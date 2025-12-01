"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Element } from "hast";
import MermaidDiagram from "./MermaidDiagram";

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
 * Generates an ID from heading text for anchor links
 */
function generateHeadingId(children: React.ReactNode): string {
  const text = extractTextFromNode(children);
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

  // Handle scrolling to anchors when content loads or hash changes
  useEffect(() => {
    if (isLoading || error || !content) return;

    // Function to scroll to anchor
    const scrollToAnchor = (anchorId: string) => {
      // Try multiple times with increasing delays to handle async rendering
      const tryScroll = (attempt = 0) => {
        const element = document.getElementById(anchorId);
        if (element && contentRef.current) {
          // Find the scrollable parent container (in DocumentationModal)
          const scrollableParent = contentRef.current.closest('.overflow-y-auto') as HTMLElement;
          if (scrollableParent) {
            // Calculate position relative to scrollable container
            const containerRect = scrollableParent.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const scrollTop = scrollableParent.scrollTop;
            const elementTop = elementRect.top - containerRect.top + scrollTop;

            // Scroll to element with some offset from top
            scrollableParent.scrollTo({
              top: Math.max(0, elementTop - 20), // 20px offset from top, ensure non-negative
              behavior: 'smooth'
            });
            return true;
          } else {
            // Fallback: scroll element into view
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return true;
          }
        }
        return false;
      };

      // Try immediately, then with delays
      if (!tryScroll()) {
        setTimeout(() => {
          if (!tryScroll()) {
            setTimeout(() => tryScroll(), 200);
          }
        }, 100);
      }
    };

    const hash = window.location.hash;
    if (hash) {
      const anchorId = hash.slice(1); // Remove the #
      scrollToAnchor(anchorId);
    } else {
      // If no hash, scroll to top
      const scrollableParent = contentRef.current?.closest('.overflow-y-auto') as HTMLElement;
      if (scrollableParent) {
        scrollableParent.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
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
          h1: ({ children, ...props }: any) => {
            const id = generateHeadingId(children);
            return <h1 id={id} {...props}>{children}</h1>;
          },
          h2: ({ children, ...props }: any) => {
            const id = generateHeadingId(children);
            return <h2 id={id} {...props}>{children}</h2>;
          },
          h3: ({ children, ...props }: any) => {
            const id = generateHeadingId(children);
            return <h3 id={id} {...props}>{children}</h3>;
          },
          h4: ({ children, ...props }: any) => {
            const id = generateHeadingId(children);
            return <h4 id={id} {...props}>{children}</h4>;
          },
          h5: ({ children, ...props }: any) => {
            const id = generateHeadingId(children);
            return <h5 id={id} {...props}>{children}</h5>;
          },
          h6: ({ children, ...props }: any) => {
            const id = generateHeadingId(children);
            return <h6 id={id} {...props}>{children}</h6>;
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
          a(props: any) {
            const { href, children, ...rest } = props;

            // Check if it's an external link (starts with http:// or https://)
            if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                  {...rest}
                >
                  {children}
                </a>
              );
            }

            // Check if it's an anchor-only link (starts with #) - handle scrolling manually
            if (href && href.startsWith("#")) {
              return (
                <a
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    const anchorId = href.slice(1); // Remove the #
                    // Update URL hash first
                    window.history.pushState(null, '', href);
                    // Then scroll to element
                    const scrollToElement = () => {
                      const element = document.getElementById(anchorId);
                      if (element) {
                        // Find the scrollable parent container
                        const scrollableParent = element.closest('.overflow-y-auto') as HTMLElement;
                        if (scrollableParent) {
                          // Calculate position relative to scrollable container
                          const containerRect = scrollableParent.getBoundingClientRect();
                          const elementRect = element.getBoundingClientRect();
                          const scrollTop = scrollableParent.scrollTop;
                          const elementTop = elementRect.top - containerRect.top + scrollTop;

                          // Scroll to element with some offset from top
                          scrollableParent.scrollTo({
                            top: Math.max(0, elementTop - 20), // 20px offset from top, ensure non-negative
                            behavior: 'smooth'
                          });
                        } else {
                          // Fallback: scroll element into view
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                        return true;
                      }
                      return false;
                    };
                    // Try immediately, then with delay if element not found
                    if (!scrollToElement()) {
                      setTimeout(() => scrollToElement(), 100);
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
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

                // Only navigate if the resolved path is valid and different from current path
                // (to avoid unnecessary re-renders for anchor links that resolve to current path)
                if (resolvedPath && resolvedPath !== docPath && resolvedPath.trim() !== "") {
                  return (
                    <a
                      href={anchorPart ? `#${anchorPart}` : "#"}
                      onClick={(e) => {
                        e.preventDefault();
                        // Navigate to the new document
                        onDocClick(resolvedPath);
                        // If there's an anchor, update URL hash (scrolling will happen in useEffect)
                        if (anchorPart) {
                          // Small delay to ensure new content loads before scrolling
                          setTimeout(() => {
                            window.history.pushState(null, '', `#${anchorPart}`);
                            // Trigger scroll after content loads
                            setTimeout(() => {
                              const element = document.getElementById(anchorPart);
                              if (element) {
                                const scrollableParent = element.closest('.overflow-y-auto');
                                if (scrollableParent) {
                                  const containerRect = scrollableParent.getBoundingClientRect();
                                  const elementRect = element.getBoundingClientRect();
                                  const scrollTop = scrollableParent.scrollTop;
                                  const elementTop = elementRect.top - containerRect.top + scrollTop;
                                  scrollableParent.scrollTo({
                                    top: elementTop - 20,
                                    behavior: 'smooth'
                                  });
                                }
                              }
                            }, 300);
                          }, 100);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 underline"
                      {...rest}
                    >
                      {children}
                    </a>
                  );
                } else if (resolvedPath === docPath && anchorPart) {
                  // Same document, just scroll to anchor
                  return (
                    <a
                      href={`#${anchorPart}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById(anchorPart);
                        if (element) {
                          const scrollableParent = element.closest('.overflow-y-auto');
                          if (scrollableParent) {
                            const containerRect = scrollableParent.getBoundingClientRect();
                            const elementRect = element.getBoundingClientRect();
                            const scrollTop = scrollableParent.scrollTop;
                            const elementTop = elementRect.top - containerRect.top + scrollTop;
                            scrollableParent.scrollTo({
                              top: elementTop - 20,
                              behavior: 'smooth'
                            });
                          }
                        }
                        window.history.pushState(null, '', `#${anchorPart}`);
                      }}
                      className="text-blue-600 hover:text-blue-800 underline"
                      {...rest}
                    >
                      {children}
                    </a>
                  );
                }
              } catch (error) {
                // If path resolution fails, log error and fall through to default handling
                console.error("Error resolving doc path:", error, { docPath, href });
              }
              // If resolved path is same as current, empty, or resolution failed, let browser handle it
              return (
                <a
                  href={href}
                  className="text-blue-600 hover:text-blue-800 underline"
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
