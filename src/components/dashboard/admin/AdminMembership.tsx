import { useState } from "react";
import type { FormEvent } from "react";
import useSWR from "swr";
import { CheckCircle2, ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  DEFAULT_MEMBERSHIP_TIERS,
  getMembershipBuyUrlError,
  type MembershipTierContent,
  type MembershipTierKey,
} from "../../../lib/membership-content";
import { fetchApi } from "@/lib/http";

type SaveState = "idle" | "loading" | "success" | "error";
type MembershipSettingsResponse = {
  tiers?: MembershipTierContent[];
  error?: string;
};

function cloneTiers(tiers: MembershipTierContent[]) {
  return tiers.map((tier) => ({ ...tier, benefits: [...tier.benefits] }));
}

async function fetchMembershipSettings(url: string): Promise<MembershipSettingsResponse> {
  const res = await fetchApi(url);
  const data = await res.json().catch(() => ({})) as MembershipSettingsResponse;
  if (!res.ok) {
    throw new Error(data.error || "Failed to load membership settings.");
  }
  return data;
}

export default function AdminMembership() {
  const { data, error, isLoading } = useSWR<MembershipSettingsResponse>("/api/admin/membership", fetchMembershipSettings);

  if (isLoading) return <p className="text-xs text-neutral-500">Loading membership settings</p>;

  const tiers = Array.isArray(data?.tiers) ? data.tiers : DEFAULT_MEMBERSHIP_TIERS;
  const notice = error instanceof Error ? error.message : error ? "Failed to load membership settings." : "";

  return <MembershipSettingsEditor initialNotice={notice} initialTiers={tiers} />;
}

function MembershipSettingsEditor({ initialNotice, initialTiers }: { initialNotice: string; initialTiers: MembershipTierContent[] }) {
  const [tiers, setTiers] = useState<MembershipTierContent[]>(() => cloneTiers(initialTiers));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [notice, setNotice] = useState(initialNotice);

  const inputClass = "box-border w-full border border-neutral-800 bg-black/20 px-3 py-2 text-sm text-neutral-200 outline-none transition-colors placeholder:text-neutral-700 focus:border-neutral-600";
  const iconButtonClass = "inline-flex size-9 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40";

  const updateTier = <K extends keyof MembershipTierContent>(
    key: MembershipTierKey,
    field: K,
    value: MembershipTierContent[K],
  ) => {
    setTiers((current) => current.map((tier) => (
      tier.key === key ? { ...tier, [field]: value } : tier
    )));
  };

  const updateBenefit = (key: MembershipTierKey, index: number, value: string) => {
    setTiers((current) => current.map((tier) => {
      if (tier.key !== key) return tier;
      const benefits = [...tier.benefits];
      benefits[index] = value;
      return { ...tier, benefits };
    }));
  };

  const addBenefit = (key: MembershipTierKey) => {
    setTiers((current) => current.map((tier) => (
      tier.key === key ? { ...tier, benefits: [...tier.benefits, ""] } : tier
    )));
  };

  const removeBenefit = (key: MembershipTierKey, index: number) => {
    setTiers((current) => current.map((tier) => {
      if (tier.key !== key) return tier;
      const benefits = tier.benefits.filter((_, benefitIndex) => benefitIndex !== index);
      return { ...tier, benefits: benefits.length > 0 ? benefits : [""] };
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaveState("loading");
    setNotice("");

    const invalidTier = tiers.find((tier) => getMembershipBuyUrlError(tier.buyUrl));
    if (invalidTier) {
      setSaveState("error");
      setNotice(`${invalidTier.name}: ${getMembershipBuyUrlError(invalidTier.buyUrl)}`);
      return;
    }

    try {
      const res = await fetchApi("/api/admin/membership", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers }),
      });
      const data = await res.json().catch(() => ({})) as MembershipSettingsResponse;

      if (!res.ok) {
        throw new Error(data.error || "Failed to update membership settings.");
      }

      if (Array.isArray(data.tiers)) {
        setTiers(cloneTiers(data.tiers));
      }
      setSaveState("success");
      setNotice("Membership settings saved.");
      setTimeout(() => {
        setSaveState("idle");
        setNotice("");
      }, 4000);
    } catch (err) {
      setSaveState("error");
      setNotice(err instanceof Error ? err.message : "Failed to update membership settings.");
    }
  };

  const hasEmptyRequiredFields = tiers.some((tier) => (
    !tier.price.trim() ||
    !tier.period.trim() ||
    tier.benefits.every((benefit) => !benefit.trim())
  ));

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {notice && (
        <p className={`flex items-center gap-2 text-xs ${
          saveState === "error" ? "text-red-400" : "text-green-400"
        }`}>
          {saveState === "success" && <CheckCircle2 size={14} />}
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href="/membership"
          className="inline-flex items-center gap-2 border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
        >
          <ExternalLink size={12} />
          View Page
        </a>
        <button
          type="submit"
          disabled={saveState === "loading" || hasEmptyRequiredFields}
          className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveState === "loading" ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {tiers.map((tier) => (
          <section key={tier.key} className={`border bg-white/[0.02] p-5 ${tier.featured ? "border-neutral-600" : "border-neutral-800"}`}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-[9px] uppercase tracking-[0.24em] text-neutral-600">{tier.tier}</p>
                <h2 className="text-xl tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {tier.name}
                </h2>
              </div>
              {tier.featured && (
                <span className="border border-neutral-700 px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-neutral-400">
                  Featured
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Price</span>
                <input
                  value={tier.price}
                  onChange={(e) => updateTier(tier.key, "price", e.target.value)}
                  maxLength={30}
                  required
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Period</span>
                <input
                  value={tier.period}
                  onChange={(e) => updateTier(tier.key, "period", e.target.value)}
                  maxLength={40}
                  required
                  className={inputClass}
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Buy Link</span>
              <input aria-label="https://"
                type="text"
                value={tier.buyUrl}
                onChange={(e) => updateTier(tier.key, "buyUrl", e.target.value)}
                maxLength={500}
                placeholder="https://"
                className={inputClass}
              />
            </label>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">Benefits</h3>
                <button
                  type="button"
                  onClick={() => addBenefit(tier.key)}
                  disabled={tier.benefits.length >= 12}
                  className="inline-flex items-center gap-1 border border-neutral-800 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={11} />
                  Add
                </button>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
	                {tier.benefits.map((benefit, index) => (
	                  <div key={`${tier.key}-${benefit}`} className="flex items-center gap-2">
                    <input aria-label="Membership benefit"
                      value={benefit}
                      onChange={(e) => updateBenefit(tier.key, index, e.target.value)}
                      maxLength={180}
                      placeholder="Membership benefit"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => removeBenefit(tier.key, index)}
                      className={iconButtonClass}
                      aria-label={`Remove benefit ${index + 1}`}
                      title="Remove benefit"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </form>
  );
}
