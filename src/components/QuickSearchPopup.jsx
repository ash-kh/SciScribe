import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Globe, Sparkles } from 'lucide-react';
import { fetchPaperAbstract } from '../services/paperFetcher';

/**
 * Robust normalization for diacritics, orthography, ligatures, and Unicode variants:
 * Åkerfelt → akerfelt, æ → ae, ä → a, ø → o, etc.
 */
function normalizeForSearch(str) {
  if (!str) return '';
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .replace(/ß/g, 'ss')
    .replace(/[åÅ]/g, 'a')
    .replace(/[äÄ]/g, 'a')
    .replace(/[öÖ]/g, 'o')
    .replace(/[øØ]/g, 'o')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export default function QuickSearchPopup({ 
  isOpen, 
  onClose, 
  citationDatabase, 
  onSelectCitation,
  initialQuery,
  onAddPaperToDatabase
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFetchingOnline, setIsFetchingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState(null);
  const inputRef = useRef(null);

  const filteredPapers = citationDatabase.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = normalizeForSearch(searchQuery);
    return (
      normalizeForSearch(p.title).includes(q) ||
      p.authors?.some(a => normalizeForSearch(a).includes(q)) ||
      normalizeForSearch(p.doi).includes(q) ||
      normalizeForSearch(p.journal).includes(q) ||
      normalizeForSearch(p.abstract).includes(q) ||
      p.year?.includes(searchQuery.trim())
    );
  });

  useEffect(() => { 
    setSelectedIndex(0); 
    setOnlineError(null);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery || '');
      setOnlineError(null);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialQuery]);

  const handleFetchOnline = async (queryToSearch) => {
    const q = queryToSearch || searchQuery;
    if (!q.trim()) return;

    setIsFetchingOnline(true);
    setOnlineError(null);

    try {
      const fetched = await fetchPaperAbstract(q.trim());
      if (fetched) {
        const newPaper = {
          id: fetched.doi || fetched.arxivId || `cite-${Date.now()}`,
          doi: fetched.doi || '',
          title: fetched.title,
          authors: fetched.authors,
          journal: fetched.journal,
          year: fetched.year,
          abstract: fetched.abstract,
          url: fetched.url,
          source: fetched.source || 'PubMed / Online'
        };

        if (onAddPaperToDatabase) {
          onAddPaperToDatabase(newPaper);
        }

        handleSelect(newPaper);
      }
    } catch (err) {
      setOnlineError(`No online articles found for "${q}". Check spelling or DOI.`);
    } finally {
      setIsFetchingOnline(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { 
      e.preventDefault(); 
      onClose(); 
    }
    else if (e.key === 'ArrowDown') { 
      e.preventDefault(); 
      setSelectedIndex(i => i < filteredPapers.length - 1 ? i + 1 : 0); 
    }
    else if (e.key === 'ArrowUp') { 
      e.preventDefault(); 
      setSelectedIndex(i => i > 0 ? i - 1 : filteredPapers.length - 1); 
    }
    else if (e.key === 'Enter') { 
      e.preventDefault(); 
      if (filteredPapers.length > 0 && filteredPapers[selectedIndex]) {
        handleSelect(filteredPapers[selectedIndex]);
      } else if (searchQuery.trim()) {
        handleFetchOnline(searchQuery);
      }
    }
  };

  const handleSelect = (paper) => {
    const last = paper.authors?.[0]?.split(' ')?.pop() || 'Author';
    const etAl = paper.authors?.length > 1 ? ' et al.' : '';
    const doi = paper.doi || paper.id || '';
    
    // Formats as (Smith et al. 10.xxxx/...) so DOI link is clickable in text
    const insertText = doi ? ` (${last}${etAl} ${doi}) ` : ` (${last}${etAl} ${paper.id}) `;
    onSelectCitation(insertText, paper);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(42, 34, 23, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '90%', maxWidth: '560px',
          background: 'var(--bg-card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          background: 'var(--bg-sidebar)'
        }}>
          <Search size={16} style={{ color: 'var(--ink)', flexShrink: 0 }} />
          <input 
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search citations by title, author, Åkerfelt, DOI..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: '0.95rem', fontFamily: 'var(--font)'
            }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', background: 'var(--bg-hover)', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>
            ESC
          </span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '0.4rem' }}>
          {isFetchingOnline ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-mid)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div className="spinner" />
              <span>Searching PubMed / Europe PMC online for "{searchQuery}"...</span>
            </div>
          ) : filteredPapers.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
              <span>No local citations matched "{searchQuery}".</span>
              {searchQuery.trim() && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleFetchOnline(searchQuery)}
                  style={{ fontSize: '0.8rem' }}
                >
                  <Globe size={14} /> Search Online Repository (PubMed / arXiv)
                </button>
              )}
              {onlineError && <span style={{ color: 'var(--ink)', fontSize: '0.8rem' }}>{onlineError}</span>}
            </div>
          ) : (
            filteredPapers.map((paper, idx) => (
              <div 
                key={paper.id || idx}
                onClick={() => handleSelect(paper)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--r-sm)',
                  background: idx === selectedIndex ? 'var(--ink-light)' : 'transparent',
                  border: idx === selectedIndex ? '1px solid var(--doi-border)' : '1px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '0.2rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: idx === selectedIndex ? 'var(--ink)' : 'var(--text)' }}>
                    {paper.title}
                  </span>
                  {paper.year && <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', flexShrink: 0, marginLeft: '0.5rem' }}>{paper.year}</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginTop: '0.15rem' }}>
                  {paper.authors?.slice(0, 3).join(', ')}{paper.authors?.length > 3 ? ' et al.' : ''}
                  {paper.journal && <span style={{ opacity: 0.6 }}> — {paper.journal}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.45rem 1rem',
          borderTop: '1px solid var(--line)',
          background: 'var(--bg-sidebar)',
          fontSize: '0.72rem', color: 'var(--text-faint)',
          display: 'flex', justifyContent: 'space-between'
        }}>
          <span>↑ ↓ navigate · Enter insert/fetch · Esc close</span>
          <span>Zotero + Online Lookup</span>
        </div>
      </div>
    </div>
  );
}
