export const INITIAL_MANUSCRIPT = {
  title: "Neural Architectures for Automated Scientific Paper Synthesis and Citation Resolution",
  authors: "Dr. Elena Rostova, Prof. Marcus Vance, & The SciScribe Collaboration",
  abstract: "Automated retrieval and inline verification of scientific literature remain critical challenges in computational academia. Here we evaluate transformer-based citation resolution using real-time DOI lookup protocols. By integrating live REST endpoints with interactive manuscript rendering, we demonstrate a 42% reduction in reference resolution latency during technical paper drafting.",
  sections: [
    {
      id: "sec-abstract",
      title: "Abstract",
      content: "Automated retrieval and inline verification of scientific literature remain critical challenges in computational academia. Here we evaluate transformer-based citation resolution using real-time DOI lookup protocols. By integrating live REST endpoints with interactive manuscript rendering, we demonstrate a 42% reduction in reference resolution latency during technical paper drafting."
    },
    {
      id: "sec-intro",
      title: "1. Introduction",
      content: "Scientific manuscript drafting requires continuous cross-referencing between experimental text, mathematical formulations, and foundational prior work. Recent advances in deep neural representations have transformed how researchers analyze biological structure prediction (10.1038/s41586-021-03819-2) and natural language modeling (1706.03762).\n\nHistorically, structural molecular biology relied on seminal physical models proposed by Watson & Crick (10.1126/science.169.3946.635). Modern deep learning approaches (10.1038/nature14539) now allow high-dimensional feature embeddings to predict macromolecular dynamics directly from primary sequence data."
    },
    {
      id: "sec-methods",
      title: "2. Methods & Mathematical Formulation",
      content: "Our system models citation matching as a vector similarity query over an embedding space defined by $f(x) = \\sigma(W_2 \\cdot \\text{ReLU}(W_1 x + b_1) + b_2)$. Given a DOI string $D \\in \\mathcal{D}$, the lookup resolution latency $L(D)$ satisfies:\n\n$$L(D) = \\min_{k \\in \\text{APIs}} \\left\\{ t_{\\text{fetch}}(k, D) + t_{\\text{parse}}(D) \\right\\}$$\n\nFor genome editing protocols (10.1126/science.1225829), CRISPR-Cas9 sequence alignments are parsed via Europe PMC REST endpoints and normalized into BibTeX citation records."
    },
    {
      id: "sec-results",
      title: "3. Results & Discussion",
      content: "When testing automatic abstract retrieval across 500 benchmark DOIs, the integrated side panel achieved 99.4% accuracy for CrossRef, PubMed, and arXiv preprints. Clicking any embedded DOI pill (e.g. 10.1038/s41586-021-03819-2 or 1706.03762) dynamically brings up author affiliations, full abstract metadata, and instant inline citation insertion."
    },
    {
      id: "sec-references",
      title: "References",
      content: "[1] Jumper, J., et al. (2021). Highly accurate protein structure prediction with AlphaFold. Nature, 596, 583–589. DOI: 10.1038/s41586-021-03819-2\n[2] Vaswani, A., et al. (2017). Attention Is All You Need. NeurIPS. arXiv: 1706.03762\n[3] LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521, 436–444. DOI: 10.1038/nature14539\n[4] Jinek, M., et al. (2012). A Programmable Dual-RNA-Guided DNA Endonuclease in Adaptive Bacterial Immunity. Science, 337, 816–821. DOI: 10.1126/science.1225829"
    }
  ]
};
