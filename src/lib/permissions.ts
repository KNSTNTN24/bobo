export type CatalogPerms = {
  canBakeryEditProducts: boolean;
  canBakeryEditPrices: boolean;
};

export const NO_PERMS: CatalogPerms = {
  canBakeryEditProducts: false,
  canBakeryEditPrices: false,
};

/** Can this role edit catalog (non-price) fields, given delegation settings? */
export function canEditCatalog(role: string, perms: CatalogPerms): boolean {
  return role === "ADMIN" || (role === "BAKERY" && perms.canBakeryEditProducts);
}

/** Can this role edit prices, given delegation settings? */
export function canEditPrices(role: string, perms: CatalogPerms): boolean {
  return role === "ADMIN" || (role === "BAKERY" && perms.canBakeryEditPrices);
}

/** Can this user act on orders/data for a given café? Cafés are limited to their own. */
export function canAccessCafe(
  role: string,
  sessionCafeId: string | null,
  cafeId: string,
): boolean {
  if (role === "ADMIN" || role === "BAKERY") return true;
  if (role === "CAFE") return sessionCafeId === cafeId;
  return false;
}
