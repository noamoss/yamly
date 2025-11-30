"use client";

import { useState } from "react";

interface SchemaViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEGAL_DOCUMENT_SCHEMA = `# Legal Document Schema (OpenSpec)
# Version: 1.0.0

# This schema defines the structure for legal and regulatory documents
# with recursive sections, supporting unlimited nesting depth.

document:
  # Required fields
  id: string          # Stable document identifier (UUID or canonical ID)
  title: string       # Document title in Hebrew
  type: enum          # One of: law, regulation, directive, circular, policy, other
  language: "hebrew"  # Must be 'hebrew'
  
  version:
    number: string    # Version identifier (e.g., "2024-11-01", "v1.0")
    description?: string  # Optional description
  
  source:
    url: string       # Original source URL
    fetched_at: datetime  # When document was fetched
  
  sections:           # Array of Section objects (see below)
    - Section
  
  # Optional fields
  authors?: string[]  # List of authors/organizations
  published_date?: datetime
  updated_date?: datetime

# Recursive Section Definition
Section:
  marker: string      # Required: structural marker ("1", "1.א", "(b)")
                      # Used for diffing - must be unique at same nesting level
  
  id?: string         # Optional: stable ID (auto-generated UUID if not provided)
  title?: string      # Optional: section title
  content?: string    # Optional: text content (defaults to "")
  
  sections:           # Recursive: nested sub-sections
    - Section

# Example Document
---
document:
  id: "law-example-001"
  title: "חוק לדוגמה"
  type: law
  language: hebrew
  version:
    number: "2024-01-01"
  source:
    url: "https://example.gov.il/law001"
    fetched_at: "2025-01-20T09:50:00Z"
  sections:
    - marker: "1"
      title: "הגדרות"
      content: "בחוק זה..."
      sections:
        - marker: "א"
          content: '"משרד" - משרד הפנים'
          sections: []
    - marker: "2"
      title: "תחולה"
      content: "חוק זה חל על..."
      sections: []
`;

export default function SchemaViewer({ isOpen, onClose }: SchemaViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(LEGAL_DOCUMENT_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Legal Document Schema</h2>
            <p className="text-sm text-gray-600 mt-1">
              OpenSpec schema for legal documents with marker-based diffing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-gray-900 rounded-lg p-4 relative">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <pre className="text-sm font-mono text-gray-100 overflow-x-auto whitespace-pre">
              {LEGAL_DOCUMENT_SCHEMA}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>Tip:</strong> Documents must have <code className="bg-gray-200 px-1 rounded">document:</code> as 
              the top-level key and sections with unique <code className="bg-gray-200 px-1 rounded">marker</code> fields.
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg hover:opacity-90 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

