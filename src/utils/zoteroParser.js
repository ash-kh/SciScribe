/**
 * Zotero JSON / CSL-JSON (Citation Style Language JSON) Converter
 */

/**
 * Normalizes an array of raw Zotero / CSL-JSON items into standard SciScribe paper objects.
 */
export function parseZoteroJson(jsonArray) {
  if (!Array.isArray(jsonArray)) return [];

  return jsonArray.map((item, index) => {
    // Extract authors array [{given, family}] or string
    let authorsArr = [];
    if (Array.isArray(item.author)) {
      authorsArr = item.author.map(a => {
        if (typeof a === 'string') return a;
        if (a.name) return a.name;
        return `${a.given || ''} ${a.family || ''}`.trim();
      });
    } else if (item.creators && Array.isArray(item.creators)) {
      authorsArr = item.creators.map(c => `${c.firstName || ''} ${c.lastName || ''}`.trim());
    } else {
      authorsArr = ["Author N/A"];
    }

    // Extract year
    let year = "";
    if (item.issued && item.issued['date-parts'] && item.issued['date-parts'][0]) {
      year = item.issued['date-parts'][0][0].toString();
    } else if (item.date) {
      const match = item.date.match(/\d{4}/);
      if (match) year = match[0];
    } else if (item.publicationDate) {
      const match = item.publicationDate.match(/\d{4}/);
      if (match) year = match[0];
    }

    const title = item.title || "Untitled Document";
    const journal = item['container-title'] || item.publicationTitle || item.journalAbbreviation || "Journal";
    const doi = item.DOI || item.doi || "";
    const abstract = item.abstract || item.abstractNote || "No abstract available.";
    const key = item.id || item.citationKey || item.key || `cite-${index + 1}`;

    return {
      id: key,
      doi: doi,
      title: title,
      authors: authorsArr,
      journal: journal,
      year: year,
      abstract: abstract,
      url: item.URL || (doi ? `https://doi.org/${doi}` : ''),
      source: 'Zotero Library'
    };
  });
}

/**
 * Converts SciScribe paper citation objects into official Zotero / CSL-JSON format.
 */
export function exportToZoteroJson(papers) {
  const cslItems = papers.map((p, idx) => {
    // Format authors into CSL JSON [{family, given}]
    const cslAuthors = (p.authors || []).map(authorStr => {
      const parts = authorStr.trim().split(' ');
      if (parts.length === 1) return { family: parts[0], given: "" };
      const family = parts.pop();
      const given = parts.join(' ');
      return { family, given };
    });

    const firstAuthor = cslAuthors[0]?.family?.toLowerCase() || 'ref';
    const citeKey = `${firstAuthor}${p.year || '2024'}${idx + 1}`;

    return {
      id: citeKey,
      type: 'article-journal',
      title: p.title || 'Untitled Paper',
      author: cslAuthors,
      'container-title': p.journal || 'Journal',
      issued: p.year ? { 'date-parts': [[parseInt(p.year, 10)]] } : undefined,
      DOI: p.doi || undefined,
      abstract: p.abstract || undefined,
      URL: p.url || (p.doi ? `https://doi.org/${p.doi}` : undefined)
    };
  });

  return JSON.stringify(cslItems, null, 2);
}
