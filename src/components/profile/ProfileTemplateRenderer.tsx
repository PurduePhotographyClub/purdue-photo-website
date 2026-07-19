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
}: {
  profile: PublicProfileIdentity;
}) {
  if (profile.anonymous) return null;
  const resolvedShape = resolveProfileAvatarShape(profile);

  return (
    <div
      className={`relative aspect-square w-32 shrink-0 overflow-hidden border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] sm:w-40 lg:w-44 ${getAvatarShapeClass(profile)}`}
      data-profile-avatar="true"
      data-profile-avatar-shape={resolvedShape}
    >
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={`${profile.displayName || "Member"} portrait`}
          className="size-full object-cover"
          decoding="async"
          draggable={false}
          height={512}
          sizes="(min-width: 1024px) 176px, (min-width: 640px) 160px, 128px"
          style={getProfileAvatarImageStyle(profile)}
          width={512}
        />
      ) : (
        <img
          src="/ppc-logo.webp"
          alt="Purdue Photography Club logo"
          className="size-full object-contain p-5 opacity-75 sm:p-6"
          data-profile-avatar-fallback="true"
          height={256}
          width={256}
        />
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
    <nav
      aria-label="Profile social links"
      className={`flex min-w-0 flex-wrap items-center gap-2 ${centered ? "justify-center" : ""}`}
      data-profile-meta-group="socials"
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
              : "flex size-11 items-center justify-center border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] text-[var(--profile-ink)] transition-colors hover:[border-color:var(--profile-accent)] hover:text-[var(--profile-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)]"}
          >
            <ProfileSocialIcon platform={social.icon} size={20} />
            {style === "labels" && <span className="truncate">{label}</span>}
          </a>
        );
      })}
    </nav>
  );
}

function Specialties({ specialties, centered = false }: { specialties: ProfileSpecialty[]; centered?: boolean }) {
  if (specialties.length === 0) return null;
  return (
    <div
      className={`min-w-0 ${centered ? "flex flex-col items-center" : ""}`}
      data-profile-meta-group="photography"
    >
      <p className="mb-2.5 text-[9px] uppercase tracking-[0.18em] text-[var(--profile-muted)]">Photography types</p>
      <div aria-label="Photography types" className={`flex flex-wrap gap-1.5 ${centered ? "justify-center" : ""}`}>
        {specialties.map((specialty) => (
          <span
            key={specialty}
            className="border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-[var(--profile-ink)]"
            data-profile-role-tag="true"
          >
            {specialty}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProfileIdentity({ profile, centered = false }: { profile: PublicProfileIdentity; centered?: boolean }) {
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] ${centered ? "justify-center" : ""}`}>
      {profile.username && (
        <span className="text-[var(--profile-muted)]" data-profile-username="true">
          @{profile.username}
        </span>
      )}
      <span
        className="inline-flex min-h-7 items-center gap-2 border [border-color:var(--profile-border)] px-2.5 py-1 uppercase tracking-[0.11em] text-[var(--profile-ink)]"
        data-profile-membership="true"
      >
        <span aria-hidden="true" className="size-1.5 [background-color:var(--profile-accent)]" />
        Purdue Photography Club member
      </span>
    </div>
  );
}

function ProfileStatistics({
  centered = false,
  photoCount,
  profile,
}: {
  centered?: boolean;
  photoCount: number;
  profile: PublicProfileIdentity;
}) {
  const statistics = profile.anonymous
    ? [{ label: "Photographs", value: photoCount }]
    : [
        { label: "Photographs", value: photoCount },
        { label: "Focus areas", value: profile.specialties.length },
        { label: "Profile links", value: profile.socials.length },
      ];

  return (
    <dl
      className={`grid border-y [border-color:var(--profile-border)] ${profile.anonymous ? "grid-cols-1" : "grid-cols-3"}`}
      data-profile-statistics="true"
    >
      {statistics.map((statistic, index) => (
        <div
          key={statistic.label}
          className={`min-w-0 py-3.5 ${centered ? "px-3" : "pr-3"} ${index > 0 ? "border-l [border-color:var(--profile-border)] pl-3 sm:pl-4" : ""}`}
          data-profile-stat="true"
        >
          <dt className="text-[8px] uppercase tracking-[0.14em] text-[var(--profile-muted)]">{statistic.label}</dt>
          <dd className="mt-1 text-base leading-none text-[var(--profile-ink)] sm:text-lg">{statistic.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProfileActions({ profile, centered = false }: { profile: PublicProfileIdentity; centered?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${centered ? "justify-center" : ""}`}
      data-profile-actions="true"
    >
      <a
        href="#profile-gallery"
        className="inline-flex min-h-11 items-center justify-center border [border-color:var(--profile-accent)] [background-color:var(--profile-accent)] px-4 text-[10px] uppercase tracking-[0.13em] [color:var(--profile-surface)] transition-colors hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)]"
      >
        View gallery
      </a>
      <SocialLinks socials={profile.socials} style={profile.socialStyle} centered={centered} />
    </div>
  );
}

function ProfileDetails({
  centered = false,
  compact = false,
  photoCount,
  profile,
}: {
  centered?: boolean;
  compact?: boolean;
  photoCount: number;
  profile: PublicProfileIdentity;
}) {

  return (
    <div className={`min-w-0 ${centered ? "text-center" : ""}`} data-profile-identity-group="true">
      <Name profile={profile} centered={centered} compact={compact} />
      <ProfileIdentity profile={profile} centered={centered} />
      {profile.specialties.length > 0 && (
        <div className="mt-5">
          <Specialties specialties={profile.specialties} centered={centered} />
        </div>
      )}
      {profile.bio && (
        <p
          className={`mt-5 max-w-[68ch] whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-6 text-[var(--profile-ink)] sm:text-[15px] sm:leading-7 ${centered ? "mx-auto" : ""}`}
          data-profile-bio="true"
        >
          {profile.bio}
        </p>
      )}
      <div className="mt-6"><ProfileStatistics centered={centered} photoCount={photoCount} profile={profile} /></div>
      <div className="mt-5"><ProfileActions profile={profile} centered={centered} /></div>
    </div>
  );
}

interface ProfileHeaderProps {
  photoCount: number;
  profile: PublicProfileIdentity;
}

function ContactSheetHeader({ photoCount, profile }: ProfileHeaderProps) {
  return (
    <header className={profile.anonymous
      ? "py-9 sm:py-12"
      : "grid gap-7 py-8 sm:py-10 md:grid-cols-[160px_minmax(0,1fr)] md:items-start md:gap-9 lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-11"}
      data-profile-header="true"
    >
      <Avatar profile={profile} />
      <div className="min-w-0">
        <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[var(--profile-muted)]">Member mini-portfolio</p>
        <ProfileDetails photoCount={photoCount} profile={profile} />
      </div>
    </header>
  );
}

function PrintIndexHeader({ photoCount, profile }: ProfileHeaderProps) {
  return (
    <header className="mx-auto flex max-w-4xl flex-col items-center py-9 text-center sm:py-12" data-profile-header="true">
      <Avatar profile={profile} />
      <p className={`${profile.anonymous ? "" : "mt-6"} text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]`}>Purdue Photography Club</p>
      <div className="mt-3 min-w-0 max-w-full"><ProfileDetails photoCount={photoCount} profile={profile} centered /></div>
    </header>
  );
}

function SplitFrameHeader({ photoCount, profile }: ProfileHeaderProps) {
  return (
    <header className={profile.anonymous
      ? "py-9 sm:py-12"
      : "grid gap-7 py-8 sm:py-10 md:grid-cols-[minmax(0,1fr)_160px] md:items-start md:gap-9 lg:grid-cols-[minmax(0,1fr)_176px] lg:gap-11"}
      data-profile-header="true"
    >
      <div className="order-2 min-w-0 md:order-1">
        <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]">Selected work</p>
        <ProfileDetails photoCount={photoCount} profile={profile} />
      </div>
      {!profile.anonymous && (
        <div className="order-1 md:order-2 md:justify-self-end">
          <Avatar profile={profile} />
        </div>
      )}
    </header>
  );
}

function NegativeStripHeader({ photoCount, profile }: ProfileHeaderProps) {
  return (
    <header className="my-5 border-y-8 [border-color:var(--profile-border)] [background-color:var(--profile-surface)] sm:my-7" data-profile-header="true">
      <div aria-hidden="true" className="h-2.5 bg-[repeating-linear-gradient(90deg,transparent_0_18px,var(--profile-border)_18px_28px)]" />
      <div className={profile.anonymous
        ? "border-y [border-color:var(--profile-border)] px-5 py-8 sm:px-8"
        : "grid gap-7 border-y [border-color:var(--profile-border)] px-5 py-7 sm:px-8 md:grid-cols-[160px_minmax(0,1fr)] md:items-start md:gap-9"}
      >
        <Avatar profile={profile} />
        <div className="min-w-0"><ProfileDetails photoCount={photoCount} profile={profile} compact /></div>
      </div>
      <div aria-hidden="true" className="h-2.5 bg-[repeating-linear-gradient(90deg,transparent_0_18px,var(--profile-border)_18px_28px)]" />
    </header>
  );
}

function EditorialGridHeader({ photoCount, profile }: ProfileHeaderProps) {
  return (
    <header className={profile.anonymous
      ? "py-9 sm:py-12"
      : "grid gap-7 py-8 sm:py-10 md:grid-cols-[minmax(0,1fr)_160px] md:items-start md:gap-9 lg:grid-cols-[minmax(0,1fr)_176px] lg:gap-11"}
      data-profile-header="true"
    >
      <div className="order-2 min-w-0 border-t [border-color:var(--profile-border)] pt-5 md:order-1 md:border-l md:border-t-0 md:pl-7 md:pt-0 lg:pl-9">
        <p className="mb-4 text-[9px] uppercase tracking-[0.28em] text-[var(--profile-muted)]">Photographer index</p>
        <ProfileDetails photoCount={photoCount} profile={profile} />
      </div>
      {!profile.anonymous && (
        <div className="order-1 md:order-2 md:justify-self-end">
          <Avatar profile={profile} />
        </div>
      )}
    </header>
  );
}

function DarkroomCardHeader({ photoCount, profile }: ProfileHeaderProps) {
  return (
    <header className={profile.anonymous
      ? "my-6 border-y [border-color:var(--profile-border)] [background-color:var(--profile-chip)] px-5 py-8 sm:px-8 sm:py-10"
      : "my-6 grid gap-7 border-y [border-color:var(--profile-border)] [background-color:var(--profile-chip)] px-5 py-7 sm:px-8 md:grid-cols-[160px_minmax(0,1fr)] md:items-start md:gap-9 lg:grid-cols-[176px_minmax(0,1fr)]"}
      data-profile-header="true"
    >
      <Avatar profile={profile} />
      <div className="min-w-0">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--profile-muted)]">Darkroom record</p>
        <ProfileDetails photoCount={photoCount} profile={profile} compact />
      </div>
    </header>
  );
}

function DiptychHeader({ photoCount, profile }: ProfileHeaderProps) {
  return (
    <header className={profile.anonymous
      ? "py-9 sm:py-12"
      : "grid gap-7 py-8 sm:py-10 md:grid-cols-[160px_minmax(0,1fr)] md:items-start md:gap-9 lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-11"}
      data-profile-header="true"
    >
      <Avatar profile={profile} />
      <div className="min-w-0 border-t [border-color:var(--profile-border)] pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0 lg:pl-9">
        <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]">Profile / selected work</p>
        <ProfileDetails photoCount={photoCount} profile={profile} />
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

function TemplateHeader({ photoCount, profile }: ProfileHeaderProps) {
  if (profile.template === "print-index") return <PrintIndexHeader photoCount={photoCount} profile={profile} />;
  if (profile.template === "split-frame") return <SplitFrameHeader photoCount={photoCount} profile={profile} />;
  if (profile.template === "negative-strip") return <NegativeStripHeader photoCount={photoCount} profile={profile} />;
  if (profile.template === "editorial-grid") return <EditorialGridHeader photoCount={photoCount} profile={profile} />;
  if (profile.template === "darkroom-card") return <DarkroomCardHeader photoCount={photoCount} profile={profile} />;
  if (profile.template === "diptych") return <DiptychHeader photoCount={photoCount} profile={profile} />;
  return <ContactSheetHeader photoCount={photoCount} profile={profile} />;
}

export default function ProfileTemplateRenderer({
  children,
  photoCount = 0,
  profile,
}: {
  children?: ReactNode;
  photoCount?: number;
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
        <TemplateHeader photoCount={photoCount} profile={visibleProfile} />
      </DecorationFrame>
      {children}
    </section>
  );
}
