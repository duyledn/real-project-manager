"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useProject } from "./useProject";
import type { Project } from "./types";

type SaveState = "idle" | "saving" | "saved" | "error";

interface ProjectContextValue {
  project: Project | null;
  setProject: (updater: (prev: Project) => Project) => void;
  loading: boolean;
  error: string | null;
  saveState: SaveState;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/** Loads a project once at the layout level and shares it with every tab, so
 *  the header's Convert button and all the tab pages read and mutate the same
 *  live working copy. */
export function ProjectProvider({ id, children }: { id: string; children: ReactNode }) {
  const value = useProject(id);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext must be inside ProjectProvider");
  return ctx;
}
