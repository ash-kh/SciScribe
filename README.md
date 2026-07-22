# 📜 SciScribe

> **A distraction-free, typewriter-themed manuscript editor for scientific writing with automatic DOI auto-linking, PubMed/arXiv abstract inspection, and Zotero integration.**

---

## 🌟 Overview

**SciScribe** is a specialized writing studio designed for researchers, academics, and scientific authors. Built around a focused vintage typewriter aesthetic, SciScribe combines distraction-free continuous writing with powerful academic reference tools.

![SciScribe Interface](src/assets/hero.png)

---

## ✨ Key Features

- **📜 Continuous Typewriter Writing**: Single continuous paper sheet layout with automatic section detection using `## Section Title` headers.
- **🔗 Interactive Inline DOI Links**: Click any DOI (`10.1038/...`) or arXiv ID directly in your text overlay to open the live Abstract Inspector panel.
- **🔍 Abstract Inspector**: Real-time paper metadata, full abstract retrieval, BibTeX generation, and journal details powered by PubMed, arXiv, and CrossRef APIs.
- **🔢 Numbered Citation Resolver**: Automatically parses `[1]`, `[2,3]`, `[1-5]` in your manuscript and maps them to DOIs in your References section with one-click resolution to `(Author et al. DOI)`.
- **👥 Author Mention Reviewer**: Scans manuscript for textual mentions (e.g. *"Smith et al."*) and matches them against your reference database.
- **⚡ Alt / Option Quick Search**: Instant citation search popup anywhere in the document.
- **📚 Zotero Library Integration**: Import, manage, and search your reference library directly inside the app.
- **💾 Flexible Save & Export Options**:
  - **Native macOS App**: Double-clickable `SciScribe.app` bundle and Terminal launchers.
  - **`.scisc` Project Format**: Save full manuscript structure and reference library.
  - **Clean `.txt` Export**: Export manuscript with DOIs and web links cleanly stripped out.
  - **Save As…**: Choose exact file locations via native OS save dialogs.
  - **PDF Export**: Print-optimized manuscript styling.

---

## 🚀 Getting Started

### macOS & Windows Launchers
SciScribe includes double-clickable launchers for both macOS and Windows in the project root:

- **macOS**:
  - **`SciScribe.app`**: Native macOS application bundle. Double-click to launch the server and open SciScribe in your default web browser.
  - **`Open SciScribe.command`**: Terminal launcher script.
  - **`Stop SciScribe.command`**: Stop background server.

- **Windows**:
  - **`SciScribe.exe`**: Native Windows executable launcher. Double-click to run silently without console windows.
  - **`SciScribe.vbs`**: Silent VBScript launcher.
  - **`Open-SciScribe.bat`**: Command prompt launcher with live logs.
  - **`Stop-SciScribe.bat`**: Stop background server on Windows.

### Running via Terminal / CLI

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173`.

3. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🛠️ Technology Stack

- **Framework**: React 19 + Vite
- **Styling**: Custom Typewriter Design System (Vanilla CSS)
- **Math Formatting**: KaTeX (`$E = mc^2$`)
- **Icons**: Lucide React
- **Academic APIs**: Europe PMC / PubMed, arXiv, CrossRef

---

## 📄 License

MIT License. Free to use for academic, scientific, and personal writing.
