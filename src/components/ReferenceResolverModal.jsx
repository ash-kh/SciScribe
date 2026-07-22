import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Hash, Check, AlertTriangle, ArrowRight, 
  Loader2, ExternalLink, ListOrdered, RefreshCw 
} from 'lucide-react';
import { resolveAllNumberedCitations } from '../utils/referenceParser';
import { fetchPaperAbstract } from '../services/paperFetcher';

export default function ReferenceResolverModal({ 
  isOpen, 
  onClose, 
  manuscript, 
  setManuscript,
  citationDatabase 
}) {
  const [citations, setCitations] = useState([]);
  const [refMap, setRefMap] = useState(new Map());
  const [resolvedAuthors, setResolvedAuthors] = useState({}); // doi -> { firstAuthor, authorCount }
  const [loadingDois, setLoadingDois] = useState(new Set());
  const [appliedIndices, setAppliedIndices] = useState(new Set());
  const [scanning, setScanning] = useState(false);

  const scanManuscript = useCallback(() => {
    setScanning(true);
    setAppliedIndices(new Set());
    setResolvedAuthors({});

    setTimeout(() => {
      const { citations: found, refMap: map } = resolveAllNumberedCitations(manuscript.sections);
      setCitations(found);
      setRefMap(map);
      setScanning(false);

      // Auto-fetch author info for all unique DOIs
      const uniqueDois = new Set();
      for (const cite of found) {
        for (const r of cite.resolved) {
          const doi = r.refEntry.doi || r.refEntry.arxivId;
          if (doi) uniqueDois.add(doi);
        }
      }

      // Check citation database first, then fetch missing
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

      // Fetch the rest from APIs
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

  const applySingle = (idx) => {
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

  const applyAll = () => {
    // Apply from last to first to preserve indices
    const sortedIndices = citations
      .map((_, i) => i)
      .filter(i => !appliedIndices.has(i))
      .reverse();

    for (const idx of sortedIndices) {
      applySingle(idx);
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
            <ListOrdered size={18} style={{ color: 'var(--accent-secondary)' }} />
            <span className="modal-title">Resolve Numbered Citations</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <div style={{ padding: '0.6rem 1.2rem', fontSize: '0.82rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-main)' }}>
          Scans for <code>[1]</code>, <code>[2,3]</code>, <code>[1-5]</code> patterns in your text and resolves them 
          against DOIs found in your References section.
        </div>

        {/* Body */}
        <div className="modal-body" style={{ maxHeight: '55vh', overflow: 'auto' }}>
          {scanning ? (
            <div className="panel-empty">
              <div className="spinner" />
              <span>Scanning manuscript for numbered citations...</span>
            </div>
          ) : citations.length === 0 ? (
            <div className="panel-empty">
              <Hash size={40} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>No Numbered Citations Found</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px' }}>
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
                          onClick={() => applySingle(idx)}
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

                    {/* Show resolved references */}
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
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {citations.length} citation{citations.length !== 1 ? 's' : ''} found · {refMap.size} reference{refMap.size !== 1 ? 's' : ''} parsed
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={scanManuscript}>
              <RefreshCw size={14} /> Rescan
            </button>
            {hasUnresolved && citations.length > 0 && (
              <button className="btn btn-primary" onClick={applyAll} disabled={anyLoading}>
                <Check size={14} /> Resolve All
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
