export type MemberRole = "owner" | "manager" | "staff";

export const ADMIN_ROLES: MemberRole[] = ["owner", "manager"];

export function canAccessAdmin(role: MemberRole | null): boolean {
  return role !== null && (ADMIN_ROLES as string[]).includes(role);
}

export function canResetKitchen(role: MemberRole | null): boolean {
  return role !== null && (ADMIN_ROLES as string[]).includes(role);
}
