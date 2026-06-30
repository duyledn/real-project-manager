"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project, ProjectInput } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";

function stripToInput(p: Project): ProjectInput {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = p;
  return rest;
}

// ---------------------------------------------------------------------------
// Client-side project cache. Switching back to a recently-opened project (and
// its base64 profile image) then renders instantly from memory while a fresh
// copy revalidates in the background — no spinner, no re-download.
// ---------------------------------------------------------------------------
const cache = new Map<string, Project>();
const inflight = new Map<string, Promise<Project | null>>();

function fetchProject(id: string): Promise<Project | null> {
  if (inflight.has(id)) return inflight.get(id)!;
  const p = fetch(`/api/projects/${id}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load project (${res.status})`);
      const data = (await res.json()) as Project;
      cache.set(id, data);
      return data;
    })
    .catch(() => null)
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

/** Warm the cache for a project (e.g. on hover) so opening it is instant. */
export function prefetchProject(id: string): void {
  if (!cache.has(id)) void fetchProject(id);
}

/**
 * Loads a project by id and keeps a working copy in state. Reads from the
 * in-memory cache first for instant switching, then revalidates. Any change via
 * setProject is debounce-saved to the API after 700ms, and the cache is kept in
 * sync so navigating away and back shows the latest local edits immediately.
 */
export function useProject(id: string) {
  const cached = cache.get(id) ?? null;
  const [project, setProjectState] = useState<Project | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Project | null>(cached);

  useEffect(() => {
    let cancelled = false;
    const fromCache = cache.get(id) ?? null;
    if (fromCache) {
      setProjectState(fromCache);
      latest.current = fromCache;
      setLoading(false);
    } else {
      setLoading(true);
    }

    fetch(`/api/projects/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load project (${res.status})`);
        return res.json();
      })
      .then((data: Project) => {
        if (cancelled) return;
        cache.set(id, data);
        // Don't clobber unsaved local edits that are mid-flight.
        if (saveTimer.current == null) {
          setProjectState(data);
          latest.current = data;
        }
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled && !fromCache) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const persist = useCallback(async () => {
    const current = latest.current;
    if (!current) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stripToInput(current)),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const saved = (await res.json()) as Project;
      cache.set(id, saved);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [id]);

  const setProject = useCallback(
    (updater: (prev: Project) => Project) => {
      setProjectState((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        latest.current = next;
        cache.set(id, next);
        return next;
      });
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void persist();
      }, 700);
    },
    [persist, id],
  );

  // Flush a pending save if the user navigates away.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void persist();
      }
    };
  }, [persist]);

  return { project, setProject, loading, error, saveState };
}
