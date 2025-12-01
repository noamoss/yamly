"use client";

import MarkdownViewer from "./MarkdownViewer";

interface DocumentationModalProps {
  isOpen: boolean;
  docPath: string | null;
  onClose: () => void;
  onDocClick?: (docPath: string) => void;
}

export default function DocumentationModal({
  isOpen,
  docPath,
  onClose,
  onDocClick,
}: DocumentationModalProps) {
  if (!isOpen || !docPath) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="documentation-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2
            id="documentation-title"
            className="text-xl font-semibold text-gray-900"
          >
            Documentation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
        <div className="overflow-y-auto flex-1">
          <MarkdownViewer docPath={docPath} onClose={onClose} onDocClick={onDocClick} />
        </div>
      </div>
    </div>
  );
}
