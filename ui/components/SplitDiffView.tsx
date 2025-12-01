"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { EditorView, lineNumbers, Decoration, gutter, GutterMarker } from "@codemirror/view";
import { EditorState, Extension, Range, RangeSet } from "@codemirror/state";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { yaml } from "@codemirror/lang-yaml";
import { DocumentDiff, DiffResult, ChangeType, GenericDiff, GenericDiffResult, GenericChangeType } from "@/lib/types";
import { formatMarkerPath, computeCharDiff, DiffChunk } from "@/lib/diff-utils";
import { useDiscussionsStore } from "@/stores/discussions";
import InlineDiscussion from "./InlineDiscussion";

interface SplitDiffViewProps {
  oldYaml: string;
  newYaml: string;
  diff: DocumentDiff | GenericDiff;
}

function isDocumentDiff(diff: DocumentDiff | GenericDiff): diff is DocumentDiff {
  return "added_count" in diff && "deleted_count" in diff && "modified_count" in diff && "moved_count" in diff;
}

function isDocumentDiffResult(change: DiffResult | GenericDiffResult): change is DiffResult {
  return "section_id" in change && "marker" in change;
}

// Gutter marker to display discussion icon
class DiscussionGutterMarker extends GutterMarker {
  constructor(private onClick: () => void) {
    super();
  }

  eq(other: DiscussionGutterMarker) {
    return this.onClick === other.onClick;
  }

  toDOM() {
    const icon = document.createElement("span");
    icon.className = "cm-discussion-icon-gutter";
    icon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 2.75C1.5 2.33579 1.83579 2 2.25 2H13.75C14.1642 2 14.5 2.33579 14.5 2.75V11.25C14.5 11.6642 14.1642 12 13.75 12H9.5L6.5 14.5V12H2.25C1.83579 12 1.5 11.6642 1.5 11.25V2.75Z" fill="#0969da" stroke="#0969da" stroke-width="0.5"/>
        <circle cx="5.5" cy="7" r="0.75" fill="white"/>
        <circle cx="8" cy="7" r="0.75" fill="white"/>
        <circle cx="10.5" cy="7" r="0.75" fill="white"/>
      </svg>
    `;
    icon.style.cssText = `
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      opacity: 0.8;
      vertical-align: middle;
      margin-left: 4px;
    `;
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onClick();
    });
    icon.addEventListener("mouseenter", () => {
      icon.style.opacity = "1";
    });
    icon.addEventListener("mouseleave", () => {
      icon.style.opacity = "0.8";
    });
    return icon;
  }
}


export default function SplitDiffView({ oldYaml, newYaml, diff }: SplitDiffViewProps) {
  const oldEditorRef = useRef<HTMLDivElement>(null);
  const newEditorRef = useRef<HTMLDivElement>(null);
  const oldViewRef = useRef<EditorView | null>(null);
  const newViewRef = useRef<EditorView | null>(null);
  const [expandedDiscussions, setExpandedDiscussions] = useState<Set<string>>(new Set());
  const scrollSyncRef = useRef<boolean>(true);
  const discussionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lineToChangesMapRef = useRef<Map<string, string[]>>(new Map());

  // Get discussions store to check for discussions
  const getDiscussion = useDiscussionsStore((state) => state.getDiscussion);

  // Map changes to line ranges using line numbers from API
  const mapChangesToLines = useCallback((changes: (DiffResult | GenericDiffResult)[]) => {
    const changeMap = new Map<string, { oldLine?: number; newLine?: number }>();

    for (const change of changes) {
      // Use line numbers directly from API response
      const oldLine = change.old_line_number ?? undefined;
      const newLine = change.new_line_number ?? undefined;

      if (oldLine || newLine) {
        changeMap.set(change.id, { oldLine, newLine });
      }
    }

    return changeMap;
  }, []);

  const [changeLineMap, setChangeLineMap] = useState<Map<string, { oldLine?: number; newLine?: number }>>(new Map());

  // Compute change line mappings from API data
  useEffect(() => {
    const map = mapChangesToLines(diff.changes);
    setChangeLineMap(map);
  }, [diff.changes, mapChangesToLines]);

  // Create reverse mapping: line number -> change IDs (for click-to-focus and gutter markers)
  const lineToChangesMap = useMemo(() => {
    const map = new Map<string, string[]>(); // key: "old:5" or "new:10", value: change IDs
    for (const change of diff.changes) {
      const mapping = changeLineMap.get(change.id);
      if (mapping?.oldLine) {
        const key = `old:${mapping.oldLine}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(change.id);
      }
      if (mapping?.newLine) {
        const key = `new:${mapping.newLine}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(change.id);
      }
    }
    lineToChangesMapRef.current = map;
    return map;
  }, [changeLineMap, diff.changes]);

  // Create gutter markers for discussion icons (old editor)
  const createOldGutterMarkers = useCallback((view: EditorView) => {
    const markers: Range<GutterMarker>[] = [];
    const currentLineToChangesMap = lineToChangesMapRef.current;

    for (let i = 0; i < view.state.doc.lines; i++) {
      const line = view.state.doc.line(i + 1);
      const key = `old:${i + 1}`;
      const changeIds = currentLineToChangesMap.get(key);

      if (changeIds && changeIds.length > 0) {
        // Check if any of the changes have discussions
        const hasDiscussion = changeIds.some((changeId) => {
          const discussion = getDiscussion(changeId);
          return discussion && discussion.comments.length > 0;
        });

        if (hasDiscussion) {
          const marker = new DiscussionGutterMarker(() => {
            const changeId = changeIds[0];
            setExpandedDiscussions((prev) => {
              const next = new Set(prev);
              next.add(changeId);
              return next;
            });
            setTimeout(() => {
              const discussionElement = discussionRefs.current.get(changeId);
              if (discussionElement) {
                discussionElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }, 100);
          });
          markers.push(marker.range(line.from));
        }
      }
    }

    return RangeSet.of(markers);
  }, [getDiscussion]); // lineToChangesMapRef.current is used, not the memoized value

  // Create gutter markers for discussion icons (new editor)
  const createNewGutterMarkers = useCallback((view: EditorView) => {
    const markers: Range<GutterMarker>[] = [];
    const currentLineToChangesMap = lineToChangesMapRef.current;

    for (let i = 0; i < view.state.doc.lines; i++) {
      const line = view.state.doc.line(i + 1);
      const key = `new:${i + 1}`;
      const changeIds = currentLineToChangesMap.get(key);

      if (changeIds && changeIds.length > 0) {
        // Check if any of the changes have discussions
        const hasDiscussion = changeIds.some((changeId) => {
          const discussion = getDiscussion(changeId);
          return discussion && discussion.comments.length > 0;
        });

        if (hasDiscussion) {
          const marker = new DiscussionGutterMarker(() => {
            const changeId = changeIds[0];
            setExpandedDiscussions((prev) => {
              const next = new Set(prev);
              next.add(changeId);
              return next;
            });
            setTimeout(() => {
              const discussionElement = discussionRefs.current.get(changeId);
              if (discussionElement) {
                discussionElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }, 100);
          });
          markers.push(marker.range(line.from));
        }
      }
    }

    return RangeSet.of(markers);
  }, [getDiscussion]); // lineToChangesMapRef.current is used, not the memoized value

  // Compute which lines should be highlighted based on API semantic changes
  const { oldHighlightLines, newHighlightLines } = useMemo(() => {
    const oldLines = new Set<number>();
    const newLines = new Set<number>();

    for (const change of diff.changes) {
      // Skip unchanged items
      const isUnchanged =
        ('change_type' in change && change.change_type === ChangeType.UNCHANGED) ||
        ('change_type' in change && change.change_type === GenericChangeType.UNCHANGED);
      if (isUnchanged) continue;

      if (change.old_line_number) {
        oldLines.add(change.old_line_number);
      }
      if (change.new_line_number) {
        newLines.add(change.new_line_number);
      }
    }

    return { oldHighlightLines: oldLines, newHighlightLines: newLines };
  }, [diff.changes]);

  // Compute character-level diffs for changed lines
  const [charDiffs, setCharDiffs] = useState<Map<string, DiffChunk[]>>(new Map());

  useEffect(() => {
    const computeDiffs = async () => {
      const diffs = new Map<string, DiffChunk[]>();
      const oldLines = oldYaml.split('\n');
      const newLines = newYaml.split('\n');

      // Find matching old/new line pairs for character-level diff
      for (const change of diff.changes) {
        const isUnchanged =
          ('change_type' in change && change.change_type === ChangeType.UNCHANGED) ||
          ('change_type' in change && change.change_type === GenericChangeType.UNCHANGED);
        if (isUnchanged) continue;

        const oldLineNum = change.old_line_number;
        const newLineNum = change.new_line_number;

        if (oldLineNum && newLineNum) {
          // Both old and new lines exist - compute character diff
          const oldLineText = oldLines[oldLineNum - 1] || '';
          const newLineText = newLines[newLineNum - 1] || '';

          if (oldLineText !== newLineText) {
            try {
              const allChunks = await computeCharDiff(oldLineText, newLineText);

              // For old side: show removed and unchanged chunks
              const oldChunks: DiffChunk[] = [];
              for (const chunk of allChunks) {
                if (chunk.type === 'removed' || chunk.type === 'unchanged') {
                  oldChunks.push(chunk);
                }
              }
              if (oldChunks.length > 0) {
                diffs.set(`old:${oldLineNum}`, oldChunks);
              }

              // For new side: show added and unchanged chunks
              const newChunks: DiffChunk[] = [];
              for (const chunk of allChunks) {
                if (chunk.type === 'added' || chunk.type === 'unchanged') {
                  newChunks.push(chunk);
                }
              }
              if (newChunks.length > 0) {
                diffs.set(`new:${newLineNum}`, newChunks);
              }
            } catch (error) {
              console.error('Error computing char diff:', error);
            }
          }
        } else if (oldLineNum) {
          // Only old line - mark entire line as removed
          const oldLineText = oldLines[oldLineNum - 1] || '';
          if (oldLineText) {
            diffs.set(`old:${oldLineNum}`, [{ text: oldLineText, type: 'removed' }]);
          }
        } else if (newLineNum) {
          // Only new line - mark entire line as added
          const newLineText = newLines[newLineNum - 1] || '';
          if (newLineText) {
            diffs.set(`new:${newLineNum}`, [{ text: newLineText, type: 'added' }]);
          }
        }
      }

      setCharDiffs(diffs);
    };

    computeDiffs();
  }, [oldYaml, newYaml, diff.changes]);

  // Create decorations for old editor (using API semantic changes + character-level diffs)
  const createOldDecorations = useCallback((state: EditorState) => {
    const decorations: Range<Decoration>[] = [];

    for (const lineNum of oldHighlightLines) {
      if (lineNum >= 1 && lineNum <= state.doc.lines) {
        const line = state.doc.line(lineNum);
        if (!line) continue;

        // Line-level decoration
        const lineDeco = Decoration.line({
          class: "cm-line-modified",
          attributes: {
            "data-line-number": lineNum.toString(),
            "data-side": "old",
          },
        });
        decorations.push(lineDeco.range(line.from));

        // Character-level decorations
        const diffKey = `old:${lineNum}`;
        const chunks = charDiffs.get(diffKey);
        if (chunks) {
          let offset = 0;
          for (const chunk of chunks) {
            if (chunk.type === 'removed' && chunk.text.length > 0) {
              const from = Math.min(line.to, line.from + offset);
              const to = Math.min(line.to, from + chunk.text.length);
              if (to > from && from >= line.from) {
                const charDeco = Decoration.mark({
                  class: "cm-char-removed",
                  attributes: {
                    "data-char-diff": "removed",
                  },
                });
                decorations.push(charDeco.range(from, to));
              }
            }
            // Only increment offset for chunks that appear in the old line
            if (chunk.type === 'removed' || chunk.type === 'unchanged') {
              offset += chunk.text.length;
            }
          }
        }
      }
    }

    return Decoration.set(decorations, true);
  }, [oldHighlightLines, charDiffs]);

  // Create decorations for new editor (using API semantic changes + character-level diffs)
  const createNewDecorations = useCallback((state: EditorState) => {
    const decorations: Range<Decoration>[] = [];

    for (const lineNum of newHighlightLines) {
      if (lineNum >= 1 && lineNum <= state.doc.lines) {
        const line = state.doc.line(lineNum);
        if (!line) continue;

        // Line-level decoration
        const lineDeco = Decoration.line({
          class: "cm-line-modified",
          attributes: {
            "data-line-number": lineNum.toString(),
            "data-side": "new",
          },
        });
        decorations.push(lineDeco.range(line.from));

        // Character-level decorations
        const diffKey = `new:${lineNum}`;
        const chunks = charDiffs.get(diffKey);
        if (chunks) {
          let offset = 0;
          for (const chunk of chunks) {
            if (chunk.type === 'added' && chunk.text.length > 0) {
              const from = Math.min(line.to, line.from + offset);
              const to = Math.min(line.to, from + chunk.text.length);
              if (to > from && from >= line.from) {
                const charDeco = Decoration.mark({
                  class: "cm-char-added",
                  attributes: {
                    "data-char-diff": "added",
                  },
                });
                decorations.push(charDeco.range(from, to));
              }
            }
            // Only increment offset for chunks that appear in the new line
            if (chunk.type === 'added' || chunk.type === 'unchanged') {
              offset += chunk.text.length;
            }
          }
        }
      }
    }

    return Decoration.set(decorations, true);
  }, [newHighlightLines, charDiffs]);

  // Setup old editor
  useEffect(() => {
    if (!oldEditorRef.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      yaml(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorState.readOnly.of(true),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "14px",
        },
        ".cm-content": {
          padding: "12px",
          fontFamily: "var(--font-mono), 'Fira Code', monospace",
        },
        ".cm-scroller": {
          overflow: "auto",
        },
        ".cm-gutters": {
          backgroundColor: "#f6f8fa",
          borderRight: "1px solid #e1e4e8",
        },
        ".cm-line": {
          position: "relative",
        },
        ".cm-line-removed": {
          backgroundColor: "#ffeef0",
        },
        ".cm-line-modified": {
          backgroundColor: "#fff5b1",
        },
        ".cm-line-removed:hover, .cm-line-modified:hover": {
          cursor: "pointer",
          opacity: 0.95,
        },
        ".cm-line-removed::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          backgroundColor: "#d1242f",
        },
      }),
      EditorView.decorations.of((view) => createOldDecorations(view.state)),
      gutter({
        class: "cm-discussion-gutter",
        markers: (view) => createOldGutterMarkers(view),
      }),
      EditorView.domEventHandlers({
        click: (event, view) => {
          const target = event.target as HTMLElement;
          const lineElement = target.closest(".cm-line");
          if (!lineElement) return false;

          const lineNumber = lineElement.getAttribute("data-line-number");
          if (!lineNumber) return false;

          const key = `old:${lineNumber}`;
          const changeIds = lineToChangesMapRef.current.get(key);
          if (changeIds && changeIds.length > 0) {
            // Expand the first matching discussion
            const changeId = changeIds[0];
            setExpandedDiscussions((prev) => {
              const next = new Set(prev);
              next.add(changeId);
              return next;
            });

            // Scroll to the discussion after a brief delay to allow expansion
            setTimeout(() => {
              const discussionElement = discussionRefs.current.get(changeId);
              if (discussionElement) {
                discussionElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }, 100);
          }
          return false;
        },
      }),
    ];

    const state = EditorState.create({
      doc: oldYaml,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: oldEditorRef.current,
    });

    // Sync scrolling
    const scrollListener = () => {
      if (!scrollSyncRef.current || !newViewRef.current) return;
      scrollSyncRef.current = false;
      const scrollTop = view.scrollDOM.scrollTop;
      newViewRef.current.scrollDOM.scrollTop = scrollTop;
      setTimeout(() => {
        scrollSyncRef.current = true;
      }, 50);
    };

    view.scrollDOM.addEventListener("scroll", scrollListener);

    oldViewRef.current = view;

    return () => {
      view.scrollDOM.removeEventListener("scroll", scrollListener);
      view.destroy();
      oldViewRef.current = null;
    };
  }, [oldYaml, createOldDecorations]);

  // Subscribe to discussions store changes to update icons
  const discussions = useDiscussionsStore((state) => state.discussions);
  useEffect(() => {
    if (oldViewRef.current) {
      oldViewRef.current.dispatch({});
    }
    if (newViewRef.current) {
      newViewRef.current.dispatch({});
    }
  }, [discussions]);

  // Update decorations and gutter markers when line-to-changes map changes
  useEffect(() => {
    if (oldViewRef.current && lineToChangesMap.size > 0) {
      oldViewRef.current.dispatch({});
    }
    if (newViewRef.current && lineToChangesMap.size > 0) {
      newViewRef.current.dispatch({});
    }
  }, [lineToChangesMap]);

  // Setup new editor
  useEffect(() => {
    if (!newEditorRef.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      yaml(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorState.readOnly.of(true),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "14px",
        },
        ".cm-content": {
          padding: "12px",
          fontFamily: "var(--font-mono), 'Fira Code', monospace",
        },
        ".cm-scroller": {
          overflow: "auto",
        },
        ".cm-gutters": {
          backgroundColor: "#f6f8fa",
          borderRight: "1px solid #e1e4e8",
        },
        ".cm-line": {
          position: "relative",
        },
        ".cm-line-added": {
          backgroundColor: "#e6ffed",
        },
        ".cm-line-modified": {
          backgroundColor: "#fff5b1",
        },
        ".cm-line-added:hover, .cm-line-modified:hover": {
          cursor: "pointer",
          opacity: 0.95,
        },
        ".cm-line-added::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          backgroundColor: "#28a745",
        },
      }),
      EditorView.decorations.of((view) => createNewDecorations(view.state)),
      gutter({
        class: "cm-discussion-gutter",
        markers: (view) => createNewGutterMarkers(view),
      }),
      EditorView.domEventHandlers({
        click: (event, view) => {
          const target = event.target as HTMLElement;
          const lineElement = target.closest(".cm-line");
          if (!lineElement) return false;

          const lineNumber = lineElement.getAttribute("data-line-number");
          if (!lineNumber) return false;

          const key = `new:${lineNumber}`;
          const changeIds = lineToChangesMapRef.current.get(key);
          if (changeIds && changeIds.length > 0) {
            // Expand the first matching discussion
            const changeId = changeIds[0];
            setExpandedDiscussions((prev) => {
              const next = new Set(prev);
              next.add(changeId);
              return next;
            });

            // Scroll to the discussion after a brief delay to allow expansion
            setTimeout(() => {
              const discussionElement = discussionRefs.current.get(changeId);
              if (discussionElement) {
                discussionElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }, 100);
          }
          return false;
        },
      }),
    ];

    const state = EditorState.create({
      doc: newYaml,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: newEditorRef.current,
    });

    // Sync scrolling
    const scrollListener = () => {
      if (!scrollSyncRef.current || !oldViewRef.current) return;
      scrollSyncRef.current = false;
      const scrollTop = view.scrollDOM.scrollTop;
      oldViewRef.current.scrollDOM.scrollTop = scrollTop;
      setTimeout(() => {
        scrollSyncRef.current = true;
      }, 50);
    };

    view.scrollDOM.addEventListener("scroll", scrollListener);

    newViewRef.current = view;

    return () => {
      view.scrollDOM.removeEventListener("scroll", scrollListener);
      view.destroy();
      newViewRef.current = null;
    };
  }, [newYaml, createNewDecorations]);

  // Get changes with their line positions for inline display - filter unchanged without discussions
  const changesWithPositions = diff.changes
    .map((change) => {
      const mapping = changeLineMap.get(change.id);
      return {
        change,
        oldLine: mapping?.oldLine,
        newLine: mapping?.newLine,
      };
    })
    .filter(({ change }) => {
      // Show if not unchanged, or if unchanged but has discussion
      const isUnchanged =
        ('change_type' in change && change.change_type === ChangeType.UNCHANGED) ||
        ('change_type' in change && change.change_type === GenericChangeType.UNCHANGED);
      if (!isUnchanged) {
        return true;
      }
      const discussion = getDiscussion(change.id);
      return discussion && discussion.comments.length > 0;
    })
    .sort((a, b) => {
      // Sort by newLine first, then oldLine, then keep original order
      const aLine = a.newLine ?? a.oldLine ?? Infinity;
      const bLine = b.newLine ?? b.oldLine ?? Infinity;
      return aLine - bLine;
    });

  return (
    <div className="w-full" data-testid="split-diff-view">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 flex">
        <div className="flex-1 border-r border-gray-200 px-4 py-2">
          <span className="text-sm font-medium text-gray-700">Old Version</span>
        </div>
        <div className="flex-1 border-r border-gray-200 px-4 py-2">
          <span className="text-sm font-medium text-gray-700">New Version</span>
        </div>
        <div className="w-80 px-4 py-2">
          <span className="text-sm font-medium text-gray-700">Changes</span>
        </div>
      </div>

      {/* Split view with discussions sidebar */}
      <div className="border-b border-gray-200" style={{ minHeight: "400px", height: "600px" }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] h-full">
          {/* Old version editor */}
          <div className="border-r border-gray-200 overflow-hidden bg-white">
            <div ref={oldEditorRef} className="h-full" />
          </div>

          {/* New version editor */}
          <div className="border-r border-gray-200 overflow-hidden bg-white">
            <div ref={newEditorRef} className="h-full" />
          </div>

          {/* Changes sidebar */}
          <div className="overflow-y-auto bg-gray-50 border-l border-gray-200">
            <div className="p-4 space-y-4">
              {changesWithPositions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No changes found.</p>
              ) : (
                changesWithPositions.map(({ change, oldLine, newLine }) => {
                  const lineNumber = newLine || oldLine;
                  const side = newLine ? "new" : (oldLine ? "old" : "new");
                  const isExpanded = expandedDiscussions.has(change.id);
                  const discussion = getDiscussion(change.id);

                  return (
                    <div
                      key={change.id}
                      ref={(el) => {
                        if (el) {
                          discussionRefs.current.set(change.id, el);
                        } else {
                          discussionRefs.current.delete(change.id);
                        }
                      }}
                      className="bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        // Scroll to line in editors using EditorView.scrollIntoView
                        // Add defensive checks to prevent CodeMirror errors
                        try {
                          if (newLine && newViewRef.current) {
                            const view = newViewRef.current;
                            // Validate line number is within document bounds
                            if (newLine >= 1 && newLine <= view.state.doc.lines) {
                              const line = view.state.doc.line(newLine);
                              if (line && line.from >= 0 && line.to <= view.state.doc.length) {
                                scrollSyncRef.current = false;
                                view.dispatch({
                                  effects: EditorView.scrollIntoView(line.from, {
                                    y: "center",
                                  }),
                                });
                                setTimeout(() => {
                                  scrollSyncRef.current = true;
                                }, 300);
                              }
                            }
                          }
                          if (oldLine && oldViewRef.current) {
                            const view = oldViewRef.current;
                            // Validate line number is within document bounds
                            if (oldLine >= 1 && oldLine <= view.state.doc.lines) {
                              const line = view.state.doc.line(oldLine);
                              if (line && line.from >= 0 && line.to <= view.state.doc.length) {
                                scrollSyncRef.current = false;
                                view.dispatch({
                                  effects: EditorView.scrollIntoView(line.from, {
                                    y: "center",
                                  }),
                                });
                                setTimeout(() => {
                                  scrollSyncRef.current = true;
                                }, 300);
                              }
                            }
                          }
                        } catch (error) {
                          console.error("Error scrolling to line:", error);
                          // Fallback: try manual scrolling if EditorView.scrollIntoView fails
                          if (newLine && newViewRef.current) {
                            const view = newViewRef.current;
                            if (newLine >= 1 && newLine <= view.state.doc.lines) {
                              try {
                                const line = view.state.doc.line(newLine);
                                const lineElement = view.domAtPos(line.from).node;
                                if (lineElement && lineElement.parentElement) {
                                  lineElement.parentElement.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center"
                                  });
                                }
                              } catch (fallbackError) {
                                console.error("Fallback scroll also failed:", fallbackError);
                              }
                            }
                          }
                          if (oldLine && oldViewRef.current) {
                            const view = oldViewRef.current;
                            if (oldLine >= 1 && oldLine <= view.state.doc.lines) {
                              try {
                                const line = view.state.doc.line(oldLine);
                                const lineElement = view.domAtPos(line.from).node;
                                if (lineElement && lineElement.parentElement) {
                                  lineElement.parentElement.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center"
                                  });
                                }
                              } catch (fallbackError) {
                                console.error("Fallback scroll also failed:", fallbackError);
                              }
                            }
                          }
                        }

                        // Expand/collapse
                        setExpandedDiscussions((prev) => {
                          const next = new Set(prev);
                          if (isExpanded) {
                            next.delete(change.id);
                          } else {
                            next.add(change.id);
                          }
                          return next;
                        });
                      }}
                    >
                      <div className="w-full flex items-center justify-between p-3 border-b border-gray-200">
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {lineNumber ? (
                              <>
                                <span className="text-xs font-semibold text-gray-700">
                                  Line {lineNumber}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({side === "new" ? "New" : "Old"} version)
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-gray-700">
                                Change (no line mapping)
                              </span>
                            )}
                            {!isDocumentDiffResult(change) && 'change_type' in change && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                {change.change_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </span>
                            )}
                            {isDocumentDiffResult(change) && change.change_type && (
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${
                                change.change_type === ChangeType.SECTION_MOVED
                                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                                  : change.change_type === ChangeType.SECTION_ADDED
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : change.change_type === ChangeType.SECTION_REMOVED
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : change.change_type === ChangeType.CONTENT_CHANGED
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                  : change.change_type === ChangeType.TITLE_CHANGED
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-gray-100 text-gray-800 border-gray-300'
                              }`}>
                                {change.change_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </span>
                            )}
                            {isDocumentDiffResult(change) && discussion && discussion.comments.length > 0 && (
                              <span className="text-xs text-blue-600">
                                {discussion.comments.length} comment{discussion.comments.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
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
                      {isExpanded && isDocumentDiffResult(change) && (
                        <div className="p-3">
                          <InlineDiscussion
                            change={change}
                            lineNumber={lineNumber || 0}
                            side={side}
                          />
                        </div>
                      )}
                      {isExpanded && !isDocumentDiffResult(change) && (
                        <div className="p-3 space-y-3">
                          <div className="text-sm text-gray-700">
                            <div className="font-semibold mb-2">
                              {('change_type' in change ? change.change_type : 'unknown').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </div>
                            <div className="space-y-1.5 text-xs">
                              {('path' in change && change.path) && (
                                <div className="text-gray-600">
                                  <span className="font-semibold">Path:</span>{' '}
                                  <span className="font-mono bg-gray-100 px-1 rounded">{change.path}</span>
                                </div>
                              )}
                              {('old_path' in change && change.old_path && change.old_path !== change.path) && (
                                <div className="text-gray-600">
                                  <span className="font-semibold">Old Path:</span>{' '}
                                  <span className="font-mono bg-gray-100 px-1 rounded">{change.old_path}</span>
                                </div>
                              )}
                              {('new_path' in change && change.new_path && change.new_path !== change.path) && (
                                <div className="text-gray-600">
                                  <span className="font-semibold">New Path:</span>{' '}
                                  <span className="font-mono bg-gray-100 px-1 rounded">{change.new_path}</span>
                                </div>
                              )}
                              {('old_key' in change && change.old_key) && (
                                <div className="text-gray-600">
                                  <span className="font-semibold">Old Key:</span>{' '}
                                  <span className="font-mono bg-gray-100 px-1 rounded">{change.old_key}</span>
                                </div>
                              )}
                              {('new_key' in change && change.new_key) && (
                                <div className="text-gray-600">
                                  <span className="font-semibold">New Key:</span>{' '}
                                  <span className="font-mono bg-gray-100 px-1 rounded">{change.new_key}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Show old/new values if available */}
                          {('old_value' in change && change.old_value !== undefined) && (
                            <div className="border-t border-gray-200 pt-2">
                              <div className="text-xs font-semibold text-gray-600 mb-1">Old Value:</div>
                              <div className="text-xs font-mono bg-red-50 border border-red-200 rounded p-2 text-gray-800 break-all">
                                {typeof change.old_value === 'object'
                                  ? JSON.stringify(change.old_value, null, 2)
                                  : String(change.old_value)}
                              </div>
                            </div>
                          )}
                          {('new_value' in change && change.new_value !== undefined) && (
                            <div className="border-t border-gray-200 pt-2">
                              <div className="text-xs font-semibold text-gray-600 mb-1">New Value:</div>
                              <div className="text-xs font-mono bg-green-50 border border-green-200 rounded p-2 text-gray-800 break-all">
                                {typeof change.new_value === 'object'
                                  ? JSON.stringify(change.new_value, null, 2)
                                  : String(change.new_value)}
                              </div>
                            </div>
                          )}
                          {/* Discussions not yet supported for generic diffs */}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
