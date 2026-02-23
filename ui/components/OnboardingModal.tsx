"use client";

import { useState, useEffect, useRef } from "react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
}

const ONBOARDING_STORAGE_KEY = "yamly-onboarding-seen";

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

export function markOnboardingAsSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
}

export default function OnboardingModal({
  isOpen,
  onClose,
  onDontShowAgain,
}: OnboardingModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    setIsClosing(true);
    timeoutRef.current = setTimeout(() => {
      onClose();
      setIsClosing(false);
      timeoutRef.current = null;
    }, 200);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleDontShowAgain = () => {
    markOnboardingAsSeen();
    onDontShowAgain();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className={`bg-[var(--background)] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2
              id="onboarding-title"
              className="text-2xl font-serif font-normal text-[var(--foreground)]"
            >
              Welcome to yamly
            </h2>
            <button
              onClick={handleClose}
              className="p-2 -m-2 sm:p-0 sm:m-0 text-[var(--brand-secondary)] hover:text-[var(--foreground)] transition-colors touch-manipulation rounded-lg hover:bg-[var(--brand-secondary)]/10 active:bg-[var(--brand-secondary)]/20"
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
          <div className="space-y-4 text-[var(--brand-secondary)]">
            <p className="text-base leading-relaxed">
              Compare and review changes in YAML documents. Ideal for tracking
              updates in legal docs, configuration files, and more.
            </p>

            <div className="bg-[var(--brand-background)] border border-[var(--brand-secondary)]/20 rounded-lg p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <h3 className="font-serif font-medium text-[var(--foreground)] mb-2">
                Try Example Documents
              </h3>
              <p className="text-sm text-[var(--brand-secondary)]">
                Scroll up to explore sample documents that show how diffing
                works. Click any example to load it into the editors.
              </p>
            </div>

            <div>
              <h3 className="font-serif font-medium text-[var(--foreground)] mb-2">
                Key Features:
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-[var(--brand-accent)] mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Diff Visualization:</strong> See all changes clearly
                    highlighted with contextual line-by-line comparisons.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-[var(--brand-accent)] mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Explain:</strong> Add comments and replies to specific
                    changes.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-[var(--brand-accent)] mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Flexible Interfaces:</strong> Use the Web UI, CLI
                    commands, REST API, or a local MCP integration. Download diff
                    results as JSON.
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-serif font-medium text-[var(--foreground)] mb-2">
                Coming Soon
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-[var(--brand-accent)] mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Version History Tracking</strong> — Compare across
                    multiple document versions.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-[var(--brand-accent)] mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Explainable Diffs</strong> — Add external references
                    or reasons to detected changes.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-[var(--brand-accent)] mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>Online MCP (SSE)</strong> — Stream real-time diffs
                    and events.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 text-[var(--brand-accent)] mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    <strong>GenAI Summaries</strong> — Automatically generate
                    human-readable summaries of changes.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-[var(--brand-background)] border border-[var(--brand-secondary)]/20 rounded-lg p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <p className="text-sm text-[var(--brand-secondary)]">
                <strong className="text-[var(--foreground)]">Get started:</strong> Load two YAML documents and click{" "}
                <strong>Run diff →</strong> to see the changes.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={handleDontShowAgain}
              className="px-4 py-2 text-sm text-[var(--brand-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              Don't show again
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-[var(--brand-cta-bg)] text-[var(--brand-cta-text)] rounded-lg hover:opacity-90 transition-opacity text-sm font-medium uppercase"
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
