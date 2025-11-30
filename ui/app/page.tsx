"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import YamlEditor from "@/components/YamlEditor";
import FileUpload from "@/components/FileUpload";
import DiffView from "@/components/DiffView";
import ExportButton from "@/components/ExportButton";
import DemoSection from "@/components/DemoSection";
import OnboardingModal, {
  hasSeenOnboarding,
  markOnboardingAsSeen,
} from "@/components/OnboardingModal";
import HelpModal from "@/components/HelpModal";
import Tooltip from "@/components/Tooltip";
import DocumentationLinks from "@/components/DocumentationLinks";
import DocumentationModal from "@/components/DocumentationModal";
import { diffDocuments, ApiError, testApiConnection } from "@/lib/api";
import { DocumentDiff } from "@/lib/types";

type ViewMode = "editor" | "diff";

export default function Home() {
  const [oldYaml, setOldYaml] = useState("");
  const [newYaml, setNewYaml] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [diff, setDiff] = useState<DocumentDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiTestResult, setApiTestResult] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docPath, setDocPath] = useState<string | null>(null);

  // Check for onboarding on mount
  useEffect(() => {
    if (!hasSeenOnboarding()) {
      setShowOnboarding(true);
    }
  }, []);

  const diffMutation = useMutation({
    mutationFn: ({ oldYaml, newYaml }: { oldYaml: string; newYaml: string }) =>
      diffDocuments(oldYaml, newYaml),
    onSuccess: (data) => {
      setDiff(data.diff);
      setViewMode("diff");
      setError(null);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
      setDiff(null);
    },
  });

  const handleTestApi = async () => {
    setApiTestResult("Testing API connection...");
    const result = await testApiConnection();
    setApiTestResult(result.message);
  };

  const handleRunDiff = () => {
    if (!oldYaml.trim() || !newYaml.trim()) {
      setError("Please provide both old and new YAML content");
      return;
    }

    // Basic validation - check if YAML contains 'document:' key
    // Allow whitespace/comments before document: key
    const oldYamlTrimmed = oldYaml.trim();
    const newYamlTrimmed = newYaml.trim();
    const documentKeyPattern = /^#.*\n?document:|^document:/m;

    if (!documentKeyPattern.test(oldYamlTrimmed)) {
      setError("YAML must have 'document:' as the top-level key. Example:\n\ndocument:\n  id: \"test\"\n  title: \"Test\"\n  ...");
      return;
    }
    if (!documentKeyPattern.test(newYamlTrimmed)) {
      setError("YAML must have 'document:' as the top-level key. Example:\n\ndocument:\n  id: \"test\"\n  title: \"Test\"\n  ...");
      return;
    }

    setError(null);
    diffMutation.mutate({ oldYaml, newYaml });
  };

  const handleOldYamlLoad = (content: string) => {
    setOldYaml(content);
    setError(null);
  };

  const handleNewYamlLoad = (content: string) => {
    setNewYaml(content);
    setError(null);
  };

  const handleLoadExample = (oldYaml: string, newYaml: string) => {
    setOldYaml(oldYaml);
    setNewYaml(newYaml);
    setError(null);
    // Optionally scroll to editor area
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between h-auto sm:h-16 py-3 sm:py-0 gap-3 sm:gap-0">
            <div className="flex items-center gap-4">
              <a
                href="https://about.thepitz.studio/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[var(--brand-text)] font-sans text-sm sm:text-base font-normal hover:opacity-80 transition-opacity"
                aria-label="The Pitz Studio"
              >
                <Image
                  src="/favicon.svg"
                  alt="The Pitz Studio"
                  width={24}
                  height={24}
                  className="flex-shrink-0"
                />
                <span>the pitz studio</span>
              </a>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <h1 className="text-xl font-semibold text-gray-900">
                YAML Diff Viewer
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Tooltip content="Check if the API server is reachable and responding">
                <button
                  onClick={handleTestApi}
                  className="px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base"
                  aria-label="Test API connection"
                >
                  Test API
                </button>
              </Tooltip>
              <Tooltip content="Download diff results and discussions as JSON">
                <div>
                  <ExportButton diff={diff} disabled={!diff} />
                </div>
              </Tooltip>
              <Tooltip content="Compare the two YAML documents and see all changes">
                <button
                  onClick={handleRunDiff}
                  disabled={diffMutation.isPending || !oldYaml.trim() || !newYaml.trim()}
                  className={`px-3 sm:px-4 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm sm:text-base flex-1 sm:flex-initial ${
                    diffMutation.isPending || !oldYaml.trim() || !newYaml.trim()
                      ? 'bg-gray-300'
                      : 'bg-[var(--brand-primary)]'
                  } text-white`}
                  aria-label="Run diff to compare documents"
                >
                  {diffMutation.isPending ? (
                    <span className="flex items-center gap-2 justify-center">
                      <svg
                        className="animate-spin h-4 w-4"
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
                      <span className="hidden sm:inline">Running...</span>
                      <span className="sm:hidden">...</span>
                    </span>
                  ) : (
                    "Run Diff"
                  )}
                </button>
              </Tooltip>
              <Tooltip content="Open help and documentation">
                <button
                  onClick={() => setShowHelp(true)}
                  className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                  aria-label="Open help"
                >
                  Help
                </button>
              </Tooltip>
              <DocumentationLinks
                variant="dropdown"
                onDocClick={(path) => {
                  setDocPath(path);
                  setShowDocModal(true);
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setViewMode("editor")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === "editor"
                  ? "text-[var(--brand-primary)] border-[var(--brand-primary)]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Editor
            </button>
            <Tooltip content="View changes in split view or cards view">
              <button
                onClick={() => setViewMode("diff")}
                disabled={!diff}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  viewMode === "diff"
                    ? "text-[var(--brand-primary)] border-[var(--brand-primary)]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
                aria-label="View diff results"
              >
                Diff View
              </button>
            </Tooltip>
          </nav>
        </div>
      </div>

      {/* Demo Section */}
      <DemoSection onLoadExample={handleLoadExample} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {apiTestResult && (
          <div className={`mb-4 border rounded-lg p-4 ${
            apiTestResult.includes("reachable") || apiTestResult.includes("OK")
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {apiTestResult.includes("reachable") || apiTestResult.includes("OK") ? (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  apiTestResult.includes("reachable") || apiTestResult.includes("OK")
                    ? "text-green-800"
                    : "text-yellow-800"
                }`}>
                  API Connection Test
                </h3>
                <div className={`mt-2 text-sm ${
                  apiTestResult.includes("reachable") || apiTestResult.includes("OK")
                    ? "text-green-700"
                    : "text-yellow-700"
                }`}>
                  <p>{apiTestResult}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap font-sans">{error}</pre>
                </div>
                {error.includes("document:") && (
                  <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                    <p className="text-xs text-red-800 font-medium mb-1">
                      How to fix:
                    </p>
                    <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                      <li>Ensure your YAML has <code className="bg-red-200 px-1 rounded">document:</code> as the top-level key</li>
                      <li>All sections must have a <code className="bg-red-200 px-1 rounded">marker</code> field</li>
                      <li>Check that your YAML syntax is valid</li>
                      <li>Try using one of the demo examples above as a reference</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === "editor" ? (
          <div className="space-y-6">
            {!oldYaml && !newYaml && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0"
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
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">
                      <strong>Get started:</strong> Upload or paste two YAML
                      documents, or try an example from the demo section above.
                      Make sure your documents have <code className="bg-blue-100 px-1 rounded">document:</code> as the
                      top-level key.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-4">
                <Tooltip content="Upload a YAML file or paste content directly into the editor">
                  <div>
                    <FileUpload
                      onFileLoad={handleOldYamlLoad}
                      label="Old Version"
                    />
                  </div>
                </Tooltip>
                <div className="h-[400px] sm:h-[500px]">
                  <YamlEditor
                    value={oldYaml}
                    onChange={setOldYaml}
                    placeholder="Paste or type old YAML version here..."
                  />
                </div>
              </div>
              <div className="space-y-4">
                <Tooltip content="Upload a YAML file or paste content directly into the editor">
                  <div>
                    <FileUpload
                      onFileLoad={handleNewYamlLoad}
                      label="New Version"
                    />
                  </div>
                </Tooltip>
                <div className="h-[400px] sm:h-[500px]">
                  <YamlEditor
                    value={newYaml}
                    onChange={setNewYaml}
                    placeholder="Paste or type new YAML version here..."
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {diff ? (
              <DiffView diff={diff} oldYaml={oldYaml} newYaml={newYaml} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Run a diff to see changes here.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onDontShowAgain={() => {
          markOnboardingAsSeen();
          setShowOnboarding(false);
        }}
      />
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        onDocClick={(path) => {
          setDocPath(path);
          setShowDocModal(true);
        }}
      />
      <DocumentationModal
        isOpen={showDocModal}
        docPath={docPath}
        onClose={() => {
          setShowDocModal(false);
          setDocPath(null);
        }}
      />
    </div>
  );
}
