"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
} from "react";

const transparentDragImage = typeof window === "undefined" ? null : new Image();
if (transparentDragImage) {
  transparentDragImage.src =
    "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

/** Animate keyed rows from their pre-reorder positions into their new layout. */
export function useFlipList<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  keys: readonly string[],
  dragIndex: number | null,
): void {
  const previousTops = useRef<Map<string, number>>(new Map());
  const transitionHandlers = useRef<Map<HTMLElement, EventListener>>(new Map());
  const orderKey = keys.join("\u0001");
  const draggedKey = dragIndex === null ? null : keys[dragIndex] ?? null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || dragIndex === null) return;

    const capturePositions = () => {
      if (prefersReducedMotion()) return;
      const next = new Map<string, number>();
      container.querySelectorAll<HTMLElement>("[data-key]").forEach((row) => {
        const key = row.dataset.key;
        if (key) next.set(key, row.getBoundingClientRect().top);
      });
      previousTops.current = next;
    };

    container.addEventListener("dragover", capturePositions);
    return () => container.removeEventListener("dragover", capturePositions);
  }, [containerRef, dragIndex, orderKey]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const previous = previousTops.current;
    previousTops.current = new Map();
    if (!container || previous.size === 0 || prefersReducedMotion()) return;

    const movedRows: HTMLElement[] = [];
    container.querySelectorAll<HTMLElement>("[data-key]").forEach((row) => {
      const key = row.dataset.key;
      if (!key || key === draggedKey) return;
      const oldTop = previous.get(key);
      if (oldTop === undefined) return;
      const delta = oldTop - row.getBoundingClientRect().top;
      if (Math.abs(delta) < 0.5) return;

      const priorHandler = transitionHandlers.current.get(row);
      if (priorHandler) row.removeEventListener("transitionend", priorHandler);
      row.style.transition = "none";
      row.style.transform = `translateY(${delta}px)`;
      movedRows.push(row);
    });

    if (movedRows.length === 0) return;
    void container.offsetHeight;

    movedRows.forEach((row) => {
      const finish: EventListener = (event) => {
        if ((event as TransitionEvent).propertyName !== "transform") return;
        row.style.transition = "";
        row.style.transform = "";
        row.removeEventListener("transitionend", finish);
        transitionHandlers.current.delete(row);
      };
      transitionHandlers.current.set(row, finish);
      row.addEventListener("transitionend", finish);
      row.style.transition = "transform 180ms cubic-bezier(.32,.72,0,1)";
      row.style.transform = "none";
    });
  }, [containerRef, draggedKey, orderKey]);

  useEffect(
    () => () => {
      transitionHandlers.current.forEach((handler, row) => {
        row.removeEventListener("transitionend", handler);
        row.style.transition = "";
        row.style.transform = "";
      });
      transitionHandlers.current.clear();
    },
    [],
  );
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
  const ghost = useRef<HTMLDivElement | null>(null);
  const dragOverListener = useRef<((event: globalThis.DragEvent) => void) | null>(null);
  const animationFrame = useRef<number | null>(null);
  const latestPointer = useRef({ x: 0, y: 0 });
  const grabOffset = useRef({ x: 0, y: 0 });

  const removeGhost = useCallback(() => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
    if (dragOverListener.current) document.removeEventListener("dragover", dragOverListener.current);
    dragOverListener.current = null;
    ghost.current?.remove();
    ghost.current = null;
  }, []);

  useEffect(() => removeGhost, [removeGhost]);

  function setIdx(i: number | null) {
    dragIdx.current = i;
    setDragIndex(i);
  }
  function reset() {
    removeGhost();
    setIdx(null);
  }

  function createGhost(event: DragEvent): void {
    if (prefersReducedMotion()) return;
    const source = (event.currentTarget as HTMLElement).closest<HTMLElement>("tr, [data-drag-row]");
    if (!source) return;

    const rect = source.getBoundingClientRect();
    const wrapper = document.createElement("div");
    wrapper.className = "drag-ghost";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.style.width = `${rect.width}px`;
    wrapper.style.height = `${rect.height}px`;

    const clone = source.cloneNode(true) as HTMLElement;
    if (source.tagName === "TR") {
      const sourceTable = source.closest("table");
      const table = document.createElement("table");
      if (sourceTable) {
        const tableStyle = getComputedStyle(sourceTable);
        table.style.width = tableStyle.width;
        table.style.tableLayout = tableStyle.tableLayout;
        table.style.borderCollapse = tableStyle.borderCollapse;
        const colgroup = sourceTable.querySelector("colgroup")?.cloneNode(true);
        if (colgroup) table.appendChild(colgroup);
      }
      const tbody = document.createElement("tbody");
      tbody.appendChild(clone);
      table.appendChild(tbody);
      wrapper.appendChild(table);
    } else {
      clone.style.width = "100%";
      wrapper.appendChild(clone);
    }

    grabOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    latestPointer.current = { x: event.clientX, y: event.clientY };
    wrapper.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    document.body.appendChild(wrapper);
    ghost.current = wrapper;

    dragOverListener.current = (dragEvent) => {
      latestPointer.current = { x: dragEvent.clientX, y: dragEvent.clientY };
    };
    document.addEventListener("dragover", dragOverListener.current);

    const updatePosition = () => {
      if (!ghost.current) {
        animationFrame.current = null;
        return;
      }
      const x = latestPointer.current.x - grabOffset.current.x;
      const y = latestPointer.current.y - grabOffset.current.y;
      ghost.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      animationFrame.current = requestAnimationFrame(updatePosition);
    };
    animationFrame.current = requestAnimationFrame(updatePosition);
  }

  function handleProps(index: number): DragHandleProps {
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        removeGhost();
        setIdx(index);
        e.dataTransfer.effectAllowed = "move";
        // Firefox requires data to be set for a drag to actually start.
        try {
          e.dataTransfer.setData("text/plain", String(index));
        } catch {
          /* no-op */
        }
        if (!prefersReducedMotion()) {
          if (transparentDragImage) e.dataTransfer.setDragImage(transparentDragImage, 0, 0);
          createGhost(e);
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
