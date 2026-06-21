export type MerchProductCategory = "current-drops" | "prints" | "rolls";
export type MerchProductStatus = "available" | "limited" | "sold_out";

export interface MerchCategoryContent {
  id: MerchProductCategory;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MerchProductContent {
  id: string;
  name: string;
  description: string;
  category: MerchProductCategory;
  categoryName: string;
  price: string;
  buyUrl: string;
  imageR2Key: string | null;
  status: MerchProductStatus;
  inventoryLabel: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_MERCH_CATEGORIES: MerchCategoryContent[] = [
  { id: "current-drops", name: "Current Drops", sortOrder: 0, isActive: true },
  { id: "prints", name: "Prints", sortOrder: 10, isActive: true },
  { id: "rolls", name: "Rolls", sortOrder: 20, isActive: true },
];

export const MERCH_STATUSES: Array<{ value: MerchProductStatus; label: string }> = [
  { value: "available", label: "Available" },
  { value: "limited", label: "Limited" },
  { value: "sold_out", label: "Sold Out" },
];

function sanitizeMerchText(input: unknown, maxLength: number): string {
  return String(input || "")
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}

export function getMerchPriceParts(price: string) {
  const value = sanitizeMerchText(price, 40);
  const numeric = value.replace(/^\$/, "");
  const [whole = "0", cents = "00"] = numeric.split(".");

  return {
    symbol: "$",
    whole: whole || "0",
    cents: (cents || "00").padEnd(2, "0").slice(0, 2),
  };
}

export function getMerchImageUrl(imageR2Key: string | null | undefined) {
  return imageR2Key ? `/api/merch/image/${imageR2Key}` : "";
}
