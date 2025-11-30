"use client";

import { DocumentDiff, GenericDiff } from "@/lib/types";

interface DiffSummaryProps {
  diff: DocumentDiff | GenericDiff;
}

function isDocumentDiff(diff: DocumentDiff | GenericDiff): diff is DocumentDiff {
  return "added_count" in diff && "deleted_count" in diff && "modified_count" in diff && "moved_count" in diff;
}

export default function DiffSummary({ diff }: DiffSummaryProps) {
  if (isDocumentDiff(diff)) {
    // Document diff summary
    return (
      <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
          <span className="font-semibold text-gray-700">Changes Summary:</span>
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-medium">
              +{diff.added_count} added
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-medium">
              -{diff.deleted_count} removed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 font-medium">
              ~{diff.modified_count} modified
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-600 font-medium">
              ↔{diff.moved_count} moved
            </span>
          </div>
          <div className="ml-auto text-gray-500">
            Total: {diff.added_count + diff.deleted_count + diff.modified_count + diff.moved_count} changes
          </div>
        </div>
      </div>
    );
  } else {
    // Generic diff summary
    const totalChanges =
      diff.value_changed_count +
      diff.key_added_count +
      diff.key_removed_count +
      diff.key_renamed_count +
      diff.key_moved_count +
      diff.item_added_count +
      diff.item_removed_count +
      diff.item_changed_count +
      diff.item_moved_count +
      diff.type_changed_count;

    return (
      <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
          <span className="font-semibold text-gray-700">Changes Summary:</span>
          {diff.value_changed_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 font-medium">
                ~{diff.value_changed_count} values changed
              </span>
            </div>
          )}
          {diff.key_added_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-medium">
                +{diff.key_added_count} keys added
              </span>
            </div>
          )}
          {diff.key_removed_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-medium">
                -{diff.key_removed_count} keys removed
              </span>
            </div>
          )}
          {diff.key_renamed_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium">
                ↻{diff.key_renamed_count} keys renamed
              </span>
            </div>
          )}
          {diff.key_moved_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-purple-600 font-medium">
                ↔{diff.key_moved_count} keys moved
              </span>
            </div>
          )}
          {diff.item_added_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-medium">
                +{diff.item_added_count} items added
              </span>
            </div>
          )}
          {diff.item_removed_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-medium">
                -{diff.item_removed_count} items removed
              </span>
            </div>
          )}
          {diff.item_changed_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 font-medium">
                ~{diff.item_changed_count} items changed
              </span>
            </div>
          )}
          {diff.item_moved_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-purple-600 font-medium">
                ↔{diff.item_moved_count} items moved
              </span>
            </div>
          )}
          {diff.type_changed_count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-orange-600 font-medium">
                ⚠{diff.type_changed_count} type changes
              </span>
            </div>
          )}
          <div className="ml-auto text-gray-500">
            Total: {totalChanges} changes
          </div>
        </div>
      </div>
    );
  }
}
