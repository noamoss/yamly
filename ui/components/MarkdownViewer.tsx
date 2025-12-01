"use client";

import { useState, useEffect } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidDiagram from "./MermaidDiagram";

interface MarkdownViewerProps {
  docPath: string;
  onClose?: () => void;
}

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export default function MarkdownViewer({
  docPath,
  onClose,
}: MarkdownViewerProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchMarkdown = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/docs/${docPath}`, {
          signal: abortController.signal,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to load documentation (${response.status})`
          );
        }
        const data = await response.json();
        if (!data.content) {
          throw new Error("Documentation content is empty");
        }
        // Only update state if request wasn't aborted
        if (!abortController.signal.aborted) {
          setContent(data.content);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        // Only update state if request wasn't aborted
        if (!abortController.signal.aborted) {
          const errorMsg =
            err instanceof Error
              ? err.message
              : "Failed to load documentation";
          console.error("Error loading documentation:", err);
          setError(errorMsg);
        }
      } finally {
        // Only update loading state if request wasn't aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchMarkdown();

    return () => {
      abortController.abort();
    };
  }, [docPath]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-gray-600">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading documentation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <svg
              className="h-5 w-5 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none p-6">
      {onClose && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props: CodeProps) {
            const { node, inline, className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            // Handle children array properly - ReactMarkdown may pass children as array
            const codeString = Array.isArray(children)
              ? children.map(String).join("")
              : String(children);
            const trimmedCode = codeString.replace(/\n$/, "");

            // Render Mermaid diagrams for non-inline mermaid code blocks
            if (language === "mermaid" && !inline) {
              return <MermaidDiagram code={trimmedCode} />;
            }

            // Default code rendering (inline or non-mermaid blocks)
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
