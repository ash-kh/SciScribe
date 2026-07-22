/**
 * Reference Parser Utility
 * 
 * Parses numbered citations like [1], [2,3], [1-5] in body text and resolves
 * them against a References/Bibliography section at the end of the manuscript,
 * and vice-versa (Inline parenthetical citations -> Numbered [1], [2]).
 */

import { DOI_REGEX, ARXIV_REGEX } from './doiDetector';

/**
 * Find the References / Bibliography section content from manuscript sections.
 * Returns the raw text content of that section, or null.
 */
export function findReferenceSection(sections) {
  if (!sections || !sections.length) return null;

  const refSection = sections.find(s => 
    /^(references|bibliography|works cited|cited literature|literature cited)/i.test(s.title.trim())
  );

  return refSection ? refSection.content : null;
}

/**
 * Parse numbered reference entries from a references section.
 * Supports formats like:
 *   [1] Author (Year). Title. Journal. DOI: 10.xxxx/yyyy
 *   1. Author (Year). Title. https://doi.org/10.xxxx/yyyy
 *   [Ref] Author (Year). Title. Journal. DOI: 10.xxxx/yyyy
 * 
 * Returns a Map: refNumber (int) -> { number, text, doi, arxivId }
 */
export function parseReferenceEntries(refText) {
  if (!refText) return new Map();

  const entries = new Map();

  // Split into lines/entries
  const lines = refText.split('\n').filter(l => l.trim());

  // Strategy 1: numbered entries like [1], [2], 1., 2., (1), (2)
  const numberedPattern = /^(?:\[(\d+)\]|(\d+)\.|(\d+)\)|\((\d+)\))\s+(.+)/;

  for (const line of lines) {
    const match = line.trim().match(numberedPattern);
    if (match) {
      const num = parseInt(match[1] || match[2] || match[3] || match[4], 10);
      const text = match[5];
      const doi = extractFirstDoi(text);
      const arxivId = extractFirstArxiv(text);

      entries.set(num, {
        number: num,
        text: text.trim(),
        doi: doi,
        arxivId: arxivId
      });
    }
  }

  // If no numbered entries found, try sequential (each non-empty line is a ref)
  if (entries.size === 0) {
    let refNum = 1;
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip headers like "References" or separator lines
      if (!trimmed || /^[-=_*]{3,}$/.test(trimmed) || /^(references|bibliography)/i.test(trimmed)) {
        continue;
      }
      // Skip [Ref] format entries — handle them separately
      const refTagMatch = trimmed.match(/^\[Ref\]\s+(.+)/i);
      const text = refTagMatch ? refTagMatch[1] : trimmed;
      const doi = extractFirstDoi(text);
      const arxivId = extractFirstArxiv(text);

      entries.set(refNum, {
        number: refNum,
        text: text,
        doi: doi,
        arxivId: arxivId
      });
      refNum++;
    }
  }

  return entries;
}

/**
 * Find all numbered citation markers in body text.
 * Matches: [1], [2], [1,2], [1, 3], [1-5], [1–5], [1,3-5], [1, 2, 4-6]
 * 
 * Returns array of { match, index, numbers[] }
 */
export function findNumberedCitations(text) {
  if (!text) return [];

  const citationPattern = /\[(\d+(?:\s*[,\-–]\s*\d+)*)\]/g;
  const results = [];
  let match;

  while ((match = citationPattern.exec(text)) !== null) {
    const inner = match[1];
    const numbers = expandCitationNumbers(inner);

    results.push({
      match: match[0],       // full match e.g. "[1,3-5]"
      index: match.index,     // position in text
      numbers: numbers         // expanded array e.g. [1, 3, 4, 5]
    });
  }

  return results;
}

/**
 * Expand a citation number string like "1,3-5" into [1, 3, 4, 5]
 */
function expandCitationNumbers(str) {
  const parts = str.split(/\s*,\s*/);
  const numbers = [];

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) {
        numbers.push(i);
      }
    } else {
      const n = parseInt(part.trim(), 10);
      if (!isNaN(n)) numbers.push(n);
    }
  }

  return [...new Set(numbers)].sort((a, b) => a - b);
}

/**
 * Given the manuscript sections, find numbered citations in the body and
 * resolve them against the reference section.
 */
export function resolveAllNumberedCitations(sections) {
  const refText = findReferenceSection(sections);
  const refMap = parseReferenceEntries(refText);

  if (refMap.size === 0) return { citations: [], refMap };

  const citations = [];

  for (const section of sections) {
    if (/^(references|bibliography|works cited)/i.test(section.title.trim())) continue;

    const found = findNumberedCitations(section.content);
    for (const cite of found) {
      const resolved = cite.numbers
        .map(num => {
          const entry = refMap.get(num);
          return entry ? { number: num, refEntry: entry } : null;
        })
        .filter(Boolean);

      if (resolved.length > 0) {
        citations.push({
          ...cite,
          sectionId: section.id,
          sectionTitle: section.title,
          resolved
        });
      }
    }
  }

  return { citations, refMap };
}

/**
 * Find inline parenthetical citations in text that contain DOIs, arXiv IDs, or author strings.
 * e.g. "(Jumper et al. 10.1038/s41586-021-03819-2)" or "(Vaswani et al. 1706.03762)"
 */
export function findInlineParentheticalCitations(sections) {
  const results = [];

  for (const section of sections) {
    if (/^(references|bibliography|works cited)/i.test(section.title.trim())) continue;

    const regex = /\(([^)\n]*?(?:10\.\d{4,9}\/|arXiv:\s*|1706\.|2\d{3}\.)[^)\n]*?)\)/gi;
    let match;
    while ((match = regex.exec(section.content)) !== null) {
      const fullMatch = match[0];
      const innerText = match[1];

      const doiMatch = innerText.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/i);
      const arxivMatch = innerText.match(/(?:arXiv:\s*|1706\.|2\d{3}\.)(\d{4}\.\d{4,5}(?:v\d+)?)/i);

      const identifier = doiMatch ? doiMatch[0].replace(/[.,;)]+$/, '') : (arxivMatch ? arxivMatch[1] : null);

      if (identifier) {
        results.push({
          match: fullMatch,
          innerText: innerText,
          identifier: identifier,
          sectionId: section.id,
          sectionTitle: section.title,
          index: match.index
        });
      }
    }
  }

  return results;
}

/**
 * Converts all inline parenthetical citations (Smith et al. DOI) to numbered citations [1], [2]
 * and generates/updates the References section.
 */
export function convertInlineToNumberedAll(sections, citationDatabase = []) {
  const inlineCites = findInlineParentheticalCitations(sections);
  if (inlineCites.length === 0) return { sections, count: 0 };

  const idToNumber = new Map();
  const refList = [];
  let nextNum = 1;

  for (const cite of inlineCites) {
    const id = cite.identifier;
    if (!idToNumber.has(id)) {
      idToNumber.set(id, nextNum);

      const dbEntry = citationDatabase.find(p => p.doi === id || p.id === id || p.arxivId === id);
      
      let refLine = '';
      if (dbEntry) {
        const authors = dbEntry.authors?.join(', ') || 'Author et al.';
        refLine = `[${nextNum}] ${authors} (${dbEntry.year || '2024'}). ${dbEntry.title}. ${dbEntry.journal || ''}. DOI: ${id}`;
      } else {
        refLine = `[${nextNum}] ${cite.innerText.trim()} (DOI: ${id})`;
      }

      refList.push(refLine);
      nextNum++;
    }
  }

  const newSections = sections.map(sec => {
    if (/^(references|bibliography|works cited)/i.test(sec.title.trim())) return sec;

    let newContent = sec.content;
    for (const cite of inlineCites) {
      if (cite.sectionId === sec.id) {
        const num = idToNumber.get(cite.identifier);
        if (num) {
          newContent = newContent.replace(cite.match, `[${num}]`);
        }
      }
    }
    return { ...sec, content: newContent };
  });

  const refContent = refList.join('\n');
  const refIdx = newSections.findIndex(s => /^(references|bibliography|works cited)/i.test(s.title.trim()));

  if (refIdx >= 0) {
    newSections[refIdx] = { ...newSections[refIdx], content: refContent };
  } else {
    newSections.push({
      id: 'sec-references',
      title: 'References',
      content: refContent
    });
  }

  return { sections: newSections, count: inlineCites.length };
}

/**
 * Extract the first DOI found in a text string.
 */
function extractFirstDoi(text) {
  const regex = new RegExp(DOI_REGEX.source, 'i');
  const match = text.match(regex);
  return match ? match[1].replace(/[.,;)]+$/, '') : null;
}

/**
 * Extract the first arXiv ID found in a text string.
 */
function extractFirstArxiv(text) {
  const regex = new RegExp(ARXIV_REGEX.source, 'i');
  const match = text.match(regex);
  return match ? match[1] : null;
}
