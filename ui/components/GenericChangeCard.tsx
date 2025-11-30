"use client";

import { useState, useEffect } from "react";
import { GenericDiffResult, GenericChangeType } from "@/lib/types";
import { computeCharDiff, DiffChunk } from "@/lib/diff-utils";

interface GenericChangeCardProps {
  change: GenericDiffResult;
  index: number;
}

function getChangeTypeStyles(changeType: GenericChangeType) {
  switch (changeType) {
    case GenericChangeType.KEY_ADDED:
    case GenericChangeType.ITEM_ADDED:
      return {
        badge: "bg-green-100 text-green-800 border-green-300",
        bg: "bg-green-50",
        icon: "+",
      };
    case GenericChangeType.KEY_REMOVED:
    case GenericChangeType.ITEM_REMOVED:
      return {
        badge: "bg-red-100 text-red-800 border-red-300",
        bg: "bg-red-50",
        icon: "-",
      };
    case GenericChangeType.VALUE_CHANGED:
    case GenericChangeType.ITEM_CHANGED:
      return {
        badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
        bg: "bg-yellow-50",
        icon: "~",
      };
    case GenericChangeType.KEY_RENAMED:
      return {
        badge: "bg-blue-100 text-blue-800 border-blue-300",
        bg: "bg-blue-50",
        icon: "↻",
      };
    case GenericChangeType.KEY_MOVED:
    case GenericChangeType.ITEM_MOVED:
      return {
        badge: "bg-purple-100 text-purple-800 border-purple-300",
        bg: "bg-purple-50",
        icon: "↔",
      };
    case GenericChangeType.TYPE_CHANGED:
      return {
        badge: "bg-orange-100 text-orange-800 border-orange-300",
        bg: "bg-orange-50",
        icon: "⚠",
      };
    default:
      return {
        badge: "bg-gray-100 text-gray-800 border-gray-300",
        bg: "bg-gray-50",
        icon: "•",
      };
  }
}

function formatChangeType(changeType: GenericChangeType): string {
  return changeType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function renderDiffedText(chunks: DiffChunk[], type: "old" | "new") {
  // Filter chunks based on side:
  // - Old side: show only "removed" and "unchanged" chunks
  // - New side: show only "added" and "unchanged" chunks
  const filteredChunks = chunks.filter((chunk) => {
    if (chunk.type === "unchanged") return true;
    if (type === "old") return chunk.type === "removed";
    if (type === "new") return chunk.type === "added";
    return false;
  });

  return (
    <pre className="whitespace-pre-wrap text-sm font-mono break-words">
      {filteredChunks.map((chunk, i) => {
        if (chunk.type === "unchanged") {
          return <span key={i}>{chunk.text}</span>;
        }
        if (chunk.type === "removed" && type === "old") {
          return (
            <span key={i} className="bg-red-200 line-through">
              {chunk.text}
            </span>
          );
        }
        if (chunk.type === "added" && type === "new") {
          return (
            <span key={i} className="bg-green-200 font-semibold">
              {chunk.text}
            </span>
          );
        }
        return <span key={i}>{chunk.text}</span>;
      })}
    </pre>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "(empty)";
  }
  if (typeof value === "string") {
    return value.length > 100 ? value.substring(0, 100) + "..." : value;
  }
  if (typeof value === "object") {
    const json = JSON.stringify(value, null, 2);
    return json.length > 200 ? json.substring(0, 200) + "..." : json;
  }
  return String(value);
}

function ValueDisplay({
  value,
  label,
  className,
  diffChunks,
  diffType
}: {
  value: unknown;
  label: string;
  className: string;
  diffChunks?: DiffChunk[];
  diffType?: "old" | "new";
}) {
  const formatted = formatValue(value);
  const isObject = typeof value === "object" && value !== null;
  const useDiff = diffChunks && diffChunks.length > 0 && diffType && !isObject;

  return (
    <div className={`rounded ${className} ${className.includes('p-') ? '' : 'p-3'}`}>
      {label && <div className="text-xs font-semibold text-gray-600 mb-1">{label}:</div>}
      {useDiff ? (
        // Use character-level diff highlighting
        renderDiffedText(diffChunks, diffType)
      ) : isObject ? (
        <pre className="whitespace-pre-wrap text-sm font-mono break-words">
          {formatted}
        </pre>
      ) : (
        <div className="text-sm font-mono break-words">
          {formatted}
        </div>
      )}
    </div>
  );
}

export default function GenericChangeCard({ change, index }: GenericChangeCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [diffChunks, setDiffChunks] = useState<DiffChunk[]>([]);
  const styles = getChangeTypeStyles(change.change_type);

  // Detect if content is unchanged
  const isUnchanged = change.change_type === GenericChangeType.UNCHANGED;

  // Compute character-level diff for value changes
  useEffect(() => {
    const computeDiff = async () => {
      // Only compute diff for value changes (strings/primitives)
      if (
        change.change_type === GenericChangeType.VALUE_CHANGED ||
        change.change_type === GenericChangeType.ITEM_CHANGED
      ) {
        const oldStr = formatValue(change.old_value);
        const newStr = formatValue(change.new_value);
        const chunks = await computeCharDiff(oldStr, newStr);
        setDiffChunks(chunks);
      } else {
        setDiffChunks([]);
      }
    };
    computeDiff();
  }, [change.change_type, change.old_value, change.new_value]);

  // Determine what to show based on change type
  const showOldValue = change.change_type !== GenericChangeType.KEY_ADDED &&
                       change.change_type !== GenericChangeType.ITEM_ADDED;
  const showNewValue = change.change_type !== GenericChangeType.KEY_REMOVED &&
                       change.change_type !== GenericChangeType.ITEM_REMOVED;
  const showKeyChange = change.change_type === GenericChangeType.KEY_RENAMED;
  const showPathChange = change.change_type === GenericChangeType.KEY_MOVED ||
                         change.change_type === GenericChangeType.ITEM_MOVED;

  return (
    <div className={`border rounded-lg ${styles.bg} ${isExpanded ? "" : "overflow-hidden"}`}>
      <div
        className="px-3 sm:px-4 py-3 cursor-pointer hover:bg-opacity-80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded border ${styles.badge}`}
            >
              {styles.icon} {formatChangeType(change.change_type)}
            </span>
            <span className="text-sm font-mono text-gray-700 break-all">
              {change.path}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(change.old_line_number || change.new_line_number) && (
              <span className="text-xs text-gray-500">
                Line {change.old_line_number || change.new_line_number}
              </span>
            )}
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Key rename info */}
          {showKeyChange && change.old_key && change.new_key && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Renamed:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Old Key:</div>
                  <div className="text-sm font-mono text-gray-800">{change.old_key}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="text-xs font-semibold text-gray-600 mb-1">New Key:</div>
                  <div className="text-sm font-mono text-gray-800">{change.new_key}</div>
                </div>
              </div>
            </div>
          )}

          {/* Path change info */}
          {showPathChange && change.old_path && change.new_path && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Moved From → To:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Old Path:</div>
                  <div className="text-sm font-mono text-gray-800 break-all">{change.old_path}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="text-xs font-semibold text-gray-600 mb-1">New Path:</div>
                  <div className="text-sm font-mono text-gray-800 break-all">{change.new_path}</div>
                </div>
              </div>
            </div>
          )}

          {/* Value changes */}
          {(showOldValue || showNewValue) && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {change.change_type === GenericChangeType.TYPE_CHANGED ? "Type Change:" : "Value:"}
              </h4>
              {isUnchanged ? (
                // Unchanged content: show single gray column
                <div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Content (unchanged):</div>
                    <ValueDisplay
                      value={change.old_value ?? change.new_value}
                      label=""
                      className="bg-transparent border-0 p-0"
                    />
                  </div>
                </div>
              ) : (
                // Changed content: show two-column layout
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {showOldValue ? (
                    <ValueDisplay
                      value={change.old_value}
                      label="Old Value"
                      className="bg-red-50 border border-red-200"
                      diffChunks={diffChunks}
                      diffType="old"
                    />
                  ) : (
                    <div className="bg-gray-100 border border-gray-200 rounded p-3">
                      <div className="text-xs text-gray-500 italic">(not applicable)</div>
                    </div>
                  )}
                  {showNewValue ? (
                    <ValueDisplay
                      value={change.new_value}
                      label="New Value"
                      className="bg-green-50 border border-green-200"
                      diffChunks={diffChunks}
                      diffType="new"
                    />
                  ) : (
                    <div className="bg-gray-100 border border-gray-200 rounded p-3">
                      <div className="text-xs text-gray-500 italic">(not applicable)</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Line numbers */}
          {(change.old_line_number || change.new_line_number) && (
            <div className="text-xs text-gray-500 flex gap-4">
              {change.old_line_number && (
                <span>Old line: {change.old_line_number}</span>
              )}
              {change.new_line_number && (
                <span>New line: {change.new_line_number}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
