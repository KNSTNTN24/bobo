export const ROLES = ["ADMIN", "BAKERY", "CAFE", "COURIER"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  BAKERY: "/bakery",
  CAFE: "/cafe",
  COURIER: "/courier",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  BAKERY: "Bakery",
  CAFE: "Café",
  COURIER: "Courier",
};
