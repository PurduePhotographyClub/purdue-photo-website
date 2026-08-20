export interface EquipmentRequestAccess {
  canRequestPersonal: boolean;
  canRequestPpc: boolean;
  isStaff: boolean;
}

export function getEquipmentRequestAccess(
  userRole: string,
  userTier: string | null,
): EquipmentRequestAccess {
  const isStaff = userRole === "admin" || userRole === "officer";

  return {
    canRequestPersonal: isStaff || userTier === "facilities" || userTier === "member",
    canRequestPpc: isStaff || userTier === "facilities",
    isStaff,
  };
}

export function canRequestEquipmentItem(
  access: EquipmentRequestAccess,
  isPpcItem: boolean,
) {
  return isPpcItem ? access.canRequestPpc : access.canRequestPersonal;
}
