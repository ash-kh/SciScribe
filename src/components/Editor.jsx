import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { extractPaperIdentifiers, DOI_REGEX, ARXIV_REGEX } from '../utils/doiDetector';

/**
 * Build a combined regex that matches DOIs and arXiv IDs in text.
 */
function buildDoiHighlightRegex() {
  // Match DOIs like 10.1038/s41586-021-03819-2
  // Match arXiv IDs like arXiv:1706.03762
  // Match parenthetical citations that contain DOIs: (Author et al. 10.xxxx/yyyy)
  return /(\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b)|(\b(?:arXiv:\s*)\d{4}\.\d{4,5}(?:v\d+)?\b)/gi;
}

/**
 * Render text with DOI/arXiv spans as React elements.
 * Non-DOI text is rendered as plain text spans, DOIs as clickable spans.
 */
function renderHighlightedText(text, onDoiClick) {
  if (!text) return [<span key="empty"></span>];

  const regex = buildDoiHighlightRegex();
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      elements.push(
        <span key={`t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    const matchedText = match[0];
    const doi = match[1] ? match[1].replace(/[.,;)]+$/, '') : null;
    const arxivFull = match[2];
    const arxivId = arxivFull ? arxivFull.replace(/^arXiv:\s*/i, '').trim() : null;
    const clickId = doi || arxivId;

    elements.push(
      <span
        key={`doi-${match.index}`}
        className="editor-doi-link"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (clickId && onDoiClick) onDoiClick(clickId);
        }}
        title={`Click to view abstract for ${clickId}`}
      >
        {matchedText}
      </span>
    );

    lastIndex = match.index + matchedText.length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    elements.push(
      <span key={`t-${lastIndex}`}>{text.slice(lastIndex)}</span>
    );
  }

  if (elements.length === 0) {
    elements.push(<span key="full">{text}</span>);
  }

  return elements;
}

export default function Editor({ 
  manuscript, 
  setManuscript, 
  onDoiClick,
  onOpenQuickSearch,
  insertedCitation,
  clearInsertedCitation
}) {
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const savedCursorRef = useRef({ start: 0, end: 0 });

  // Combine all sections into a single continuous document string for editing
  const getFullBody = useCallback(() => {
    return manuscript.sections
      .map(sec => `## ${sec.title}\n\n${sec.content}`)
      .join('\n\n');
  }, [manuscript.sections]);

  const [body, setBody] = useState(getFullBody);

  // Sync body when manuscript changes externally
  const lastExternalUpdate = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastExternalUpdate.current > 300) {
      setBody(getFullBody());
    }
  }, [manuscript.sections, getFullBody]);

  // Parse the continuous body back into manuscript sections
  const parseBodyToSections = useCallback((text) => {
    const sectionRegex = /^## (.+)$/gm;
    const parts = [];
    let match;
    const matches = [];

    while ((match = sectionRegex.exec(text)) !== null) {
      matches.push({ title: match[1], index: match.index, headerEnd: match.index + match[0].length });
    }

    if (matches.length === 0) {
      return [{
        id: 'sec-body',
        title: 'Body',
        content: text.trim()
      }];
    }

    for (let i = 0; i < matches.length; i++) {
      const contentStart = matches[i].headerEnd;
      const contentEnd = i < matches.length - 1 ? matches[i + 1].index : text.length;
      const content = text.slice(contentStart, contentEnd).replace(/^\n+/, '').replace(/\n+$/, '');
      const existingSec = manuscript.sections.find(s => s.title === matches[i].title);
      
      parts.push({
        id: existingSec?.id || `sec-${i}-${Date.now()}`,
        title: matches[i].title,
        content: content
      });
    }

    return parts;
  }, [manuscript.sections]);

  const handleBodyChange = (e) => {
    const newText = e.target.value;
    setBody(newText);
    lastExternalUpdate.current = Date.now();

    clearTimeout(handleBodyChange._timer);
    handleBodyChange._timer = setTimeout(() => {
      const parsed = parseBodyToSections(newText);
      setManuscript(prev => ({ ...prev, sections: parsed }));
    }, 400);
  };

  const handleTitleChange = (e) => {
    setManuscript(prev => ({ ...prev, title: e.target.value }));
  };

  const handleAuthorsChange = (e) => {
    setManuscript(prev => ({ ...prev, authors: e.target.value }));
  };

  // Track cursor position when Alt or typing occurs
  const handleKeyDown = (e) => {
    if (e.key === 'Alt') {
      const ta = textareaRef.current;
      if (ta) {
        savedCursorRef.current = {
          start: ta.selectionStart,
          end: ta.selectionEnd
        };
      }
      onOpenQuickSearch();
    }
  };

  const handleSelectionOrClick = () => {
    const ta = textareaRef.current;
    if (ta) {
      savedCursorRef.current = {
        start: ta.selectionStart,
        end: ta.selectionEnd
      };
    }
  };

  // When a citation is selected from popup or side panel, insert at EXACT cursor position!
  useEffect(() => {
    if (!insertedCitation) return;

    const ta = textareaRef.current;
    const currentBody = body;
    const start = savedCursorRef.current.start || (ta ? ta.selectionStart : currentBody.length);
    const end = savedCursorRef.current.end || (ta ? ta.selectionEnd : currentBody.length);

    const newBody = currentBody.substring(0, start) + insertedCitation + currentBody.substring(end);
    const newCursorPos = start + insertedCitation.length;

    setBody(newBody);
    lastExternalUpdate.current = Date.now();

    const parsed = parseBodyToSections(newBody);
    setManuscript(prev => ({ ...prev, sections: parsed }));

    // Restore focus & position cursor right after inserted citation
    setTimeout(() => {
      if (ta) {
        ta.focus();
        ta.setSelectionRange(newCursorPos, newCursorPos);
        savedCursorRef.current = { start: newCursorPos, end: newCursorPos };
      }
    }, 50);

    clearInsertedCitation();
  }, [insertedCitation, body, parseBodyToSections, setManuscript, clearInsertedCitation]);

  // Auto-resize textarea and sync overlay height
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [body]);

  // Sync scroll between textarea and overlay
  const handleScroll = () => {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (ta && ov) {
      ov.scrollTop = ta.scrollTop;
      ov.scrollLeft = ta.scrollLeft;
    }
  };

  const detectedPapers = extractPaperIdentifiers(body);

  return (
    <div className="editor-container">
      <div className="paper-sheet">
        {/* Title */}
        <input 
          type="text"
          className="paper-title-input"
          value={manuscript.title}
          onChange={handleTitleChange}
          placeholder="Manuscript Title"
        />

        {/* Authors */}
        <input 
          type="text"
          className="paper-author-input"
          value={manuscript.authors}
          onChange={handleAuthorsChange}
          placeholder="Author names, affiliations..."
        />

        {/* DOI Pill Bar */}
        {detectedPapers.length > 0 && (
          <div className="doi-bar">
            <span className="doi-bar-label">References found:</span>
            <div className="doi-bar-pills">
              {detectedPapers.map((paper, i) => (
                <span 
                  key={i}
                  className="doi-pill"
                  onClick={() => onDoiClick(paper.id)}
                  title={`Click to inspect abstract for ${paper.id}`}
                >
                  <ExternalLink size={11} />
                  {paper.type === 'arxiv' ? `arXiv:${paper.id}` : paper.id}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Editor area: textarea + clickable overlay */}
        <div className="editor-textarea-wrapper" ref={containerRef}>
          {/* The real textarea for editing */}
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={body}
            onChange={handleBodyChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelectionOrClick}
            onClick={handleSelectionOrClick}
            onScroll={handleScroll}
            placeholder={"Start writing here...\n\nUse ## Section Title to create sections.\nType DOIs like 10.1038/... and click them in the reference bar above.\nPress Option (⌥) to search your citation library."}
            spellCheck
          />

          {/* Highlight overlay — mirrors textarea text with clickable DOI spans */}
          <div
            ref={overlayRef}
            className="editor-overlay"
            aria-hidden="true"
          >
            {renderHighlightedText(body, onDoiClick)}
          </div>
        </div>
      </div>
    </div>
  );
}
