"use client";

import { useState, useRef, useEffect } from "react";

interface Example {
  id: string;
  name: string;
  description: string;
  oldYamlPath: string;
  newYamlPath: string;
  diffTypes: string[];
}

const exampleDefinitions: Example[] = [
  {
    id: "space-taco",
    name: "Space Taco Truck Mission",
    description: "Demonstrates additions, deletions, and content modifications",
    oldYamlPath: "/examples/space_taco_truck_v1.yaml",
    newYamlPath: "/examples/space_taco_truck_v2.yaml",
    diffTypes: ["Additions", "Deletions", "Content Changes"],
  },
  {
    id: "pet-robot",
    name: "Pet Robot Care Schedule",
    description: "Shows nested structural changes and deep modifications",
    oldYamlPath: "/examples/pet_robot_care_v1.yaml",
    newYamlPath: "/examples/pet_robot_care_v2.yaml",
    diffTypes: ["Nested Changes", "Deep Modifications", "Structural Updates"],
  },
  {
    id: "legal-doc",
    name: "Hebrew Legal Document",
    description: "Real-world example with Hebrew content and complex nesting",
    oldYamlPath: "/examples/document_v1.yaml",
    newYamlPath: "/examples/document_v2.yaml",
    diffTypes: ["Hebrew Content", "Complex Nesting", "Multiple Change Types"],
  },
];

interface DemoSectionProps {
  onLoadExample: (oldYaml: string, newYaml: string) => void;
}

export default function DemoSection({ onLoadExample }: DemoSectionProps) {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
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
        onLoadExample(oldYaml, newYaml);
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
            Compare two YAML files and see what changed. Perfect for tracking
            changes in legal documents, configuration files, and structured data.
          </p>
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
                <ul className="text-sm text-blue-800 space-y-2 mt-3">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      Accepted formats: <code className="bg-blue-100 px-1 rounded">.yaml</code> or{" "}
                      <code className="bg-blue-100 px-1 rounded">.yml</code>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      Documents must have <code className="bg-blue-100 px-1 rounded">document:</code> as the
                      top-level key
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      All sections require a <code className="bg-blue-100 px-1 rounded">marker</code> field
                      (unique identifier)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Supports unlimited nesting levels</span>
                  </li>
                </ul>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            {exampleDefinitions.map((example) => (
              <button
                key={example.id}
                onClick={() => handleLoadExample(example)}
                disabled={isLoading}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${
                    selectedExample === example.id
                      ? "border-[var(--brand-primary)] bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                  }
                  ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2
                `}
                aria-label={`Load ${example.name} example`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {example.name}
                  </h4>
                  {selectedExample === example.id && isLoading && (
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
                <p className="text-xs text-gray-600 mb-3">
                  {example.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {example.diffTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </button>
            ))}
                </div>
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
    </div>
  );
}
