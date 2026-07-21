export const SERVICE_MANAGER_SCOPES = ["studio", "darkroom", "equipment"] as const;

export type ServiceManagerScope = (typeof SERVICE_MANAGER_SCOPES)[number];

const SERVICE_ADMIN_PATHS: Record<ServiceManagerScope, string> = {
  studio: "/dashboard/admin/studio",
  darkroom: "/dashboard/admin/darkroom",
  equipment: "/dashboard/admin/equipment",
};

export function isGlobalStaffRole(role: unknown): role is "admin" | "officer" {
  return role === "admin" || role === "officer";
}

export function normalizeManagerScopes(value: unknown): ServiceManagerScope[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<ServiceManagerScope>();
  const scopes: ServiceManagerScope[] = [];
  for (const candidate of value) {
    if (
      typeof candidate === "string" &&
      SERVICE_MANAGER_SCOPES.includes(candidate as ServiceManagerScope) &&
      !seen.has(candidate as ServiceManagerScope)
    ) {
      const scope = candidate as ServiceManagerScope;
      seen.add(scope);
      scopes.push(scope);
    }
  }
  return scopes;
}

export function canAccessAdminPath(
  role: unknown,
  managerScopes: readonly ServiceManagerScope[],
  pathname: string,
): boolean {
  if (isGlobalStaffRole(role)) return true;

  const normalizedPathname = normalizePathname(pathname);
  if (normalizedPathname === "/dashboard/admin") {
    return managerScopes.length > 0;
  }

  return managerScopes.some((scope) => {
    const servicePath = SERVICE_ADMIN_PATHS[scope];
    return normalizedPathname === servicePath || normalizedPathname.startsWith(`${servicePath}/`);
  });
}

export function getDefaultAdminPath(
  role: unknown,
  managerScopes: readonly ServiceManagerScope[],
): string | null {
  if (isGlobalStaffRole(role)) return "/dashboard/admin/members";

  const firstScope = SERVICE_MANAGER_SCOPES.find((scope) => managerScopes.includes(scope));
  return firstScope ? SERVICE_ADMIN_PATHS[firstScope] : null;
}

function normalizePathname(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}
