"use client";

import { useRef, useState, type DragEvent } from "react";

/** Pure helper: return a new array with the item at `from` moved to `to`. */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Move every selected item (preserving their relative order) as one block,
 * inserting it before the row at `targetIndex`. Used for multi-select drag.
 */
export function moveItemsBefore<T extends { id: string }>(
  arr: T[],
  selectedIds: Set<string>,
  targetIndex: number,
): T[] {
  const selected = arr.filter((x) => selectedIds.has(x.id));
  if (selected.length === 0) return arr;
  const rest = arr.filter((x) => !selectedIds.has(x.id));
  const targetItem = arr[targetIndex];
  let insertAt = targetItem ? rest.indexOf(targetItem) : rest.length;
  if (insertAt === -1) {
    // Dropped onto a selected row: keep the block near its original spot.
    insertAt = arr.slice(0, targetIndex).filter((x) => !selectedIds.has(x.id)).length;
  }
  rest.splice(insertAt, 0, ...selected);
  return rest;
}

export interface DragHandleProps {
  draggable: true;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
}

export interface DropRowProps {
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

/**
 * Generic list-row reordering via the native HTML5 drag API, with **live**
 * (Apple-style) reordering: as the pointer moves over a new row, the list is
 * reordered immediately so the rows visibly shift and a gap opens under the
 * dragged item — no separate drop-line indicator needed.
 *
 * Only the drag *handle* is draggable (spread `handleProps` onto it) so the
 * inputs inside each row stay usable. Every row is a drop target (spread
 * `rowProps`). `onReorder(from, to)` runs on each step; if it returns the
 * dragged item's new index (e.g. for multi-select block moves) that value is
 * tracked, otherwise `to` is assumed.
 */
export function useDragReorder(onReorder: (from: number, to: number) => number | void) {
  // The dragged item's *current* index. Kept in a ref so the rapid stream of
  // dragover events always reorders from the latest position, and in state so
  // rows can render the "lifted" style.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragIdx = useRef<number | null>(null);

  function setIdx(i: number | null) {
    dragIdx.current = i;
    setDragIndex(i);
  }
  function reset() {
    setIdx(null);
  }

  function handleProps(index: number): DragHandleProps {
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        setIdx(index);
        e.dataTransfer.effectAllowed = "move";
        // Firefox requires data to be set for a drag to actually start.
        try {
          e.dataTransfer.setData("text/plain", String(index));
        } catch {
          /* no-op */
        }
      },
      onDragEnd: reset,
    };
  }

  function rowProps(index: number): DropRowProps {
    return {
      onDragOver: (e: DragEvent) => {
        const from = dragIdx.current;
        if (from === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (from === index) return;
        const newIndex = onReorder(from, index);
        setIdx(typeof newIndex === "number" ? newIndex : index);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        reset();
      },
    };
  }

  // `overIndex` is retained for API compatibility but mirrors the live drag
  // position; tables now show movement instead of a drop line.
  return { dragIndex, overIndex: dragIndex, handleProps, rowProps };
}
