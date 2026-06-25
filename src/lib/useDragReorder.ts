"use client";

import { useState, type DragEvent } from "react";

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
 * Generic list-row reordering via the native HTML5 drag API.
 * Only the drag *handle* is draggable (spread `handleProps` onto it), so the
 * inputs inside each row stay fully usable. Each row is a drop target (spread
 * `rowProps`). `onReorder(from, to)` fires when an item is dropped on a new row.
 */
export function useDragReorder(onReorder: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function reset() {
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleProps(index: number): DragHandleProps {
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        setDragIndex(index);
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
        if (dragIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (overIndex !== index) setOverIndex(index);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== index) onReorder(dragIndex, index);
        reset();
      },
    };
  }

  return { dragIndex, overIndex, handleProps, rowProps };
}
