"use client";

import DocumentationLinks from "./DocumentationLinks";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              id="help-title"
              className="text-2xl font-semibold text-gray-900"
            >
              Help & Documentation
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

          {/* Content */}
          <div className="space-y-6 text-gray-700">
            {/* What is yaml-diffs */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What is yaml-diffs?
              </h3>
              <p className="text-sm leading-relaxed">
                yaml-diffs is a tool for comparing YAML document versions. It's
                designed for Hebrew legal documents but works with any
                structured YAML data. The tool shows detailed changes with
                context, making it easy to track modifications, additions,
                deletions, and structural changes.
              </p>
            </section>

            {/* How to Use */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How to Use
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  <strong>Load documents:</strong> Upload or paste two YAML
                  document versions into the editors, or use the demo examples
                  above.
                </li>
                <li>
                  <strong>Run diff:</strong> Click the "Run Diff" button to
                  compare the documents.
                </li>
                <li>
                  <strong>Review changes:</strong> View changes in Split View
                  (side-by-side) or Cards View (individual change cards).
                </li>
                <li>
                  <strong>Add comments:</strong> Click on any change to add
                  comments and start discussions.
                </li>
                <li>
                  <strong>Export:</strong> Download diff results and discussions
                  as JSON if needed.
                </li>
              </ol>
            </section>

            {/* Document Format */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Document Format Requirements
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                <p>
                  <strong>Top-level key:</strong> Documents must have{" "}
                  <code className="bg-gray-200 px-1 rounded">document:</code> as
                  the top-level key.
                </p>
                <p>
                  <strong>Section markers:</strong> All sections require a{" "}
                  <code className="bg-gray-200 px-1 rounded">marker</code>{" "}
                  field, which serves as a unique identifier within the same
                  nesting level.
                </p>
                <p>
                  <strong>Nesting:</strong> Supports unlimited nesting levels for
                  complex document structures.
                </p>
                <p>
                  <strong>Content:</strong> Each section can have a{" "}
                  <code className="bg-gray-200 px-1 rounded">content</code>{" "}
                  field containing text for that section level.
                </p>
              </div>
            </section>

            {/* Common Use Cases */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Common Use Cases
              </h3>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Track changes in legal documents over time</li>
                <li>Review configuration file updates</li>
                <li>Compare document versions for collaborative review</li>
                <li>Audit changes in structured data files</li>
                <li>Understand modifications in complex nested documents</li>
              </ul>
            </section>

            {/* FAQ */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Frequently Asked Questions
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    What file formats are supported?
                  </h4>
                  <p className="text-gray-600">
                    Currently, only YAML files (<code className="bg-gray-200 px-1 rounded">.yaml</code> or{" "}
                    <code className="bg-gray-200 px-1 rounded">.yml</code>) are
                    supported.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    What do the different change types mean?
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>
                      <strong>SECTION_ADDED:</strong> A new section was added in
                      the new version
                    </li>
                    <li>
                      <strong>SECTION_REMOVED:</strong> A section was removed
                      from the old version
                    </li>
                    <li>
                      <strong>CONTENT_CHANGED:</strong> The content of a section
                      changed (same marker and path)
                    </li>
                    <li>
                      <strong>SECTION_MOVED:</strong> A section moved to a
                      different location (path changed)
                    </li>
                    <li>
                      <strong>TITLE_CHANGED:</strong> Only the title changed
                      (same marker, path, and content)
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    How do I handle validation errors?
                  </h4>
                  <p className="text-gray-600">
                    Ensure your YAML has <code className="bg-gray-200 px-1 rounded">document:</code> as the
                    top-level key and all sections have <code className="bg-gray-200 px-1 rounded">marker</code> fields.
                    Check the error message for specific details about what's
                    missing.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    Can I use this with Hebrew content?
                  </h4>
                  <p className="text-gray-600">
                    Yes! yaml-diffs fully supports Hebrew content and RTL
                    (right-to-left) text. The tool was designed with Hebrew
                    legal documents in mind.
                  </p>
                </div>
              </div>
            </section>

            {/* Documentation Links */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Learn More
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Explore additional ways to use yaml-diffs:
              </p>
              <DocumentationLinks variant="list" />
            </section>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
