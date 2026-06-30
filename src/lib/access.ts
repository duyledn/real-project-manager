import type { User, Project, Company } from "./types";

/**
 * Authorization rules (intentionally simple — internal tool):
 *  - god: full control over everything.
 *  - company owner: full control over their company + its projects.
 *  - assigned member: view + edit an assigned project, but never delete it.
 */

export function canManageCompany(user: User, company: Company): boolean {
  return user.role === "god" || company.ownerId === user.id;
}

/** A user can see/edit a project if god, the company owner, or assigned to it. */
export function canEditProject(user: User, project: Project, company: Company | null): boolean {
  if (user.role === "god") return true;
  if (company && company.ownerId === user.id) return true;
  return project.memberIds.includes(user.id);
}

export const canViewProject = canEditProject;

/** Only god or the company owner may delete a project. */
export function canDeleteProject(user: User, project: Project, company: Company | null): boolean {
  if (user.role === "god") return true;
  return !!company && company.ownerId === user.id;
}
