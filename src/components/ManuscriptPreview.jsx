import React from 'react';
import katex from 'katex';
import { extractPaperIdentifiers } from '../utils/doiDetector';
import { ExternalLink } from 'lucide-react';

export default function ManuscriptPreview({ manuscript, onDoiClick }) {

  // Function to render text with KaTeX formulas & interactive DOI pills
  const renderFormattedContent = (text) => {
    if (!text) return null;

    // Split text by paragraphs
    const paragraphs = text.split('\n\n');

    return paragraphs.map((paragraph, pIdx) => {
      // Check for display math $$...$$
      if (paragraph.trim().startsWith('$$') && paragraph.trim().endsWith('$$')) {
        const mathExpr = paragraph.trim().slice(2, -2).trim();
        try {
          const html = katex.renderToString(mathExpr, { displayMode: true, throwOnError: false });
          return (
            <div 
              key={pIdx} 
              dangerouslySetInnerHTML={{ __html: html }} 
              style={{ margin: '1.5rem 0', textAlign: 'center', overflowX: 'auto' }}
            />
          );
        } catch (e) {
          return <pre key={pIdx} style={{ color: 'var(--accent-amber)' }}>{paragraph}</pre>;
        }
      }

      // Process inline elements: DOIs and inline math $...$
      const detected = extractPaperIdentifiers(paragraph);

      // Simple inline math parsing replacement ($...$)
      let parts = [paragraph];
      
      return (
        <p key={pIdx} style={{ marginBottom: '1.2rem', textAlign: 'justify' }}>
          {renderParagraphWithInteractiveDois(paragraph, detected, onDoiClick)}
        </p>
      );
    });
  };

  return (
    <div className="manuscript-preview">
      <div className="formatted-paper">
        <h1>{manuscript.title || "Untitled Paper"}</h1>
        <div className="authors">{manuscript.authors || "Author Names"}</div>

        {manuscript.sections.map((sec, idx) => (
          <section key={sec.id || idx} style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
              {sec.title}
            </h2>
            {renderFormattedContent(sec.content)}
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * Helper to replace DOI text instances with interactive click badges
 */
function renderParagraphWithInteractiveDois(text, detectedList, onDoiClick) {
  if (!detectedList || detectedList.length === 0) {
    return renderInlineMath(text);
  }

  // Find occurrences of DOIs in text and render as clickable badges
  let elements = [];
  let lastIndex = 0;

  // Sort detected list by position in text
  const occurrences = [];
  detectedList.forEach(item => {
    let index = text.indexOf(item.original);
    while (index !== -1) {
      occurrences.push({ ...item, start: index, end: index + item.original.length });
      index = text.indexOf(item.original, index + 1);
    }
  });

  occurrences.sort((a, b) => a.start - b.start);

  occurrences.forEach((occ, idx) => {
    if (occ.start >= lastIndex) {
      // Push string before DOI
      const beforeStr = text.substring(lastIndex, occ.start);
      if (beforeStr) elements.push(renderInlineMath(beforeStr));

      // Push DOI pill element
      elements.push(
        <span 
          key={`doi-${idx}`}
          className="doi-pill"
          onClick={() => onDoiClick(occ.id)}
          title={`Click to pull abstract for ${occ.id}`}
          style={{ margin: '0 0.2rem' }}
        >
          <ExternalLink size={11} /> {occ.id}
        </span>
      );

      lastIndex = occ.end;
    }
  });

  if (lastIndex < text.length) {
    elements.push(renderInlineMath(text.substring(lastIndex)));
  }

  return elements;
}

/**
 * Render inline $...$ math expressions using KaTeX
 */
function renderInlineMath(str) {
  if (!str.includes('$')) return str;

  const parts = str.split(/(\$[^\$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const expr = part.slice(1, -1);
      try {
        const html = katex.renderToString(expr, { displayMode: false, throwOnError: false });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      } catch (e) {
        return part;
      }
    }
    return part;
  });
}
