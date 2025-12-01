"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Element } from "hast";
import MermaidDiagram from "./MermaidDiagram";

// Constants for scroll behavior
const SCROLL_OFFSET_TOP = 20; // px offset from top when scrolling to anchor
const SCROLL_RETRY_DELAY_1 = 100; // ms - first retry delay
const SCROLL_RETRY_DELAY_2 = 200; // ms - second retry delay
const ANCHOR_SCROLL_DELAY = 100; // ms - delay before scrolling to anchor after navigation
const ANCHOR_SCROLL_DELAY_2 = 300; // ms - delay for nested scroll after content load

interface MarkdownViewerProps {
  docPath: string;
  onClose?: () => void;
  onDocClick?: (docPath: string) => void;
}

interface CodeProps {
  node?: Element; // ReactMarkdown's internal AST node from hast - not used in this component
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

/**
 * Extracts text content from React nodes recursively
 */
function extractTextFromNode(node: React.ReactNode): string {
  if (typeof node === 'string') {
    return node;
  }
  if (typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join('');
  }
  if (node && typeof node === 'object' && 'props' in node && node.props && typeof node.props === 'object' && 'children' in node.props) {
    return extractTextFromNode((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

/**
 * Generates a unique ID from heading text for anchor links
 * Handles duplicate headings by appending a counter
 * @param children - The heading content
 * @param idCounter - Map to track generated IDs (component-scoped)
 */
function generateHeadingId(children: React.ReactNode, idCounter: Map<string, number>): string {
  const text = extractTextFromNode(children);
  const baseId = text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Handle duplicate IDs by appending a counter
  if (idCounter.has(baseId)) {
    const count = idCounter.get(baseId)! + 1;
    idCounter.set(baseId, count);
    return `${baseId}-${count}`;
  } else {
    idCounter.set(baseId, 0);
    return baseId;
  }
}

/**
 * Scrolls to an element within a scrollable container
 * @param elementId - The ID of the element to scroll to
 * @param container - Optional container element (defaults to finding .overflow-y-auto)
 * @returns true if scroll was successful, false otherwise
 */
function scrollToElementInContainer(elementId: string, container?: HTMLElement): boolean {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const scrollableParent = container || (element.closest('.overflow-y-auto') as HTMLElement);
  if (scrollableParent) {
    // Calculate position relative to scrollable container
    const containerRect = scrollableParent.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scrollTop = scrollableParent.scrollTop;
    const elementTop = elementRect.top - containerRect.top + scrollTop;

    // Scroll to element with offset from top
    scrollableParent.scrollTo({
      top: Math.max(0, elementTop - SCROLL_OFFSET_TOP),
      behavior: 'smooth'
    });
    return true;
  } else {
    // Fallback: scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }
}

/**
 * Resolves a relative markdown link path to an absolute docPath format.
 * Handles relative paths like:
 * - `schema_reference.md` (same directory)
 * - `../developer/api_reference.md` (parent directory)
 * - `user/getting_started.md` (subdirectory)
 * - `#section` (anchor link - returns current path)
 */
function resolveDocPath(currentPath: string, linkPath: string): string {
  // If it's just an anchor link (starts with #), return current path
  if (linkPath.startsWith("#")) {
    return currentPath;
  }

  // Remove .md extension if present
  let normalizedLink = linkPath.replace(/\.md$/, "");

  // Remove anchor/hash if present (e.g., `file.md#section` -> `file`)
  normalizedLink = normalizedLink.split("#")[0];

  // If normalized link is empty after processing, return current path
  if (!normalizedLink) {
    return currentPath;
  }

  // If it's already an absolute path (starts with /), remove the leading slash
  if (normalizedLink.startsWith("/")) {
    normalizedLink = normalizedLink.slice(1);
  }

  // If it's a relative path starting with ../
  if (normalizedLink.startsWith("../")) {
    // Get the directory of the current path
    const currentDir = currentPath.split("/").slice(0, -1);

    // Process each ../
    let remaining = normalizedLink;
    while (remaining.startsWith("../")) {
      if (currentDir.length > 0) {
        currentDir.pop();
      }
      remaining = remaining.slice(3);
    }

    // Combine directory with remaining path
    if (remaining) {
      // If currentDir is empty, just return the remaining path (root level)
      if (currentDir.length === 0) {
        return remaining;
      }
      return [...currentDir, remaining].join("/");
    } else {
      return currentDir.length > 0 ? currentDir.join("/") : "";
    }
  }

  // If it's a relative path in the same directory (no / in the path)
  if (!normalizedLink.includes("/")) {
    const currentDir = currentPath.split("/").slice(0, -1);
    if (currentDir.length > 0) {
      return [...currentDir, normalizedLink].join("/");
    } else {
      return normalizedLink;
    }
  }

  // If it's already an absolute path (contains /), return as-is
  return normalizedLink;
}

export default function MarkdownViewer({
  docPath,
  onClose,
  onDocClick,
}: MarkdownViewerProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Component-scoped heading ID counter to handle duplicates
  const headingIdCounterRef = useRef<Map<string, number>>(new Map());

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

  // Reset heading ID counter when content changes
  useEffect(() => {
    headingIdCounterRef.current.clear();
  }, [content]);

  // Handle scrolling to anchors when content loads or hash changes
  useEffect(() => {
    if (isLoading || error || !content) return;

    const container = contentRef.current?.closest('.overflow-y-auto') as HTMLElement | undefined;
    const timeouts: NodeJS.Timeout[] = [];

    const hash = window.location.hash;
    if (hash) {
      const anchorId = hash.slice(1); // Remove the #

      // Try immediately
      if (!scrollToElementInContainer(anchorId, container)) {
        // Retry with delays to handle async rendering
        const timeout1 = setTimeout(() => {
          if (!scrollToElementInContainer(anchorId, container)) {
            const timeout2 = setTimeout(() => {
              scrollToElementInContainer(anchorId, container);
            }, SCROLL_RETRY_DELAY_2);
            timeouts.push(timeout2);
          }
        }, SCROLL_RETRY_DELAY_1);
        timeouts.push(timeout1);
      }
    } else {
      // If no hash, scroll to top
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // Cleanup function to clear all timeouts
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [content, isLoading, error]);

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
    <div ref={contentRef} className="prose prose-sm max-w-none p-6">
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
          // Generate IDs for headings to support anchor links
          h1: (props) => {
            const { children, ...rest } = props;
            const id = generateHeadingId(children, headingIdCounterRef.current);
            return <h1 id={id} {...rest}>{children}</h1>;
          },
          h2: (props) => {
            const { children, ...rest } = props;
            const id = generateHeadingId(children, headingIdCounterRef.current);
            return <h2 id={id} {...rest}>{children}</h2>;
          },
          h3: (props) => {
            const { children, ...rest } = props;
            const id = generateHeadingId(children, headingIdCounterRef.current);
            return <h3 id={id} {...rest}>{children}</h3>;
          },
          h4: (props) => {
            const { children, ...rest } = props;
            const id = generateHeadingId(children, headingIdCounterRef.current);
            return <h4 id={id} {...rest}>{children}</h4>;
          },
          h5: (props) => {
            const { children, ...rest } = props;
            const id = generateHeadingId(children, headingIdCounterRef.current);
            return <h5 id={id} {...rest}>{children}</h5>;
          },
          h6: (props) => {
            const { children, ...rest } = props;
            const id = generateHeadingId(children, headingIdCounterRef.current);
            return <h6 id={id} {...rest}>{children}</h6>;
          },
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
          a: (props) => {
            const { href, children, ...rest } = props;
            // Check if it's an external link (starts with http:// or https://)
            if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                  aria-label={`Open ${typeof children === 'string' ? children : 'link'} in new tab`}
                  {...rest}
                >
                  {children}
                </a>
              );
            }

            // Check if it's an anchor-only link (starts with #) - handle scrolling manually
            if (href && href.startsWith("#")) {
              const anchorId = href.slice(1); // Remove the #
              return (
                <a
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    // Update URL hash first
                    window.history.pushState(null, '', href);
                    // Then scroll to element
                    const container = contentRef.current?.closest('.overflow-y-auto') as HTMLElement | undefined;
                    if (!scrollToElementInContainer(anchorId, container)) {
                      // Retry with delay if element not found
                      setTimeout(() => {
                        scrollToElementInContainer(anchorId, container);
                      }, SCROLL_RETRY_DELAY_1);
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
                  aria-label={`Jump to section: ${anchorId}`}
                  {...rest}
                >
                  {children}
                </a>
              );
            }

            // Internal link - resolve relative path and navigate
            if (href && onDocClick) {
              try {
                // Check if href contains both path and anchor (e.g., "file.md#section")
                const [pathPart, anchorPart] = href.split("#");
                const resolvedPath = resolveDocPath(docPath, pathPart);

                // Validate resolved path
                if (!resolvedPath || resolvedPath.trim() === "") {
                  console.warn(`Invalid resolved path for link: ${href}`, { docPath, pathPart });
                  // Fall through to default handling
                } else if (resolvedPath !== docPath) {
                  // Navigate to different document
                  const container = contentRef.current?.closest('.overflow-y-auto') as HTMLElement | undefined;
                  return (
                    <a
                      href={anchorPart ? `#${anchorPart}` : "#"}
                      onClick={(e) => {
                        e.preventDefault();
                        // Navigate to the new document
                        onDocClick(resolvedPath);
                        // If there's an anchor, scroll after content loads
                        if (anchorPart) {
                          setTimeout(() => {
                            window.history.pushState(null, '', `#${anchorPart}`);
                            // Trigger scroll after content loads
                            setTimeout(() => {
                              scrollToElementInContainer(anchorPart, container);
                            }, ANCHOR_SCROLL_DELAY_2);
                          }, ANCHOR_SCROLL_DELAY);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 underline"
                      aria-label={`Navigate to ${resolvedPath}${anchorPart ? ` and jump to ${anchorPart}` : ''}`}
                      {...rest}
                    >
                      {children}
                    </a>
                  );
                } else if (anchorPart) {
                  // Same document, just scroll to anchor
                  const container = contentRef.current?.closest('.overflow-y-auto') as HTMLElement | undefined;
                  return (
                    <a
                      href={`#${anchorPart}`}
                      onClick={(e) => {
                        e.preventDefault();
                        window.history.pushState(null, '', `#${anchorPart}`);
                        scrollToElementInContainer(anchorPart, container);
                      }}
                      className="text-blue-600 hover:text-blue-800 underline"
                      aria-label={`Jump to section: ${anchorPart}`}
                      {...rest}
                    >
                      {children}
                    </a>
                  );
                }
              } catch (error) {
                // If path resolution fails, log error and fall through to default handling
                console.error("Error resolving doc path:", error, { docPath, href });
                // Return a link that will show an error or do nothing
                return (
                  <a
                    href={href}
                    className="text-blue-600 hover:text-blue-800 underline"
                    aria-label={`Link to ${href} (error resolving path)`}
                    {...rest}
                  >
                    {children}
                  </a>
                );
              }
              // If resolved path is same as current and no anchor, let browser handle it
              return (
                <a
                  href={href}
                  className="text-blue-600 hover:text-blue-800 underline"
                  aria-label={`Link to ${href}`}
                  {...rest}
                >
                  {children}
                </a>
              );
            }

            // Fallback for links without href or onDocClick
            return (
              <a href={href} className="text-blue-600 hover:text-blue-800 underline" {...rest}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
