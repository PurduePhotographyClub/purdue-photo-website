export type MembershipTierKey = "member" | "facilities";

export interface MembershipTierContent {
  key: MembershipTierKey;
  tier: string;
  name: string;
  price: string;
  period: string;
  benefits: string[];
  buyUrl: string;
  featured: boolean;
  sortOrder: number;
}

export const DEFAULT_MEMBERSHIP_TIERS: MembershipTierContent[] = [
  {
    tier: "Tier 1",
    name: "Basic",
    key: "member",
    price: "$10",
    period: "/semester",
    benefits: [
      "General membership for one semester",
      "Access to meetings",
      "Certificate of membership",
    ],
    buyUrl: "",
    featured: false,
    sortOrder: 1,
  },
  {
    tier: "Tier 2",
    name: "Facilities",
    key: "facilities",
    price: "$30",
    period: "/semester",
    benefits: [
      "All Basic tier benefits",
      "15 rolls of film development (color and B&W)",
      "Facilities reservation (darkroom and studio)",
      "Access to job postings board",
      "Can purchase more film development as needed (10 for $15)",
    ],
    buyUrl: "",
    featured: true,
    sortOrder: 2,
  },
];

function sanitizeMembershipText(input: unknown, maxLength: number): string {
  return String(input || "")
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}

export function getMembershipBuyUrlError(input: unknown): string | null {
  const value = sanitizeMembershipText(input, 500);
  if (!value) return null;

  if (value.startsWith("/") && !value.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return null;
    }
  } catch {
    return "Buy link must be a valid URL.";
  }

  return "Buy link must start with http://, https://, or /.";
}
