import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Menu, X, Mail, ExternalLink, UserCircle, LogIn, UserPlus } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { fetchApi } from "../lib/http";
import {
  clearProfileLinkCache,
  getProfileLinkStorage,
  PROFILE_LINK_CACHE_UPDATED_EVENT,
  readProfileLinkCache,
  updateProfileLinkCache,
} from "../lib/profile-link-cache";
import { getPublicProfileHref, normalizeProfileResponse } from "../lib/profile-model";
import LiveEventBar, { useFeaturedEvents } from "./LiveEventBar";
import InstagramIcon from "./icons/InstagramIcon";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/gallery", label: "Gallery" },
  { to: "/members", label: "Members" },
  { to: "/competitions", label: "Competitions" },
  { to: "/facilities", label: "Facilities" },
  { to: "/membership", label: "Membership" },
  { to: "/merch", label: "Merch" },
  { to: "/request", label: "Request a Photographer" },
];

const primaryNavLinks = navLinks.filter((link) =>
  ["/events", "/gallery", "/members", "/request"].includes(link.to)
);
const moreNavLinks = navLinks.filter((link) =>
  ["/competitions", "/facilities", "/membership", "/merch"].includes(link.to)
);

const specialEventLink = { to: "/film-event", label: "Film event" };

const socialLinks = [
  { href: "https://www.instagram.com/purduephotoclub/", label: "Instagram", icon: InstagramIcon },
  { href: "/discord", label: "Discord", icon: DiscordIcon },
  { href: "mailto:photo@purdue.edu", label: "Email", icon: Mail },
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

function isNavLinkActive(linkPath: string, currentPath: string) {
  const normalizedPath = currentPath.length > 1
    ? currentPath.replace(/\/+$/, "")
    : currentPath;
  return normalizedPath === linkPath ||
    (linkPath === "/events" && normalizedPath === "/film-event");
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

interface HeaderProps {
  theme?: "default" | "film-event";
}

export default function Header({ theme = "default" }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [publicProfileHref, setPublicProfileHref] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const dashboardButtonRef = useRef<HTMLButtonElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const currentPath = useSyncExternalStore(subscribeToPathChanges, getCurrentPath, () => "/");
  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(session);
  const currentUserId = typeof session?.user?.id === "string" ? session.user.id : null;
  const featuredEvents = useFeaturedEvents();
  const hasFeaturedEvent = Boolean(featuredEvents.currentEvents.length > 0 || featuredEvents.upcomingEvent);
  const showEventBar = hasFeaturedEvent && !menuOpen && !dashboardOpen;

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
      const target = event.target as Node;
      if (
        dashboardOpen &&
        isSignedIn &&
        !dashboardButtonRef.current?.contains(target) &&
        !accountMenuRef.current?.contains(target)
      ) {
        setDashboardOpen(false);
        return;
      }
      if (!navRef.current?.contains(target)) {
        closePanels(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [dashboardOpen, isSignedIn, menuOpen]);

  useEffect(() => {
    document.body.classList.toggle("ppc-nav-open", menuOpen || dashboardOpen);
    return () => document.body.classList.remove("ppc-nav-open");
  }, [dashboardOpen, menuOpen]);

  useEffect(() => {
    if (!currentUserId) {
      setPublicProfileHref(null);
      return;
    }

    const storage = getProfileLinkStorage(window);
    const cached = storage ? readProfileLinkCache(storage, currentUserId) : null;
    setPublicProfileHref(cached?.hit ? cached.href : null);

    const handleProfileLinkUpdate = (event: Event) => {
      const href = (event as CustomEvent<{ href?: unknown }>).detail?.href;
      setPublicProfileHref(updateProfileLinkCache(storage, currentUserId, href));
    };
    window.addEventListener(PROFILE_LINK_CACHE_UPDATED_EVENT, handleProfileLinkUpdate);
    return () => window.removeEventListener(PROFILE_LINK_CACHE_UPDATED_EVENT, handleProfileLinkUpdate);
  }, [currentUserId]);

  useEffect(() => {
    if (!dashboardOpen || !currentUserId) return;
    const storage = getProfileLinkStorage(window);
    const cached = storage ? readProfileLinkCache(storage, currentUserId) : null;
    if (cached?.hit) {
      setPublicProfileHref(cached.href);
      return;
    }
    const controller = new AbortController();
    let isActive = true;

    void fetchApi("/api/profile", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!isActive) return null;
        if (!response.ok) {
          setPublicProfileHref(null);
          return null;
        }
        return response.json();
      })
      .then((payload) => {
        if (!isActive || payload === null) return;
        const normalized = normalizeProfileResponse(payload, "PPC member");
        const href = getPublicProfileHref(normalized.profile);
        setPublicProfileHref(updateProfileLinkCache(storage, currentUserId, href));
      })
      .catch(() => {
        if (isActive && !controller.signal.aborted) setPublicProfileHref(null);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [currentUserId, dashboardOpen]);

  useEffect(() => {
    if (!dashboardOpen || !isSignedIn) return;
    const focusFrame = window.requestAnimationFrame(() => {
      accountMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [dashboardOpen, isSignedIn]);

  const handleAccountMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const menuItems = Array.from(
      accountMenuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (event.key === "Tab") {
      setDashboardOpen(false);
      return;
    }
    if (menuItems.length === 0) return;

    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % menuItems.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = currentIndex <= 0 ? menuItems.length - 1 : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = menuItems.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      menuItems[nextIndex]?.focus();
    }
  };

  const handleSignOut = async () => {
    setDashboardOpen(false);
    const storage = getProfileLinkStorage(window);
    if (currentUserId && storage) clearProfileLinkCache(storage, currentUserId);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          },
        },
      });
    } catch {
      // Continue to login so the next page can resolve any stale session state.
    }
    window.location.href = "/login";
  };

  const isFilmEvent = theme === "film-event";
  const navBg = isFilmEvent ? "bg-[#f79400]/95" : "bg-neutral-950/90";
  const panelBg = isFilmEvent ? "bg-[#f79400]" : "bg-neutral-950";
  const border = isFilmEvent ? "border-black/25" : "border-neutral-800";
  const navLayer = menuOpen || dashboardOpen ? "z-[110]" : "z-40";
  const linkActive = isFilmEvent ? "text-black" : "text-white";
  const linkInactive = isFilmEvent ? "text-black/65" : "text-neutral-500";
  const linkHover = isFilmEvent
    ? "hover:text-black focus-visible:text-black"
    : "hover:text-white focus-visible:text-white";
  const socialColor = isFilmEvent
    ? "text-black/65 hover:text-black focus-visible:text-black"
    : "text-neutral-500 hover:text-white focus-visible:text-white";
  const mutedText = isFilmEvent ? "text-black/60" : "text-neutral-600";
  const logoText = isFilmEvent ? "text-black/80" : "text-neutral-300";
  const slashText = isFilmEvent
    ? "text-black/35 transition-colors group-hover:text-black/70"
    : "text-neutral-700 transition-colors group-hover:text-neutral-500";
  const focusRing = isFilmEvent
    ? "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
    : "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400";
  const iconControl = `inline-flex min-h-11 min-w-11 items-center justify-center ${linkInactive} ${linkHover} ${focusRing} transition-colors`;
  const socialControl = `inline-flex min-h-10 min-w-10 items-center justify-center ${socialColor} ${focusRing} transition-colors`;
  const menuInteraction = isFilmEvent
    ? "bg-black/[0.025] hover:border-black/60 hover:bg-black/[0.06] focus-visible:border-black"
    : "bg-white/[0.02] hover:border-neutral-600 hover:bg-white/[0.04] focus-visible:border-neutral-400";
  const menuLinkBase = `group flex min-h-12 items-center justify-between border ${border} ${menuInteraction} px-4 py-3 text-xs uppercase tracking-[0.18em] transition-colors focus-visible:outline-none`;
  const compactMenuLinkBase = `group flex min-h-11 items-center justify-between border ${border} ${menuInteraction} px-4 py-3 text-[11px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-none`;
  const specialEventLinkClass = isFilmEvent
    ? `font-semibold text-black underline decoration-black/45 underline-offset-4 transition-colors hover:text-black/70 focus-visible:text-black ${focusRing}`
    : `font-semibold text-amber-300 underline decoration-amber-300/60 underline-offset-4 transition-colors hover:text-amber-200 focus-visible:text-amber-200 ${focusRing}`;

  return (
    <>
      <nav ref={navRef} className={`fixed top-0 left-0 right-0 ${navLayer} ${navBg} backdrop-blur-sm border-b ${border} transition-colors duration-500`}>
        <div className="flex h-20 w-full items-center justify-between px-6">
          <a href="/" className={`flex min-h-11 items-center gap-3 flex-shrink-0 ${focusRing}`}>
            <img
              src="/ppc-logo.webp"
              alt="PPC Logo"
              className={`size-10 rounded-full ${isFilmEvent ? "contrast-125" : "brightness-[1.8] invert"}`}
              style={isFilmEvent ? undefined : { mixBlendMode: "screen" }}
            />
            <span className={`text-sm tracking-[0.2em] uppercase ${logoText} hidden 2xl:inline`} style={{ fontFamily: "'Playfair Display', serif" }}>
              Purdue Photography Club
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-5">
            {primaryNavLinks.map((link) => (
              <a
                key={link.to}
                href={link.to}
                aria-current={isNavLinkActive(link.to, currentPath) ? "page" : undefined}
                className={`text-[11px] tracking-[0.15em] uppercase transition-colors ${linkHover} whitespace-nowrap ${
                  isNavLinkActive(link.to, currentPath) ? linkActive : linkInactive
                } ${focusRing}`}
              >
                {link.label}
              </a>
            ))}
            <a
              href={specialEventLink.to}
              aria-label="Special event: Film event"
              aria-current={isNavLinkActive(specialEventLink.to, currentPath) ? "page" : undefined}
              className={`${specialEventLinkClass} hidden text-[11px] uppercase tracking-[0.15em] lg:inline`}
            >
              {specialEventLink.label}
            </a>
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
	              <button
                  type="button"
                  ref={dashboardButtonRef}
                  onClick={() => { setDashboardOpen(!dashboardOpen); setMenuOpen(false); }}
                  className={iconControl}
                  aria-label="Account menu"
                  aria-controls="account-menu"
                  aria-expanded={dashboardOpen}
                  aria-haspopup="menu"
                  title="Account menu"
                >
                <UserCircle size={22} />
              </button>
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

        {showEventBar && (
          isFilmEvent
            ? <LiveEventBar featuredEvents={featuredEvents} theme="film-event" />
            : <LiveEventBar featuredEvents={featuredEvents} />
        )}

        {/* Dashboard dropdown */}
        {dashboardOpen && !session && (
          <div id="dashboard-menu" className={`border-t ${border} ${panelBg}`}>
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

        {/* Signed-in account menu */}
        {dashboardOpen && isSignedIn && (
          <div
            ref={accountMenuRef}
            id="account-menu"
            role="menu"
            aria-label="Account"
            onKeyDown={handleAccountMenuKeyDown}
            className={`absolute right-4 top-full grid w-[calc(100vw-2rem)] max-w-xs gap-2 border ${border} ${panelBg} p-2 shadow-2xl shadow-black/40 sm:right-6`}
          >
            {publicProfileHref && (
              <a
                href={publicProfileHref}
                role="menuitem"
                tabIndex={-1}
                onClick={() => setDashboardOpen(false)}
                className={`${compactMenuLinkBase} ${linkInactive}`}
              >
                View profile
                <span aria-hidden="true" className={slashText}>/</span>
              </a>
            )}
            <a
              href="/dashboard"
              role="menuitem"
              tabIndex={-1}
              onClick={() => setDashboardOpen(false)}
              className={`${compactMenuLinkBase} ${linkInactive}`}
            >
              Dashboard
              <span aria-hidden="true" className={slashText}>/</span>
            </a>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => void handleSignOut()}
              className={`${compactMenuLinkBase} ${linkInactive} w-full`}
            >
              Sign out
              <span aria-hidden="true" className={slashText}>/</span>
            </button>
          </div>
        )}

        {/* Mobile nav */}
        {menuOpen && (
          <div id="site-menu" className={`border-t ${border} ${panelBg}`}>
            <div className="max-h-[calc(100dvh-5rem)] min-h-[calc(100dvh-5rem)] overflow-y-auto px-4 py-5 sm:px-6 lg:min-h-0">
              <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
                <div className="lg:hidden">
                  <a
                    href={specialEventLink.to}
                    onClick={() => setMenuOpen(false)}
                    aria-label="Special event: Film event"
                    aria-current={isNavLinkActive(specialEventLink.to, currentPath) ? "page" : undefined}
                    className={`${specialEventLinkClass} mb-5 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.18em]`}
                  >
                    {specialEventLink.label}
                  </a>
                  <p className={`mb-3 text-[10px] uppercase tracking-[0.28em] ${mutedText}`}>Site Menu</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                {navLinks.map((link) => (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isNavLinkActive(link.to, currentPath) ? "page" : undefined}
                    className={`${menuLinkBase} ${
                      isNavLinkActive(link.to, currentPath) ? linkActive : linkInactive
                    }`}
                  >
                    {link.label}
                    <span aria-hidden="true" className={slashText}>/</span>
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
                    aria-current={isNavLinkActive(link.to, currentPath) ? "page" : undefined}
                    className={`${compactMenuLinkBase} ${
                      isNavLinkActive(link.to, currentPath) ? linkActive : linkInactive
                    }`}
                  >
                    {link.label}
                    <span aria-hidden="true" className={slashText}>/</span>
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
                        <span aria-hidden="true" className={slashText}>/</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
      {showEventBar && <div aria-hidden="true" className="h-11" />}
    </>
  );
}
