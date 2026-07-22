/**
 * Utility for handling SciScribe (.scisc, .txt, .json) document files.
 */

export const SCISC_VERSION = "1.0";

/**
 * Creates and triggers download of a .scisc manuscript project file.
 */
export function saveSciscFile(manuscript, citationDatabase) {
  const sciscData = {
    fileType: "SciScribe Manuscript Document",
    version: SCISC_VERSION,
    savedAt: new Date().toISOString(),
    manuscript: manuscript,
    citationDatabase: citationDatabase || []
  };

  const jsonContent = JSON.stringify(sciscData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  
  const rawTitle = manuscript.title || 'Untitled Manuscript';
  const cleanTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'manuscript';
  const filename = `${cleanTitle}.scisc`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Saves manuscript as a clean plain text (.txt) file with DOIs, arXiv IDs, and web links stripped out.
 */
export function saveTxtFile(manuscript) {
  const rawTitle = manuscript.title || 'Untitled Manuscript';
  let textOutput = `${manuscript.title.toUpperCase()}\n`;
  if (manuscript.authors) {
    textOutput += `${manuscript.authors}\n`;
  }
  textOutput += `========================================\n\n`;

  manuscript.sections.forEach(sec => {
    let cleanContent = sec.content;
    
    // 1. Convert "(Smith et al. 10.1038/s41586-021-03819-2)" -> "(Smith et al.)"
    cleanContent = cleanContent.replace(/\(([^)]*?)\s+10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\)/g, '($1)');
    // 2. Convert "(Vaswani et al. 1706.03762)" or "(Vaswani et al. arXiv:1706.03762)" -> "(Vaswani et al.)"
    cleanContent = cleanContent.replace(/\(([^)]*?)\s+(?:arXiv:|1706\.|2\d{3}\.)[-._;()/:A-Za-z0-9]+\)/g, '($1)');
    // 3. Strip standalone DOIs or URLs
    cleanContent = cleanContent.replace(/\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/g, '');
    cleanContent = cleanContent.replace(/https?:\/\/\S+/g, '');
    cleanContent = cleanContent.replace(/ {2,}/g, ' ');

    textOutput += `${sec.title.toUpperCase()}\n${'-'.repeat(sec.title.length)}\n${cleanContent}\n\n`;
  });

  const cleanTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'manuscript';
  const filename = `${cleanTitle}.txt`;

  const blob = new Blob([textOutput], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Save As .scisc — opens native OS file dialog to choose save location.
 * Falls back to download if File System Access API is not supported.
 */
export async function saveSciscFileAs(manuscript, citationDatabase) {
  const sciscData = {
    fileType: "SciScribe Manuscript Document",
    version: SCISC_VERSION,
    savedAt: new Date().toISOString(),
    manuscript: manuscript,
    citationDatabase: citationDatabase || []
  };

  const jsonContent = JSON.stringify(sciscData, null, 2);
  const rawTitle = manuscript.title || 'Untitled Manuscript';
  const cleanTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'manuscript';

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${cleanTitle}.scisc`,
        types: [{
          description: 'SciScribe Project',
          accept: { 'application/json': ['.scisc'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(jsonContent);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled the dialog — do nothing
      if (err.name === 'AbortError') return;
      console.warn('Save As failed, falling back to download', err);
    }
  }

  // Fallback to regular download
  saveSciscFile(manuscript, citationDatabase);
}

/**
 * Save As .txt — opens native OS file dialog to choose save location.
 * Falls back to download if File System Access API is not supported.
 */
export async function saveTxtFileAs(manuscript) {
  const rawTitle = manuscript.title || 'Untitled Manuscript';
  const cleanTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'manuscript';

  const textOutput = buildCleanTxtContent(manuscript);

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${cleanTitle}.txt`,
        types: [{
          description: 'Plain Text',
          accept: { 'text/plain': ['.txt'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(textOutput);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('Save As failed, falling back to download', err);
    }
  }

  // Fallback to regular download
  saveTxtFile(manuscript);
}

/**
 * Build clean text content (shared by saveTxtFile and saveTxtFileAs).
 */
function buildCleanTxtContent(manuscript) {
  let textOutput = `${manuscript.title.toUpperCase()}\n`;
  if (manuscript.authors) {
    textOutput += `${manuscript.authors}\n`;
  }
  textOutput += `========================================\n\n`;

  manuscript.sections.forEach(sec => {
    let cleanContent = sec.content;
    cleanContent = cleanContent.replace(/\(([^)]*?)\s+10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\)/g, '($1)');
    cleanContent = cleanContent.replace(/\(([^)]*?)\s+(?:arXiv:|1706\.|2\d{3}\.)[-._;()/:A-Za-z0-9]+\)/g, '($1)');
    cleanContent = cleanContent.replace(/\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/g, '');
    cleanContent = cleanContent.replace(/https?:\/\/\S+/g, '');
    cleanContent = cleanContent.replace(/ {2,}/g, ' ');
    textOutput += `${sec.title.toUpperCase()}\n${'-'.repeat(sec.title.length)}\n${cleanContent}\n\n`;
  });

  return textOutput;
}

/**
 * Reads and parses .scisc, .json, or plain text (.txt) files.
 */
export function loadSciscFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const textContent = e.target.result;

      // Handle .txt or non-JSON plain text files
      if (file.name.endsWith('.txt') || !textContent.trim().startsWith('{')) {
        const lines = textContent.split('\n');
        const filenameTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        const firstLine = lines[0]?.trim() || '';
        
        let title = filenameTitle;
        let bodyLines = lines;

        if (firstLine && !firstLine.startsWith('#')) {
          title = firstLine;
          bodyLines = lines.slice(1);
        }

        const rawBody = bodyLines.join('\n').trim();

        const sectionRegex = /^## (.+)$/gm;
        let match;
        const matches = [];
        while ((match = sectionRegex.exec(rawBody)) !== null) {
          matches.push({ title: match[1], index: match.index, headerEnd: match.index + match[0].length });
        }

        let sections = [];
        if (matches.length > 0) {
          for (let i = 0; i < matches.length; i++) {
            const contentStart = matches[i].headerEnd;
            const contentEnd = i < matches.length - 1 ? matches[i + 1].index : rawBody.length;
            const secContent = rawBody.slice(contentStart, contentEnd).trim();
            sections.push({
              id: `sec-${i}-${Date.now()}`,
              title: matches[i].title,
              content: secContent
            });
          }
        } else {
          sections = [{
            id: 'sec-body',
            title: '1. Manuscript Text',
            content: rawBody
          }];
        }

        resolve({
          manuscript: {
            title: title,
            authors: "Author",
            sections: sections
          },
          citationDatabase: []
        });
        return;
      }

      try {
        const parsed = JSON.parse(textContent);
        if (parsed.manuscript && Array.isArray(parsed.manuscript.sections)) {
          resolve({
            manuscript: parsed.manuscript,
            citationDatabase: Array.isArray(parsed.citationDatabase) ? parsed.citationDatabase : []
          });
        } else if (parsed.sections && Array.isArray(parsed.sections)) {
          resolve({
            manuscript: parsed,
            citationDatabase: []
          });
        } else {
          reject(new Error("Invalid .scisc or JSON project file format."));
        }
      } catch (err) {
        reject(new Error("Failed to parse JSON file."));
      }
    };

    reader.onerror = () => reject(new Error("Error reading file"));
    reader.readAsText(file);
  });
}

/**
 * Generates a fresh, blank manuscript template.
 */
export function createNewManuscriptTemplate() {
  return {
    title: "Untitled Scientific Manuscript",
    authors: "Author Name & Institution",
    sections: [
      {
        id: "sec-abstract",
        title: "Abstract",
        content: "Write a summary of your research background, methodology, primary results, and conclusions here."
      },
      {
        id: "sec-intro",
        title: "1. Introduction",
        content: "Introduce the problem statement and review related scientific literature. (Press Option / Alt key to search citations)."
      },
      {
        id: "sec-methods",
        title: "2. Materials & Methods",
        content: "Describe experimental setup, mathematical models ($E = mc^2$), or computational methodology."
      },
      {
        id: "sec-results",
        title: "3. Results",
        content: "Present your key quantitative findings and experimental data."
      },
      {
        id: "sec-discussion",
        title: "4. Discussion",
        content: "Interpret results in the context of existing literature."
      },
      {
        id: "sec-references",
        title: "References",
        content: "[1] Reference list will automatically populate when adding citations."
      }
    ]
  };
}
