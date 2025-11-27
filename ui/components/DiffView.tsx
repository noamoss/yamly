"use client";

import { DocumentDiff } from "@/lib/types";
import DiffSummary from "./DiffSummary";
import ChangeCard from "./ChangeCard";

interface DiffViewProps {
  diff: DocumentDiff;
}

export default function DiffView({ diff }: DiffViewProps) {
  if (diff.changes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No changes detected between the two versions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DiffSummary diff={diff} />
      <div className="px-6 py-4 space-y-4">
        {diff.changes.map((change, index) => (
          <ChangeCard key={`${change.section_id}-${index}`} change={change} index={index} />
        ))}
      </div>
    </div>
  );
}
