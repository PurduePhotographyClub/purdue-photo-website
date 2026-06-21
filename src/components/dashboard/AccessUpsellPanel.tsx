import { LockKeyhole, ShoppingBag, Sparkles } from "lucide-react";

interface Props {
  eyebrow?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  href?: string;
}

export default function AccessUpsellPanel({
  eyebrow = "Member upgrade",
  title,
  description,
  ctaLabel = "Buy Membership",
  href = "/membership",
}: Props) {
  return (
    <div className="relative overflow-hidden border border-neutral-800 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 sm:p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-500/60 to-transparent" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900 text-neutral-200">
            <LockKeyhole className="size-4" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center bg-white text-black">
              <Sparkles className="size-2.5" aria-hidden="true" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-500">{eyebrow}</p>
            <p className="mt-1 text-sm font-medium text-neutral-100">{title}</p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-500">{description}</p>
          </div>
        </div>
        <a
          href={href}
          className="inline-flex shrink-0 items-center justify-center gap-2 border border-neutral-600 bg-white px-4 py-2.5 text-[10px] uppercase tracking-[0.15em] text-black transition-colors hover:bg-neutral-200"
        >
          <ShoppingBag className="size-3.5" aria-hidden="true" />
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
