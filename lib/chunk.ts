export type Chunk = {
  id: string;
  docId: string;
  pageStart: number;
  pageEnd: number;
  chunkIndex: number;
  text: string;
};

/**
 * Simple page-aware chunking.
 * - Joins page texts with page markers.
 * - Keeps track of page ranges per chunk.
 */
export function chunkPagesToRag(
  docId: string,
  pages: Array<{ pageNumber: number; text: string }>,
  targetChars = 2000,
  overlapChars = 300,
): Chunk[] {
  const results: Chunk[] = [];
  let buffer = "";
  let rangeStart = pages.length ? pages[0].pageNumber : 1;
  let rangeEnd = rangeStart;
  let chunkIndex = 0;

  const flush = () => {
    if (!buffer.trim()) return;
    const id = `${docId}-${rangeStart}-${rangeEnd}-${chunkIndex}`;
    results.push({ id, docId, pageStart: rangeStart, pageEnd: rangeEnd, chunkIndex, text: buffer.trim() });
    chunkIndex += 1;
  };

  for (let i = 0; i < pages.length; i++) {
    const { pageNumber, text } = pages[i];
    const pageBlock = `[p.${pageNumber}]\n${text}\n\n`;
    if ((buffer + pageBlock).length > targetChars) {
      // flush current as a chunk
      flush();
      // start new buffer with overlap from previous
      const start = Math.max(0, buffer.length - overlapChars);
      const overlap = buffer.slice(start);
      buffer = overlap + pageBlock;
      rangeStart = Math.max(rangeStart, rangeEnd);
      rangeEnd = pageNumber;
    } else {
      buffer += pageBlock;
      rangeEnd = pageNumber;
    }
  }

  flush();
  return results;
}


