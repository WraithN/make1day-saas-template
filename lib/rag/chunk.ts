// Dependency-free text splitter. Splits on paragraph then sentence boundaries,
// packs sentences up to a target size, and adds a small overlap so facts that
// straddle a boundary remain retrievable.

export interface ChunkOptions {
  /** Target characters per chunk. */
  target?: number;
  /** Characters carried over from the previous chunk. */
  overlap?: number;
}

export function chunkText(raw: string, options: ChunkOptions = {}): string[] {
  const target = options.target ?? 480;
  const overlap = options.overlap ?? 60;

  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const pieces: string[] = [];
  for (const paragraph of paragraphs) {
    // Require whitespace after the punctuation so "3.14" isn't split.
    const sentences = paragraph
      .split(/(?<=[。！？!?；;.])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let current = "";
    for (const sentence of sentences) {
      if (current && current.length + sentence.length + 1 > target) {
        pieces.push(current.trim());
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current.trim()) pieces.push(current.trim());
  }

  // Guard against a single very long run with no sentence breaks.
  const normalized: string[] = [];
  for (const piece of pieces) {
    if (piece.length <= target * 1.5) {
      normalized.push(piece);
      continue;
    }
    for (let i = 0; i < piece.length; i += target) {
      normalized.push(piece.slice(i, i + target));
    }
  }

  return normalized.map((piece, i) =>
    i === 0 ? piece : `${overlapTail(normalized[i - 1], overlap)} ${piece}`,
  );
}

/** Take the tail of the previous chunk without starting mid-sentence/word. */
function overlapTail(previous: string, size: number): string {
  const tail = previous.slice(-size);
  const boundary = tail.search(/[。！？!?；;.]\s/);
  if (boundary >= 0 && boundary + 2 < tail.length) {
    return tail.slice(boundary + 2).trim();
  }
  // No punctuation in the tail: for Latin text at least drop the partial word.
  const space = tail.indexOf(" ");
  return space > 0 ? tail.slice(space + 1).trim() : tail;
}
