import React from 'react';
import { Hash, Link2, List } from 'lucide-react';

export default function Outline({ 
  sections, 
  detectedPapers,
  onPaperClick,
  stats
}) {
  return (
    <aside className="left-sidebar">
      {/* Document Info */}
      <div className="sidebar-header">
        <span>Document</span>
      </div>

      {/* Section Outline */}
      <div className="sidebar-section-label">
        <List size={13} /> Sections
      </div>
      <div className="sidebar-nav">
        {sections.map((sec, idx) => (
          <div key={sec.id || idx} className="outline-item">
            <Hash size={13} />
            <span>{sec.title}</span>
          </div>
        ))}
      </div>

      {/* Detected References */}
      {detectedPapers.length > 0 && (
        <>
          <div className="sidebar-section-label" style={{ marginTop: '0.5rem' }}>
            <Link2 size={13} /> References ({detectedPapers.length})
          </div>
          <div className="sidebar-nav">
            {detectedPapers.map((paper, i) => (
              <div 
                key={i}
                className="outline-item"
                onClick={() => onPaperClick(paper.id)}
                title={`Inspect: ${paper.id}`}
              >
                <span className="doi-pill" style={{ fontSize: '0.72rem' }}>
                  {paper.type === 'arxiv' ? 'arXiv' : 'DOI'}
                </span>
                <span style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {paper.id}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Stats Footer */}
      <div className="sidebar-stats">
        <div className="stat-row">
          <span>Words</span>
          <strong>{stats.wordCount}</strong>
        </div>
        <div className="stat-row">
          <span>Characters</span>
          <strong>{stats.charCount}</strong>
        </div>
        <div className="stat-row">
          <span>References</span>
          <strong>{detectedPapers.length}</strong>
        </div>
      </div>
    </aside>
  );
}
