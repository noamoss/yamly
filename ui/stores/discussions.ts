/** Zustand store for managing discussion threads on diff changes. */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Comment {
  id: string;
  text: string;
  timestamp: string;
  replies: Comment[];
}

export interface Discussion {
  id: string;
  sectionId: string; // Links to DiffResult.section_id
  comments: Comment[];
}

interface DiscussionsState {
  discussions: Discussion[];
  addDiscussion: (sectionId: string) => string; // Returns discussion ID
  addComment: (discussionId: string, text: string, parentCommentId?: string) => void;
  editComment: (discussionId: string, commentId: string, text: string) => void;
  deleteComment: (discussionId: string, commentId: string) => void;
  getDiscussion: (sectionId: string) => Discussion | undefined;
  clearAll: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useDiscussionsStore = create<DiscussionsState>()(
  persist(
    (set, get) => ({
      discussions: [],

      addDiscussion: (sectionId: string) => {
        const existing = get().discussions.find((d) => d.sectionId === sectionId);
        if (existing) {
          return existing.id;
        }

        const newDiscussion: Discussion = {
          id: generateId(),
          sectionId,
          comments: [],
        };

        set((state) => ({
          discussions: [...state.discussions, newDiscussion],
        }));

        return newDiscussion.id;
      },

      addComment: (discussionId: string, text: string, parentCommentId?: string) => {
        if (!text.trim()) return;

        const newComment: Comment = {
          id: generateId(),
          text: text.trim(),
          timestamp: new Date().toISOString(),
          replies: [],
        };

        set((state) => ({
          discussions: state.discussions.map((discussion) => {
            if (discussion.id !== discussionId) return discussion;

            if (parentCommentId) {
              // Add as reply
              return {
                ...discussion,
                comments: discussion.comments.map((comment) => {
                  if (comment.id === parentCommentId) {
                    return {
                      ...comment,
                      replies: [...comment.replies, newComment],
                    };
                  }
                  // Recursively check replies
                  const updateReplies = (c: Comment): Comment => {
                    if (c.id === parentCommentId) {
                      return {
                        ...c,
                        replies: [...c.replies, newComment],
                      };
                    }
                    return {
                      ...c,
                      replies: c.replies.map(updateReplies),
                    };
                  };
                  return updateReplies(comment);
                }),
              };
            } else {
              // Add as top-level comment
              return {
                ...discussion,
                comments: [...discussion.comments, newComment],
              };
            }
          }),
        }));
      },

      editComment: (discussionId: string, commentId: string, text: string) => {
        if (!text.trim()) return;

        set((state) => ({
          discussions: state.discussions.map((discussion) => {
            if (discussion.id !== discussionId) return discussion;

            const updateComment = (comment: Comment): Comment => {
              if (comment.id === commentId) {
                return { ...comment, text: text.trim() };
              }
              return {
                ...comment,
                replies: comment.replies.map(updateComment),
              };
            };

            return {
              ...discussion,
              comments: discussion.comments.map(updateComment),
            };
          }),
        }));
      },

      deleteComment: (discussionId: string, commentId: string) => {
        set((state) => ({
          discussions: state.discussions.map((discussion) => {
            if (discussion.id !== discussionId) return discussion;

            const filterComment = (comment: Comment): Comment | null => {
              if (comment.id === commentId) return null;
              return {
                ...comment,
                replies: comment.replies.map(filterComment).filter((c): c is Comment => c !== null),
              };
            };

            return {
              ...discussion,
              comments: discussion.comments
                .map(filterComment)
                .filter((c): c is Comment => c !== null),
            };
          }),
        }));
      },

      getDiscussion: (sectionId: string) => {
        return get().discussions.find((d) => d.sectionId === sectionId);
      },

      clearAll: () => {
        set({ discussions: [] });
      },
    }),
    {
      name: "yaml-diff-discussions",
      storage: typeof window !== "undefined"
        ? createJSONStorage(() => localStorage)
        : undefined,
    }
  )
);
