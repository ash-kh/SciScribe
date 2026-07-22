import React, { useState, useEffect } from 'react';
import { X, CheckCheck, Link2, Search, Check, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { fetchPaperAbstract } from '../services/paperFetcher';

/**
 * Normalizes string for diacritics
 */
function normalizeStr(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function MentionReviewModal({ 
  isOpen, 
  onClose, 
  manuscript, 
  setManuscript,
  citationDatabase 
}) {
  const [mentions, setMentions] = useState([]);
  const [resolvingIdx, setResolvingIdx] = useState(null);
  const [linkedCount, setLinkedCount] = useState(0);

  // Scan manuscript text for author mentions like "Smith et al." or "Vaswani et al. (2017)"
  useEffect(() => {
    if (!isOpen) return;

    const fullBody = manuscript.sections.map(s => s.content).join('\n\n');
    
    // Regex matches patterns like "Smith et al." or "Jumper et al., 2021" or "Vaswani et al"
    const mentionRegex = /\b([A-Z][a-zA-Z\u00C0-\u024F\-]+(?:\s+et\s+al\.?|\s+and\s+[A-Z][a-zA-Z\u00C0-\u024F\-]+)?(?:,?\s*\d{4})?)\b/g;
    
    const foundMap = new Map();
    let match;

    while ((match = mentionRegex.exec(fullBody)) !== null) {
      const mentionText = match[1].trim();
      
      // Filter out false positives (e.g. section headers or short words)
      if (mentionText.length < 5 || !/et\s+al/i.test(mentionText)) continue;

      // Check context around match to see if DOI is already attached next to it
      const startIdx = Math.max(0, match.index - 10);
      const endIdx = Math.min(fullBody.length, match.index + mentionText.length + 50);
      const context = fullBody.substring(startIdx, endIdx);
      const alreadyHasDoi = /10\.\d{4,9}\//.test(context) || /arXiv:\d/.test(context);

      if (!foundMap.has(mentionText)) {
        // Try matching against citationDatabase
        const authorMatchName = mentionText.split(/\s+/)[0]; // e.g. "Smith" or "Jumper"
        const yearMatch = mentionText.match(/\d{4}/)?.[0];

        const matchedPaper = citationDatabase.find(p => {
          const authorFound = p.authors?.some(a => normalizeStr(a).includes(normalizeStr(authorMatchName)));
          const yearFound = yearMatch ? p.year === yearMatch : true;
          return authorFound && yearFound;
        });

        foundMap.set(mentionText, {
          rawText: mentionText,
          authorName: authorMatchName,
          year: yearMatch || matchedPaper?.year || '',
          alreadyLinked: alreadyHasDoi,
          matchedPaper: matchedPaper || null
        });
      }
    }

    setMentions(Array.from(foundMap.values()));
  }, [isOpen, manuscript, citationDatabase]);

  // Handle single mention link
  const handleLinkMention = async (mentionItem, index) => {
    let paper = mentionItem.matchedPaper;

    if (!paper) {
      setResolvingIdx(index);
      try {
        // Fetch via API using author name & year
        const searchQ = `${mentionItem.authorName} ${mentionItem.year || ''}`.trim();
        paper = await fetchPaperAbstract(searchQ);
      } catch (err) {
        console.warn("Could not resolve mention:", err);
      } finally {
        setResolvingIdx(null);
      }
    }

    if (!paper || (!paper.doi && !paper.arxivId)) {
      alert(`Could not find a valid DOI for "${mentionItem.rawText}". Try adding it to your Zotero library first.`);
      return;
    }

    const doiStr = paper.doi || paper.arxivId;
    const replacementStr = `(${mentionItem.rawText} ${doiStr})`;

    // Update manuscript sections replacing raw text with formatted citation
    setManuscript(prev => {
      const updatedSections = prev.sections.map(sec => ({
        ...sec,
        content: sec.content.replace(new RegExp(escapeRegExp(mentionItem.rawText), 'g'), replacementStr)
      }));
      return { ...prev, sections: updatedSections };
    });

    // Mark as linked in state
    setMentions(prev => prev.map((m, i) => i === index ? { ...m, alreadyLinked: true, matchedPaper: paper } : m));
    setLinkedCount(c => c + 1);
  };

  // Handle Link All Mentions
  const handleLinkAll = async () => {
    for (let i = 0; i < mentions.length; i++) {
      if (!mentions[i].alreadyLinked) {
        await handleLinkMention(mentions[i], i);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(42, 34, 23, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 110,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%', maxWidth: '650px',
          maxHeight: '80vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-sidebar)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCheck size={18} style={{ color: 'var(--ink)' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Review Citation Mentions</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Detect author text mentions (Smith et al.) and auto-link DOIs</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Action Header */}
        <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--line)', background: 'var(--bg-sidebar)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 600 }}>
            Found {mentions.length} mention{mentions.length === 1 ? '' : 's'} in manuscript
          </span>

          {mentions.some(m => !m.alreadyLinked) && (
            <button className="btn btn-primary" onClick={handleLinkAll} style={{ fontSize: '0.78rem' }}>
              <Link2 size={13} /> Link All DOIs
            </button>
          )}
        </div>

        {/* Body List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {mentions.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.85rem' }}>
              No unlinked author mentions found. Type <code>Smith et al.</code> in your text to test review scanning!
            </div>
          ) : (
            mentions.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  background: 'var(--bg-paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-ink)' }}>"{item.rawText}"</strong>
                    {item.alreadyLinked && (
                      <span style={{ fontSize: '0.7rem', background: 'var(--ink-light)', color: 'var(--ink)', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                        <Check size={11} inline /> Linked
                      </span>
                    )}
                  </div>

                  {item.matchedPaper ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginTop: '0.2rem' }}>
                      Matched: <em>{item.matchedPaper.title}</em> ({item.matchedPaper.doi || item.matchedPaper.arxivId})
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
                      Will query PubMed / CrossRef API for matching paper
                    </div>
                  )}
                </div>

                {!item.alreadyLinked ? (
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleLinkMention(item, idx)}
                    disabled={resolvingIdx === idx}
                    style={{ fontSize: '0.78rem', flexShrink: 0 }}
                  >
                    {resolvingIdx === idx ? 'Fetching...' : 'Link DOI'}
                  </button>
                ) : (
                  <span className="doi-pill" style={{ fontSize: '0.72rem' }}>
                    {item.matchedPaper?.doi || 'DOI Linked'}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
