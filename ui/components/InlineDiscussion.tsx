"use client";

import { useState } from "react";
import { DiffResult, ChangeType } from "@/lib/types";
import { formatMarkerPath } from "@/lib/diff-utils";
import { useDiscussionsStore } from "@/stores/discussions";
import DiscussionThread from "./DiscussionThread";

interface InlineDiscussionProps {
  change: DiffResult;
  lineNumber: number;
  side: "old" | "new";
}

function formatChangeType(changeType: ChangeType): string {
  return changeType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getChangeTypeStyles(changeType: ChangeType) {
  switch (changeType) {
    case ChangeType.SECTION_ADDED:
      return "bg-green-100 text-green-800 border-green-300";
    case ChangeType.SECTION_REMOVED:
      return "bg-red-100 text-red-800 border-red-300";
    case ChangeType.CONTENT_CHANGED:
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case ChangeType.TITLE_CHANGED:
      return "bg-blue-100 text-blue-800 border-blue-300";
    case ChangeType.SECTION_MOVED:
      return "bg-purple-100 text-purple-800 border-purple-300";
    default:
      return "bg-[var(--brand-secondary)]/20 text-[var(--foreground)] border-[var(--brand-secondary)]/40";
  }
}

export default function InlineDiscussion({ change, lineNumber, side }: InlineDiscussionProps) {
  const [commentText, setCommentText] = useState("");

  const changeId = change.id;
  const discussion = useDiscussionsStore((state) => state.getDiscussion(changeId));
  const addDiscussion = useDiscussionsStore((state) => state.addDiscussion);
  const addComment = useDiscussionsStore((state) => state.addComment);
  const editComment = useDiscussionsStore((state) => state.editComment);
  const deleteComment = useDiscussionsStore((state) => state.deleteComment);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    if (!changeId) return;

    const discussionId = discussion ? discussion.id : addDiscussion(changeId);
    addComment(discussionId, commentText);
    setCommentText("");
  };

  const handleDiscussionActions = {
    onAddComment: (text: string, parentCommentId?: string) => {
      if (!changeId) return;
      const discussionId = discussion ? discussion.id : addDiscussion(changeId);
      addComment(discussionId, text, parentCommentId);
    },
    onEditComment: (commentId: string, text: string) => {
      if (!discussion) return;
      editComment(discussion.id, commentId, text);
    },
    onDeleteComment: (commentId: string) => {
      if (!discussion) return;
      deleteComment(discussion.id, commentId);
    },
  };

  const hasPathChange =
    JSON.stringify(change.old_marker_path) !== JSON.stringify(change.new_marker_path);
  const hasTitleChange = change.old_title !== change.new_title;
  const hasContentChange =
    change.old_content !== change.new_content ||
    (change.old_content === null && change.new_content !== null) ||
    (change.old_content !== null && change.new_content === null);

  return (
    <div className="bg-[var(--brand-background)] border border-[var(--brand-secondary)]/40 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] p-3 w-80 max-w-full">
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-[var(--brand-secondary)]/30">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded border ${getChangeTypeStyles(
              change.change_type
            )}`}
          >
            {formatChangeType(change.change_type)}
          </span>
        </div>
        <div className="text-xs space-y-1">
          <div>
            <span className="font-medium text-[var(--foreground)]">Marker:</span>{" "}
            <span className="font-mono text-[var(--foreground)]">{change.marker}</span>
          </div>
          {hasPathChange && change.change_type === ChangeType.SECTION_MOVED && (
            <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200 mt-2">
              <span className="text-purple-700 font-semibold">from:</span>
              <span className="font-mono text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                {formatMarkerPath(change.old_marker_path)}
              </span>
              <svg
                className="w-4 h-4 text-purple-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 7l5 5m0 0l-5 5m5-5H4"
                  style={{ transform: 'translateX(2px)' }}
                />
              </svg>
              <span className="text-purple-700 font-semibold">to:</span>
              <span className="font-mono text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                {formatMarkerPath(change.new_marker_path)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Change details */}
      {(hasTitleChange || hasContentChange) && (
        <div className="mb-3 pb-2 border-b border-[var(--brand-secondary)]/30 space-y-2">
          {hasTitleChange && (
            <div>
              <h5 className="text-xs font-semibold text-[var(--foreground)] mb-1">Title Change:</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="font-mono text-[var(--foreground)]">{change.old_title || "(empty)"}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="font-mono text-[var(--foreground)]">{change.new_title || "(empty)"}</div>
                </div>
              </div>
            </div>
          )}
          {hasContentChange && (
            <div>
              <h5 className="text-xs font-semibold text-[var(--foreground)] mb-1">Content Change:</h5>
              <div className="grid grid-cols-2 gap-2 text-xs max-h-32 overflow-y-auto">
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <pre className="whitespace-pre-wrap font-mono text-[var(--foreground)] text-xs">
                    {change.old_content || "(empty)"}
                  </pre>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <pre className="whitespace-pre-wrap font-mono text-[var(--foreground)] text-xs">
                    {change.new_content || "(empty)"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Discussion */}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-[var(--foreground)]">Discussion</h5>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleAddComment();
            }
          }}
          className="w-full p-2 border border-[var(--brand-secondary)]/40 rounded resize-none text-xs bg-[var(--brand-background)]"
          rows={3}
          placeholder="Add a comment... (Cmd/Ctrl+Enter to submit)"
        />
        <button
          onClick={handleAddComment}
          disabled={!commentText.trim()}
          className="px-3 py-1 bg-[var(--brand-cta-bg)] text-[var(--brand-cta-text)] rounded text-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Comment
        </button>

        {discussion && discussion.comments.length > 0 && (
          <div className="mt-3">
            <DiscussionThread comments={discussion.comments} {...handleDiscussionActions} />
          </div>
        )}
      </div>
    </div>
  );
}
