import React, { useRef, useState } from 'react';
import { 
  FileText, 
  Columns, 
  BookOpen, 
  Sidebar, 
  Printer,
  FileJson,
  FolderOpen,
  FilePlus,
  Save,
  Feather,
  Search,
  CheckCheck,
  Download,
  ListOrdered,
  ChevronDown,
  SaveAll,
  ArrowLeftRight
} from 'lucide-react';

export default function Navbar({ 
  viewMode, 
  setViewMode, 
  isSidePanelOpen, 
  setIsSidePanelOpen,
  isLeftSidebarOpen,
  setIsLeftSidebarOpen,
  onNewFile,
  onSaveScisc,
  onSaveSciscAs,
  onSaveTxt,
  onSaveTxtAs,
  onOpenScisc,
  onExportPdf,
  onOpenZoteroModal,
  onOpenQuickSearch,
  onOpenReviewModal,
  onOpenRefResolver,
  onOpenDoiLookup
}) {
  const fileInputRef = useRef(null);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);

  return (
    <header className="app-header">
      {/* Left: Brand + Navigation */}
      <div className="brand-container">
        <button 
          className="btn btn-ghost btn-icon"
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          title="Toggle sidebar"
        >
          <Sidebar size={17} />
        </button>

        <div className="brand-icon">
          <Feather size={18} />
        </div>
        <span className="brand-title">SciScribe</span>
      </div>

      {/* Center: File actions + View mode */}
      <div className="tool-group">
        <button className="btn btn-ghost" onClick={onNewFile} title="New manuscript">
          <FilePlus size={15} /> New
        </button>
        <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} title="Open .scisc, .txt, or .json file">
          <FolderOpen size={15} /> Open
          <input ref={fileInputRef} type="file" accept=".scisc,.txt,.json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && onOpenScisc(e.target.files[0])} />
        </button>

        <button className="btn btn-primary" onClick={onSaveScisc} title="Quick save project as .scisc">
          <Save size={15} /> Save
        </button>

        {/* Save As dropdown */}
        <div className="save-dropdown-wrapper">
          <button 
            className="btn btn-secondary"
            onClick={() => setSaveMenuOpen(!saveMenuOpen)}
            title="Save As..."
          >
            <SaveAll size={14} /> Save As… <ChevronDown size={12} />
          </button>
          {saveMenuOpen && (
            <>
              <div className="save-dropdown-backdrop" onClick={() => setSaveMenuOpen(false)} />
              <div className="save-dropdown-menu">
                <button 
                  className="save-dropdown-item"
                  onClick={() => { onSaveSciscAs(); setSaveMenuOpen(false); }}
                >
                  <Save size={14} />
                  <div>
                    <span className="save-dropdown-item-title">Save As .scisc…</span>
                    <span className="save-dropdown-item-desc">Choose location for project file</span>
                  </div>
                </button>
                <button 
                  className="save-dropdown-item"
                  onClick={() => { onSaveTxtAs(); setSaveMenuOpen(false); }}
                >
                  <Download size={14} />
                  <div>
                    <span className="save-dropdown-item-title">Save As .txt…</span>
                    <span className="save-dropdown-item-desc">Choose location for clean text (no DOIs)</span>
                  </div>
                </button>
                <div className="save-dropdown-divider" />
                <button 
                  className="save-dropdown-item"
                  onClick={() => { onSaveScisc(); setSaveMenuOpen(false); }}
                >
                  <Save size={14} />
                  <div>
                    <span className="save-dropdown-item-title">Quick Save .scisc</span>
                    <span className="save-dropdown-item-desc">Download to default location</span>
                  </div>
                </button>
                <button 
                  className="save-dropdown-item"
                  onClick={() => { onSaveTxt(); setSaveMenuOpen(false); }}
                >
                  <Download size={14} />
                  <div>
                    <span className="save-dropdown-item-title">Quick Save .txt</span>
                    <span className="save-dropdown-item-desc">Download clean text to default location</span>
                  </div>
                </button>
                <div className="save-dropdown-divider" />
                <button 
                  className="save-dropdown-item"
                  onClick={() => { onExportPdf(); setSaveMenuOpen(false); }}
                >
                  <Printer size={14} />
                  <div>
                    <span className="save-dropdown-item-title">Export as PDF</span>
                    <span className="save-dropdown-item-desc">Print manuscript to PDF</span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="tool-divider" />

        <button className={`btn ${viewMode === 'editor' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('editor')}>
          <FileText size={14} /> Write
        </button>
        <button className={`btn ${viewMode === 'split' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('split')}>
          <Columns size={14} /> Split
        </button>
        <button className={`btn ${viewMode === 'preview' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('preview')}>
          Formatted
        </button>
      </div>

      {/* Right: Tools */}
      <div className="tool-group">
        <button className="btn btn-ghost" onClick={onOpenReviewModal} title="Review author mentions (Smith et al.) and auto-link DOIs">
          <CheckCheck size={15} /> Review Mentions
        </button>
        <button className="btn btn-ghost" onClick={onOpenRefResolver} title="Convert & resolve citations between Numbered [1] and Inline (Author et al. DOI)">
          <ArrowLeftRight size={15} /> Convert / Resolve Refs
        </button>
        <button className="btn btn-ghost" onClick={onOpenDoiLookup} title="Look up a DOI and insert a formatted citation">
          <BookOpen size={15} /> DOI Lookup
        </button>
        <button className="btn btn-ghost" onClick={onOpenQuickSearch} title="Search citations (⌥ Alt)">
          <Search size={15} />
        </button>
        <button className="btn btn-ghost" onClick={onOpenZoteroModal} title="Zotero library">
          <FileJson size={15} />
        </button>

        <div className="tool-divider" />

        <button 
          className={`btn ${isSidePanelOpen ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
        >
          <BookOpen size={15} /> Abstracts
        </button>
      </div>
    </header>
  );
}
