"use client";

import { useCallback, useEffect, useState } from "react";
import type { SubcontractorWithJobs, SubcontractorInput } from "@/lib/types";

/** Loads the global subcontractor database and exposes CRUD helpers. */
export function useSubcontractors() {
  const [subs, setSubs] = useState<SubcontractorWithJobs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subcontractors");
      if (!res.ok) throw new Error("Could not load subcontractors");
      setSubs(await res.json());
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

  const create = useCallback(
    async (input: SubcontractorInput) => {
      const res = await fetch("/api/subcontractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Could not create subcontractor");
      const created = (await res.json()) as SubcontractorWithJobs;
      await load();
      return created;
    },
    [load],
  );

  const update = useCallback(async (id: string, input: SubcontractorInput) => {
    const res = await fetch(`/api/subcontractors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Could not save subcontractor");
  }, []);

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/subcontractors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete subcontractor");
      await load();
    },
    [load],
  );

  return { subs, loading, error, reload: load, create, update, remove };
}
