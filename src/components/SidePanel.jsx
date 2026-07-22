import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  ExternalLink, 
  Plus, 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  BookmarkCheck,
  AlertCircle,
  Clock,
  Quote
} from 'lucide-react';
import { fetchPaperAbstract } from '../services/paperFetcher';

export default function SidePanel({ 
  isOpen, 
  onClose, 
  selectedDoi, 
  onInsertCitation,
  onAddToReferenceSection
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [paperData, setPaperData] = useState(null);
  const [error, setError] = useState(null);
  const [copiedBibtex, setCopiedBibtex] = useState(false);
  const [copiedInline, setCopiedInline] = useState(false);

  // When selectedDoi changes from editor/outline, auto-fetch
  useEffect(() => {
    if (selectedDoi) {
      setQuery(selectedDoi);
      handleFetch(selectedDoi);
    }
  }, [selectedDoi]);

  const handleFetch = async (queryToFetch) => {
    const q = queryToFetch || query;
    if (!q || !q.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPaperAbstract(q);
      setPaperData(data);
    } catch (err) {
      console.error("Error fetching abstract:", err);
      setError("Unable to retrieve abstract for this identifier. Check internet connection or verify DOI.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleFetch(query);
  };

  // Generate BibTeX string
  const getBibtex = () => {
    if (!paperData) return '';
    const firstAuthorLast = paperData.authors?.[0]?.split(' ')?.pop()?.toLowerCase() || 'author';
    const citeKey = `${firstAuthorLast}${paperData.year || '2023'}${paperData.title?.split(' ')?.[0]?.toLowerCase() || 'paper'}`;
    
    return `@article{${citeKey},
  title={${paperData.title}},
  author={${paperData.authors?.join(' and ')}},
  journal={${paperData.journal}},
  year={${paperData.year}},
  doi={${paperData.doi || ''}}
}`;
  };

  const handleCopyBibtex = () => {
    navigator.clipboard.writeText(getBibtex());
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  const handleInsertInline = () => {
    if (!paperData) return;
    const firstAuthor = paperData.authors?.[0]?.split(' ')?.pop() || 'Author';
    const etAl = paperData.authors?.length > 1 ? ' et al.' : '';
    const doi = paperData.doi || paperData.arxivId || '';
    const citationStr = doi ? ` (${firstAuthor}${etAl} ${doi}) ` : ` (${firstAuthor}${etAl}, ${paperData.year || '2024'}) `;
    
    onInsertCitation(citationStr);
    setCopiedInline(true);
    setTimeout(() => setCopiedInline(false), 2000);
  };

  const handleAddToRefList = () => {
    if (!paperData) return;
    const authorsStr = paperData.authors?.slice(0, 3).join(', ') + (paperData.authors?.length > 3 ? ' et al.' : '');
    const refLine = `[Ref] ${authorsStr} (${paperData.year}). ${paperData.title}. ${paperData.journal}. DOI: ${paperData.doi || paperData.arxivId}`;
    
    onAddToReferenceSection(refLine);
  };

  return (
    <aside className={`side-panel ${!isOpen ? 'collapsed' : ''}`}>
      {/* Side Panel Header */}
      <div className="side-panel-header">
        <div className="side-panel-title">
          <BookOpen size={18} style={{ color: 'var(--accent-secondary)' }} />
          <span>Abstract Inspector</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close Side Panel">
          <X size={18} />
        </button>
      </div>

      {/* DOI Search Bar */}
      <form className="side-panel-search" onSubmit={handleSearchSubmit}>
        <div className="search-input-wrapper">
          <Search size={16} />
          <input 
            type="text" 
            className="search-input"
            placeholder="Paste DOI, PMID, arXiv ID or title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Quick Sample Presets */}
        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', alignSelf: 'center' }}>Samples:</span>
          <button 
            type="button" 
            className="btn btn-ghost" 
            style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', background: 'var(--bg-dark-hover)' }}
            onClick={() => handleFetch("10.1038/s41586-021-03819-2")}
          >
            AlphaFold
          </button>
          <button 
            type="button" 
            className="btn btn-ghost" 
            style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', background: 'var(--bg-dark-hover)' }}
            onClick={() => handleFetch("1706.03762")}
          >
            Transformer
          </button>
          <button 
            type="button" 
            className="btn btn-ghost" 
            style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', background: 'var(--bg-dark-hover)' }}
            onClick={() => handleFetch("10.1126/science.1225829")}
          >
            CRISPR
          </button>
        </div>
      </form>

      {/* Side Panel Content Body */}
      <div className="side-panel-body">
        {loading ? (
          <div className="panel-empty">
            <div className="spinner" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Fetching article abstract from PubMed / arXiv / CrossRef...
            </span>
          </div>
        ) : error ? (
          <div className="panel-empty">
            <AlertCircle size={36} style={{ color: 'var(--accent-rose)' }} />
            <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{error}</span>
            <button className="btn btn-secondary" onClick={() => handleFetch(query)}>
              Retry Fetch
            </button>
          </div>
        ) : paperData ? (
          <div className="article-card">
            {/* Source Tag Badge */}
            <div className="article-source-badge source-pubmed">
              <Sparkles size={12} /> {paperData.source || 'PubMed / CrossRef'}
            </div>

            {/* Title */}
            <h3 className="article-title">{paperData.title}</h3>

            {/* Authors */}
            <div className="article-authors">
              {paperData.authors?.join(', ')}
            </div>

            {/* Metadata Bar */}
            <div className="article-meta">
              {paperData.journal && (
                <div className="meta-item">
                  <strong>Journal:</strong> {paperData.journal}
                </div>
              )}
              {paperData.year && (
                <div className="meta-item">
                  <strong>Year:</strong> {paperData.year}
                </div>
              )}
              {paperData.citationsCount !== undefined && (
                <div className="meta-item">
                  <strong>Citations:</strong> {paperData.citationsCount}
                </div>
              )}
            </div>

            {/* Abstract Section */}
            <div>
              <div className="abstract-header">Abstract</div>
              <div className="article-abstract">
                {paperData.abstract}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="article-actions">
              <button 
                className="btn btn-primary" 
                onClick={handleInsertInline}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}
              >
                {copiedInline ? <Check size={14} /> : <Quote size={14} />}
                {copiedInline ? 'Citation Inserted!' : 'Insert Inline Citation'}
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={handleAddToRefList}
                style={{ fontSize: '0.8rem' }}
                title="Add to paper references"
              >
                <Plus size={14} /> + Ref List
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={handleCopyBibtex}
                style={{ fontSize: '0.8rem' }}
                title="Copy BibTeX citation"
              >
                {copiedBibtex ? <Check size={14} /> : <Copy size={14} />} BibTeX
              </button>

              {paperData.url && (
                <a 
                  href={paperData.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-ghost btn-icon"
                  title="Open Full Article in New Tab"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="panel-empty">
            <BookOpen size={48} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              No Article Selected
            </div>
            <p style={{ fontSize: '0.85rem' }}>
              Click any DOI link or reference pill in your manuscript (e.g. <code>10.1038/...</code> or <code>1706.03762</code>) or enter a DOI in the search box above to inspect its PubMed / arXiv abstract.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
