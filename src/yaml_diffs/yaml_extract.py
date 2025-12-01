"""YAML extraction utilities for finding sections and line numbers."""

from __future__ import annotations

import yaml  # type: ignore[import-untyped]


def find_section_line_number(
    yaml_text: str,
    marker_path: tuple[str, ...],
) -> int | None:
    """Find the starting line number of a section in YAML text by marker path.

    Args:
        yaml_text: The full YAML document as a string
        marker_path: Tuple of markers representing the path to the section

    Returns:
        The line number (1-indexed) where the section starts, or None if not found
    """
    if not marker_path or not yaml_text:
        return None

    try:
        lines = yaml_text.split("\n")
        current_path: list[str] = []
        section_stack: list[tuple[str, int, int]] = []  # (marker, indent, line_number)
        document_indent = -1
        sections_indent = -1

        for i, line in enumerate(lines):
            trimmed = line.strip()

            # Skip empty lines and comments
            if not trimmed or trimmed.startswith("#"):
                continue

            indent = len(line) - len(line.lstrip())

            # Find document: entry
            if trimmed.startswith("document:") or trimmed == "document:":
                document_indent = indent
                continue

            # Find the TOP-LEVEL sections: entry point (only directly under document, set once)
            if (
                sections_indent < 0
                and document_indent >= 0
                and (trimmed == "sections:" or trimmed.startswith("sections:"))
            ):
                if indent > document_indent:
                    sections_indent = indent
                    continue

            # Process sections
            if sections_indent >= 0 and indent > sections_indent:
                # Look for marker field - handle both "marker:" and "- marker:" formats
                marker_line = None
                if trimmed.startswith("marker:"):
                    # Marker on its own line: "  marker: value"
                    marker_line = trimmed
                elif trimmed.startswith("-") and "marker:" in trimmed:
                    # Marker on same line as "-": "- marker: value"
                    marker_line = trimmed

                if marker_line:
                    # Extract marker value - find "marker:" in the line
                    marker_idx = marker_line.find("marker:")
                    if marker_idx >= 0:
                        marker_part = marker_line[marker_idx + 7 :].strip()  # "marker:" is 7 chars

                        if marker_part:
                            # Remove quotes if present
                            marker = marker_part
                            if (marker.startswith('"') and marker.endswith('"')) or (
                                marker.startswith("'") and marker.endswith("'")
                            ):
                                marker = marker[1:-1]
                                # Handle escaped quotes
                                if marker_part[0] == '"':
                                    marker = (
                                        marker.replace('\\"', '"')
                                        .replace("\\n", "\n")
                                        .replace("\\\\", "\\")
                                    )
                                elif marker_part[0] == "'":
                                    marker = marker.replace("''", "'")

                            # Pop stack until we find the right parent level
                            while section_stack and indent <= section_stack[-1][1]:
                                section_stack.pop()
                                if current_path:
                                    current_path.pop()

                            # Add this section to the path
                            section_stack.append((marker, indent, i + 1))
                            current_path.append(marker)

                            # Check if this matches our target path
                            if len(current_path) == len(marker_path):
                                matches = True
                                for j, target_marker in enumerate(marker_path):
                                    current_marker = current_path[j]
                                    if current_marker != target_marker:
                                        matches = False
                                        break

                                if matches:
                                    # Found it! If the line starts with "-", return this line
                                    # Otherwise, look backwards for the section start
                                    if trimmed.startswith("-"):
                                        # Marker is on the same line as the "-", return this line
                                        return i + 1  # 1-indexed

                                    # Otherwise, look backwards for the section start (the "-" line)
                                    max_lookback = max(0, i - 20)
                                    for k in range(i, max_lookback - 1, -1):
                                        prev_line = lines[k]
                                        prev_trimmed = prev_line.strip()

                                        if prev_trimmed.startswith("-"):
                                            prev_indent = len(prev_line) - len(prev_line.lstrip())
                                            # The "-" line should be less indented than the marker line
                                            if (
                                                prev_indent < indent
                                                and prev_indent >= sections_indent
                                            ):
                                                return k + 1  # 1-indexed

                                        if prev_trimmed and not prev_trimmed.startswith("#"):
                                            prev_indent = len(prev_line) - len(prev_line.lstrip())
                                            if k < i and prev_indent < indent - 2:
                                                break

                                    # Fallback: return the marker line
                                    result = i + 1
                                    return result
    except Exception:
        # If anything goes wrong, return None
        return None

    return None


def extract_section_yaml(
    yaml_text: str,
    marker_path: tuple[str, ...],
    parsed_doc: dict | None = None,
) -> str | None:
    """Extract full YAML representation of a section by marker path.

    Handles both regular sections and metadata fields.

    Args:
        yaml_text: The full YAML document as a string
        marker_path: Tuple of markers representing the path to the section
        parsed_doc: Optional pre-parsed document dict (to avoid re-parsing)

    Returns:
        YAML string representation of the section, or None if not found
    """
    if not marker_path or not yaml_text:
        return None

    try:
        # Parse YAML if not provided
        if parsed_doc is None:
            parsed_doc = yaml.safe_load(yaml_text)
            if not parsed_doc or "document" not in parsed_doc:
                return None

        # Handle metadata paths (e.g., ("__metadata__", "version", "number"))
        if marker_path[0] == "__metadata__":
            doc = parsed_doc.get("document", {})
            if len(marker_path) == 1:
                # Just "__metadata__" - return all metadata
                metadata = {
                    "version": doc.get("version", {}),
                    "source": doc.get("source", {}),
                    "authors": doc.get("authors", []),
                    "published_date": doc.get("published_date"),
                    "updated_date": doc.get("updated_date"),
                }
                result: str = yaml.dump(
                    metadata,
                    indent=2,
                    width=1000,
                    allow_unicode=True,
                    default_flow_style=False,
                    sort_keys=False,
                )
                return result.rstrip()
            elif len(marker_path) == 2:
                # e.g., ("__metadata__", "authors")
                field_name = marker_path[1]
                value = doc.get(field_name)
                if value is not None:
                    return str(
                        yaml.dump(
                            {field_name: value},
                            indent=2,
                            width=1000,
                            allow_unicode=True,
                            default_flow_style=False,
                            sort_keys=False,
                        )
                    ).rstrip()
            elif len(marker_path) == 3:
                # e.g., ("__metadata__", "version", "number")
                parent_name = marker_path[1]
                field_name = marker_path[2]
                parent = doc.get(parent_name)
                if parent and isinstance(parent, dict):
                    value = parent.get(field_name)
                    if value is not None:
                        return str(
                            yaml.dump(
                                {parent_name: {field_name: value}},
                                indent=2,
                                width=1000,
                                allow_unicode=True,
                                default_flow_style=False,
                                sort_keys=False,
                            )
                        ).rstrip()
            return None

        # Handle regular sections
        # Navigate to the section
        doc_sections = parsed_doc.get("document", {}).get("sections", [])
        if not doc_sections:
            return None

        # Find section by path
        current_sections = doc_sections
        current_path = list(marker_path)

        while current_path:
            target_marker = current_path.pop(0)
            found_section_dict = None

            for section_dict in current_sections:
                if section_dict.get("marker") == target_marker:
                    found_section_dict = section_dict
                    break

            if not found_section_dict:
                return None

            # If we've reached the end of the path, serialize this section
            if not current_path:
                # Serialize to YAML
                return str(
                    yaml.dump(
                        found_section_dict,
                        indent=2,
                        width=1000,  # Large width to prevent wrapping
                        allow_unicode=True,
                        default_flow_style=False,
                        sort_keys=False,
                    )
                ).rstrip()

            # Otherwise, continue navigating
            current_sections = found_section_dict.get("sections", [])

    except Exception:
        return None

    return None


def find_section_content_line_number(
    yaml_text: str,
    marker_path: tuple[str, ...],
    field_name: str = "content",
) -> int | None:
    """Find the line number of a specific field within a section.

    Args:
        yaml_text: The full YAML document as a string
        marker_path: Tuple of markers representing the path to the section
        field_name: The field to find (default: "content")

    Returns:
        The line number (1-indexed) where the field is, or None if not found
    """
    # First, find the section start line
    section_start = find_section_line_number(yaml_text, marker_path)
    if section_start is None:
        return None

    try:
        lines = yaml_text.split("\n")
        # Get the indent of the section start line (the "- id:" line)
        section_line = lines[section_start - 1]
        section_indent = len(section_line) - len(section_line.lstrip())

        # The field should be indented more than the "-" but at the same level as other fields
        # For "- id: sec-1", the "content:" line will have indent = section_indent + 2
        field_indent = section_indent + 2

        # Scan from section start to find the field
        for i in range(section_start - 1, len(lines)):
            line = lines[i]
            trimmed = line.strip()

            # Skip empty lines and comments
            if not trimmed or trimmed.startswith("#"):
                continue

            current_indent = len(line) - len(line.lstrip())

            # If we've moved past this section (less indented than section start), stop
            if current_indent <= section_indent and i > section_start - 1:
                # Check if this is a new section at the same level
                if trimmed.startswith("-"):
                    break
                # Or if it's a different field at document level
                if current_indent < section_indent:
                    break

            # Look for the field at the expected indent
            if current_indent == field_indent and trimmed.startswith(f"{field_name}:"):
                return i + 1  # 1-indexed

        # Fall back to section start if field not found
        return section_start

    except Exception:
        return section_start


def find_metadata_line_number(
    yaml_text: str,
    marker_path: tuple[str, ...],
) -> int | None:
    """Find the starting line number of a metadata field in YAML text.

    Args:
        yaml_text: The full YAML document as a string
        marker_path: Tuple representing the metadata path (e.g., ("__metadata__", "version", "number"))

    Returns:
        The line number (1-indexed) where the metadata field starts, or None if not found
    """
    if not marker_path or marker_path[0] != "__metadata__" or not yaml_text:
        return None

    try:
        lines = yaml_text.split("\n")
        document_indent = -1

        # Find document: entry
        for _i, line in enumerate(lines):
            trimmed = line.strip()
            if trimmed.startswith("document:") or trimmed == "document:":
                document_indent = len(line) - len(line.lstrip())
                break

        if document_indent < 0:
            return None

        # Handle different metadata path lengths
        if len(marker_path) == 2:
            # e.g., ("__metadata__", "authors")
            field_name = marker_path[1]
            for i, line in enumerate(lines):
                trimmed = line.strip()
                indent = len(line) - len(line.lstrip())
                # Look for the field at document level
                if indent == document_indent + 2 and trimmed.startswith(f"{field_name}:"):
                    return i + 1  # 1-indexed
        elif len(marker_path) == 3:
            # e.g., ("__metadata__", "version", "number")
            parent_name = marker_path[1]
            field_name = marker_path[2]
            in_parent = False
            for i, line in enumerate(lines):
                trimmed = line.strip()
                indent = len(line) - len(line.lstrip())
                # Check if we're in the parent section
                if indent == document_indent + 2 and trimmed.startswith(f"{parent_name}:"):
                    in_parent = True
                    continue
                # Check if we're still in the parent (indented more)
                if in_parent and indent > document_indent + 2:
                    if trimmed.startswith(f"{field_name}:"):
                        return i + 1  # 1-indexed
                # If we've left the parent, stop looking
                if (
                    in_parent
                    and indent <= document_indent + 2
                    and not trimmed.startswith(f"{parent_name}:")
                ):
                    break

    except Exception:
        return None

    return None


def find_path_line_number(yaml_text: str, path: str) -> int | None:
    """Find line number for a dot-notation path in YAML.

    Handles:
    - Simple keys: spec.replicas -> finds 'replicas:' under 'spec:'
    - Array indices: containers[0].name -> finds first item in containers
    - Nested paths: database.credentials.username

    Args:
        yaml_text: The full YAML document as a string
        path: Dot-notation path (e.g., "spec.replicas", "containers[0].name")

    Returns:
        The line number (1-indexed) where the path is found, or None if not found
    """
    if not path or not yaml_text:
        return None

    try:
        # Parse path into segments
        # e.g., "containers[0].name" -> ["containers", "[0]", "name"]
        segments: list[str] = []
        current_segment = ""
        i = 0
        while i < len(path):
            if path[i] == ".":
                if current_segment:
                    segments.append(current_segment)
                    current_segment = ""
            elif path[i] == "[":
                # Start of array index
                if current_segment:
                    segments.append(current_segment)
                    current_segment = ""
                # Find closing bracket
                j = i + 1
                while j < len(path) and path[j] != "]":
                    current_segment += path[j]
                    j += 1
                if j < len(path):
                    segments.append(f"[{current_segment}]")
                    current_segment = ""
                    i = j
            else:
                current_segment += path[i]
            i += 1
        if current_segment:
            segments.append(current_segment)

        if not segments:
            return None

        lines = yaml_text.split("\n")
        path_stack: list[tuple[str, int, int]] = []  # (key, indent, line_number)
        array_index_stack: list[tuple[int, int, int]] = []  # (index, indent, line_number)
        current_indent = -1
        expecting_array: tuple[int, int] | None = (
            None  # (target_index, array_indent) when we're expecting an array
        )

        for line_num, line in enumerate(lines, start=1):
            trimmed = line.strip()

            # Skip empty lines and comments
            if not trimmed or trimmed.startswith("#"):
                continue

            indent = len(line) - len(line.lstrip())

            # Check if we've moved to a less indented level (popped out of a structure)
            if current_indent >= 0 and indent < current_indent:
                # Pop path stack until we're at the right level
                while path_stack and path_stack[-1][1] > indent:
                    path_stack.pop()
                # Pop array index stack - but preserve the array we're currently tracking
                # Don't pop if we're still expecting this array and we're at its indent level
                while array_index_stack and array_index_stack[-1][1] > indent:
                    # Check if this is the array we're tracking and we're at its indent level
                    if (
                        expecting_array
                        and array_index_stack[-1][1] == expecting_array[1]
                        and indent == expecting_array[1]
                    ):
                        # We're still in the array we're tracking - don't pop it
                        break
                    array_index_stack.pop()
                # Also check if we're at the same indent as the array we're tracking
                if array_index_stack and array_index_stack[-1][1] == indent:
                    # If we're still tracking this array, don't pop it
                    if not (expecting_array and array_index_stack[-1][1] == expecting_array[1]):
                        array_index_stack.pop()
                # Reset expecting_array if we've moved to a shallower indent (left the array section)
                # Only clear if indent is significantly less than expected (at least 2 spaces less)
                if expecting_array and indent < expecting_array[1] - 1:
                    expecting_array = None

            current_indent = indent

            # Check for array item (starts with "-")
            if trimmed.startswith("-"):
                # This is an array item
                item_indent = indent
                if expecting_array and item_indent >= expecting_array[1]:
                    # We're expecting an array and found an item - start tracking
                    # Check if this is the target index (or we're starting at 0)
                    if expecting_array[0] == 0:
                        # Check if we already have an array at this indent level
                        if array_index_stack and item_indent == array_index_stack[-1][1]:
                            # Same indent level - increment the existing array index
                            last_array = array_index_stack[-1]
                            array_index_stack[-1] = (last_array[0] + 1, last_array[1], line_num)
                            # Check if path ends with this array index (e.g., "containers[0]")
                            if len(path_stack) + len(array_index_stack) == len(segments):
                                # Verify the path matches exactly
                                path_matches = True
                                path_stack_idx = 0
                                array_stack_idx = 0

                                for _seg_idx, segment in enumerate(segments):
                                    if segment.startswith("["):
                                        # This is an array index - match against array_index_stack
                                        if array_stack_idx >= len(array_index_stack):
                                            path_matches = False
                                            break
                                        try:
                                            target_index = int(segment[1:-1])
                                            arr_index, _, _ = array_index_stack[array_stack_idx]
                                            if arr_index != target_index:
                                                path_matches = False
                                                break
                                            array_stack_idx += 1
                                        except (ValueError, IndexError):
                                            path_matches = False
                                            break
                                    else:
                                        # This is a path key - match against path_stack
                                        if path_stack_idx >= len(path_stack):
                                            path_matches = False
                                            break
                                        path_key, _, _ = path_stack[path_stack_idx]
                                        if path_key != segment:
                                            path_matches = False
                                            break
                                        path_stack_idx += 1

                                # Ensure we've matched all items from both stacks
                                if (
                                    path_matches
                                    and path_stack_idx == len(path_stack)
                                    and array_stack_idx == len(array_index_stack)
                                ):
                                    # Path ends with array index - return line number of array item marker
                                    return line_num
                        else:
                            # New array (either first array or nested array at deeper indent)
                            array_index_stack.append((0, item_indent, line_num))
                        expecting_array = None

                        # Check if path ends with this array index (e.g., "containers[0]")
                        if len(path_stack) + len(array_index_stack) == len(segments):
                            # Verify the path matches exactly
                            path_matches = True
                            path_stack_idx = 0
                            array_stack_idx = 0

                            for _seg_idx, segment in enumerate(segments):
                                if segment.startswith("["):
                                    # This is an array index - match against array_index_stack
                                    if array_stack_idx >= len(array_index_stack):
                                        path_matches = False
                                        break
                                    try:
                                        target_index = int(segment[1:-1])
                                        arr_index, _, _ = array_index_stack[array_stack_idx]
                                        if arr_index != target_index:
                                            path_matches = False
                                            break
                                        array_stack_idx += 1
                                    except (ValueError, IndexError):
                                        path_matches = False
                                        break
                                else:
                                    # This is a path key - match against path_stack
                                    if path_stack_idx >= len(path_stack):
                                        path_matches = False
                                        break
                                    path_key, _, _ = path_stack[path_stack_idx]
                                    if path_key != segment:
                                        path_matches = False
                                        break
                                    path_stack_idx += 1

                            # Ensure we've matched all items from both stacks
                            if (
                                path_matches
                                and path_stack_idx == len(path_stack)
                                and array_stack_idx == len(array_index_stack)
                            ):
                                # Path ends with array index - return line number of array item marker
                                return line_num
                    else:
                        # We need to track until we reach the target index
                        if not array_index_stack:
                            array_index_stack.append((0, item_indent, line_num))
                        else:
                            last_array = array_index_stack[-1]
                            if item_indent == last_array[1]:
                                new_index = last_array[0] + 1
                                array_index_stack[-1] = (new_index, last_array[1], line_num)
                                if new_index == expecting_array[0]:
                                    expecting_array = None
                                    # Check if path ends with this array index (e.g., "containers[1]")
                                    if len(path_stack) + len(array_index_stack) == len(segments):
                                        # Verify the path matches exactly
                                        path_matches = True
                                        path_stack_idx = 0
                                        array_stack_idx = 0

                                        for _seg_idx, segment in enumerate(segments):
                                            if segment.startswith("["):
                                                # This is an array index - match against array_index_stack
                                                if array_stack_idx >= len(array_index_stack):
                                                    path_matches = False
                                                    break
                                                try:
                                                    target_index = int(segment[1:-1])
                                                    arr_index, _, _ = array_index_stack[
                                                        array_stack_idx
                                                    ]
                                                    if arr_index != target_index:
                                                        path_matches = False
                                                        break
                                                    array_stack_idx += 1
                                                except (ValueError, IndexError):
                                                    path_matches = False
                                                    break
                                            else:
                                                # This is a path key - match against path_stack
                                                if path_stack_idx >= len(path_stack):
                                                    path_matches = False
                                                    break
                                                path_key, _, _ = path_stack[path_stack_idx]
                                                if path_key != segment:
                                                    path_matches = False
                                                    break
                                                path_stack_idx += 1

                                        # Ensure we've matched all items from both stacks
                                        if (
                                            path_matches
                                            and path_stack_idx == len(path_stack)
                                            and array_stack_idx == len(array_index_stack)
                                        ):
                                            # Path ends with array index - return line number of array item marker
                                            return line_num
                            elif item_indent > last_array[1]:
                                # Nested array at deeper indent
                                # Only start tracking if we're expecting an array at EXACTLY this indent
                                # (e.g., for paths like containers[0].ports[1])
                                # Don't track if we're still looking for the parent array at a different indent
                                if expecting_array and item_indent == expecting_array[1]:
                                    # We're expecting an array at exactly this indent - start tracking
                                    array_index_stack.append((0, item_indent, line_num))
                                # else: ignore - this is nested content at the wrong indent level
                elif array_index_stack:
                    # We're already tracking an array - increment the index if same indent
                    last_array = array_index_stack[-1]
                    if item_indent == last_array[1]:
                        # Same indent level - increment index
                        new_index = last_array[0] + 1
                        array_index_stack[-1] = (new_index, last_array[1], line_num)

                        # Check if path ends with this array index (e.g., "containers[0]")
                        if len(path_stack) + len(array_index_stack) == len(segments):
                            # Verify the path matches exactly
                            path_matches = True
                            path_stack_idx = 0
                            array_stack_idx = 0

                            for _seg_idx, segment in enumerate(segments):
                                if segment.startswith("["):
                                    # This is an array index - match against array_index_stack
                                    if array_stack_idx >= len(array_index_stack):
                                        path_matches = False
                                        break
                                    try:
                                        target_index = int(segment[1:-1])
                                        arr_index, _, _ = array_index_stack[array_stack_idx]
                                        if arr_index != target_index:
                                            path_matches = False
                                            break
                                        array_stack_idx += 1
                                    except (ValueError, IndexError):
                                        path_matches = False
                                        break
                                else:
                                    # This is a path key - match against path_stack
                                    if path_stack_idx >= len(path_stack):
                                        path_matches = False
                                        break
                                    path_key, _, _ = path_stack[path_stack_idx]
                                    if path_key != segment:
                                        path_matches = False
                                        break
                                    path_stack_idx += 1

                            # Ensure we've matched all items from both stacks
                            if (
                                path_matches
                                and path_stack_idx == len(path_stack)
                                and array_stack_idx == len(array_index_stack)
                            ):
                                # Path ends with array index - return line number of array item marker
                                return line_num
                    # If item_indent > last_array[1], it's a nested array we're not tracking, ignore it

            # Check for key-value pair (contains ":")
            if ":" in trimmed:
                key_part = trimmed.split(":")[0].strip()
                # If the key is on the same line as an array item marker, strip the "- " prefix
                if key_part.startswith("- "):
                    key_part = key_part[2:].strip()
                key_indent = indent

                # Determine which segment we should be looking for
                target_segment_idx = len(path_stack) + len(array_index_stack)

                if target_segment_idx < len(segments):
                    target_segment = segments[target_segment_idx]

                    # Check if the next segment after this one is an array index
                    next_is_array = target_segment_idx + 1 < len(segments) and segments[
                        target_segment_idx + 1
                    ].startswith("[")

                    if key_part == target_segment:
                        # Before matching this key, verify all array indices in the path up to this point
                        # are correctly matched. This prevents matching keys inside the wrong array item.
                        array_indices_ok = True
                        if array_index_stack:
                            arr_stack_idx = 0
                            for seg_idx in range(target_segment_idx):
                                seg = segments[seg_idx]
                                if seg.startswith("["):
                                    if arr_stack_idx >= len(array_index_stack):
                                        array_indices_ok = False
                                        break
                                    try:
                                        expected_idx = int(seg[1:-1])
                                        actual_idx, _, _ = array_index_stack[arr_stack_idx]
                                        if actual_idx != expected_idx:
                                            array_indices_ok = False
                                            break
                                        arr_stack_idx += 1
                                    except (ValueError, IndexError):
                                        array_indices_ok = False
                                        break

                        if not array_indices_ok:
                            # We're in the wrong array item - don't match this key, continue searching
                            # Don't clear expecting_array - we need to keep tracking to reach the correct index
                            continue

                        # Found matching key
                        path_stack.append((key_part, key_indent, line_num))

                        # If the next segment is an array index, prepare to track it
                        if next_is_array:
                            try:
                                target_index = int(segments[target_segment_idx + 1][1:-1])
                                expecting_array = (
                                    target_index,
                                    key_indent + 2,
                                )  # Array items are indented more
                            except ValueError:
                                expecting_array = None
                        else:
                            expecting_array = None

                        # Before checking the path match, verify that all array indices in the path
                        # match the indices we've tracked. If any array index doesn't match,
                        # we're in the wrong array item and should continue searching.
                        array_indices_match = True
                        if array_index_stack:
                            array_stack_idx = 0
                            for seg in segments[: target_segment_idx + 1]:
                                if seg.startswith("["):
                                    if array_stack_idx >= len(array_index_stack):
                                        array_indices_match = False
                                        break
                                    try:
                                        expected_idx = int(seg[1:-1])
                                        actual_idx, _, _ = array_index_stack[array_stack_idx]
                                        if actual_idx != expected_idx:
                                            array_indices_match = False
                                            break
                                        array_stack_idx += 1
                                    except (ValueError, IndexError):
                                        array_indices_match = False
                                        break

                        # Check if we've matched all segments (no array index remaining)
                        # But skip this check if we're still tracking to a target array index
                        # (we need to reach the target index before matching nested keys)
                        # Also skip if array indices don't match (we're in the wrong array item)
                        if (
                            not expecting_array
                            and array_indices_match
                            and len(path_stack) + len(array_index_stack) == len(segments)
                        ):
                            # Verify the path matches exactly by walking through segments in order
                            # and matching against both path_stack and array_index_stack
                            path_matches = True
                            path_stack_idx = 0
                            array_stack_idx = 0

                            for _seg_idx, segment in enumerate(segments):
                                if segment.startswith("["):
                                    # This is an array index - match against array_index_stack
                                    if array_stack_idx >= len(array_index_stack):
                                        path_matches = False
                                        break
                                    try:
                                        target_index = int(segment[1:-1])
                                        arr_index, _, _ = array_index_stack[array_stack_idx]
                                        if arr_index != target_index:
                                            path_matches = False
                                            break
                                        array_stack_idx += 1
                                    except (ValueError, IndexError):
                                        path_matches = False
                                        break
                                else:
                                    # This is a path key - match against path_stack
                                    if path_stack_idx >= len(path_stack):
                                        path_matches = False
                                        break
                                    path_key, _, _ = path_stack[path_stack_idx]
                                    if path_key != segment:
                                        path_matches = False
                                        break
                                    path_stack_idx += 1

                            # Ensure we've matched all items from both stacks
                            if path_matches:
                                if path_stack_idx != len(path_stack) or array_stack_idx != len(
                                    array_index_stack
                                ):
                                    path_matches = False

                            if path_matches:
                                return line_num

    except Exception:
        # If anything goes wrong, return None
        return None
    # FALLBACK: If path ends with an array index and wasn't found,
    # try finding the parent key's line number (useful for inline arrays)
    if "segments" in locals() and segments and segments[-1].startswith("["):
        # Remove the last array index segment and try again
        parent_segments = segments[:-1]
        if parent_segments:
            # Reconstruct parent path
            parent_path_parts = []
            for seg in parent_segments:
                if seg.startswith("["):
                    parent_path_parts.append(seg)
                else:
                    if parent_path_parts and not parent_path_parts[-1].startswith("["):
                        parent_path_parts.append(".")
                    parent_path_parts.append(seg)
            parent_path = "".join(parent_path_parts)
            # Recursively try to find parent path
            fallback_result = find_path_line_number(yaml_text, parent_path)
            if fallback_result:
                return fallback_result

    return None
