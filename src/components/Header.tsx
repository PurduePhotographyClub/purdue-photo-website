import { useState, useSyncExternalStore } from "react";
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

export { };

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const currentPath = useSyncExternalStore(subscribeToPathChanges, getCurrentPath, () => "/");
  const { data: session } = authClient.useSession();

  const navBg = "bg-neutral-950/90";
  const border = "border-neutral-800";
  const linkActive = "text-white";
  const linkInactive = "text-neutral-500";
  const linkHover = "hover:text-white";
  const socialColor = "text-neutral-600 hover:text-white";
  const mutedText = "text-neutral-600";
  const logoText = "text-neutral-300";

  return (
      <nav className={`fixed top-0 left-0 right-0 z-40 ${navBg} backdrop-blur-sm border-b ${border} transition-colors duration-500`}>
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 flex-shrink-0">
            <img src="/ppc-logo.webp" alt="PPC Logo" className="size-10 rounded-full brightness-[1.8] invert" style={{ mixBlendMode: "screen" }} />
            <span className={`text-sm tracking-[0.2em] uppercase ${logoText} hidden sm:inline`} style={{ fontFamily: "'Playfair Display', serif" }}>
              Purdue Photography Club
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.to}
                href={link.to}
                className={`text-[11px] tracking-[0.15em] uppercase transition-colors ${linkHover} whitespace-nowrap ${
                  currentPath === link.to ? linkActive : linkInactive
                }`}
              >
                {link.label}
              </a>
            ))}
            <div className="w-px h-4 bg-neutral-800 mx-1" />
            <div className="flex items-center gap-3">
              {socialLinks.slice(0, 3).map((social) => (
	                <a
	                  key={social.label}
	                  href={social.href}
	                  target={social.href.startsWith("mailto") ? undefined : "_blank"}
	                  rel="noopener noreferrer"
	                  aria-label={social.label}
	                  title={social.label}
	                  className={socialColor + " transition-colors"}
	                >
                  <social.icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Mobile: social + menu - always visible */}
          <div className="flex items-center gap-4">
            {/* Dashboard button */}
            {!session ? (
	              <button type="button"
	                onClick={() => { setDashboardOpen(!dashboardOpen); setMenuOpen(false); }}
	                className={`${linkInactive} ${linkHover} transition-colors`}
	                aria-label="Dashboard"
	                title="Dashboard"
	              >
              <UserCircle size={22} />
            </button>
            ) : (
	              <a href="/dashboard" className={`${linkInactive} ${linkHover} transition-colors`} aria-label="Dashboard" title="Dashboard">
                <UserCircle size={22} />
              </a>
            )}
            <div className="hidden sm:flex items-center gap-3">
              {socialLinks.slice(0, 3).map((social) => (
	                <a
	                  key={social.label}
	                  href={social.href}
	                  target={social.href.startsWith("mailto") ? undefined : "_blank"}
	                  rel="noopener noreferrer"
	                  aria-label={social.label}
	                  title={social.label}
	                  className={socialColor + " transition-colors"}
	                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
            <button type="button" onClick={() => { setMenuOpen(!menuOpen); setDashboardOpen(false); }} className={`${linkInactive} ${linkHover} transition-colors`}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Dashboard dropdown */}
        {dashboardOpen && !session && (
          <div className={`border-t ${border} bg-neutral-950`}>
            <div className="px-6 py-5">
              <p className={`text-xs tracking-[0.2em] uppercase ${logoText} mb-1`}>Member Area</p>
              <p className={`text-[10px] tracking-wider ${mutedText} mb-5`}>
                {session
                  ? "Access your member resources and manage your account."
                  : "Sign in to access member resources, or join us today."}
              </p>
              <div className="flex gap-2">
                { session &&
                  <a
                    href="/dashboard"
                    onClick={() => setDashboardOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-black text-[10px] tracking-[0.2em] uppercase hover:bg-neutral-200 transition-colors"
                  >
                    <UserCircle size={13} />
                    Dashboard
                  </a>
                }
                {!session && (
                  <>
                    <a
                      href="/login"
                      onClick={() => setDashboardOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 border ${border} text-[10px] tracking-[0.2em] uppercase ${linkInactive} ${linkHover} transition-colors`}
                    >
                      <LogIn size={13} />
                      Sign In
                    </a>
                    <a
                      href="/register"
                      onClick={() => setDashboardOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 border ${border} text-[10px] tracking-[0.2em] uppercase ${linkInactive} ${linkHover} transition-colors`}
                    >
                      <UserPlus size={13} />
                      Register
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile nav */}
        {menuOpen && (
          <div className={`overflow-hidden border-t ${border}`}>
            <div className="px-6 py-4 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={`text-xs tracking-[0.2em] uppercase ${
                      currentPath === link.to ? linkActive : linkInactive
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
                <div className={`border-t ${border} pt-4 mt-2`}>
                  <p className={`text-[10px] tracking-[0.3em] uppercase ${mutedText} mb-3`}>Connect With Us</p>
                  <div className="flex items-center gap-4">
                    {socialLinks.map((social) => (
	                      <a
	                        key={social.label}
	                        href={social.href}
	                        target={social.href.startsWith("mailto") ? undefined : "_blank"}
	                        rel="noopener noreferrer"
	                        aria-label={social.label}
	                        title={social.label}
	                        className={`${linkInactive} ${linkHover} transition-colors`}
	                      >
                        <social.icon size={14} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
          </div>
        )}
      </nav>
  );
}
