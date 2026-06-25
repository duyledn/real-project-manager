"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project, ProjectInput } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";

function stripToInput(p: Project): ProjectInput {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = p;
  return rest;
}

/**
 * Loads a project by id and keeps a working copy in state. Any change made via
 * setProject is debounce-saved to the API after 700ms of inactivity, so the
 * three tabs (Inputs / Analysis / Math) all read the same live object and the
 * user never has to press "save".
 */
export function useProject(id: string) {
  const [project, setProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/projects/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load project (${res.status})`);
        return res.json();
      })
      .then((data: Project) => {
        if (cancelled) return;
        setProjectState(data);
        latest.current = data;
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
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
        return next;
      });
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist();
      }, 700);
    },
    [persist],
  );

  // Flush a pending save if the user navigates away.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        void persist();
      }
    };
  }, [persist]);

  return { project, setProject, loading, error, saveState };
}
