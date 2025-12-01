# Diffing Algorithms

This document describes the diffing algorithms used in yaml-diffs for both generic YAML files and legal documents.

## Overview

yaml-diffs implements two distinct diffing algorithms optimized for different use cases:

1. **Generic YAML Diffing** - For arbitrary YAML structures (configs, Kubernetes manifests, etc.)
2. **Legal Document Diffing** - For schema-validated Hebrew legal documents

Both algorithms detect comprehensive change types including additions, deletions, modifications, moves, and renames.

## Generic YAML Diffing Algorithm

The generic diffing algorithm uses a **3-phase approach** to detect all types of changes in arbitrary YAML structures.

### Phase 1: Recursive Local Diff

The algorithm recursively compares nodes at the same paths in both documents.

**Process:**
1. Start at root level, compare old and new documents
2. For each path that exists in both documents:
   - If values differ → `VALUE_CHANGED`
   - If types differ → `TYPE_CHANGED`
3. For mappings (objects):
   - Keys only in old → collect as removed (for later phases)
   - Keys only in new → collect as added (for later phases)
4. For sequences (arrays):
   - Match items by identity (using identity rules or auto-detection)
   - Unmatched items → collect as removed/added (for later phases)
   - Matched items with different content → `ITEM_CHANGED`

**Identity Detection for Arrays:**

The algorithm uses a priority-based approach to identify array items:

1. **Conditional Rules** (most specific):
   ```python
   # Example: books by catalog_id when type=book
   IdentityRule(array="inventory", identity_field="catalog_id",
                when_field="type", when_value="book")
   ```

2. **Unconditional Rules**:
   ```python
   # Example: containers by name
   IdentityRule(array="containers", identity_field="name")
   ```

3. **Auto-detection** (fallback):
   - Checks common field names: `id`, `_id`, `uuid`, `key`, `name`, `host`, `hostname`
   - Uses first field found in all items

**Output:**
- Direct value/type changes
- Lists of unmatched keys and items for later phases

### Phase 2: Rename Detection

Matches removed and added keys at the same parent path with similar values.

**Process:**
1. For each removed key at path `P`:
   - Find added keys at the same path `P`
   - Calculate similarity between old and new values
   - If similarity ≥ threshold (typically 0.95) → `KEY_RENAMED`
   - Remove matched keys from removed/added lists

**Similarity Calculation:**
- Uses JSON serialization and word-based Jaccard similarity
- Compares word sets from both values
- Formula: `|words_old ∩ words_new| / |words_old ∪ words_new|`

**Example:**
```yaml
# Old
database:
  host: "localhost"

# New
database:
  hostname: "localhost"  # Same value, different key
```
Result: `KEY_RENAMED` at `database.host` → `database.hostname`

### Phase 3: Global Move Detection

Matches remaining removed items with added items globally by identity or content similarity.

**Process:**
1. For each remaining removed key/item:
   - Search all added keys/items globally
   - Match by:
     - **Identity** (for array items with identity fields)
     - **Content similarity** (≥0.95 threshold)
   - If match found → `KEY_MOVED` or `ITEM_MOVED`
   - Record old_path and new_path

**Move Detection Rules:**
- Keys: Match by value similarity across different paths
- Items: Match by identity field value, then by content similarity
- Empty content sections are not matched (to avoid false positives)

**Example:**
```yaml
# Old
config:
  database:
    host: "localhost"

# New
database:
  host: "localhost"  # Moved up one level
```
Result: `KEY_MOVED` from `config.database.host` to `database.host`

### Change Types Detected

The generic diffing algorithm detects the following change types:

| Change Type | Description | Example |
|------------|-------------|---------|
| `VALUE_CHANGED` | Same key/item, value changed | `port: 5432` → `port: 5433` |
| `TYPE_CHANGED` | Value type changed | `port: "5432"` → `port: 5432` |
| `KEY_ADDED` | New key in mapping | Added `timeout: 30` |
| `KEY_REMOVED` | Key removed from mapping | Removed `deprecated: true` |
| `KEY_RENAMED` | Key name changed, value same | `host` → `hostname` |
| `KEY_MOVED` | Key+value moved to different path | `config.db.host` → `db.host` |
| `ITEM_ADDED` | New item in array | Added to `servers[]` |
| `ITEM_REMOVED` | Item removed from array | Removed from `servers[]` |
| `ITEM_CHANGED` | Same item (by identity), content changed | `servers[0].port` changed |
| `ITEM_MOVED` | Item moved to different array/path | `servers[2]` → `servers[0]` |
| `UNCHANGED` | No changes detected | - |

## Legal Document Diffing Algorithm

The legal document diffing algorithm uses **marker-based matching** to reliably track sections across document versions.

### Marker-Based Matching

Legal documents use **markers** (not IDs) as the primary identifier for sections. Markers must be unique within the same nesting level.

**Why Markers Instead of IDs?**
- Markers are stable across versions (e.g., "פרק א'", "1", "(א)")
- IDs may change or be auto-generated
- Markers provide semantic meaning (section numbers, Hebrew markers)

### Algorithm Overview

1. **Build Marker Maps**: Create maps of `(marker, parent_path)` → section for both documents
2. **Find Exact Matches**: Match sections with same marker and same parent path
3. **Detect Changes**: Compare content and title for matched sections
4. **Detect Movements**: Match unmatched sections by content similarity
5. **Detect Additions/Deletions**: Unmatched sections are added or removed

### Phase 1: Exact Matching

Match sections with identical marker paths.

**Process:**
1. Build marker maps for both documents:
   ```python
   marker_map = {
       (marker, parent_path): (section, marker_path, id_path)
   }
   ```
2. Find intersection of marker keys
3. For each exact match:
   - Compare content → `CONTENT_CHANGED` if different
   - Compare title → `TITLE_CHANGED` if different
   - If both same → `UNCHANGED`

**Example:**
```yaml
# Old
sections:
  - marker: "1"
    content: "Old content"

# New
sections:
  - marker: "1"
    content: "New content"  # Same marker, different content
```
Result: `CONTENT_CHANGED` for section with marker "1"

### Phase 2: Movement Detection

Match unmatched sections by content similarity.

**Process:**
1. Collect unmatched sections from both documents
2. For each unmatched old section:
   - Find unmatched new sections with similar content (≥0.95 similarity)
   - If match found → `SECTION_MOVED`
   - Record old_marker_path and new_marker_path

**Similarity Calculation:**
- Uses content similarity scoring
- Only matches sections with non-empty content
- Empty content sections (parent sections) are not matched

**Example:**
```yaml
# Old
sections:
  - marker: "1"
    content: "Section content"
  - marker: "2"
    content: "Another section"

# New
sections:
  - marker: "2"
    content: "Section content"  # Moved from marker "1"
  - marker: "1"
    content: "Another section"  # Moved from marker "2"
```
Result: Two `SECTION_MOVED` changes

### Phase 3: Additions and Deletions

Remaining unmatched sections are additions or deletions.

**Process:**
1. Unmatched sections in new document → `SECTION_ADDED`
2. Unmatched sections in old document → `SECTION_REMOVED`

### Change Types Detected

The legal document diffing algorithm detects:

| Change Type | Description | Example |
|------------|-------------|---------|
| `SECTION_ADDED` | New section added | New section with marker "3" |
| `SECTION_REMOVED` | Section removed | Removed section with marker "2" |
| `CONTENT_CHANGED` | Content changed (same marker+path) | Same marker, different content |
| `TITLE_CHANGED` | Title changed (same marker+path) | Same marker, different title |
| `SECTION_MOVED` | Path changed (and possibly marker) | Marker "1" moved to different parent |
| `UNCHANGED` | No changes detected | - |

## Line Number Extraction

Both algorithms support line number tracking for changes, enabling precise location of modifications in source files.

### Generic YAML Line Numbers

Line numbers are extracted using path-based traversal:

1. Parse YAML to get line numbers for each node
2. For each change, extract line number from path:
   - Direct keys: Line number of the key
   - Array items: Line number of the item (or parent if inline)
   - Nested paths: Traverse to the target node

**Challenges:**
- Inline arrays: All items on same line → fallback to parent key line
- Nested array indices: Complex path traversal required
- Flow style YAML: Less precise line numbers

### Legal Document Line Numbers

Line numbers are extracted using marker-based lookup:

1. Parse YAML to get line numbers for each section
2. Match sections by marker path
3. Extract line number from section's YAML representation

**Challenges:**
- Same-line markers: `- marker: "value"` on one line
- Nested sections: Need to track parent paths
- Multi-line content: Use section start line

## Performance Considerations

### Generic Diffing

- **Time Complexity**: O(n + m) where n, m are document sizes
- **Similarity Calculations**: O(k) where k is number of unmatched items
- **Optimization Opportunities**:
  - Use `rapidfuzz` for faster similarity (10-100x speedup)
  - Structural hashing to quickly eliminate non-matches
  - Lazy evaluation for large diffs

### Legal Document Diffing

- **Time Complexity**: O(n + m) for marker map building, O(n×m) worst case for movement detection
- **Similarity Calculations**: Only for unmatched sections (typically small)
- **Optimization**: Content similarity only computed when needed

## Edge Cases

### Generic Diffing

1. **Empty Arrays**: `[]` → `[1, 2, 3]` → All items are `ITEM_ADDED`
2. **Scalar Arrays**: `["a", "b"]` → `["b", "c"]` → Items matched by value
3. **Duplicate Values**: `[1, 1, 1]` → Matching by position
4. **Very Long Paths**: 10+ levels deep → Handled recursively
5. **Type Coercion**: String numbers vs actual numbers → `TYPE_CHANGED`

### Legal Document Diffing

1. **Duplicate Markers**: Validation error (markers must be unique)
2. **Missing Markers**: Validation error (markers required)
3. **Empty Content**: Parent sections with no content → Not matched for moves
4. **Hebrew Content**: Full UTF-8 support throughout
5. **Deep Nesting**: Unlimited depth supported recursively

## Algorithm Selection

The system automatically detects which algorithm to use:

1. **Mode Detection** (`diff_router.py`):
   - Checks for `document` → `sections` → `marker` structure
   - If found → Legal Document Mode
   - Otherwise → Generic Mode

2. **Manual Override**:
   - CLI: `--mode general` or `--mode legal_document`
   - API: `mode` parameter
   - MCP: `mode` parameter

## Implementation Files

- **Generic Diffing**: `src/yaml_diffs/generic_diff.py`
- **Legal Document Diffing**: `src/yaml_diffs/diff.py`
- **Mode Detection**: `src/yaml_diffs/diff_router.py`
- **Line Number Extraction**: `src/yaml_diffs/yaml_extract.py`

## References

- [Architecture Documentation](./architecture.md) - System architecture overview
- [API Reference](./api_reference.md) - API usage examples
- [Generic Diff Types](../../src/yaml_diffs/generic_diff_types.py) - Type definitions
- [Diff Types](../../src/yaml_diffs/diff_types.py) - Legal document diff types
