"use client";

import DocumentationLinks from "./DocumentationLinks";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocClick?: (docPath: string) => void;
}

export default function HelpModal({
  isOpen,
  onClose,
  onDocClick,
}: HelpModalProps) {
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
        className="bg-[var(--brand-background)] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              id="help-title"
              className="text-2xl font-normal text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              Help & Documentation
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--brand-secondary)] hover:text-[var(--foreground)] transition-colors"
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
          <div className="space-y-6 text-[var(--brand-secondary)]">
            {/* What is yamly */}
            <section>
              <h3 className="text-lg font-normal text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-serif), serif" }}>
                What is yamly?
              </h3>
              <p className="text-sm leading-relaxed">
                yamly reads YAML as structured data rather than plain text. It highlights meaningful changes and filters out noise, making it easier to review config updates, infrastructure changes, and YAML produced or rewritten by LLM-powered tools.
              </p>
            </section>

            {/* How to Use */}
            <section>
              <h3 className="text-lg font-normal text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-serif), serif" }}>
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
              <h3 className="text-lg font-normal text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-serif), serif" }}>
                Document Format Requirements
              </h3>
              <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-secondary)]/20 rounded-lg p-4 space-y-2 text-sm">
                <p>
                  <strong className="text-[var(--foreground)]">Top-level key:</strong> Documents must have{" "}
                  <code className="bg-[var(--brand-secondary)]/20 px-1 rounded">document:</code> as
                  the top-level key.
                </p>
                <p>
                  <strong className="text-[var(--foreground)]">Section markers:</strong> All sections require a{" "}
                  <code className="bg-[var(--brand-secondary)]/20 px-1 rounded">marker</code>{" "}
                  field, which serves as a unique identifier within the same
                  nesting level.
                </p>
                <p>
                  <strong className="text-[var(--foreground)]">Nesting:</strong> Supports unlimited nesting levels for
                  complex document structures.
                </p>
                <p>
                  <strong className="text-[var(--foreground)]">Content:</strong> Each section can have a{" "}
                  <code className="bg-[var(--brand-secondary)]/20 px-1 rounded">content</code>{" "}
                  field containing text for that section level.
                </p>
              </div>
            </section>

            {/* Common Use Cases */}
            <section>
              <h3 className="text-lg font-normal text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-serif), serif" }}>
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
              <h3 className="text-lg font-normal text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-serif), serif" }}>
                Frequently Asked Questions
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-[var(--foreground)] mb-1">
                    What file formats are supported?
                  </h4>
                  <p className="text-[var(--brand-secondary)]">
                    Currently, only YAML files (<code className="bg-[var(--brand-secondary)]/20 px-1 rounded">.yaml</code> or{" "}
                    <code className="bg-[var(--brand-secondary)]/20 px-1 rounded">.yml</code>) are
                    supported.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[var(--foreground)] mb-1">
                    What do the different change types mean?
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-[var(--brand-secondary)] ml-2">
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
                  <h4 className="font-medium text-[var(--foreground)] mb-1">
                    How do I handle validation errors?
                  </h4>
                  <p className="text-[var(--brand-secondary)]">
                    Ensure your YAML has <code className="bg-[var(--brand-secondary)]/20 px-1 rounded">document:</code> as the
                    top-level key and all sections have <code className="bg-[var(--brand-secondary)]/20 px-1 rounded">marker</code> fields.
                    Check the error message for specific details about what's
                    missing.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[var(--foreground)] mb-1">
                    Can I use this with Hebrew content?
                  </h4>
                  <p className="text-[var(--brand-secondary)]">
                    Yes! yamly fully supports Hebrew content and RTL
                    (right-to-left) text. The tool was designed with Hebrew
                    legal documents in mind.
                  </p>
                </div>
              </div>
            </section>

            {/* Documentation Links */}
            <section>
              <h3 className="text-lg font-normal text-[var(--foreground)] mb-3" style={{ fontFamily: "var(--font-serif), serif" }}>
                Learn More
              </h3>
              <p className="text-sm text-[var(--brand-secondary)] mb-3">
                Explore additional ways to use yamly:
              </p>
              <DocumentationLinks variant="list" onDocClick={onDocClick} />
            </section>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[var(--brand-cta-bg)] text-[var(--brand-cta-text)] rounded-lg hover:opacity-90 transition-opacity text-sm font-medium uppercase"
            >
              Close →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
