/**
 * Utility to extract DOIs, arXiv IDs, and PubMed IDs from plain text or URLs.
 */

// Matches DOIs like 10.1038/s41586-021-03819-2 or 10.1126/science.169.3946.635
export const DOI_REGEX = /\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/g;

// Matches arXiv IDs like arXiv:2104.12345 or arXiv:hep-th/9901001
export const ARXIV_REGEX = /\b(?:arXiv:\s*|arxiv\.org\/abs\/)(\d{4}\.\d{4,5}(?:v\d+)?|[a-z\-]+(?:\.[A-Z]{2})?\/\d{7})\b/gi;

// Matches PubMed IDs like PMID: 32000000 or pubmed.ncbi.nlm.nih.gov/32000000
export const PUBMED_REGEX = /\b(?:PMID:\s*|pubmed\.ncbi\.nlm\.nih\.gov\/)(\d{7,9})\b/gi;

/**
 * Universal normalization for ALL Unicode diacritics, accents, ligatures, and orthography.
 * Strips accents from: Å, ä, ê, ø, ñ, ć, š, ž, ī, ō, ū, ă, ę, ğ, ő, ű, etc.
 */
export function normalizeForSearch(str) {
  if (!str) return '';
  return str
    // 1. Ligatures and special characters
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .replace(/ß/g, 'ss')
    .replace(/[ðÐ]/g, 'd')
    .replace(/[þÞ]/g, 'th')
    .replace(/[łŁ]/g, 'l')
    .replace(/[đĐ]/g, 'd')
    .replace(/[øØ]/g, 'o')
    // 2. Unicode Compatibility Decomposition (NFKD)
    .normalize('NFKD')
    // 3. Strip ALL combining diacritical marks
    .replace(/[\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g, '')
    .toLowerCase()
    // 4. Keep alphanumeric and spaces
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Extracts all valid academic identifiers from a given text.
 */
export function extractPaperIdentifiers(text) {
  if (!text) return [];

  const results = [];

  // Match DOIs
  let match;
  const doiRegex = new RegExp(DOI_REGEX.source, 'gi');
  while ((match = doiRegex.exec(text)) !== null) {
    let doi = match[1].replace(/[.,;)]+$/, '');
    if (!results.some(r => r.id === doi)) {
      results.push({ type: 'doi', id: doi, original: match[0] });
    }
  }

  // Match arXiv
  const arxivRegex = new RegExp(ARXIV_REGEX.source, 'gi');
  while ((match = arxivRegex.exec(text)) !== null) {
    const arxivId = match[1];
    if (!results.some(r => r.id === arxivId)) {
      results.push({ type: 'arxiv', id: arxivId, original: match[0] });
    }
  }

  // Match PubMed
  const pubmedRegex = new RegExp(PUBMED_REGEX.source, 'gi');
  while ((match = pubmedRegex.exec(text)) !== null) {
    const pmid = match[1];
    if (!results.some(r => r.id === pmid)) {
      results.push({ type: 'pubmed', id: pmid, original: match[0] });
    }
  }

  return results;
}

/**
 * Normalizes any query input (DOI string, URL, arXiv link, PMID) to a standard paper query object.
 */
export function normalizeQuery(query) {
  if (!query) return null;
  const clean = query.trim();

  // Check if full DOI link
  if (clean.includes('doi.org/')) {
    const parts = clean.split('doi.org/');
    return { type: 'doi', value: parts[1].replace(/[.,;)]+$/, '') };
  }

  // Check if direct DOI (starts with 10.)
  if (/^10\.\d{4,9}\//.test(clean)) {
    return { type: 'doi', value: clean.replace(/[.,;)]+$/, '') };
  }

  // Check if arXiv link or format
  if (/arxiv/i.test(clean)) {
    const match = clean.match(/(\d{4}\.\d{4,5}(?:v\d+)?|[a-z\-]+\/\d{7})/i);
    if (match) return { type: 'arxiv', value: match[1] };
  }

  // Check if PubMed PMID
  if (/pubmed|pmid/i.test(clean) || /^\d{7,9}$/.test(clean)) {
    const match = clean.match(/\d{7,9}/);
    if (match) return { type: 'pubmed', value: match[0] };
  }

  return { type: 'search', value: clean };
}
