import type { ReactNode } from "react";

interface MarkdownMessageProps {
  value: string;
  className?: string;
}

type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string };

const headingTags = {
  2: "h2",
  3: "h3",
  4: "h4",
} as const;

function blockKey(block: Block) {
  switch (block.type) {
    case "ul":
    case "ol":
      return `${block.type}:${block.items.join("|")}`;
    case "heading":
      return `heading:${block.level}:${block.text}`;
    case "paragraph":
    case "quote":
    case "code":
      return `${block.type}:${block.text}`;
  }
}

function uniqueKey(base: string, counts: Map<string, number>) {
  const count = counts.get(base) ?? 0;
  counts.set(base, count + 1);
  return count === 0 ? base : `${base}:${count}`;
}

function isSafeHref(href: string) {
  return /^(https?:\/\/|mailto:|\/|#)/i.test(href);
}

const emojiShortcodes: Record<string, string> = {
  alert: "\u{26A0}\u{FE0F}",
  bug: "\u{1F41B}",
  camera: "\u{1F4F7}",
  check: "\u{2705}",
  fire: "\u{1F525}",
  fix: "\u{1F6E0}\u{FE0F}",
  idea: "\u{1F4A1}",
  info: "\u{2139}\u{FE0F}",
  party: "\u{1F389}",
  sparkles: "\u{2728}",
  star: "\u{2B50}",
  tools: "\u{1F6E0}\u{FE0F}",
  warning: "\u{26A0}\u{FE0F}",
};

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buffer = "";
  let i = 0;
  let key = 0;

  const flush = () => {
    if (!buffer) return;
    nodes.push(buffer);
    buffer = "";
  };

  while (i < text.length) {
    if (text[i] === ":") {
      const match = /^:([a-z0-9_+-]+):/.exec(text.slice(i));
      const emoji = match ? emojiShortcodes[match[1]] : null;
      if (emoji) {
        flush();
        nodes.push(
          <span key={`emoji-${key++}`} className="mx-0.5 align-[-0.08em] text-[1.08em]" title={`:${match![1]}:`}>
            {emoji}
          </span>
        );
        i += match![0].length;
        continue;
      }
    }

    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        nodes.push(
          <code key={`code-${key++}`} className="border border-neutral-800 bg-black/30 px-1.5 py-0.5 text-[0.92em] text-neutral-100">
            {text.slice(i + 1, end)}
          </code>
        );
        i = end + 1;
        continue;
      }
    }

    const strongMarker = text.startsWith("**", i) ? "**" : text.startsWith("__", i) ? "__" : "";
    if (strongMarker) {
      const end = text.indexOf(strongMarker, i + 2);
      if (end !== -1) {
        flush();
        nodes.push(
          <strong key={`strong-${key++}`} className="font-semibold text-neutral-100">
            {parseInline(text.slice(i + 2, end))}
          </strong>
        );
        i = end + 2;
        continue;
      }
    }

    if (text[i] === "[") {
      const labelEnd = text.indexOf("]", i + 1);
      const urlStart = labelEnd !== -1 ? text.indexOf("(", labelEnd) : -1;
      const urlEnd = urlStart !== -1 ? text.indexOf(")", urlStart) : -1;
      if (labelEnd !== -1 && urlStart === labelEnd + 1 && urlEnd !== -1) {
        const label = text.slice(i + 1, labelEnd);
        const href = text.slice(urlStart + 1, urlEnd).trim();
        flush();
        if (isSafeHref(href)) {
          nodes.push(
            <a
              key={`link-${key++}`}
	              href={href}
	              target={href.startsWith("http") ? "_blank" : undefined}
	              rel="noreferrer"
              className="text-neutral-100 underline decoration-neutral-600 underline-offset-4 transition-colors hover:text-white"
            >
              {parseInline(label)}
            </a>
          );
        } else {
          nodes.push(parseInline(label));
        }
        i = urlEnd + 1;
        continue;
      }
    }

    const emphasisMarker = text[i] === "*" || text[i] === "_" ? text[i] : "";
    if (emphasisMarker && text[i + 1] !== emphasisMarker) {
      const end = text.indexOf(emphasisMarker, i + 1);
      if (end !== -1) {
        flush();
        nodes.push(
          <em key={`em-${key++}`} className="text-neutral-100">
            {parseInline(text.slice(i + 1, end))}
          </em>
        );
        i = end + 1;
        continue;
      }
    }

    if (text[i] === "\n") {
      flush();
      nodes.push(<br key={`br-${key++}`} />);
      i++;
      continue;
    }

    buffer += text[i];
    i++;
  }

  flush();
  return nodes.flat();
}

function parseBlocks(value: string): Block[] {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", text: codeLines.join("\n") });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      blocks.push({
        type: "heading",
        level: Math.min(heading[1].length + 1, 4) as 2 | 3 | 4,
        text: heading[2].trim(),
      });
      i++;
      continue;
    }

    if (/^>\s?/.test(line.trim())) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    if (/^[-*+]\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraphLines = [line.trim()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

export default function MarkdownMessage({ value, className = "" }: MarkdownMessageProps) {
  const blocks = parseBlocks(value);
  const blockKeyCounts = new Map<string, number>();

  return (
    <div
      className={`space-y-3 text-sm leading-6 text-neutral-300 ${className}`}
      style={{ fontFamily: "'Space Mono', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', monospace" }}
    >
      {blocks.map((block) => {
        const key = uniqueKey(blockKey(block), blockKeyCounts);
        if (block.type === "heading") {
          const Tag = headingTags[block.level];
          return (
            <Tag key={key} className="text-sm font-normal uppercase tracking-[0.16em] text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
              {parseInline(block.text)}
            </Tag>
          );
        }

        if (block.type === "ul" || block.type === "ol") {
          const Tag = block.type;
          const itemKeyCounts = new Map<string, number>();
          return (
            <Tag key={key} className="ml-5 space-y-1 marker:text-neutral-500">
              {block.items.map((item) => (
                <li key={uniqueKey(item, itemKeyCounts)} className={block.type === "ul" ? "list-disc" : "list-decimal"}>
                  {parseInline(item)}
                </li>
              ))}
            </Tag>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={key} className="border-l border-neutral-700 bg-white/[0.02] px-4 py-3 text-neutral-400">
              {parseInline(block.text)}
            </blockquote>
          );
        }

        if (block.type === "code") {
          return (
            <pre key={key} className="overflow-x-auto border border-neutral-800 bg-black/40 p-3 text-xs leading-5 text-neutral-200">
              <code>{block.text}</code>
            </pre>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={key}>
              {parseInline(block.text)}
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}
