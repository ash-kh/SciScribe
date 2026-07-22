import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Outline from './components/Outline';
import Editor from './components/Editor';
import ManuscriptPreview from './components/ManuscriptPreview';
import SidePanel from './components/SidePanel';
import QuickSearchPopup from './components/QuickSearchPopup';
import CitationLibraryModal from './components/CitationLibraryModal';
import MentionReviewModal from './components/MentionReviewModal';
import ReferenceResolverModal from './components/ReferenceResolverModal';

import { INITIAL_MANUSCRIPT } from './data/sampleManuscript';
import { extractPaperIdentifiers } from './utils/doiDetector';
import { saveSciscFile, saveTxtFile, saveSciscFileAs, saveTxtFileAs, loadSciscFile, createNewManuscriptTemplate } from './utils/sciscFile';

const INITIAL_CITATIONS = [
  {
    id: "10.1038/s41586-021-03819-2",
    doi: "10.1038/s41586-021-03819-2",
    title: "Highly accurate protein structure prediction with AlphaFold",
    authors: ["John Jumper", "Richard Evans", "Alexander Pritzel", "Demis Hassabis"],
    journal: "Nature", year: "2021",
    abstract: "AlphaFold produces high accuracy 3D atomic structures of proteins directly from amino acid sequence data.",
    source: "Zotero / Nature"
  },
  {
    id: "1706.03762",
    doi: "10.48550/arXiv.1706.03762",
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit", "Aidan Gomez"],
    journal: "NeurIPS (arXiv:1706.03762)", year: "2017",
    abstract: "The Transformer architecture dispensing with recurrence and convolutions based entirely on self-attention.",
    source: "arXiv"
  },
  {
    id: "10.1038/nature14539",
    doi: "10.1038/nature14539",
    title: "Deep learning",
    authors: ["Yann LeCun", "Yoshua Bengio", "Geoffrey Hinton"],
    journal: "Nature", year: "2015",
    abstract: "Deep learning allows computational models composed of multiple processing layers to learn representations of data.",
    source: "Nature"
  },
  {
    id: "10.1126/science.1225829",
    doi: "10.1126/science.1225829",
    title: "A Programmable Dual-RNA-Guided DNA Endonuclease in Adaptive Bacterial Immunity",
    authors: ["Martin Jinek", "Jennifer A. Doudna", "Emmanuelle Charpentier"],
    journal: "Science", year: "2012",
    abstract: "Cas9 endonuclease uses dual-RNA guidance for site-specific DNA cleavage in bacterial immunity.",
    source: "Science"
  }
];

export default function App() {
  const [viewMode, setViewMode] = useState('editor');
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  
  const [manuscript, setManuscript] = useState(() => {
    const saved = localStorage.getItem('sciscribe_manuscript');
    return saved ? JSON.parse(saved) : INITIAL_MANUSCRIPT;
  });

  const [citationDatabase, setCitationDatabase] = useState(() => {
    const saved = localStorage.getItem('sciscribe_zotero_library');
    return saved ? JSON.parse(saved) : INITIAL_CITATIONS;
  });

  const [selectedDoi, setSelectedDoi] = useState(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [quickSearchInitialQuery, setQuickSearchInitialQuery] = useState('');
  const [isZoteroModalOpen, setIsZoteroModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRefResolverOpen, setIsRefResolverOpen] = useState(false);
  
  const [insertedCitation, setInsertedCitation] = useState(null);

  // Enforce typewriter theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'typewriter');
  }, []);

  // Auto-save
  useEffect(() => {
    localStorage.setItem('sciscribe_manuscript', JSON.stringify(manuscript));
  }, [manuscript]);

  useEffect(() => {
    localStorage.setItem('sciscribe_zotero_library', JSON.stringify(citationDatabase));
  }, [citationDatabase]);

  // Global Alt key listener
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Alt' && !isQuickSearchOpen && !isZoteroModalOpen && !isReviewModalOpen) {
        let selected = '';
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
          const start = activeEl.selectionStart;
          const end = activeEl.selectionEnd;
          if (start !== end) {
            selected = activeEl.value.substring(start, end).trim();
          }
        } else {
          selected = (window.getSelection()?.toString() || '').trim();
        }
        setQuickSearchInitialQuery(selected);
        setIsQuickSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isQuickSearchOpen, isZoteroModalOpen, isReviewModalOpen]);

  // Text stats
  const fullText = manuscript.sections.map(s => s.content).join(' ');
  const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
  const charCount = fullText.length;
  const detectedPapers = extractPaperIdentifiers(fullText);

  const handleDoiClick = (doiId) => {
    setSelectedDoi(doiId);
    setIsSidePanelOpen(true);
  };

  const handleInsertCitation = (citationText) => {
    setInsertedCitation(citationText);
  };

  const handleAddPaperToDatabase = (newPaper) => {
    setCitationDatabase(prev => [newPaper, ...prev.filter(p => p.id !== newPaper.id)]);
  };

  const handleAddToReferenceSection = (refLine) => {
    setManuscript(prev => {
      const refIdx = prev.sections.findIndex(s => s.title.toLowerCase().includes('reference'));
      if (refIdx >= 0) {
        const sections = [...prev.sections];
        sections[refIdx] = { ...sections[refIdx], content: sections[refIdx].content + '\n' + refLine };
        return { ...prev, sections };
      }
      return { ...prev, sections: [...prev.sections, { id: 'sec-references', title: 'References', content: refLine }] };
    });
  };

  const handleNewFile = () => {
    if (window.confirm("Start a new manuscript? Unsaved changes will be lost.")) {
      setManuscript(createNewManuscriptTemplate());
    }
  };

  const handleOpenScisc = async (file) => {
    try {
      const { manuscript: loaded, citationDatabase: cites } = await loadSciscFile(file);
      setManuscript(loaded);
      if (cites?.length) {
        setCitationDatabase(prev => {
          const existing = new Set(prev.map(p => p.doi?.toLowerCase()).filter(Boolean));
          return [...prev, ...cites.filter(p => !p.doi || !existing.has(p.doi.toLowerCase()))];
        });
      }
    } catch (err) {
      alert(`Could not open file: ${err.message}`);
    }
  };

  return (
    <div id="root">
      <Navbar 
        viewMode={viewMode}
        setViewMode={setViewMode}
        isSidePanelOpen={isSidePanelOpen}
        setIsSidePanelOpen={setIsSidePanelOpen}
        isLeftSidebarOpen={isLeftSidebarOpen}
        setIsLeftSidebarOpen={setIsLeftSidebarOpen}
        onNewFile={handleNewFile}
        onSaveScisc={() => saveSciscFile(manuscript, citationDatabase)}
        onSaveSciscAs={() => saveSciscFileAs(manuscript, citationDatabase)}
        onSaveTxt={() => saveTxtFile(manuscript)}
        onSaveTxtAs={() => saveTxtFileAs(manuscript)}
        onOpenScisc={handleOpenScisc}
        onExportPdf={() => window.print()}
        onOpenZoteroModal={() => setIsZoteroModalOpen(true)}
        onOpenQuickSearch={() => { setQuickSearchInitialQuery(''); setIsQuickSearchOpen(true); }}
        onOpenReviewModal={() => setIsReviewModalOpen(true)}
        onOpenRefResolver={() => setIsRefResolverOpen(true)}
      />

      <div className="app-body">
        {isLeftSidebarOpen && (
          <Outline 
            sections={manuscript.sections}
            detectedPapers={detectedPapers}
            onPaperClick={handleDoiClick}
            stats={{ wordCount, charCount }}
          />
        )}

        <main className="workspace-area">
          <div className="workspace-content">
            {(viewMode === 'editor' || viewMode === 'split') && (
              <Editor 
                manuscript={manuscript}
                setManuscript={setManuscript}
                onDoiClick={handleDoiClick}
                onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
                insertedCitation={insertedCitation}
                clearInsertedCitation={() => setInsertedCitation(null)}
              />
            )}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <ManuscriptPreview manuscript={manuscript} onDoiClick={handleDoiClick} />
            )}
          </div>
        </main>

        <SidePanel 
          isOpen={isSidePanelOpen}
          onClose={() => setIsSidePanelOpen(false)}
          selectedDoi={selectedDoi}
          onInsertCitation={handleInsertCitation}
          onAddToReferenceSection={handleAddToReferenceSection}
        />
      </div>

      <QuickSearchPopup 
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        citationDatabase={citationDatabase}
        onSelectCitation={handleInsertCitation}
        initialQuery={quickSearchInitialQuery}
        onAddPaperToDatabase={handleAddPaperToDatabase}
      />

      <CitationLibraryModal 
        isOpen={isZoteroModalOpen}
        onClose={() => setIsZoteroModalOpen(false)}
        citationDatabase={citationDatabase}
        setCitationDatabase={setCitationDatabase}
        onInspectPaper={handleDoiClick}
      />

      <MentionReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        manuscript={manuscript}
        setManuscript={setManuscript}
        citationDatabase={citationDatabase}
      />

      <ReferenceResolverModal 
        isOpen={isRefResolverOpen}
        onClose={() => setIsRefResolverOpen(false)}
        manuscript={manuscript}
        setManuscript={setManuscript}
        citationDatabase={citationDatabase}
      />

      <footer className="app-statusbar">
        <div className="status-item">
          <span className="dot-online" />
          <span>SciScribe</span>
        </div>
        <div className="status-item">
          <span>{wordCount} words · {detectedPapers.length} refs</span>
          <span style={{ opacity: 0.4, margin: '0 0.5rem' }}>·</span>
          <span style={{ color: 'var(--accent-primary)' }}>⌥ Alt = Citation Search</span>
        </div>
      </footer>
    </div>
  );
}
