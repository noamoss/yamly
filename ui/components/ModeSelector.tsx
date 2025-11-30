"use client";

import { IdentityRule } from "@/lib/types";

interface ModeSelectorProps {
  mode: "auto" | "general" | "legal_document";
  onModeChange: (mode: "auto" | "general" | "legal_document") => void;
  identityRules: IdentityRule[];
  onIdentityRulesChange: (rules: IdentityRule[]) => void;
}

export default function ModeSelector({
  mode,
  onModeChange,
  identityRules,
  onIdentityRulesChange,
}: ModeSelectorProps) {
  return (
    <div className="space-y-4 border-b border-gray-200 pb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Diff Mode
        </label>
        <select
          value={mode}
          onChange={(e) =>
            onModeChange(
              e.target.value as "auto" | "general" | "legal_document"
            )
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
        >
          <option value="auto">Auto-detect</option>
          <option value="general">General YAML</option>
          <option value="legal_document">Legal Document</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {mode === "auto" &&
            "Automatically detect document structure"}
          {mode === "general" &&
            "Generic YAML diffing (no schema required)"}
          {mode === "legal_document" &&
            "Legal document mode (marker-based diffing)"}
        </p>
      </div>

      {mode !== "legal_document" && (
        <IdentityRulesEditor
          rules={identityRules}
          onRulesChange={onIdentityRulesChange}
        />
      )}
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
