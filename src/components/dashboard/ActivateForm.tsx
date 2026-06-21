import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { fetchApi, readErrorMessage, readJson } from "@/lib/http";

const wikiHref = "https://github.com/alesgsanudoo/ppc/wiki";

interface ActivationResponse {
  expiresAt?: string | null;
  tier?: string | null;
}

export default function ActivateForm() {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetchApi("/api/keys/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });

      if (!res.ok) {
        setError(await readErrorMessage(res, "Invalid or expired activation key."));
        setLoading(false);
        return;
      }

      const data = await readJson<ActivationResponse>(res);
      const expiryStr = data.expiresAt
        ? new Date(data.expiresAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })
        : "no expiration";
      const tierLabel = data.tier ? data.tier.charAt(0).toUpperCase() + data.tier.slice(1) : "Member";
      setSuccess(`Membership activated! Tier: ${tierLabel} (until ${expiryStr}).`);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.02] border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors text-center tracking-[0.2em] uppercase";

  return (
    <div>
      <form onSubmit={handleActivate} className="space-y-4">
        <div>
          <label htmlFor="ActivateForm-activation-key" className="block text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">
            Activation Key
          </label>
          <input id="ActivateForm-activation-key" aria-label="XXXX-XXXX-XXXX-XXXX"
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            required
            className={inputClass}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {success && (
          <p className="text-xs text-green-400">{success}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-white text-black text-[11px] tracking-[0.2em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {loading ? "Activating" : "Activate Membership"}
        </button>
      </form>

      <p className="text-center mt-6 text-[10px] text-neutral-600">
        Activation keys are emailed to your TooCOOL email. If you haven't received yours, please check your spam folder or contact support in the discord server.
      </p>
      <p className="mt-4 text-center text-[10px] tracking-wider text-neutral-600">
        Don't know how to buy or activate?
        <a
          href={wikiHref}
          target="_blank"
          rel="noreferrer"
          className="ml-1 inline-flex items-center gap-1 text-neutral-300 underline underline-offset-4 transition-colors hover:text-white"
        >
          Read the wiki <ExternalLink size={10} />
        </a>
      </p>
    </div>
  );
}
