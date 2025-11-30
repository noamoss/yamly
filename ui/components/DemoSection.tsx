"use client";

import { useState, useRef, useEffect } from "react";
import { DiffMode, IdentityRule } from "@/lib/types";
import ModeSelector from "./ModeSelector";
import SchemaViewer from "./SchemaViewer";

interface Example {
  id: string;
  name: string;
  description: string;
  oldYamlPath: string;
  newYamlPath: string;
  diffTypes: string[];
  category: "legal" | "generic";
}

const exampleDefinitions: Example[] = [
  // Legal Document Examples
  {
    id: "space-taco",
    name: "Space Taco Truck Mission",
    description: "Demonstrates additions, deletions, and content modifications",
    oldYamlPath: "/examples/space_taco_truck_v1.yaml",
    newYamlPath: "/examples/space_taco_truck_v2.yaml",
    diffTypes: ["Section Added", "Section Removed", "Content Changed", "Item Added"],
    category: "legal",
  },
  {
    id: "pet-robot",
    name: "Pet Robot Care Schedule",
    description: "Shows nested structural changes and deep modifications",
    oldYamlPath: "/examples/pet_robot_care_v1.yaml",
    newYamlPath: "/examples/pet_robot_care_v2.yaml",
    diffTypes: ["Deep Nesting", "Nested Content Changes", "Nested Section Added"],
    category: "legal",
  },
  {
    id: "legal-doc",
    name: "Hebrew Legal Document",
    description: "Real-world example with Hebrew content and complex nesting",
    oldYamlPath: "/examples/document_v1.yaml",
    newYamlPath: "/examples/document_v2.yaml",
    diffTypes: ["Section Moved", "Title Changed", "Section Added/Removed", "Content Changed", "Multiple Languages Content Support"],
    category: "legal",
  },
  // Generic YAML Examples
  {
    id: "kubernetes",
    name: "Kubernetes Deployment",
    description: "Compare K8s deployment changes: replicas, images, resources",
    oldYamlPath: "/examples/kubernetes_v1.yaml",
    newYamlPath: "/examples/kubernetes_v2.yaml",
    diffTypes: ["Value Changed", "Key Added", "Item Changed"],
    category: "generic",
  },
  {
    id: "config",
    name: "Application Config",
    description: "Configuration file changes: database, cache, features",
    oldYamlPath: "/examples/config_v1.yaml",
    newYamlPath: "/examples/config_v2.yaml",
    diffTypes: ["Key Renamed", "Key Added/Removed", "Value Changed", "Item Changed"],
    category: "generic",
  },
];

interface DemoSectionProps {
  onLoadExample: (oldYaml: string, newYaml: string, mode: "general" | "legal_document") => void;
  onClearExample: () => void;
  mode: DiffMode;
  onModeChange: (mode: DiffMode) => void;
  isModeLocked: boolean;
  onModeLockChange: (locked: boolean) => void;
  identityRules: IdentityRule[];
  onIdentityRulesChange: (rules: IdentityRule[]) => void;
}

interface ExampleButtonProps {
  example: Example;
  isSelected: boolean;
  isLoading: boolean;
  onClick: () => void;
  disabled: boolean;
}

function ExampleButton({ example, isSelected, isLoading, onClick, disabled }: ExampleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-3 rounded-lg border-2 text-left transition-all
        ${
          isSelected
            ? "border-[var(--brand-primary)] bg-blue-50"
            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2
      `}
      aria-label={`Load ${example.name} example`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <h4 className="font-semibold text-gray-900 text-sm">
          {example.name}
        </h4>
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4 text-[var(--brand-primary)]"
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
        )}
      </div>
      <p className="text-xs text-gray-600 mb-2">
        {example.description}
      </p>
      <div className="flex flex-wrap gap-1">
        {example.diffTypes.map((type) => (
          <span
            key={type}
            className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
          >
            {type}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function DemoSection({
  onLoadExample,
  onClearExample,
  mode,
  onModeChange,
  isModeLocked,
  onModeLockChange,
  identityRules,
  onIdentityRulesChange,
}: DemoSectionProps) {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleLoadExample = async (example: Example) => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setSelectedExample(example.id);
    setLoadError(null);

    try {
      // Fetch both YAML files with abort signal
      const [oldResponse, newResponse] = await Promise.all([
        fetch(example.oldYamlPath, { signal }),
        fetch(example.newYamlPath, { signal }),
      ]);

      if (!oldResponse.ok || !newResponse.ok) {
        throw new Error("Failed to load example files");
      }

      const [oldYaml, newYaml] = await Promise.all([
        oldResponse.text(),
        newResponse.text(),
      ]);

      // Only update state if request wasn't aborted
      if (!signal.aborted) {
        // Set mode to match example category and lock it
        const exampleMode: "general" | "legal_document" = example.category === "generic" ? "general" : "legal_document";
        onModeChange(exampleMode);
        onModeLockChange(true);
        onLoadExample(oldYaml, newYaml, exampleMode);
        setIsLoading(false);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      // Only update state if request wasn't aborted
      if (!signal.aborted) {
        setLoadError(error instanceof Error ? error.message : "Failed to load example");
        setIsLoading(false);
      }
    }
  };

  // Filter examples based on mode
  const getFilteredExamples = () => {
    if (mode === "auto") {
      return exampleDefinitions;
    } else if (mode === "general") {
      return exampleDefinitions.filter((e) => e.category === "generic");
    } else {
      return exampleDefinitions.filter((e) => e.category === "legal");
    }
  };

  const filteredExamples = getFilteredExamples();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Service Explanation - Always visible, compact */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            What is yaml-diffs?
          </h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            <strong>Semantic YAML diffing</strong> that understands structure, not just lines. Unlike standard diff tools that compare line-by-line, yaml-diffs intelligently detects moves, renames, and structural changes while reducing noise from formatting. Features advanced array matching with custom identity rules, dual-mode operation (generic YAML + legal documents), and a complete API/UI ecosystem. Perfect for tracking configuration changes, infrastructure-as-code updates, legal document revisions, and any structured YAML data where context matters.
          </p>
        </div>

        {/* Mode Selector - At the top */}
        <div className="mb-4 bg-white rounded-lg p-4 border border-gray-200">
          <ModeSelector
            mode={mode}
            onModeChange={onModeChange}
            identityRules={identityRules}
            onIdentityRulesChange={onIdentityRulesChange}
            disabled={isModeLocked}
          />
          {isModeLocked && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Mode is locked to match the selected example. Clear the example to change mode.
              </p>
              <button
                type="button"
                onClick={() => {
                  onModeLockChange(false);
                  setSelectedExample(null);
                  onClearExample();
                }}
                className="text-xs text-[var(--brand-primary)] hover:underline"
              >
                Clear & Unlock
              </button>
            </div>
          )}
        </div>

        {/* Accordion Sections */}
        <div className="space-y-2">
          {/* Input Requirements Accordion */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => toggleSection("requirements")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              aria-expanded={expandedSection === "requirements"}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-blue-600 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium text-gray-900">
                  Input Requirements
                </span>
              </div>
              <svg
                className={`h-5 w-5 text-gray-500 transition-transform ${
                  expandedSection === "requirements" ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {expandedSection === "requirements" && (
              <div className="px-4 pb-4 border-t border-gray-200 bg-blue-50">
                {mode === "auto" ? (
                  // Show both modes when auto-detect
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">General YAML Mode</h4>
                      <ul className="text-sm text-blue-800 space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Any valid YAML file works</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Uses path-based change tracking</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Auto-detects array item identity</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Great for configs, K8s manifests</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">Legal Document Mode</h4>
                      <ul className="text-sm text-blue-800 space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>
                            Requires <code className="bg-blue-100 px-1 rounded text-xs">document:</code> top-level key
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>
                            Sections need <code className="bg-blue-100 px-1 rounded text-xs">marker</code> field
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Schema validation built-in</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>Hebrew legal documents</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : mode === "general" ? (
                  // Show only General YAML mode
                  <div className="mt-3">
                    <h4 className="font-semibold text-blue-900 mb-2 text-sm">General YAML Mode Requirements</h4>
                    <ul className="text-sm text-blue-800 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Any valid YAML file works - no specific structure required</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Uses path-based change tracking (e.g., <code className="bg-blue-100 px-1 rounded text-xs">spec.replicas</code>)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Auto-detects array item identity by common fields (<code className="bg-blue-100 px-1 rounded text-xs">id</code>, <code className="bg-blue-100 px-1 rounded text-xs">name</code>, <code className="bg-blue-100 px-1 rounded text-xs">key</code>)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Perfect for config files, Kubernetes manifests, CI/CD pipelines, and more</span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  // Show only Legal Document mode with schema reference
                  <div className="mt-3">
                    <h4 className="font-semibold text-blue-900 mb-2 text-sm">Legal Document Mode - Schema Requirements</h4>

                    <div className="space-y-3">
                      <div>
                        <h5 className="text-xs font-semibold text-blue-800 mb-1.5">Document (all required fields):</h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              <code className="bg-blue-100 px-1 rounded text-xs">id</code>: String identifier (UUID or custom)
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              <code className="bg-blue-100 px-1 rounded text-xs">title</code>: Document title (Hebrew)
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              <code className="bg-blue-100 px-1 rounded text-xs">type</code>: Must be <code className="bg-blue-100 px-0.5 rounded text-xs">'law'</code>, <code className="bg-blue-100 px-0.5 rounded text-xs">'regulation'</code>, <code className="bg-blue-100 px-0.5 rounded text-xs">'directive'</code>, <code className="bg-blue-100 px-0.5 rounded text-xs">'circular'</code>, <code className="bg-blue-100 px-0.5 rounded text-xs">'policy'</code>, or <code className="bg-blue-100 px-0.5 rounded text-xs">'other'</code>
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              <code className="bg-blue-100 px-1 rounded text-xs">language</code>: Must be <code className="bg-blue-100 px-0.5 rounded text-xs">'hebrew'</code>
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              <code className="bg-blue-100 px-1 rounded text-xs">version</code>: Object with required <code className="bg-blue-100 px-0.5 rounded text-xs">number</code> field
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              <code className="bg-blue-100 px-1 rounded text-xs">source</code>: Object with required <code className="bg-blue-100 px-0.5 rounded text-xs">url</code> and <code className="bg-blue-100 px-0.5 rounded text-xs">fetched_at</code> fields
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              <code className="bg-blue-100 px-1 rounded text-xs">sections</code>: Array of section objects
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-xs font-semibold text-blue-800 mb-1.5">Section (required fields):</h5>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              <code className="bg-blue-100 px-1 rounded text-xs">marker</code>: Unique structural marker (e.g., "1", "1.א", "(b)") - must be unique at same nesting level
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>
                              <code className="bg-blue-100 px-1 rounded text-xs">sections</code>: Array of nested sections (can be empty)
                            </span>
                          </li>
                        </ul>
                        <p className="text-xs text-blue-700 mt-1.5 italic">
                          Optional: <code className="bg-blue-100 px-0.5 rounded text-xs">id</code> (auto-generated if not provided), <code className="bg-blue-100 px-0.5 rounded text-xs">title</code>, <code className="bg-blue-100 px-0.5 rounded text-xs">content</code>
                        </p>
                      </div>
                    </div>

                    {/* Schema Reference Box */}
                    <div className="mt-4 p-4 bg-white border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Predefined Schema
                        </h5>
                        <button
                          onClick={() => setShowSchema(true)}
                          className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                        >
                          View Full Schema →
                        </button>
                      </div>
                      <p className="text-xs text-blue-800">
                        Legal documents must follow the OpenSpec schema with recursive sections. Each section contains a <code className="bg-blue-100 px-1 rounded">marker</code> (required), optional <code className="bg-blue-100 px-1 rounded">title</code>, <code className="bg-blue-100 px-1 rounded">content</code>, and nested <code className="bg-blue-100 px-1 rounded">sections</code>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Example Documents Accordion */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => toggleSection("examples")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              aria-expanded={expandedSection === "examples"}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[var(--brand-primary)] flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="font-medium text-gray-900">
                  Try Example Documents
                </span>
              </div>
              <svg
                className={`h-5 w-5 text-gray-500 transition-transform ${
                  expandedSection === "examples" ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {expandedSection === "examples" && (
              <div className="px-4 pb-4 border-t border-gray-200">
                {filteredExamples.length === 0 ? (
                  <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      No examples available for the selected mode. Switch to "Auto-detect" to see all examples.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    {mode === "auto" ? (
                      // Show both categories when in auto mode
                      <>
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Generic YAML
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredExamples.filter(e => e.category === "generic").map((example) => (
                              <ExampleButton
                                key={example.id}
                                example={example}
                                isSelected={selectedExample === example.id}
                                isLoading={isLoading && selectedExample === example.id}
                                onClick={() => handleLoadExample(example)}
                                disabled={isLoading}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            Legal Documents
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {filteredExamples.filter(e => e.category === "legal").map((example) => (
                              <ExampleButton
                                key={example.id}
                                example={example}
                                isSelected={selectedExample === example.id}
                                isLoading={isLoading && selectedExample === example.id}
                                onClick={() => handleLoadExample(example)}
                                disabled={isLoading}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      // Show single category when mode is specific
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredExamples.map((example) => (
                          <ExampleButton
                            key={example.id}
                            example={example}
                            isSelected={selectedExample === example.id}
                            isLoading={isLoading && selectedExample === example.id}
                            onClick={() => handleLoadExample(example)}
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {loadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-red-800">
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
              <span>Error loading example: {loadError}</span>
            </div>
          </div>
        )}
        {selectedExample && !isLoading && !loadError && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <svg
                className="h-5 w-5 text-green-600"
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
                Example loaded! Click "Run Diff" to see the changes.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Schema Viewer Modal */}
      <SchemaViewer isOpen={showSchema} onClose={() => setShowSchema(false)} />
    </div>
  );
}
