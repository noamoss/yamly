/** TypeScript types matching the API schemas from the yaml-diffs backend. */

export enum ChangeType {
  SECTION_ADDED = "section_added",
  SECTION_REMOVED = "section_removed",
  CONTENT_CHANGED = "content_changed",
  SECTION_MOVED = "section_moved",
  TITLE_CHANGED = "title_changed",
  UNCHANGED = "unchanged",
}

export enum GenericChangeType {
  VALUE_CHANGED = "value_changed",
  TYPE_CHANGED = "type_changed",
  KEY_ADDED = "key_added",
  KEY_REMOVED = "key_removed",
  KEY_RENAMED = "key_renamed",
  KEY_MOVED = "key_moved",
  ITEM_ADDED = "item_added",
  ITEM_REMOVED = "item_removed",
  ITEM_CHANGED = "item_changed",
  ITEM_MOVED = "item_moved",
  UNCHANGED = "unchanged",
}

export type DiffMode = "auto" | "general" | "legal_document";

export interface IdentityRule {
  array: string;
  identity_field: string;
  when_field?: string | null;
  when_value?: string | null;
}

export interface DiffResult {
  id: string;
  section_id: string;
  change_type: ChangeType;
  marker: string;
  old_marker_path: string[] | null;
  new_marker_path: string[] | null;
  old_id_path: string[] | null;
  new_id_path: string[] | null;
  old_content: string | null;
  new_content: string | null;
  old_title: string | null;
  new_title: string | null;
  old_section_yaml: string | null;
  new_section_yaml: string | null;
  old_line_number: number | null;
  new_line_number: number | null;
}

export interface DocumentDiff {
  changes: DiffResult[];
  added_count: number;
  deleted_count: number;
  modified_count: number;
  moved_count: number;
}

export interface GenericDiffResult {
  id: string;
  change_type: GenericChangeType;
  path: string;
  old_path?: string | null;
  new_path?: string | null;
  old_key?: string | null;
  new_key?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  old_line_number?: number | null;
  new_line_number?: number | null;
}

export interface GenericDiff {
  changes: GenericDiffResult[];
  value_changed_count: number;
  key_added_count: number;
  key_removed_count: number;
  key_renamed_count: number;
  key_moved_count: number;
  item_added_count: number;
  item_removed_count: number;
  item_changed_count: number;
  item_moved_count: number;
  type_changed_count: number;
}

export interface DiffRequest {
  old_yaml: string;
  new_yaml: string;
  mode?: DiffMode;
  identity_rules?: IdentityRule[];
}

export interface UnifiedDiffResponse {
  mode: DiffMode;
  document_diff?: DocumentDiff | null;
  generic_diff?: GenericDiff | null;
}

export interface DiffResponse {
  diff: DocumentDiff;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Array<Record<string, unknown>> | null;
}
