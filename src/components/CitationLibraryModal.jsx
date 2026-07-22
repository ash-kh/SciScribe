import React, { useState } from 'react';
import { X, Upload, Download, Plus, BookOpen, Trash2, Check, FileJson, AlertCircle } from 'lucide-react';
import { parseZoteroJson, exportToZoteroJson } from '../utils/zoteroParser';
import { fetchPaperAbstract } from '../services/paperFetcher';

export default function CitationLibraryModal({ 
  isOpen, onClose, citationDatabase, setCitationDatabase, onInspectPaper
}) {
  const [tab, setTab] = useState('library');
  const [doiInput, setDoiInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [doiError, setDoiError] = useState(null);
  const [doiOk, setDoiOk] = useState(false);
  const [importCount, setImportCount] = useState(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseZoteroJson(JSON.parse(ev.target.result));
        if (parsed.length) {
          setCitationDatabase(prev => {
            const existing = new Set(prev.map(p => p.doi?.toLowerCase()).filter(Boolean));
            return [...prev, ...parsed.filter(p => !p.doi || !existing.has(p.doi.toLowerCase()))];
          });
          setImportCount(parsed.length);
          setTimeout(() => setImportCount(null), 4000);
        }
      } catch { alert("Invalid JSON file."); }
    };
    reader.readAsText(file);
  };

  const handleAddDoi = async (e) => {
    e.preventDefault();
    if (!doiInput.trim()) return;
    setAdding(true); setDoiError(null); setDoiOk(false);
    try {
      const data = await fetchPaperAbstract(doiInput.trim());
      if (data) {
        const entry = {
          id: data.doi || data.arxivId || `cite-${Date.now()}`,
          doi: data.doi || '', title: data.title, authors: data.authors,
          journal: data.journal, year: data.year, abstract: data.abstract,
          url: data.url, source: data.source || 'DOI Lookup'
        };
        setCitationDatabase(prev => [entry, ...prev.filter(p => p.doi !== entry.doi)]);
        setDoiOk(true); setDoiInput('');
        setTimeout(() => setDoiOk(false), 3000);
      }
    } catch { setDoiError("Could not resolve. Check the DOI."); }
    finally { setAdding(false); }
  };

  const handleExport = () => {
    const blob = new Blob([exportToZoteroJson(citationDatabase)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'zotero_library.json';
    a.click();
  };

  return (
    <div 
      style={{ position: 'fixed', inset: 0, background: 'rgba(42,34,23,0.55)', backdropFilter: 'blur(4px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div 
        style={{ width: '100%', maxWidth: '680px', height: '75vh', maxHeight: '600px', background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-sidebar)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileJson size={20} style={{ color: 'var(--ink)' }} />
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Zotero Citation Library</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Import, manage, and export citations</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-sidebar)', flexWrap: 'wrap', gap: '0.4rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button className={`btn ${tab === 'library' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('library')} style={{ fontSize: '0.78rem' }}>
              <BookOpen size={13} /> Library ({citationDatabase.length})
            </button>
            <button className={`btn ${tab === 'import' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('import')} style={{ fontSize: '0.78rem' }}>
              <Upload size={13} /> Import
            </button>
            <button className={`btn ${tab === 'add' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('add')} style={{ fontSize: '0.78rem' }}>
              <Plus size={13} /> Add DOI
            </button>
          </div>
          <button className="btn btn-secondary" onClick={handleExport} style={{ fontSize: '0.78rem' }}>
            <Download size={13} /> Export JSON
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {tab === 'library' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {citationDatabase.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-faint)' }}>
                  No citations yet. Import a Zotero JSON or add DOIs.
                </div>
              ) : citationDatabase.map((p, i) => (
                <div key={p.id || i} style={{ background: 'var(--bg-paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{p.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-mid)' }}>{p.authors?.join(', ')} ({p.year || 'N/A'})</div>
                    {p.doi && (
                      <span className="doi-pill" style={{ fontSize: '0.7rem', marginTop: '0.3rem', display: 'inline-flex' }}
                        onClick={() => { onInspectPaper(p.doi); onClose(); }}>
                        {p.doi}
                      </span>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => setCitationDatabase(prev => prev.filter(x => x.id !== p.id))} style={{ color: 'var(--ink)', flexShrink: 0 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center', gap: '1rem' }}>
              <Upload size={36} style={{ color: 'var(--ink)', opacity: 0.6 }} />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>Import Zotero JSON</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', maxWidth: '400px' }}>
                  Select a <code>.json</code> file exported from Zotero (File → Export Library → CSL JSON).
                </p>
              </div>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> Choose File
                <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
              {importCount !== null && (
                <div style={{ color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Check size={16} /> Imported {importCount} citations
                </div>
              )}
            </div>
          )}

          {tab === 'add' && (
            <form onSubmit={handleAddDoi} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>Add by DOI or arXiv ID</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-mid)' }}>
                  Paste a DOI (e.g. <code>10.1038/s41586-021-03819-2</code>) or arXiv ID (e.g. <code>1706.03762</code>).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="search-input" placeholder="DOI or arXiv ID..." value={doiInput} onChange={e => setDoiInput(e.target.value)} style={{ flex: 1, paddingLeft: '0.75rem' }} />
                <button type="submit" className="btn btn-primary" disabled={adding}>
                  {adding ? 'Resolving...' : 'Fetch & Add'}
                </button>
              </div>
              {doiOk && <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.85rem' }}><Check size={14} /> Added to library</div>}
              {doiError && <div style={{ color: 'var(--ink)', fontSize: '0.85rem' }}><AlertCircle size={14} /> {doiError}</div>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
