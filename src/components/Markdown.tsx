import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { openExternal } from "../lib/open";

// Renders markdown with links that open in the system browser. GFM enables
// autolinks (raw URLs), task lists, tables, and strikethrough.
export function Markdown({ source }: { source: string }) {
  return (
    <div className="md text-sm leading-relaxed text-[var(--fg)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }: ComponentPropsWithoutRef<"a">) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                void openExternal(href);
              }}
              className="cursor-pointer text-[var(--accent)] underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
