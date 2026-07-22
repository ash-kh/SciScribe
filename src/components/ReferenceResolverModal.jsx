import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Hash, Check, AlertTriangle, ArrowRight, 
  Loader2, ExternalLink, ListOrdered, RefreshCw,
  ArrowLeftRight, FileText
} from 'lucide-react';
import { 
  resolveAllNumberedCitations, 
  findInlineParentheticalCitations, 
  convertInlineToNumberedAll 
} from '../utils/referenceParser';
import { fetchPaperAbstract } from '../services/paperFetcher';

export default function ReferenceResolverModal({ 
  isOpen, 
  onClose, 
  manuscript, 
  setManuscript,
  citationDatabase 
}) {
  const [activeTab, setActiveTab] = useState('numToInline'); // 'numToInline' | 'inlineToNum'

  // State for Numbered -> Inline
  const [citations, setCitations] = useState([]);
  const [refMap, setRefMap] = useState(new Map());
  const [resolvedAuthors, setResolvedAuthors] = useState({});
  const [loadingDois, setLoadingDois] = useState(new Set());
  const [appliedIndices, setAppliedIndices] = useState(new Set());
  const [scanning, setScanning] = useState(false);

  // State for Inline -> Numbered
  const [detectedInlineCites, setDetectedInlineCites] = useState([]);
  const [inlineConvertedSuccess, setInlineConvertedSuccess] = useState(false);

  const scanManuscript = useCallback(() => {
    setScanning(true);
    setAppliedIndices(new Set());
    setResolvedAuthors({});
    setInlineConvertedSuccess(false);

    setTimeout(() => {
      // 1. Scan for Numbered [1] -> Inline
      const { citations: found, refMap: map } = resolveAllNumberedCitations(manuscript.sections);
      setCitations(found);
      setRefMap(map);

      // 2. Scan for Inline (Smith et al. DOI) -> Numbered
      const foundInline = findInlineParentheticalCitations(manuscript.sections);
      setDetectedInlineCites(foundInline);

      setScanning(false);

      // Auto-fetch author info for Numbered -> Inline
      const uniqueDois = new Set();
      for (const cite of found) {
        for (const r of cite.resolved) {
          const doi = r.refEntry.doi || r.refEntry.arxivId;
          if (doi) uniqueDois.add(doi);
        }
      }

      const authorMap = {};
      const toFetch = [];
      for (const doi of uniqueDois) {
        const dbEntry = citationDatabase.find(
          p => p.doi === doi || p.id === doi || p.arxivId === doi
        );
        if (dbEntry) {
          const firstAuthor = dbEntry.authors?.[0]?.split(' ')?.pop() || 'Author';
          authorMap[doi] = { firstAuthor, authorCount: dbEntry.authors?.length || 1 };
        } else {
          toFetch.push(doi);
        }
      }
      setResolvedAuthors(prev => ({ ...prev, ...authorMap }));

      for (const doi of toFetch) {
        setLoadingDois(prev => new Set([...prev, doi]));
        fetchPaperAbstract(doi)
          .then(paper => {
            const firstAuthor = paper.authors?.[0]?.split(' ')?.pop() || 'Author';
            setResolvedAuthors(prev => ({
              ...prev,
              [doi]: { firstAuthor, authorCount: paper.authors?.length || 1 }
            }));
          })
          .catch(() => {
            setResolvedAuthors(prev => ({
              ...prev,
              [doi]: { firstAuthor: 'Author', authorCount: 1 }
            }));
          })
          .finally(() => {
            setLoadingDois(prev => {
              const next = new Set(prev);
              next.delete(doi);
              return next;
            });
          });
      }
    }, 100);
  }, [manuscript.sections, citationDatabase]);

  useEffect(() => {
    if (isOpen) {
      scanManuscript();
    }
  }, [isOpen, scanManuscript]);

  const buildCitationString = (resolvedEntries) => {
    const parts = resolvedEntries.map(r => {
      const doi = r.refEntry.doi || r.refEntry.arxivId || '';
      const info = resolvedAuthors[doi];
      const author = info?.firstAuthor || 'Author';
      const etAl = (info?.authorCount || 1) > 1 ? ' et al.' : '';
      return `${author}${etAl} ${doi}`;
    });
    return `(${parts.join('; ')})`;
  };

  const applySingleNumberedToInline = (idx) => {
    const cite = citations[idx];
    if (!cite || appliedIndices.has(idx)) return;

    const replacementText = buildCitationString(cite.resolved);

    setManuscript(prev => {
      const newSections = prev.sections.map(sec => {
        if (sec.id === cite.sectionId) {
          return {
            ...sec,
            content: sec.content.replace(cite.match, replacementText)
          };
        }
        return sec;
      });
      return { ...prev, sections: newSections };
    });

    setAppliedIndices(prev => new Set([...prev, idx]));
  };

  const applyAllNumberedToInline = () => {
    const sortedIndices = citations
      .map((_, i) => i)
      .filter(i => !appliedIndices.has(i))
      .reverse();

    for (const idx of sortedIndices) {
      applySingleNumberedToInline(idx);
    }
  };

  // Convert Inline (Smith et al. DOI) -> Numbered [1], [2]
  const applyAllInlineToNumbered = () => {
    const { sections: newSections, count } = convertInlineToNumberedAll(manuscript.sections, citationDatabase);
    if (count > 0) {
      setManuscript(prev => ({ ...prev, sections: newSections }));
      setInlineConvertedSuccess(true);
      setTimeout(() => scanManuscript(), 400);
    }
  };

  if (!isOpen) return null;

  const hasUnresolved = citations.some((_, i) => !appliedIndices.has(i));
  const anyLoading = loadingDois.size > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container ref-resolver-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeftRight size={18} style={{ color: 'var(--accent-secondary)' }} />
            <span className="modal-title">Citation Format Converter</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="modal-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-main)', padding: '0.4rem 1.2rem', gap: '0.5rem', background: 'var(--bg-card)' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'numToInline' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
            onClick={() => setActiveTab('numToInline')}
          >
            <Hash size={14} /> Numbered [1] ➔ Inline (Author DOI)
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'inlineToNum' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
            onClick={() => setActiveTab('inlineToNum')}
          >
            <FileText size={14} /> Inline (Author DOI) ➔ Numbered [1]
          </button>
        </div>

        {/* Sub-Header Description */}
        <div style={{ padding: '0.6rem 1.2rem', fontSize: '0.82rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-main)' }}>
          {activeTab === 'numToInline' ? (
            <>Scans for <code>[1]</code>, <code>[2,3]</code>, <code>[1-5]</code> patterns and converts them to <code>(Author et al. DOI)</code> format.</>
          ) : (
            <>Scans for <code>(Author et al. DOI)</code> in text and converts them to <code>[1]</code>, <code>[2]</code> format, automatically updating your References list.</>
          )}
        </div>

        {/* Body */}
        <div className="modal-body" style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {scanning ? (
            <div className="panel-empty">
              <div className="spinner" />
              <span>Scanning manuscript for citations...</span>
            </div>
          ) : activeTab === 'numToInline' ? (
            /* TAB 1: Numbered -> Inline */
            citations.length === 0 ? (
              <div className="panel-empty">
                <Hash size={40} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>No Numbered Citations Found</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '340px' }}>
                  No patterns like [1], [2,3], or [1-5] were found in your manuscript body, 
                  or no References section with DOIs was detected.
                </span>
              </div>
            ) : (
              <div className="mention-list">
                {citations.map((cite, idx) => {
                  const isApplied = appliedIndices.has(idx);
                  return (
                    <div 
                      key={idx} 
                      className={`mention-item ${isApplied ? 'mention-applied' : ''}`}
                    >
                      <div className="mention-item-header">
                        <div className="mention-text-col">
                          <span className="mention-match-label">
                            <Hash size={13} />
                            {cite.match}
                          </span>
                          <span className="mention-section-label">
                            in {cite.sectionTitle}
                          </span>
                        </div>
                        {!isApplied && (
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.76rem', padding: '0.2rem 0.6rem' }}
                            onClick={() => applySingleNumberedToInline(idx)}
                            disabled={anyLoading}
                          >
                            <ArrowRight size={13} /> Replace
                          </button>
                        )}
                        {isApplied && (
                          <span style={{ color: 'var(--accent-green)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Check size={14} /> Applied
                          </span>
                        )}
                      </div>

                      <div className="mention-resolved-refs">
                        {cite.resolved.map((r, ri) => {
                          const doi = r.refEntry.doi || r.refEntry.arxivId || '';
                          const isLoading = loadingDois.has(doi);
                          const authorInfo = resolvedAuthors[doi];
                          const preview = authorInfo
                            ? `(${authorInfo.firstAuthor}${authorInfo.authorCount > 1 ? ' et al.' : ''} ${doi})`
                            : `(Author et al. ${doi})`;

                          return (
                            <div key={ri} className="mention-ref-entry">
                              <span className="ref-number-badge">[{r.number}]</span>
                              <div className="ref-entry-detail">
                                <span className="ref-entry-text" title={r.refEntry.text}>
                                  {r.refEntry.text.length > 80
                                    ? r.refEntry.text.slice(0, 80) + '…'
                                    : r.refEntry.text}
                                </span>
                                <span className="ref-entry-preview">
                                  {isLoading ? (
                                    <><Loader2 size={11} className="spinning" /> Fetching author…</>
                                  ) : (
                                    <><ArrowRight size={11} /> {preview}</>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB 2: Inline -> Numbered */
            detectedInlineCites.length === 0 ? (
              <div className="panel-empty">
                <FileText size={40} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>No Inline Citations Found</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '340px' }}>
                  No inline parenthetical citations like <code>(Author et al. 10.1038/...)</code> were detected in your document body.
                </span>
              </div>
            ) : (
              <div className="mention-list">
                {inlineConvertedSuccess && (
                  <div style={{ padding: '0.5rem 0.8rem', background: 'rgba(30, 112, 57, 0.15)', color: 'var(--green)', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <Check size={16} /> Converted all inline citations to numbered brackets and updated References section!
                  </div>
                )}
                {detectedInlineCites.map((cite, idx) => (
                  <div key={idx} className="mention-item">
                    <div className="mention-item-header">
                      <div className="mention-text-col">
                        <span className="mention-match-label" style={{ fontSize: '0.82rem' }}>
                          {cite.match}
                        </span>
                        <span className="mention-section-label">
                          in {cite.sectionTitle}
                        </span>
                      </div>
                      <span className="ref-entry-preview">
                        <ArrowRight size={13} /> [{idx + 1}]
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                      Identifier: <code>{cite.identifier}</code>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {activeTab === 'numToInline' 
              ? `${citations.length} citation(s) found · ${refMap.size} reference(s) parsed`
              : `${detectedInlineCites.length} inline citation(s) detected`
            }
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={scanManuscript}>
              <RefreshCw size={14} /> Rescan
            </button>
            {activeTab === 'numToInline' && hasUnresolved && citations.length > 0 && (
              <button className="btn btn-primary" onClick={applyAllNumberedToInline} disabled={anyLoading}>
                <Check size={14} /> Convert All to Inline
              </button>
            )}
            {activeTab === 'inlineToNum' && detectedInlineCites.length > 0 && (
              <button className="btn btn-primary" onClick={applyAllInlineToNumbered}>
                <Check size={14} /> Convert All to Numbered [1]
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
