import useSWR from "swr";
import { Check, ExternalLink, Film, KeyRound, Mail, Monitor, Shield, ShoppingCart } from "lucide-react";
import { DEFAULT_MEMBERSHIP_TIERS, type MembershipTierContent } from "../lib/membership-content";
import { fetchPublicJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

interface Props {
  currentTier?: string | null;
  currentRole?: string | null;
  isLoggedIn?: boolean;
}

interface MembershipResponse {
  tiers?: MembershipTierContent[];
}

const tierBadge: Record<string, { label: string; style: string }> = {
  member: { label: "Basic Member", style: "bg-green-900/50 text-green-300 border-green-800" },
  facilities: { label: "Facilities Member", style: "bg-blue-900/50 text-blue-300 border-blue-800" },
};

const roleBadge: Record<string, { label: string; style: string }> = {
  officer: { label: "Officer", style: "bg-amber-950/30 text-amber-300 border-amber-800/70" },
  admin: { label: "Administrator", style: "bg-red-950/30 text-red-300 border-red-800/70" },
};

const wikiHref = "https://github.com/alesgsanudoo/ppc/wiki";

const purchaseSteps = [
  {
    step: "01",
    title: "Buy Through TooCOOL",
    desc: "Purchase Tier 1 first. Facilities is available as an upgrade once Basic is active.",
    icon: ShoppingCart,
  },
  {
    step: "02",
    title: "Check TooCOOL Email",
    desc: "Your activation key is sent to your TooCOOL email after purchase.",
    icon: Mail,
  },
  {
    step: "03",
    title: "Activate",
    desc: "Redeem the key on your account. Facilities keys require active Tier 1 membership.",
    icon: KeyRound,
  },
];

function cloneTiers(tiers: MembershipTierContent[]) {
  return tiers.map((tier) => ({ ...tier, benefits: [...tier.benefits] }));
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function getTierCta(tier: MembershipTierContent, isLoggedIn?: boolean) {
  if (tier.buyUrl) {
    return {
      href: tier.buyUrl,
      label: `Buy ${tier.name}`,
      external: isExternalHref(tier.buyUrl),
    };
  }

  return {
    href: isLoggedIn ? "/activate" : "/register",
    label: isLoggedIn ? "Activate Key" : "Sign Up",
    external: false,
  };
}

export default function Membership({ currentTier, currentRole, isLoggedIn }: Props) {
  const { data } = useSWR<MembershipResponse>("/api/membership", fetchPublicJson, PUBLIC_API_SWR_OPTIONS);
  const tiers = data?.tiers && data.tiers.length > 0 ? cloneTiers(data.tiers) : cloneTiers(DEFAULT_MEMBERSHIP_TIERS);
  const isElevated = currentRole === "admin" || currentRole === "officer";

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-20">
          <p className={`text-xs tracking-[0.4em] uppercase text-neutral-500 mb-4`}>Join Us</p>
          <h1 className={`text-4xl md:text-5xl tracking-wider text-neutral-100`} style={{ fontFamily: "'Playfair Display', serif" }}>Membership</h1>
          <p className={`text-sm text-neutral-400 tracking-wider mt-6 max-w-lg mx-auto select-text`}>
            Whether you shoot film, digital, or both, there's a place for you here. Open to anyone interested in photography.
          </p>
          {currentTier && (
            <div className="mt-6">
              <span className={`inline-block px-3 py-1 text-[10px] tracking-[0.2em] uppercase border rounded ${tierBadge[currentTier]?.style ?? tierBadge.member.style}`}>
                Your tier: {tierBadge[currentTier]?.label ?? currentTier}
              </span>
            </div>
          )}
          {isElevated && currentRole && (
            <div className={`${currentTier ? "mt-3" : "mt-6"}`}>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-[0.2em] uppercase border rounded ${roleBadge[currentRole]?.style}`}>
                <Shield size={10} /> {roleBadge[currentRole]?.label}, Full Access
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-3xl mx-auto">
          {tiers.map((tier) => {
            const isCurrentTier = currentTier === tier.key;
            const isIncludedTier = currentTier === "facilities" && tier.key === "member";
            const requiresBasicFirst = tier.key === "facilities" && !isElevated && currentTier !== "member" && currentTier !== "facilities";
            const hasAccess = isCurrentTier || isIncludedTier || isElevated;
            const canUpgradeToFacilities = tier.key === "facilities" && !hasAccess && !requiresBasicFirst && currentTier === "member";
            const cta = getTierCta(tier, isLoggedIn);
            return (
              <div
                key={tier.name}
                className={`p-8 md:p-10 border transition-all duration-300 relative ${
                  requiresBasicFirst
                    ? "border-neutral-800 bg-white/[0.02]"
                    : hasAccess
                    ? "border-green-700 bg-green-900/10"
                    : tier.featured
                      ? "border-white bg-white/5"
                      : "border-neutral-800 hover:border-neutral-600"
                }`}>
                {isCurrentTier && (
                  <span className="absolute top-3 right-3 text-[9px] tracking-[0.2em] uppercase text-green-400 border border-green-800 bg-green-900/30 px-2 py-0.5 rounded">Current</span>
                )}
                {isIncludedTier && (
                  <span className="absolute top-3 right-3 text-[9px] tracking-[0.2em] uppercase text-green-400 border border-green-800 bg-green-900/30 px-2 py-0.5 rounded">Included</span>
                )}
                {requiresBasicFirst && (
                  <span className="absolute top-3 right-3 text-[9px] tracking-[0.2em] uppercase text-amber-400 border border-amber-900/70 bg-amber-950/20 px-2 py-0.5 rounded">Requires Basic</span>
                )}
                {!isCurrentTier && !isIncludedTier && isElevated && tier.key === "facilities" && (
                  <span className="absolute top-3 right-3 text-[9px] tracking-[0.2em] uppercase text-purple-400 border border-purple-800 bg-purple-900/30 px-2 py-0.5 rounded">
                    {currentRole === "admin" ? "Admin" : "Officer"} Access
                  </span>
                )}
                <p className={`text-[10px] tracking-[0.3em] uppercase text-neutral-600 mb-2`}>{tier.tier}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <h2 className={`text-3xl md:text-4xl tracking-wider text-neutral-100`} style={{ fontFamily: "'Playfair Display', serif" }}>
                    {tier.name}
                  </h2>
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className={`text-2xl md:text-3xl tracking-wider text-neutral-100`} style={{ fontFamily: "'Playfair Display', serif" }}>
                    {tier.price}
                  </span>
                  <span className={`text-xs text-neutral-500 tracking-wider`}>{tier.period}</span>
                </div>
                <ul className="space-y-3">
                  {tier.benefits.map((b, index) => (
                    <li key={`${tier.key}-${index}-${b}`} className="flex items-start gap-3">
                      <Check size={14} className={`text-neutral-500 mt-0.5 flex-shrink-0`} />
                      <span className={`text-xs text-neutral-400 tracking-wider leading-relaxed select-text`}>{b}</span>
                    </li>
                  ))}
                </ul>
                {requiresBasicFirst && (
                  <>
                    <p className="mt-6 text-[10px] tracking-[0.16em] uppercase text-amber-400/80">
                      Activate Tier 1 before upgrading to Facilities.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="mt-4 flex w-full cursor-not-allowed items-center justify-center py-3 text-xs tracking-[0.3em] uppercase text-neutral-600 border border-neutral-800 bg-neutral-950/40"
                    >
                      Requires Tier 1
                    </button>
                  </>
                )}
                {canUpgradeToFacilities && (
                  <div className="mt-8 grid grid-cols-1 gap-2">
                    {tier.buyUrl && (
                      <a
                        href={tier.buyUrl}
                        target={isExternalHref(tier.buyUrl) ? "_blank" : undefined}
                        rel={isExternalHref(tier.buyUrl) ? "noreferrer" : undefined}
                    className="flex min-h-11 w-full items-center justify-center gap-2 bg-white py-3 text-xs uppercase tracking-[0.3em] text-black transition-all duration-300 hover:bg-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
                      >
                        Buy Upgrade
                        {isExternalHref(tier.buyUrl) && <ExternalLink size={12} />}
                      </a>
                    )}
                    <a
                      href="/activate"
                      className="flex min-h-11 w-full items-center justify-center border border-neutral-700 py-3 text-xs uppercase tracking-[0.3em] text-neutral-400 transition-all duration-300 hover:border-white hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
                    >
                      Activate Key
                    </a>
                  </div>
                )}
                {!hasAccess && !requiresBasicFirst && !canUpgradeToFacilities && (
                  <a
                    href={cta.href}
                    target={cta.external ? "_blank" : undefined}
                    rel={cta.external ? "noreferrer" : undefined}
                    className={`mt-8 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 py-3 text-center text-xs uppercase tracking-[0.3em] transition-all duration-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 ${
                      tier.featured
                        ? "bg-white text-black hover:bg-neutral-200"
                        : "border border-neutral-700 text-neutral-400 hover:border-white hover:text-white"
                    }`}
                  >
                    {cta.label}
                    {cta.external && <ExternalLink size={12} />}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-32 border-t border-neutral-800 pt-16">
          <p className="mb-4 text-center text-xs uppercase tracking-[0.4em] text-neutral-500">Buying Access</p>
          <h3 className="mb-12 text-center text-xl tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>Buy & Activate</h3>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {purchaseSteps.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="mb-4 inline-flex items-center justify-center text-white">
                    <Icon size={80} strokeWidth={1.8} />
                  </div>
                  <p className="mb-3 text-2xl tracking-wider text-neutral-600" style={{ fontFamily: "'Playfair Display', serif" }}>{item.step}</p>
                  <h4 className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-100">{item.title}</h4>
                  <p className="text-xs leading-relaxed tracking-wider text-neutral-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
          {/* <div className="mt-10 text-center">
            <a href={wikiHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-neutral-600 px-8 py-3 text-xs uppercase tracking-[0.3em] text-neutral-300 transition-all duration-300 hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400">
              Read the Wiki <ExternalLink size={12} />
            </a>
          </div> */}
        </div>
      </div>
    </div>
  );
}
