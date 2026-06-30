import { Project } from "../types";

/**
 * Enforces SaaS monetization limits by checking the count of active projects for a tenant.
 * Returns true if the limit is reached and more project creation is blocked.
 * 
 * @param projects List of all projects for the current tenant
 * @param subscriptionPlan The current subscription plan level
 */
export function checkProjectLimit(
  projects: Project[],
  subscriptionPlan: 'Free Trial' | 'Pro Growth' | 'Enterprise Matrix'
): boolean {
  if (subscriptionPlan !== 'Free Trial') {
    return false; // Pro Growth and Enterprise plans have unlimited active projects
  }
  
  // "Active projects" are those with status === 'Active'
  const activeProjectsCount = projects.filter(p => p.status === 'Active').length;
  return activeProjectsCount >= 3;
}
