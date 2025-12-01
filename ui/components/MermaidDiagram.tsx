"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  code: string;
}

// Initialize Mermaid once using a singleton pattern
let mermaidInitialized = false;
const initMermaid = () => {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      // Use "strict" security level - documentation content is trusted but we should
      // still follow security best practices. Mermaid diagrams are from our own docs,
      // not user-provided content, but using strict mode is safer.
      securityLevel: "strict",
      flowchart: {
        useMaxWidth: false, // Allow diagrams to be larger
        htmlLabels: true,
        curve: "basis",
      },
      themeVariables: {
        fontSize: "16px", // Larger default font
      },
    });
    mermaidInitialized = true;
  }
};

// Counter for unique ID generation
let idCounter = 0;

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [inlineZoom, setInlineZoom] = useState(0.5); // Default zoom for inline view (50%)
  const [expandedZoom, setExpandedZoom] = useState(0.5); // Default zoom for expanded view (50%)
  const diagramRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string>(
    `mermaid-${Date.now()}-${++idCounter}`
  );

  useEffect(() => {
    // Initialize Mermaid using singleton
    initMermaid();

    // Clear previous state
    setError(null);
    setSvg("");

    // Track if component is still mounted
    let cancelled = false;

    // Render the diagram
    const diagramId = idRef.current;
    mermaid
      .render(diagramId, code)
      .then((result) => {
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Mermaid rendering error:", err);
          setError(err.message || "Failed to render diagram");
        }
      });

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Handle keyboard accessibility for modal
  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  // Handle zoom controls for inline view
  const handleInlineZoomIn = () => setInlineZoom((prev) => Math.min(prev + 0.25, 3));
  const handleInlineZoomOut = () => setInlineZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleInlineResetZoom = () => setInlineZoom(0.5);

  // Handle zoom controls for expanded view
  const handleExpandedZoomIn = () => setExpandedZoom((prev) => Math.min(prev + 0.25, 3));
  const handleExpandedZoomOut = () => setExpandedZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleExpandedResetZoom = () => setExpandedZoom(0.5);

  // If there's an error, show it
  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">
          <strong>Mermaid diagram error:</strong> {error}
        </p>
        <pre className="mt-2 text-xs text-red-600 overflow-auto">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <>
      <div className="my-4 relative group">
        {/* Zoom controls */}
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleInlineZoomOut}
            className="px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded text-xs hover:bg-gray-700 shadow-lg font-medium"
            title="Zoom out"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={handleInlineResetZoom}
            className="px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded text-xs hover:bg-gray-700 shadow-lg font-medium"
            title="Reset zoom"
            aria-label="Reset zoom"
          >
            {Math.round(inlineZoom * 100)}%
          </button>
          <button
            onClick={handleInlineZoomIn}
            className="px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded text-xs hover:bg-gray-700 shadow-lg font-medium"
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            className="px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded text-xs hover:bg-gray-700 shadow-lg font-medium"
            title="Expand to full screen"
            aria-label="Expand diagram"
          >
            ⛶
          </button>
        </div>

        {/* Diagram container with zoom */}
        <div className="flex justify-center overflow-x-auto overflow-y-auto max-h-[600px] bg-gray-50 rounded-lg p-4">
          <div
            ref={diagramRef}
            className="mermaid-diagram"
            style={{
              transform: `scale(${inlineZoom})`,
              transformOrigin: "top center",
              minWidth: "100%",
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>

      {/* Expanded modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={() => setIsExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded diagram"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-[95vw] max-h-[95vh] w-full mx-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Diagram (Click outside to close)
              </h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleExpandedZoomOut}
                  className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <button
                  onClick={handleExpandedResetZoom}
                  className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200"
                  title="Reset zoom"
                  aria-label="Reset zoom"
                >
                  {Math.round(expandedZoom * 100)}%
                </button>
                <button
                  onClick={handleExpandedZoomIn}
                  className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-gray-50">
              <div
                ref={expandedRef}
                className="mermaid-diagram flex justify-center"
                style={{
                  transform: `scale(${expandedZoom})`,
                  transformOrigin: "top center",
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
