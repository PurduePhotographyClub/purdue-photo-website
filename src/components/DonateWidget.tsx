import { useEffect, useRef, useState } from "react";
import { ExternalLink, HandHeart, Sparkles, X } from "lucide-react";

const DONATION_URL = "https://giving.purdue.edu/cart?dids=SO1760&amount=10&appealcode=18240";
const FIREWORK_COLORS = ["#ceb888", "#f5e6b6", "#ffffff", "#8e6f3e"];

type CanvasConfetti = typeof import("canvas-confetti")["default"];

let confettiLoader: Promise<CanvasConfetti | null> | null = null;

function loadConfetti() {
  if (!confettiLoader) {
    confettiLoader = import("canvas-confetti")
      .then((module) => module.default)
      .catch(() => null);
  }

  return confettiLoader;
}

function launchDonateFireworks() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    void loadConfetti().then((confetti) => {
      if (!confetti) return;

      const defaults = {
        colors: FIREWORK_COLORS,
        disableForReducedMotion: true,
        scalar: 0.9,
        ticks: 180,
        zIndex: 10000,
      };

      confetti({
        ...defaults,
        particleCount: 90,
        spread: 115,
        startVelocity: 36,
        origin: { x: 0.5, y: 0.58 },
        shapes: ["star", "circle", "square"],
      });

      window.setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 46,
          angle: 58,
          spread: 64,
          startVelocity: 44,
          origin: { x: 0.03, y: 0.82 },
        });
        confetti({
          ...defaults,
          particleCount: 46,
          angle: 122,
          spread: 64,
          startVelocity: 44,
          origin: { x: 0.97, y: 0.82 },
        });
      }, 110);

      window.setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 26,
          spread: 95,
          startVelocity: 22,
          gravity: 0.55,
          drift: -0.2,
          origin: { x: 0.25, y: 0.15 },
          shapes: ["star"],
        });
        confetti({
          ...defaults,
          particleCount: 26,
          spread: 95,
          startVelocity: 22,
          gravity: 0.55,
          drift: 0.2,
          origin: { x: 0.75, y: 0.15 },
          shapes: ["star"],
        });
      }, 260);
    });
  }
}

export default function DonateWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);
  return (
    <div ref={panelRef} className="fixed bottom-[4rem] right-6 z-[60]">

      {isOpen && (
        <div
          className="fixed bottom-[7.5rem] left-1/2 w-[calc(100vw-2rem)] max-w-72 -translate-x-1/2 overflow-hidden rounded-lg border border-[#ceb888]/25 bg-neutral-950/95 shadow-2xl shadow-black/50 backdrop-blur-md sm:absolute sm:bottom-14 sm:left-auto sm:right-0 sm:w-72 sm:max-w-none sm:translate-x-0"
          style={{ animation: "donateSlideUp 0.2s ease-out" }}
        >
          <div className="flex items-center justify-between border-b border-neutral-800/80 px-4 py-3">
            <span
              className="text-[10px] uppercase tracking-[0.25em] text-[#ceb888]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Support PPC
            </span>
            <button type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-600 transition-colors hover:text-white"
              aria-label="Close donation panel"
            >
              <X size={12} />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div className="flex gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[#ceb888]/25 bg-[#ceb888]/10 text-[#ceb888]">
                <Sparkles size={15} />
              </div>
              <div>
                <p
                  className="text-sm leading-snug text-neutral-100"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Help keep cameras clicking.
                </p>
                <p className="mt-2 text-[10px] leading-relaxed tracking-[0.08em] text-neutral-500">
                  Gifts support club programming, supplies, darkroom access, and creative opportunities for Purdue photographers.
                </p>
              </div>
            </div>

            <a
              href={DONATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ceb888] px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-neutral-950 transition-colors hover:bg-[#d8c79b]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Donate $10
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      <button type="button"
        onClick={() => {
          launchDonateFireworks();
          setIsOpen((open) => !open);
        }}
        className="group flex items-center gap-2.5 rounded-full border border-[#ceb888]/30 bg-neutral-950/90 px-4 py-2.5 text-[#ceb888] shadow-lg shadow-neutral-900/50 backdrop-blur-sm transition-all duration-300 hover:border-[#ceb888]/60 hover:text-[#f0dfb0]"
        title="Donate to the club"
        aria-expanded={isOpen}
        aria-label="Open donation panel"
      >
        <HandHeart
          size={14}
          className={`transition-transform duration-300 ${isOpen ? "rotate-12" : "group-hover:-rotate-6"}`}
        />
        <span
          className="hidden text-[10px] uppercase tracking-[0.15em] sm:inline"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Donate
        </span>
      </button>

      <style>{`
        @keyframes donateSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes donateThanksFloat {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.96);
          }
          18%, 82% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
        }
      `}</style>
    </div>
  );
}
