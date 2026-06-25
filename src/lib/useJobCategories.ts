"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Loads the globally-shared job category list and lets the user add/remove
 * options. Any change is persisted via PUT, so a category added in one project
 * appears in every other project (and a removed one disappears everywhere).
 */
export function useJobCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/job-categories");
      if (!res.ok) throw new Error("Could not load job categories");
      setCategories(await res.json());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(async (next: string[]) => {
    setCategories(next); // optimistic
    const res = await fetch("/api/job-categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: next }),
    });
    if (!res.ok) throw new Error("Could not save job categories");
    setCategories(await res.json());
  }, []);

  const addCategory = useCallback(
    async (name: string) => {
      const t = name.trim();
      if (!t) return;
      if (categories.some((c) => c.toLowerCase() === t.toLowerCase())) return;
      await persist([...categories, t]);
    },
    [categories, persist],
  );

  const removeCategory = useCallback(
    async (name: string) => {
      await persist(categories.filter((c) => c !== name));
    },
    [categories, persist],
  );

  return { categories, loading, error, reload: load, addCategory, removeCategory };
}
