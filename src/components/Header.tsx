import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Menu, X, Instagram, Mail, ExternalLink, UserCircle, LogIn, UserPlus } from "lucide-react";
import { authClient } from "../lib/auth-client";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/gallery", label: "Gallery" },
  { to: "/competitions", label: "Competitions" },
  { to: "/leadership", label: "Leadership" },
  { to: "/facilities", label: "Facilities" },
  { to: "/membership", label: "Membership" },
  { to: "/merch", label: "Merch" },
  { to: "/request", label: "Request a Photographer" },
];

const primaryNavLinks = navLinks.filter((link) =>
  ["/events", "/gallery", "/membership", "/request"].includes(link.to)
);
const moreNavLinks = navLinks.filter((link) =>
  ["/competitions", "/leadership", "/facilities", "/merch"].includes(link.to)
);

const socialLinks = [
  { href: "https://www.instagram.com/purduephotoclub/", label: "Instagram", icon: Instagram },
  { href: "/discord", label: "Discord", icon: DiscordIcon },
  { href: "mailto:purduephotographyclub@gmail.com", label: "Email", icon: Mail },
  { href: "https://linktr.ee/purduephotoclub", label: "Linktree", icon: ExternalLink },
  { href: "https://boilerlink.purdue.edu/organization/photoclub", label: "BoilerLink", icon: ExternalLink },
];

function subscribeToPathChanges(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getCurrentPath() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

function DiscordIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.09 9a3 3 0 0 1 5.83 0" />
      <path d="M20.27 6.73a19.6 19.6 0 0 0-4.84-1.5 14.68 14.68 0 0 0-.64 1.31 18.16 18.16 0 0 0-5.57 0 14.68 14.68 0 0 0-.65-1.31 19.55 19.55 0 0 0-4.84 1.5A20.09 20.09 0 0 0 .29 18.07a19.72 19.72 0 0 0 6.03 3.05 14.82 14.82 0 0 0 1.3-2.1 12.74 12.74 0 0 1-2.05-.99l.49-.38a14.08 14.08 0 0 0 12 0l.49.38c-.66.39-1.35.72-2.06.99a14.82 14.82 0 0 0 1.3 2.1 19.65 19.65 0 0 0 6.02-3.05A20.06 20.06 0 0 0 20.27 6.73zM8.52 15.65a2.33 2.33 0 0 1-2.18-2.4 2.31 2.31 0 0 1 2.18-2.4 2.31 2.31 0 0 1 2.17 2.4 2.33 2.33 0 0 1-2.17 2.4zm6.96 0a2.33 2.33 0 0 1-2.17-2.4 2.31 2.31 0 0 1 2.17-2.4 2.31 2.31 0 0 1 2.18 2.4 2.33 2.33 0 0 1-2.18 2.4z" />
    </svg>
  );
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const dashboardButtonRef = useRef<HTMLButtonElement | null>(null);
  const currentPath = useSyncExternalStore(subscribeToPathChanges, getCurrentPath, () => "/");
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!menuOpen && !dashboardOpen) return;

    const focusTrigger = () => {
      if (menuOpen) {
        menuButtonRef.current?.focus();
      } else {
        dashboardButtonRef.current?.focus();
      }
    };

    const closePanels = (returnFocus = false) => {
      setMenuOpen(false);
      setDashboardOpen(false);
      if (returnFocus) {
        focusTrigger();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanels(true);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        closePanels(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [dashboardOpen, menuOpen]);

  useEffect(() => {
    document.body.classList.toggle("ppc-nav-open", menuOpen || dashboardOpen);
    return () => document.body.classList.remove("ppc-nav-open");
  }, [dashboardOpen, menuOpen]);

  const navBg = "bg-neutral-950/90";
  const border = "border-neutral-800";
  const navLayer = menuOpen || dashboardOpen ? "z-[110]" : "z-40";
  const linkActive = "text-white";
  const linkInactive = "text-neutral-500";
  const linkHover = "hover:text-white focus-visible:text-white";
  const socialColor = "text-neutral-500 hover:text-white focus-visible:text-white";
  const mutedText = "text-neutral-600";
  const logoText = "text-neutral-300";
  const focusRing = "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400";
  const iconControl = `inline-flex min-h-11 min-w-11 items-center justify-center ${linkInactive} ${linkHover} ${focusRing} transition-colors`;
  const socialControl = `inline-flex min-h-10 min-w-10 items-center justify-center ${socialColor} ${focusRing} transition-colors`;
  const menuLinkBase = `group flex min-h-12 items-center justify-between border ${border} bg-white/[0.02] px-4 py-3 text-xs uppercase tracking-[0.18em] transition-colors hover:border-neutral-600 hover:bg-white/[0.04] focus-visible:border-neutral-400 focus-visible:outline-none`;
  const compactMenuLinkBase = `group flex min-h-11 items-center justify-between border ${border} bg-white/[0.02] px-4 py-3 text-[11px] uppercase tracking-[0.16em] transition-colors hover:border-neutral-600 hover:bg-white/[0.04] focus-visible:border-neutral-400 focus-visible:outline-none`;

  return (
      <nav ref={navRef} className={`fixed top-0 left-0 right-0 ${navLayer} ${navBg} backdrop-blur-sm border-b ${border} transition-colors duration-500`}>
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <a href="/" className={`flex min-h-11 items-center gap-3 flex-shrink-0 ${focusRing}`}>
            <img src="/ppc-logo.webp" alt="PPC Logo" className="size-10 rounded-full brightness-[1.8] invert" style={{ mixBlendMode: "screen" }} />
            <span className={`text-sm tracking-[0.2em] uppercase ${logoText} hidden sm:inline`} style={{ fontFamily: "'Playfair Display', serif" }}>
              Purdue Photography Club
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-5">
            {primaryNavLinks.map((link) => (
              <a
                key={link.to}
                href={link.to}
                aria-current={currentPath === link.to ? "page" : undefined}
                className={`text-[11px] tracking-[0.15em] uppercase transition-colors ${linkHover} whitespace-nowrap ${
                  currentPath === link.to ? linkActive : linkInactive
                } ${focusRing}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Social, dashboard, and menu controls */}
          <div className="flex items-center gap-3 sm:gap-2">
            {/* Dashboard button */}
            {!session ? (
	              <button type="button"
                  ref={dashboardButtonRef}
	                onClick={() => { setDashboardOpen(!dashboardOpen); setMenuOpen(false); }}
	                className={iconControl}
	                aria-label="Dashboard"
	                aria-controls="dashboard-menu"
	                aria-expanded={dashboardOpen}
	                title="Dashboard"
	              >
              <UserCircle size={22} />
            </button>
            ) : (
	              <a href="/dashboard" className={iconControl} aria-label="Dashboard" title="Dashboard">
                <UserCircle size={22} />
              </a>
            )}
            <div className="hidden sm:flex items-center gap-1.5">
              {socialLinks.slice(0, 3).map((social) => (
	                <a
	                  key={social.label}
	                  href={social.href}
	                  target={isExternalHref(social.href) ? "_blank" : undefined}
	                  rel={isExternalHref(social.href) ? "noopener noreferrer" : undefined}
	                  aria-label={social.label}
	                  title={social.label}
	                  className={socialControl}
	                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
            <button
              type="button"
              ref={menuButtonRef}
              onClick={() => { setMenuOpen(!menuOpen); setDashboardOpen(false); }}
              className={`${iconControl} gap-2 px-1`}
              aria-controls="site-menu"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close site menu" : "Open site menu"}
            >
              <span className="hidden text-[10px] uppercase tracking-[0.2em] lg:inline">More</span>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Dashboard dropdown */}
        {dashboardOpen && !session && (
          <div id="dashboard-menu" className={`border-t ${border} bg-neutral-950`}>
            <div className="mx-auto max-w-6xl px-6 py-5">
              <p className={`text-xs tracking-[0.2em] uppercase ${logoText} mb-1`}>Member Area</p>
              <p className={`text-[10px] tracking-wider ${mutedText} mb-5`}>
                Sign in to access member resources, or join us today.
              </p>
              <div className="flex gap-2">
                <a
                  href="/login"
                  onClick={() => setDashboardOpen(false)}
                  className={`flex min-h-11 items-center gap-2 px-4 py-2.5 border ${border} text-[10px] tracking-[0.2em] uppercase ${linkInactive} ${linkHover} ${focusRing} transition-colors`}
                >
                  <LogIn size={13} />
                  Sign In
                </a>
                <a
                  href="/register"
                  onClick={() => setDashboardOpen(false)}
                  className={`flex min-h-11 items-center gap-2 px-4 py-2.5 border ${border} text-[10px] tracking-[0.2em] uppercase ${linkInactive} ${linkHover} ${focusRing} transition-colors`}
                >
                  <UserPlus size={13} />
                  Register
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Mobile nav */}
        {menuOpen && (
          <div id="site-menu" className={`border-t ${border} bg-neutral-950`}>
            <div className="max-h-[calc(100dvh-5rem)] min-h-[calc(100dvh-5rem)] overflow-y-auto px-4 py-5 sm:px-6 lg:min-h-0">
              <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
                <div className="lg:hidden">
                  <p className={`mb-3 text-[10px] uppercase tracking-[0.28em] ${mutedText}`}>Site Menu</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                {navLinks.map((link) => (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={() => setMenuOpen(false)}
                    aria-current={currentPath === link.to ? "page" : undefined}
                    className={`${menuLinkBase} ${
                      currentPath === link.to ? linkActive : linkInactive
                    }`}
                  >
                    {link.label}
                    <span aria-hidden="true" className="text-neutral-700 transition-colors group-hover:text-neutral-500">/</span>
                  </a>
                ))}
                  </div>
              </div>
                <div className="hidden lg:block">
                  <p className={`mb-3 text-[10px] uppercase tracking-[0.28em] ${mutedText}`}>More Routes</p>
                  <div className="grid grid-cols-4 gap-2">
                {moreNavLinks.map((link) => (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={() => setMenuOpen(false)}
                    aria-current={currentPath === link.to ? "page" : undefined}
                    className={`${compactMenuLinkBase} ${
                      currentPath === link.to ? linkActive : linkInactive
                    }`}
                  >
                    {link.label}
                    <span aria-hidden="true" className="text-neutral-700 transition-colors group-hover:text-neutral-500">/</span>
                  </a>
                ))}
                  </div>
              </div>
                <div className={`border-t ${border} pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0`}>
                  <p className={`text-[10px] tracking-[0.28em] uppercase ${mutedText} mb-3`}>Connect</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    {socialLinks.map((social) => (
	                      <a
	                        key={social.label}
	                        href={social.href}
	                        target={isExternalHref(social.href) ? "_blank" : undefined}
	                        rel={isExternalHref(social.href) ? "noopener noreferrer" : undefined}
	                        aria-label={social.label}
	                        title={social.label}
	                        className={`${compactMenuLinkBase} ${linkInactive}`}
	                      >
                        <span className="flex items-center gap-2">
                          <social.icon size={14} />
                          {social.label}
                        </span>
                        <span aria-hidden="true" className="text-neutral-700 transition-colors group-hover:text-neutral-500">/</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
  );
}
