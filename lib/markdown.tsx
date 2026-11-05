import type { ReactNode } from "react";

// A tiny, dependency-free Markdown renderer for blog articles. It supports the
// subset we author: headings (#/##/###), fenced code blocks, blockquotes,
// unordered/ordered lists, paragraphs, and inline **bold**, `code` and
// [links](url). Keeping it self-contained avoids adding a markdown dependency
// to the template.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    if (m[2] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${i}`}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-black/80 px-1.5 py-0.5 font-mono text-[0.85em] text-accent"
        >
          {m[3]}
        </code>,
      );
    } else if (m[4] !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-l${i}`}
          href={m[5]}
          className="text-accent underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          {m[4]}
        </a>,
      );
    }
    lastIndex = regex.lastIndex;
    i++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const isBlockStart = (s: string) =>
    /^(#{1,3}\s|[-*]\s|\d+\.\s|>|```)/.test(s.trim());

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push(
        <pre
          key={`pre-${key++}`}
          className="my-5 overflow-x-auto rounded-xl border border-line bg-black/90 p-4 text-sm"
        >
          <code className="font-mono text-ink-soft">{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Heading
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      const cls =
        level === 1
          ? "mt-10 text-3xl font-semibold"
          : level === 2
            ? "mt-8 text-2xl font-semibold"
            : "mt-6 text-xl font-semibold";
      const content = renderInline(text, `h${key}`);
      blocks.push(
        level === 1 ? (
          <h1 key={`h-${key++}`} className={cls}>
            {content}
          </h1>
        ) : level === 2 ? (
          <h2 key={`h-${key++}`} className={cls}>
            {content}
          </h2>
        ) : (
          <h3 key={`h-${key++}`} className={cls}>
            {content}
          </h3>
        ),
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className="my-4 border-l-2 border-accent pl-4 italic text-ink-soft"
        >
          {renderInline(quote.join(" "), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul
          key={`ul-${key++}`}
          className="my-4 list-disc space-y-1 pl-6 text-ink-soft"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ul${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol
          key={`ol-${key++}`}
          className="my-4 list-decimal space-y-1 pl-6 text-ink-soft"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ol${key}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isBlockStart(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p
        key={`p-${key++}`}
        className="my-4 leading-relaxed text-ink-soft"
      >
        {renderInline(para.join(" "), `p${key}`)}
      </p>,
    );
  }

  return <div className="blog-body">{blocks}</div>;
}
