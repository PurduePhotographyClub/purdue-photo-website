import { Camera } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  getProfileAvatarImageStyle,
  getProfileSocialHref,
  resolveProfileAvatarShape,
  type ProfileAvatarShape,
  type ProfileDecoration,
  type ProfileNameStyle,
  type ProfilePalette,
  type ProfileSocial,
  type ProfileSocialStyle,
  type ProfileSpecialty,
  type ProfileTemplate,
} from "@/lib/profile-model";
import ProfileSocialIcon from "./ProfileSocialIcon";

export interface PublicProfileIdentity {
  anonymous: boolean;
  avatarPositionX: number;
  avatarPositionY: number;
  avatarShape: ProfileAvatarShape;
  avatarUrl: string | null;
  avatarZoom: number;
  bio: string | null;
  decoration: ProfileDecoration;
  displayName: string | null;
  nameStyle: ProfileNameStyle | null;
  palette: ProfilePalette;
  socialStyle: ProfileSocialStyle;
  socials: ProfileSocial[];
  specialties: ProfileSpecialty[];
  template: ProfileTemplate;
  username: string | null;
}

const NAME_CLASSES: Record<ProfileNameStyle, string> = {
  classic: "font-normal tracking-[0.04em]",
  "film-credit": "font-mono font-bold uppercase tracking-[0.12em]",
  editorial: "italic tracking-[0.02em]",
  "bold-print": "font-bold tracking-[0.01em]",
  condensed: "font-sans font-semibold uppercase tracking-[-0.035em]",
  typewriter: "font-mono tracking-[0.06em]",
  "small-caps": "font-serif uppercase tracking-[0.14em]",
};

const SERIF_NAME_STYLES = new Set<ProfileNameStyle>([
  "classic",
  "editorial",
  "bold-print",
  "small-caps",
]);

const DECORATION_LABELS: Record<ProfileDecoration, string> = {
  none: "No decoration",
  "film-frame": "Film frame",
  "contact-marks": "Contact marks",
  viewfinder: "Viewfinder",
  sprocket: "Sprocket holes",
  "archival-stamp": "Archival stamp",
  "grid-lines": "Grid lines",
};

const PALETTE_LABELS: Record<ProfilePalette, string> = {
  monochrome: "Monochrome",
  amber: "Amber",
  cyanotype: "Cyanotype",
  forest: "Forest",
  burgundy: "Burgundy",
  violet: "Violet",
};

type ProfilePaletteStyle = CSSProperties & Record<`--profile-${string}`, string>;

const PROFILE_PALETTE_CLASSES: Record<ProfilePalette, ProfilePaletteStyle> = {
  monochrome: {
    "--profile-accent": "#f5f5f5",
    "--profile-border": "#4a4a4a",
    "--profile-chip": "#202020",
    "--profile-ink": "#f5f5f5",
    "--profile-muted": "#b7b7b7",
    "--profile-surface": "#0a0a0a",
  },
  amber: {
    "--profile-accent": "#fcd34d",
    "--profile-border": "#a16207",
    "--profile-chip": "#3b2608",
    "--profile-ink": "#fff7db",
    "--profile-muted": "#e4c477",
    "--profile-surface": "#1a1003",
  },
  cyanotype: {
    "--profile-accent": "#67e8f9",
    "--profile-border": "#16819a",
    "--profile-chip": "#0e3038",
    "--profile-ink": "#e8fbff",
    "--profile-muted": "#a7dce4",
    "--profile-surface": "#06171b",
  },
  forest: {
    "--profile-accent": "#86efac",
    "--profile-border": "#288c50",
    "--profile-chip": "#102f1c",
    "--profile-ink": "#ecfff2",
    "--profile-muted": "#a9d8b7",
    "--profile-surface": "#07170d",
  },
  burgundy: {
    "--profile-accent": "#fda4af",
    "--profile-border": "#a02747",
    "--profile-chip": "#3d111a",
    "--profile-ink": "#fff0f2",
    "--profile-muted": "#e0abb3",
    "--profile-surface": "#1b070b",
  },
  violet: {
    "--profile-accent": "#c4b5fd",
    "--profile-border": "#7048bd",
    "--profile-chip": "#2d1c4a",
    "--profile-ink": "#f6f0ff",
    "--profile-muted": "#ccbdea",
    "--profile-surface": "#120b22",
  },
};

function getAvatarShapeClass(profile: PublicProfileIdentity) {
  const shape = resolveProfileAvatarShape(profile);
  if (shape === "rounded") return "rounded-[14%]";
  return shape === "square" ? "rounded-none" : "rounded-full";
}

function Avatar({
  profile,
  sizeClass,
}: {
  profile: PublicProfileIdentity;
  sizeClass: string;
}) {
  if (profile.anonymous) return null;
  const resolvedShape = resolveProfileAvatarShape(profile);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] text-[var(--profile-muted)] ${getAvatarShapeClass(profile)} ${sizeClass}`}
      data-profile-avatar="true"
      data-profile-avatar-shape={resolvedShape}
    >
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={`${profile.displayName || "Member"} portrait`}
          className="size-full object-cover"
          draggable={false}
          style={getProfileAvatarImageStyle(profile)}
        />
      ) : (
        <Camera aria-hidden="true" size={32} />
      )}
    </div>
  );
}

function Name({
  profile,
  centered = false,
  compact = false,
}: {
  profile: PublicProfileIdentity;
  centered?: boolean;
  compact?: boolean;
}) {
  const style = profile.nameStyle || "classic";
  const name = profile.displayName || "PPC Member";
  const longName = name.length > 25;
  const sizeClass = compact
    ? longName ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
    : longName ? "text-2xl sm:text-3xl lg:text-4xl" : "text-3xl sm:text-4xl lg:text-5xl";
  const reduceTracking = longName && (
    style === "film-credit" || style === "small-caps" || style === "typewriter"
  );
  const inlineStyle: CSSProperties = {
    ...(SERIF_NAME_STYLES.has(style) ? { fontFamily: "'Playfair Display', serif" } : {}),
    ...(reduceTracking ? { letterSpacing: "0.045em" } : {}),
  };

  return (
    <h1
      className={`max-w-full [overflow-wrap:anywhere] text-balance leading-[1.08] text-[var(--profile-accent)] ${sizeClass} ${centered ? "text-center" : ""} ${NAME_CLASSES[style]}`}
      style={inlineStyle}
    >
      {name}
    </h1>
  );
}

function getSocialLabel(platform: ProfileSocial["platform"]) {
  if (platform === "vsco") return "VSCO";
  if (platform === "website") return "Website";
  return `${platform.charAt(0).toUpperCase()}${platform.slice(1)}`;
}

function SocialLinks({
  socials,
  style,
  centered = false,
}: {
  socials: ProfileSocial[];
  style: ProfileSocialStyle;
  centered?: boolean;
}) {
  const links = socials.flatMap((social) => {
    const href = getProfileSocialHref(social);
    return href ? [{ ...social, href }] : [];
  });
  if (links.length === 0) return null;

  return (
    <div
      className={`min-w-0 ${centered ? "flex flex-col items-center" : ""}`}
      data-profile-meta-group="socials"
    >
      <p className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[var(--profile-muted)]">Social links</p>
      <nav
        aria-label="Profile social links"
        className={`flex flex-wrap items-center gap-2 ${centered ? "justify-center" : ""}`}
        data-profile-social-style={style}
      >
        {links.map((social) => {
          const external = social.platform !== "email";
          const label = getSocialLabel(social.platform);
          return (
            <a
              key={social.platform}
              href={social.href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              aria-label={label}
              title={label}
              className={style === "labels"
                ? "inline-flex min-h-11 max-w-full items-center gap-2.5 border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] px-3 py-2 text-[11px] text-[var(--profile-ink)] transition-colors hover:[border-color:var(--profile-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)]"
                : "flex size-12 items-center justify-center border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] text-[var(--profile-ink)] transition-colors hover:[border-color:var(--profile-accent)] hover:text-[var(--profile-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)]"}
            >
              <ProfileSocialIcon platform={social.icon} size={22} />
              {style === "labels" && <span className="truncate">{label}</span>}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

function Specialties({ specialties, centered = false }: { specialties: ProfileSpecialty[]; centered?: boolean }) {
  if (specialties.length === 0) return null;
  return (
    <div
      className={`min-w-0 ${centered ? "flex flex-col items-center" : "flex-1 basis-64"}`}
      data-profile-meta-group="photography"
    >
      <p className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[var(--profile-muted)]">Photography types</p>
      <div aria-label="Photography types" className={`flex flex-wrap gap-2 ${centered ? "justify-center" : ""}`}>
        {specialties.map((specialty) => (
          <span
            key={specialty}
            className="border [border-color:var(--profile-border)] px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--profile-ink)]"
            data-profile-role-tag="true"
          >
            {specialty}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProfileDetails({ profile, centered = false, compact = false }: { profile: PublicProfileIdentity; centered?: boolean; compact?: boolean }) {
  const hasMeta = profile.specialties.length > 0 || profile.socials.length > 0;

  return (
    <div className={`min-w-0 ${centered ? "text-center" : ""}`} data-profile-identity-group="true">
      <Name profile={profile} centered={centered} compact={compact} />
      {profile.bio && (
        <p className={`mt-4 max-w-[70ch] whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-6 text-[var(--profile-ink)] sm:text-[15px] sm:leading-7 ${centered ? "mx-auto" : ""}`}>
          {profile.bio}
        </p>
      )}
      {hasMeta && (
        <div className={`mt-6 flex gap-x-8 gap-y-5 border-t [border-color:var(--profile-border)] pt-5 ${centered ? "flex-col items-center" : "flex-wrap items-start"}`}>
          <Specialties specialties={profile.specialties} centered={centered} />
          <SocialLinks socials={profile.socials} style={profile.socialStyle} centered={centered} />
        </div>
      )}
    </div>
  );
}

function ContactSheetHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className={profile.anonymous
      ? "py-10 sm:py-14"
      : "grid gap-6 py-9 sm:gap-8 sm:py-12 lg:grid-cols-[176px_minmax(0,1fr)] lg:items-center lg:gap-10"}
    >
      <Avatar profile={profile} sizeClass="size-36 sm:size-44" />
      <div className="min-w-0">
        <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[var(--profile-muted)]">Member mini-portfolio</p>
        <ProfileDetails profile={profile} />
      </div>
    </header>
  );
}

function PrintIndexHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="mx-auto flex max-w-3xl flex-col items-center py-10 text-center sm:py-14">
      <Avatar profile={profile} sizeClass="size-32 sm:size-40" />
      <p className={`${profile.anonymous ? "" : "mt-6"} text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]`}>Purdue Photography Club</p>
      <div className="mt-3 min-w-0 max-w-full"><ProfileDetails profile={profile} centered /></div>
    </header>
  );
}

function SplitFrameHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className={profile.anonymous
      ? "py-9 sm:py-12"
      : "grid overflow-hidden py-7 md:grid-cols-[minmax(0,1fr)_248px] md:py-9"}
    >
      <div className="order-2 flex min-w-0 flex-col justify-center border-x border-b [border-color:var(--profile-border)] px-4 py-9 sm:px-8 md:order-1 md:border-x-0 md:border-y">
        <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]">Selected work</p>
        <ProfileDetails profile={profile} />
      </div>
      {!profile.anonymous && (
        <div className="order-1 flex items-center justify-center border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] p-7 md:order-2 md:border-l-0">
          <Avatar profile={profile} sizeClass="size-40 md:size-44" />
        </div>
      )}
    </header>
  );
}

function NegativeStripHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="my-5 border-y-[10px] [border-color:var(--profile-border)] [background-color:var(--profile-surface)] sm:my-7">
      <div aria-hidden="true" className="h-3 bg-[repeating-linear-gradient(90deg,transparent_0_18px,var(--profile-border)_18px_28px)]" />
      <div className={profile.anonymous
        ? "border-y [border-color:var(--profile-border)] px-5 py-9 sm:px-8"
        : "grid items-center gap-6 border-y [border-color:var(--profile-border)] px-5 py-7 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-8 sm:px-8"}
      >
        <Avatar profile={profile} sizeClass="size-32" />
        <div className="min-w-0"><ProfileDetails profile={profile} compact /></div>
      </div>
      <div aria-hidden="true" className="h-3 bg-[repeating-linear-gradient(90deg,transparent_0_18px,var(--profile-border)_18px_28px)]" />
    </header>
  );
}

function EditorialGridHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className={profile.anonymous
      ? "grid gap-5 py-10 sm:grid-cols-[56px_minmax(0,1fr)] sm:py-14"
      : "grid gap-6 py-9 sm:grid-cols-[56px_minmax(0,1fr)] sm:py-14 lg:grid-cols-[56px_minmax(0,1fr)_220px] lg:items-center"}
    >
      <p aria-hidden="true" className="order-1 hidden font-mono text-4xl text-[var(--profile-border)] sm:block sm:self-start">01</p>
      <div className="order-2 min-w-0 border-l [border-color:var(--profile-border)] pl-5 sm:pl-8">
        <p className="mb-4 text-[9px] uppercase tracking-[0.28em] text-[var(--profile-muted)]">Photographer index</p>
        <ProfileDetails profile={profile} />
      </div>
      {!profile.anonymous && (
        <div className="order-1 col-span-full flex justify-center sm:order-3 sm:justify-start sm:pl-[88px] lg:col-span-1 lg:justify-end lg:pl-0">
          <Avatar profile={profile} sizeClass="size-40 lg:size-48" />
        </div>
      )}
    </header>
  );
}

function DarkroomCardHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="flex justify-center py-10 sm:py-16">
      <div className={profile.anonymous
        ? "w-full max-w-3xl border [border-color:var(--profile-border)] [background-color:var(--profile-surface)] p-7 sm:p-10"
        : "grid w-full max-w-4xl gap-7 border [border-color:var(--profile-border)] [background-color:var(--profile-surface)] p-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:p-8"}
      >
        <Avatar profile={profile} sizeClass="size-40 md:size-48" />
        <div className="min-w-0">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--profile-muted)]">Darkroom record</p>
          <ProfileDetails profile={profile} compact />
        </div>
      </div>
    </header>
  );
}

function DiptychHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className={profile.anonymous ? "py-9 sm:py-12" : "grid py-8 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] md:py-12"}>
      {!profile.anonymous && (
        <div className="flex min-h-60 items-center justify-center border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] p-7">
          <Avatar profile={profile} sizeClass="size-44 lg:size-52" />
        </div>
      )}
      <div className={`flex min-h-60 min-w-0 flex-col justify-center border [border-color:var(--profile-border)] p-7 sm:p-9 ${profile.anonymous ? "" : "border-t-0 md:border-l-0 md:border-t"}`}>
        <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]">Profile / selected work</p>
        <ProfileDetails profile={profile} />
      </div>
    </header>
  );
}

function SafeArea({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`relative z-10 ${className}`} data-profile-safe-area="true">{children}</div>;
}

function DecorationFrame({ children, decoration }: { children: ReactNode; decoration: ProfileDecoration }) {
  if (decoration === "none") {
    return <SafeArea className="border-b [border-color:var(--profile-border)]">{children}</SafeArea>;
  }
  if (decoration === "film-frame") {
    return <SafeArea className="my-4 border-[3px] border-double [border-color:var(--profile-border)] px-4 sm:px-7"><span className="sr-only">Film frame</span>{children}</SafeArea>;
  }
  if (decoration === "contact-marks") {
    return (
      <div className="relative border-b [border-color:var(--profile-border)] px-7 sm:px-10">
        <span aria-hidden="true" className="pointer-events-none absolute left-2 top-3 font-mono text-[8px] text-[var(--profile-muted)]">01A</span>
        <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-2 font-mono text-[8px] text-[var(--profile-muted)]">36</span>
        <span className="sr-only">Contact marks</span><SafeArea>{children}</SafeArea>
      </div>
    );
  }
  if (decoration === "viewfinder") {
    return (
      <div className="relative border-b [border-color:var(--profile-border)] px-7 before:pointer-events-none before:absolute before:left-1 before:top-4 before:size-7 before:border-l before:border-t before:[border-color:var(--profile-muted)] after:pointer-events-none after:absolute after:bottom-4 after:right-1 after:size-7 after:border-b after:border-r after:[border-color:var(--profile-muted)] sm:px-10">
        <span className="sr-only">Viewfinder</span><SafeArea>{children}</SafeArea>
      </div>
    );
  }
  if (decoration === "sprocket") {
    return (
      <div className="my-4 border-y-8 border-dotted [border-color:var(--profile-border)] px-4 sm:px-7">
        <span className="sr-only">Sprocket holes</span><SafeArea>{children}</SafeArea>
      </div>
    );
  }
  if (decoration === "archival-stamp") {
    return (
      <div className="border-b [border-color:var(--profile-border)] px-4 sm:px-7">
        <span className="sr-only">Archival stamp</span>
        <SafeArea>{children}</SafeArea>
        <div aria-hidden="true" className="relative z-10 mb-4 flex justify-end">
          <span className="-rotate-2 border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--profile-ink)]">PPC archive / catalogued</span>
        </div>
      </div>
    );
  }
  return (
    <div className="border-b [border-color:var(--profile-border)] bg-[linear-gradient(to_right,var(--profile-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--profile-border)_1px,transparent_1px)] bg-[size:32px_32px] p-3 sm:p-5">
      <span className="sr-only">Grid lines</span>
      <SafeArea className="border [border-color:var(--profile-border)] [background-color:var(--profile-surface)] px-4 sm:px-7">{children}</SafeArea>
    </div>
  );
}

function TemplateHeader({ profile }: { profile: PublicProfileIdentity }) {
  if (profile.template === "print-index") return <PrintIndexHeader profile={profile} />;
  if (profile.template === "split-frame") return <SplitFrameHeader profile={profile} />;
  if (profile.template === "negative-strip") return <NegativeStripHeader profile={profile} />;
  if (profile.template === "editorial-grid") return <EditorialGridHeader profile={profile} />;
  if (profile.template === "darkroom-card") return <DarkroomCardHeader profile={profile} />;
  if (profile.template === "diptych") return <DiptychHeader profile={profile} />;
  return <ContactSheetHeader profile={profile} />;
}

export default function ProfileTemplateRenderer({
  children,
  profile,
}: {
  children?: ReactNode;
  profile: PublicProfileIdentity;
}) {
  const visibleProfile: PublicProfileIdentity = profile.anonymous
    ? {
        ...profile,
        avatarUrl: null,
        bio: null,
        displayName: "PPC Member",
        nameStyle: "classic",
        socials: [],
        specialties: [],
        username: null,
      }
    : profile;

  return (
    <section
      aria-label={`${DECORATION_LABELS[profile.decoration]} member mini-portfolio`}
      className="relative isolate overflow-hidden [background-color:var(--profile-surface)] text-[var(--profile-ink)]"
      data-profile-palette={profile.palette}
      data-profile-surface="true"
      data-profile-template={profile.template}
      style={PROFILE_PALETTE_CLASSES[profile.palette]}
    >
      <span className="sr-only">{PALETTE_LABELS[profile.palette]} profile palette</span>
      <DecorationFrame decoration={profile.decoration}>
        <TemplateHeader profile={visibleProfile} />
      </DecorationFrame>
      {children}
    </section>
  );
}
