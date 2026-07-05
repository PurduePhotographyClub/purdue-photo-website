import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { Camera, X, Aperture, CloudRain, Clapperboard, Film, CloudFog, Sun, Snowflake, Contrast, Waves, Eye, Grip } from "lucide-react";

interface Filter {
  name: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  css: string;
  overlay?: string;
}

const filters: Filter[] = [
  {
    name: "none",
    label: "No Filter",
    icon: Aperture,
    css: "none",
  },
  {
    name: "gloomy",
    label: "Gloomy",
    icon: CloudRain,
    css: "saturate(0.3) brightness(0.7) contrast(1.2) sepia(0.15) hue-rotate(200deg)",
    overlay: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,30,0.5) 100%)",
  },
  {
    name: "noir",
    label: "Noir",
    icon: Clapperboard,
    css: "grayscale(1) contrast(1.4) brightness(0.9)",
    overlay: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
  },
  {
    name: "vintage",
    label: "Film",
    icon: Film,
    css: "sepia(0.45) contrast(1.1) brightness(0.95) saturate(0.85)",
    overlay: "linear-gradient(180deg, rgba(255,200,100,0.08) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)",
  },
  {
    name: "faded",
    label: "Faded",
    icon: CloudFog,
    css: "contrast(0.8) brightness(1.15) saturate(0.6) sepia(0.1)",
  },
  {
    name: "warm",
    label: "Golden Hour",
    icon: Sun,
    css: "sepia(0.25) saturate(1.3) brightness(1.05) hue-rotate(-10deg)",
    overlay: "linear-gradient(180deg, rgba(255,180,80,0.1) 0%, rgba(255,100,50,0.05) 100%)",
  },
  {
    name: "cool",
    label: "Cool Tone",
    icon: Snowflake,
    css: "saturate(0.8) brightness(1.05) hue-rotate(15deg) contrast(1.05)",
    overlay: "linear-gradient(180deg, rgba(100,150,255,0.08) 0%, rgba(50,80,200,0.05) 100%)",
  },
  {
    name: "highcontrast",
    label: "Hi-Contrast",
    icon: Contrast,
    css: "contrast(1.6) brightness(0.95) saturate(1.2)",
  },
  {
    name: "distortion",
    label: "Distortion",
    icon: Waves,
    css: "hue-rotate(90deg) saturate(1.8) contrast(1.1)",
  },
  {
    name: "infrared",
    label: "Infrared",
    icon: Eye,
    css: "hue-rotate(180deg) saturate(2) brightness(1.1) contrast(1.2)",
  },
  {
    name: "grain",
    label: "Heavy Grain",
    icon: Grip,
    css: "contrast(1.1) brightness(0.95)",
    overlay: "none",
  },
];

const FILTER_STORAGE_KEY = "ppc-active-filter";
const FILTER_CHANGE_EVENT = "ppc-filter-change";

function isFilterName(value: string | null): value is string {
  return Boolean(value && filters.some((filter) => filter.name === value));
}

function getStoredFilter() {
  if (typeof window === "undefined") return "none";

  try {
    const storedFilter = window.localStorage.getItem(FILTER_STORAGE_KEY);
    return isFilterName(storedFilter) ? storedFilter : "none";
  } catch {
    return "none";
  }
}

function subscribeToFilterChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(FILTER_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(FILTER_CHANGE_EVENT, onStoreChange);
  };
}

function setStoredFilter(filterName: string) {
  try {
    if (filterName === "none") {
      window.localStorage.removeItem(FILTER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(FILTER_STORAGE_KEY, filterName);
    }
  } catch {
    // Ignore storage failures so the widget remains usable.
  }
  window.dispatchEvent(new Event(FILTER_CHANGE_EVENT));
}

export default function FilterWidget() {
  const activeFilter = useSyncExternalStore(subscribeToFilterChanges, getStoredFilter, () => "none");
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentFilter = filters.find((f) => f.name === activeFilter) ?? filters[0];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Apply filter to the content wrapper (not body, avoids breaking fixed positioning)
  useEffect(() => {
    const wrapper = document.getElementById("filter-content");
    const grainEl = document.querySelector("[data-film-grain]") as HTMLElement | null;

    if (!wrapper) return;

    if (currentFilter.name === "none") {
      wrapper.style.filter = "";
      if (grainEl) grainEl.style.opacity = "0.03";
    } else {
      wrapper.style.filter = currentFilter.css;
      if (currentFilter.name === "grain") {
        if (grainEl) grainEl.style.opacity = "0.18";
      } else {
        if (grainEl) grainEl.style.opacity = "0.03";
      }
    }

    // Manage overlay, append to body so it's outside the filtered wrapper
    let overlayEl = document.getElementById("filter-overlay");
    if (currentFilter.overlay && currentFilter.overlay !== "none") {
      if (!overlayEl) {
        overlayEl = document.createElement("div");
        overlayEl.id = "filter-overlay";
        overlayEl.style.cssText =
          "position:fixed;inset:0;z-index:55;pointer-events:none;transition:opacity 0.5s ease;";
        document.body.appendChild(overlayEl);
      }
      overlayEl.style.background = currentFilter.overlay;
      overlayEl.style.opacity = "1";
    } else if (overlayEl) {
      overlayEl.style.opacity = "0";
    }

    return () => {
      wrapper.style.filter = "";
      if (grainEl) grainEl.style.opacity = "0.03";
      if (overlayEl) overlayEl.style.opacity = "0";
    };
  }, [currentFilter]);

  return (
    <div ref={panelRef} data-floating-widget className="fixed bottom-6 right-6 z-[60] transition-all duration-300">
      {/* Filter panel */}
      {isOpen && (
        <div
          className="absolute bottom-14 right-0 w-56 bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-lg shadow-2xl overflow-hidden"
          style={{ animation: "filterSlideUp 0.2s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/80">
            <span
              className="text-[10px] tracking-[0.25em] uppercase text-neutral-500"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Lens Filters
            </span>
            <button type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-600 hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Filter list */}
          <div className="py-1 max-h-[360px] overflow-y-auto filter-scroll">
            {filters.map((filter) => {
              const FilterIcon = filter.icon;
              const isActive = activeFilter === filter.name;
              return (
                <button type="button"
                  key={filter.name}
                  onClick={() => {
                    setStoredFilter(filter.name);
                    if (filter.name === "none") setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-150 ${
                    isActive
                      ? "bg-white/[0.06] text-white"
                      : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]"
                  }`}
                >
                  <FilterIcon size={13} className={isActive ? "text-neutral-300" : "text-neutral-600"} />
                  <span
                    className="text-[10px] tracking-[0.15em] uppercase"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {filter.label}
                  </span>
                  {isActive && filter.name !== "none" && (
                    <span className="ml-auto size-1 rounded-full bg-neutral-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Clear footer */}
          {activeFilter !== "none" && (
            <div className="px-4 py-2.5 border-t border-neutral-800/80">
              <button type="button"
                onClick={() => setStoredFilter("none")}
                className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 hover:text-neutral-300 transition-colors"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                ✕ Clear Filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-all duration-300 shadow-lg ${
          activeFilter !== "none"
            ? "bg-neutral-900/95 border-neutral-600/50 text-neutral-300 shadow-neutral-900/50"
            : "bg-neutral-950/90 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
        } backdrop-blur-sm`}
        title="Photo Filters"
      >
        <Camera
          size={14}
          className={`transition-transform duration-300 ${isOpen ? "rotate-12" : "group-hover:rotate-6"}`}
        />
        <span
          className="text-[10px] tracking-[0.15em] uppercase hidden sm:inline"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {activeFilter === "none" ? "Filters" : currentFilter.label}
        </span>
        {activeFilter !== "none" && (
          <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse" />
        )}
      </button>

      <style>{`
        @keyframes filterSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .filter-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .filter-scroll:hover {
          scrollbar-color: rgba(255,255,255,0.15) transparent;
        }
        .filter-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .filter-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .filter-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        .filter-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.18);
        }
      `}</style>
    </div>
  );
}
