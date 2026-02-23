"use client";

import { DocumentDiff, GenericDiff } from "@/lib/types";
import { useDiscussionsStore } from "@/stores/discussions";

interface ExportButtonProps {
  diff: DocumentDiff | GenericDiff | null;
  disabled?: boolean;
}

export default function ExportButton({ diff, disabled }: ExportButtonProps) {
  const discussions = useDiscussionsStore((state) => state.discussions);

  const handleExport = () => {
    if (!diff) return;

    const exportData = {
      exported_at: new Date().toISOString(),
      diff,
      discussions,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yaml-diff-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || !diff}
      className="px-3 sm:px-4 py-2 bg-[var(--brand-secondary)]/30 text-[var(--foreground)] rounded-lg hover:bg-[var(--brand-secondary)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base border border-[var(--brand-secondary)]/40"
    >
      <span className="hidden sm:inline">Export JSON</span>
      <span className="sm:hidden">Export</span>
    </button>
  );
}
