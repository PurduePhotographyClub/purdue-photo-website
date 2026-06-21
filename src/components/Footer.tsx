import { Instagram, Mail, ExternalLink, Lock } from "lucide-react";

const navLinks = [
  { to: "/gallery", label: "Gallery" },
  { to: "/competitions", label: "Competitions" },
  { to: "/leadership", label: "Leadership" },
  { to: "/facilities", label: "Facilities" },
  { to: "/membership", label: "Membership" },
  { to: "/meetings", label: "Meetings" },
  { to: "/request", label: "Request" },
];

const socialLinks = [
  { href: "https://www.instagram.com/purduephotoclub/", label: "Instagram", icon: Instagram },
  { href: "/discord", label: "Discord", icon: DiscordIcon },
  { href: "mailto:purduephotographyclub@gmail.com", label: "Email", icon: Mail },
  { href: "https://linktr.ee/purduephotoclub", label: "Linktree", icon: ExternalLink },
  { href: "https://boilerlink.purdue.edu/organization/photoclub", label: "BoilerLink", icon: ExternalLink },
];

function DiscordIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.09 9a3 3 0 0 1 5.83 0" />
      <path d="M20.27 6.73a19.6 19.6 0 0 0-4.84-1.5 14.68 14.68 0 0 0-.64 1.31 18.16 18.16 0 0 0-5.57 0 14.68 14.68 0 0 0-.65-1.31 19.55 19.55 0 0 0-4.84 1.5A20.09 20.09 0 0 0 .29 18.07a19.72 19.72 0 0 0 6.03 3.05 14.82 14.82 0 0 0 1.3-2.1 12.74 12.74 0 0 1-2.05-.99l.49-.38a14.08 14.08 0 0 0 12 0l.49.38c-.66.39-1.35.72-2.06.99a14.82 14.82 0 0 0 1.3 2.1 19.65 19.65 0 0 0 6.02-3.05A20.06 20.06 0 0 0 20.27 6.73zM8.52 15.65a2.33 2.33 0 0 1-2.18-2.4 2.31 2.31 0 0 1 2.18-2.4 2.31 2.31 0 0 1 2.17 2.4 2.33 2.33 0 0 1-2.17 2.4zm6.96 0a2.33 2.33 0 0 1-2.17-2.4 2.31 2.31 0 0 1 2.17-2.4 2.31 2.31 0 0 1 2.18 2.4 2.33 2.33 0 0 1-2.18 2.4z" />
    </svg>
  );
}

function LockedNewsletter() {
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2 text-neutral-500">
        <Lock size={11} strokeWidth={1.5} aria-hidden="true" />
        <p className="text-[10px] tracking-[0.3em] uppercase">Newsletter</p>
      </div>
      <p className="mb-3 text-[10px] text-neutral-600 tracking-wider leading-relaxed">
        Sign-ups are paused for now.
      </p>
      <div className="grid gap-2" aria-label="Newsletter sign-up unavailable">
        <input
          aria-label="Your name"
          type="text"
          disabled
          placeholder="Your name"
          className="w-full bg-transparent border border-neutral-800 px-3 py-1.5 text-xs text-neutral-500 placeholder:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <input
          aria-label="Email address"
          type="email"
          disabled
          placeholder="your@email.com"
          className="w-full bg-transparent border border-neutral-800 px-3 py-1.5 text-xs text-neutral-500 placeholder:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center gap-2 border border-neutral-800 px-3 py-1.5 text-[10px] tracking-wider uppercase text-neutral-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Lock size={10} strokeWidth={1.5} aria-hidden="true" />
          Locked
        </button>
      </div>
    </div>
  );
}

export default function Footer() {
  const border = "border-neutral-800";
  const subText = "text-neutral-500";
  const mutedText = "text-neutral-600";
  const faintText = "text-neutral-700";
  const linkHover = "hover:text-white";

  return (
    <footer className={`border-t ${border} py-16 px-6 transition-colors duration-500`}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/ppc-logo.webp" alt="PPC" className="size-8 rounded-full" />
              <span className={`text-xs tracking-[0.3em] uppercase ${subText}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                Purdue Photography Club
              </span>
            </div>
            <p className={`text-xs ${mutedText} tracking-wider leading-relaxed`}>
              Where analog tradition meets digital innovation. Capturing moments in silver halide and silicon since 1934.
            </p>
          </div>
          <div>
            <p className={`text-[10px] tracking-[0.3em] uppercase ${subText} mb-4`}>Quick Links</p>
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.to}
                  href={link.to}
                  className={`text-xs tracking-wider ${mutedText} ${linkHover} transition-colors`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className={`text-[10px] tracking-[0.3em] uppercase ${subText} mb-4`}>Connect With Us</p>
            <div className="flex flex-col gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2.5 text-xs tracking-wider ${mutedText} ${linkHover} transition-colors`}
                >
                  <social.icon size={13} />
                  {social.label}
                </a>
              ))}
            </div>
            <LockedNewsletter />
          </div>
        </div>
        <div className={`border-t ${border} pt-8 flex flex-col md:flex-row items-center justify-between gap-4`}>
          <p className={`text-[10px] ${faintText} tracking-wider`}>
            Est. 1934 &middot; Purdue Photography Club &middot; West Lafayette, IN
          </p>
          <p className={`text-[10px] ${faintText} tracking-wider`}>
            Made with love by <a href="https://alesgsanudoo.com" target="_blank" rel="noopener noreferrer" className={`${subText} ${linkHover} transition-colors`}>Alejandro Griffith</a> &middot; &copy; 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
