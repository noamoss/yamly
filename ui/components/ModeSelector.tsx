"use client";

import { useState } from "react";
import { IdentityRule } from "@/lib/types";
import SchemaViewer from "./SchemaViewer";

interface ModeSelectorProps {
  mode: "auto" | "general" | "legal_document";
  onModeChange: (mode: "auto" | "general" | "legal_document") => void;
  identityRules: IdentityRule[];
  onIdentityRulesChange: (rules: IdentityRule[]) => void;
  disabled?: boolean;
}

export default function ModeSelector({
  mode,
  onModeChange,
  identityRules,
  onIdentityRulesChange,
  disabled = false,
}: ModeSelectorProps) {
  const [showSchema, setShowSchema] = useState(false);

  return (
    <div className="space-y-4 border-b border-gray-200 pb-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700">
              Diff Mode
            </label>
            {disabled && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Locked
              </span>
            )}
          </div>
          {mode === "legal_document" && (
            <button
              type="button"
              onClick={() => setShowSchema(true)}
              className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Schema
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => !disabled && onModeChange("general")}
            disabled={disabled}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              mode === "general"
                ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            General YAML
          </button>
          <button
            type="button"
            onClick={() => !disabled && onModeChange("legal_document")}
            disabled={disabled}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              mode === "legal_document"
                ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Legal Document
          </button>
          <button
            type="button"
            onClick={() => !disabled && onModeChange("auto")}
            disabled={disabled}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              mode === "auto"
                ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Auto-detect
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {mode === "auto" &&
            "Automatically detects if YAML follows legal document structure (document → sections → marker)"}
          {mode === "general" &&
            "Generic YAML diffing with path-based change tracking. Great for config files, Kubernetes manifests, etc."}
          {mode === "legal_document" &&
            "Schema-validated diffing for Hebrew legal documents with marker-based section matching"}
        </p>
      </div>

      {mode !== "legal_document" && (
        <IdentityRulesEditor
          rules={identityRules}
          onRulesChange={onIdentityRulesChange}
        />
      )}

      <SchemaViewer isOpen={showSchema} onClose={() => setShowSchema(false)} />
    </div>
  );
}

interface IdentityRulesEditorProps {
  rules: IdentityRule[];
  onRulesChange: (rules: IdentityRule[]) => void;
}

function IdentityRulesEditor({
  rules,
  onRulesChange,
}: IdentityRulesEditorProps) {
  const addRule = () => {
    onRulesChange([
      ...rules,
      { array: "", identity_field: "", when_field: null, when_value: null },
    ]);
  };

  const removeRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof IdentityRule, value: string | null) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value || null };
    onRulesChange(updated);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Identity Fields (optional)
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Specify which field identifies items in each array type. Leave empty for
        auto-detection.
      </p>

      {rules.length === 0 ? (
        <button
          type="button"
          onClick={addRule}
          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + Add identity rule
        </button>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 mb-2">
            <div className="col-span-3">Array Name</div>
            <div className="col-span-2">When Field</div>
            <div className="col-span-2">Equals Value</div>
            <div className="col-span-3">Identity Field</div>
            <div className="col-span-2"></div>
          </div>
          {rules.map((rule, index) => (
            <div key={index} className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={rule.array}
                onChange={(e) => updateRule(index, "array", e.target.value)}
                placeholder="e.g., containers"
                className="col-span-3 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-transparent"
              />
              <input
                type="text"
                value={rule.when_field || ""}
                onChange={(e) =>
                  updateRule(index, "when_field", e.target.value || null)
                }
                placeholder="e.g., type"
                className="col-span-2 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-transparent"
              />
              <input
                type="text"
                value={rule.when_value || ""}
                onChange={(e) =>
                  updateRule(index, "when_value", e.target.value || null)
                }
                placeholder="e.g., book"
                disabled={!rule.when_field}
                className="col-span-2 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
              />
              <input
                type="text"
                value={rule.identity_field}
                onChange={(e) =>
                  updateRule(index, "identity_field", e.target.value)
                }
                placeholder="e.g., name"
                className="col-span-3 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => removeRule(index)}
                className="col-span-2 px-2 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRule}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            + Add rule
          </button>
        </div>
      )}
    </div>
  );
}
