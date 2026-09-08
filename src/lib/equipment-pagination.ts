export const EQUIPMENT_PAGE_SIZE = 15;

export interface EquipmentPage<T> {
  items: T[];
  page: number;
  totalItems: number;
  totalPages: number;
}

export function getEquipmentPage<T>(items: T[], requestedPage: number): EquipmentPage<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / EQUIPMENT_PAGE_SIZE));
  const normalizedPage = Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1;
  const page = Math.min(Math.max(1, normalizedPage), totalPages);
  const start = (page - 1) * EQUIPMENT_PAGE_SIZE;

  return {
    items: items.slice(start, start + EQUIPMENT_PAGE_SIZE),
    page,
    totalItems,
    totalPages,
  };
}
