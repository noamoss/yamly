"use client";

import { useState, useEffect } from "react";
import { fetchSchema } from "@/lib/api";

interface SchemaViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SchemaViewer({ isOpen, onClose }: SchemaViewerProps) {
  const [copied, setCopied] = useState(false);
  const [schema, setSchema] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !schema) {
      setLoading(true);
      setError(null);
      fetchSchema()
        .then((schemaText) => {
          setSchema(schemaText);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load schema");
          setLoading(false);
        });
    }
  }, [isOpen, schema]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (schema) {
      await navigator.clipboard.writeText(schema);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
              disabled={!schema || loading}
              className="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-400 text-sm">Loading schema...</div>
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center py-12">
                <div className="text-red-400 text-sm">Error: {error}</div>
              </div>
            )}
            {!loading && !error && schema && (
              <pre className="text-sm font-mono text-gray-100 overflow-x-auto whitespace-pre">
                {schema}
              </pre>
            )}
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
