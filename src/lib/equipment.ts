export const EQUIPMENT_CATEGORIES = [
  { value: "camera", label: "Cameras" },
  { value: "lens", label: "Lenses" },
  { value: "lighting", label: "Lighting" },
  { value: "tripod", label: "Tripods" },
  { value: "accessory", label: "Accessories" },
  { value: "other", label: "Other equipment" },
] as const;

export type EquipmentCategory = typeof EQUIPMENT_CATEGORIES[number]["value"];

export const EQUIPMENT_CATEGORY_FILTERS = [
  { value: "", label: "All Categories" },
  ...EQUIPMENT_CATEGORIES,
];

const CATEGORY_LABELS: Record<string, string> = {
  camera: "Cameras",
  cameras: "Cameras",
  digital: "Cameras",
  film: "Cameras",
  lens: "Lenses",
  lenses: "Lenses",
  lighting: "Lighting",
  tripod: "Tripods",
  tripods: "Tripods",
  accessory: "Accessories",
  accessories: "Accessories",
  other: "Other equipment",
};

const CATEGORY_ALIASES: Record<string, EquipmentCategory> = {
  camera: "camera",
  cameras: "camera",
  digital: "camera",
  film: "camera",
  lens: "lens",
  lenses: "lens",
  lighting: "lighting",
  light: "lighting",
  tripod: "tripod",
  tripods: "tripod",
  accessory: "accessory",
  accessories: "accessory",
  other: "other",
  "other equipment": "other",
};

export function getEquipmentCategoryLabel(category: string) {
  return CATEGORY_LABELS[category.toLowerCase()] || category;
}

export function normalizeEquipmentCategory(category: string): EquipmentCategory {
  return CATEGORY_ALIASES[category.trim().toLowerCase()] || "other";
}
