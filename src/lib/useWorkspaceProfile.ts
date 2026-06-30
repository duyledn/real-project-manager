"use client";

import { useCallback, useEffect, useState } from "react";

export interface WorkspaceProfile {
  name: string;
  /** Avatar as a data URL ("" = use initials fallback). */
  avatar: string;
}

const LS_KEY = "re_profile";
const EVENT = "re-profile";
const DEFAULT: WorkspaceProfile = { name: "You", avatar: "" };

/**
 * A single, workspace-wide user profile (name + avatar) kept in localStorage.
 * Powers the nav-bar avatar and the workspace Settings page. Updates broadcast
 * across components on the same page via a window event.
 */
export function useWorkspaceProfile() {
  const [profile, setProfile] = useState<WorkspaceProfile>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setProfile({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    const onSync = (e: Event) => setProfile((e as CustomEvent).detail as WorkspaceProfile);
    window.addEventListener(EVENT, onSync);
    return () => window.removeEventListener(EVENT, onSync);
  }, []);

  const update = useCallback((patch: Partial<WorkspaceProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
      return next;
    });
  }, []);

  return { profile, update };
}

/** Initials for the avatar fallback. */
export function profileInitials(name: string): string {
  return (
    (name || "You")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "Y"
  );
}
