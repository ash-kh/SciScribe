import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Search, Loader2, ArrowRight, Check, 
  BookOpen, Copy, Plus, ExternalLink, ClipboardPaste
} from 'lucide-react';
import { fetchPaperAbstract } from '../services/paperFetcher';

/**
 * Format a paper object into different citation style strings.
 */
function formatCitation(paper, style) {
  const firstAuthor = paper.authors?.[0]?.split(' ')?.pop() || 'Author';
  const etAl = (paper.authors?.length || 1) > 1 ? ' et al.' : '';
  const doi = paper.doi || '';
  const year = paper.year || '';

  switch (style) {
    case 'inline':
      // (Smith et al. 10.xxxx/yyyy)
      return `(${firstAuthor}${etAl} ${doi})`;
    case 'full':
      // Smith, J., Jones, A. (2021). Title. Journal, Vol, Pages. DOI: 10.xxxx
      return `${paper.authors?.join(', ') || 'Author'} (${year}). ${paper.title}. ${paper.journal || ''}${paper.volume ? `, ${paper.volume}` : ''}${paper.pages ? `, ${paper.pages}` : ''}. DOI: ${doi}`;
    case 'apa':
      // Smith, J. et al. (2021). Title. Journal, Vol, Pages. https://doi.org/10.xxxx
      return `${firstAuthor}${etAl} (${year}). ${paper.title}. ${paper.journal || ''}${paper.volume ? `, ${paper.volume}` : ''}${paper.pages ? `, ${paper.pages}` : ''}. https://doi.org/${doi}`;
    default:
      return `(${firstAuthor}${etAl} ${doi})`;
  }
}

export default function DoiLookupModal({
  isOpen,
  onClose,
  onInsertCitation,
  onAddToReferenceSection,
  onAddPaperToDatabase
}) {
  const [doiInput, setDoiInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paper, setPaper] = useState(null);
  const [citationStyle, setCitationStyle] = useState('inline');
  const [insertedInline, setInsertedInline] = useState(false);
  const [addedToRefs, setAddedToRefs] = useState(false);
  const [addedToDb, setAddedToDb] = useState(false);
  const inputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDoiInput('');
      setPaper(null);
      setError(null);
      setLoading(false);
      setInsertedInline(false);
      setAddedToRefs(false);
      setAddedToDb(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleLookup = async () => {
    const raw = doiInput.trim();
    if (!raw) return;

    // Clean common DOI URL formats
    let cleanDoi = raw
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .replace(/^doi:\s*/i, '')
      .trim();

    setLoading(true);
    setError(null);
    setPaper(null);
    setInsertedInline(false);
    setAddedToRefs(false);
    setAddedToDb(false);

    try {
      const result = await fetchPaperAbstract(cleanDoi);
      if (result) {
        setPaper(result);
      } else {
        setError('No results found for this DOI. Please check it and try again.');
      }
    } catch (err) {
      setError(`Lookup failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  const handleInsertInline = () => {
    if (!paper) return;
    const text = formatCitation(paper, citationStyle);
    onInsertCitation(text);
    setInsertedInline(true);
  };

  const handleAddToRefs = () => {
    if (!paper) return;
    const refLine = formatCitation(paper, 'full');
    onAddToReferenceSection(refLine);
    setAddedToRefs(true);
  };

  const handleAddToDatabase = () => {
    if (!paper) return;
    onAddPaperToDatabase({
      id: paper.doi || paper.arxivId,
      doi: paper.doi,
      arxivId: paper.arxivId,
      title: paper.title,
      authors: paper.authors,
      journal: paper.journal,
      year: paper.year,
      abstract: paper.abstract,
      source: paper.source || 'DOI Lookup'
    });
    setAddedToDb(true);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDoiInput(text);
    } catch {
      // Fallback — clipboard API may be blocked
    }
  };

  if (!isOpen) return null;

  const previewText = paper ? formatCitation(paper, citationStyle) : '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} style={{ color: 'var(--ink)' }} />
            <span className="modal-title">DOI Citation Lookup</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* DOI Input */}
        <div style={{ padding: '0.85rem 1.2rem', borderBottom: '1px solid var(--line)' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem', display: 'block' }}>
            Enter a DOI, arXiv ID, or PubMed ID
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <div className="search-input-wrapper" style={{ flex: 1 }}>
              <Search size={14} />
              <input
                ref={inputRef}
                type="text"
                className="search-input"
                value={doiInput}
                onChange={(e) => setDoiInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 10.1038/s41586-021-03819-2"
              />
            </div>
            <button className="btn btn-ghost btn-icon" onClick={handlePaste} title="Paste from clipboard">
              <ClipboardPaste size={15} />
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleLookup}
              disabled={loading || !doiInput.trim()}
            >
              {loading ? <Loader2 size={14} className="spinning" /> : <Search size={14} />}
              {loading ? 'Searching…' : 'Lookup'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ minHeight: '200px' }}>
          {/* Error */}
          {error && (
            <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(140, 29, 29, 0.1)', borderRadius: '4px', fontSize: '0.82rem', color: 'var(--ink)' }}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="panel-empty">
              <div className="spinner" />
              <span>Fetching paper metadata…</span>
            </div>
          )}

          {/* No paper yet and not loading */}
          {!paper && !loading && !error && (
            <div className="panel-empty">
              <BookOpen size={40} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>Paste a DOI to look up a citation</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)', textAlign: 'center', maxWidth: '340px' }}>
                Enter a DOI (e.g. <code>10.1038/s41586-021-03819-2</code>), arXiv ID, 
                or PubMed ID. SciScribe will fetch the full citation metadata and let you 
                insert it directly into your manuscript.
              </span>
            </div>
          )}

          {/* Paper Result */}
          {paper && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {/* Paper Info Card */}
              <div className="article-card">
                <div className="article-title">{paper.title}</div>
                <div className="article-authors">{paper.authors?.join(', ') || 'Unknown Authors'}</div>
                <div className="article-meta">
                  {paper.journal && <span className="meta-item">{paper.journal}</span>}
                  {paper.year && <span className="meta-item">{paper.year}</span>}
                  {paper.doi && (
                    <span className="meta-item" style={{ color: 'var(--ink)' }}>
                      <ExternalLink size={11} /> {paper.doi}
                    </span>
                  )}
                </div>
                {paper.abstract && (
                  <>
                    <div className="abstract-header">Abstract</div>
                    <div className="article-abstract">{paper.abstract}</div>
                  </>
                )}
              </div>

              {/* Citation Style Picker */}
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '0.7rem', background: 'var(--bg-sidebar)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                  Citation Format
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { key: 'inline', label: 'Inline (Author DOI)' },
                    { key: 'full', label: 'Full Reference' },
                    { key: 'apa', label: 'APA-style' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`preset-btn ${citationStyle === opt.key ? 'active' : ''}`}
                      onClick={() => setCitationStyle(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Preview */}
                <div style={{ 
                  padding: '0.45rem 0.6rem', 
                  background: 'var(--bg-paper)', 
                  border: '1px solid var(--line)', 
                  borderRadius: 'var(--r-sm)', 
                  fontSize: '0.82rem', 
                  fontFamily: 'var(--font)',
                  color: 'var(--text-ink)',
                  lineHeight: 1.5,
                  wordBreak: 'break-all'
                }}>
                  {previewText}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleInsertInline}
                  disabled={insertedInline}
                >
                  {insertedInline ? <><Check size={14} /> Inserted</> : <><ArrowRight size={14} /> Insert at Cursor</>}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleAddToRefs}
                  disabled={addedToRefs}
                >
                  {addedToRefs ? <><Check size={14} /> Added</> : <><Plus size={14} /> Add to References</>}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleAddToDatabase}
                  disabled={addedToDb}
                >
                  {addedToDb ? <><Check size={14} /> Saved</> : <><BookOpen size={14} /> Save to Library</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
            Powered by Europe PMC, arXiv & CrossRef
          </span>
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
