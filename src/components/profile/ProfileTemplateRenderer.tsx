import type { CSSProperties, ReactNode } from "react";
import {
  getProfileAvatarImageStyle,
  getProfileSocialHref,
  resolveProfileDecoration,
  resolveProfileAvatarShape,
  type ProfileAvatarShape,
  type ProfileDecoration,
  type ProfileNameStyle,
  type ProfilePalette,
  type ProfilePaletteMode,
  type ProfileSocial,
  type ProfileSocialStyle,
  type ProfileSpecialty,
  type ProfileTemplate,
} from "@/lib/profile-model";
import {
  createEmptyPublicProfileStatistics,
  formatClubTenure,
  type PublicProfileStatistics,
} from "@/lib/profile-statistics";
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
  paletteMode: ProfilePaletteMode;
  showAvatar: boolean;
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

function getProfilePaletteStyle(
  palette: ProfilePalette,
  paletteMode: ProfilePaletteMode,
): ProfilePaletteStyle {
  const selectedPalette = PROFILE_PALETTE_CLASSES[palette];
  if (paletteMode === "background-accent") return selectedPalette;

  return {
    ...PROFILE_PALETTE_CLASSES.monochrome,
    "--profile-accent": selectedPalette["--profile-accent"],
  };
}

function getAvatarShapeClass(profile: PublicProfileIdentity) {
  const shape = resolveProfileAvatarShape(profile);
  if (shape === "rounded") return "rounded-[14%]";
  return shape === "square" ? "rounded-none" : "rounded-full";
}

function hasVisibleAvatar(profile: PublicProfileIdentity) {
  return !profile.anonymous && profile.showAvatar;
}

function Avatar({
  alignment = "start",
  profile,
  size = "standard",
}: {
  alignment?: "center" | "start";
  profile: PublicProfileIdentity;
  size?: "feature" | "standard";
}) {
  if (!hasVisibleAvatar(profile)) return null;
  const resolvedShape = resolveProfileAvatarShape(profile);
  const alignmentClass = alignment === "center" ? "self-center" : "self-start";
  const sizeClass = size === "feature"
    ? "w-32 sm:w-40 md:w-full md:max-w-none"
    : "w-32 sm:w-40 md:w-full md:max-w-40 lg:max-w-44";
  const responsiveSizes = size === "feature"
    ? "(min-width: 1024px) 320px, (min-width: 768px) 240px, (min-width: 640px) 160px, 128px"
    : "(min-width: 1024px) 176px, (min-width: 640px) 160px, 128px";

  return (
    <div
      data-profile-avatar-alignment={alignment}
      data-profile-avatar-size={size}
      data-profile-avatar="true"
      data-profile-avatar-shape={resolvedShape}
      className={`relative aspect-square max-w-full shrink-0 overflow-hidden border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] ${alignmentClass} ${sizeClass} ${getAvatarShapeClass(profile)}`}
    >
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={`${profile.displayName || "Member"} portrait`}
          className="size-full object-cover"
          decoding="async"
          draggable={false}
          height={512}
          sizes={responsiveSizes}
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
  if (!profile.username) return null;

  return (
    <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] ${centered ? "justify-center" : ""}`}>
      <span className="text-[var(--profile-muted)]" data-profile-username="true">
        @{profile.username}
      </span>
    </div>
  );
}

function ProfileStatistics({
  centered = false,
  profile,
  statistics,
}: {
  centered?: boolean;
  profile: PublicProfileIdentity;
  statistics: PublicProfileStatistics;
}) {
  const items = profile.anonymous
    ? [{ label: "Photographs", value: statistics.photographs }]
    : [
        { label: "Photographs", value: statistics.photographs },
        { label: "Time in club", value: formatClubTenure(statistics.clubTenureMonths) },
        {
          label: "Top 3 finishes",
          value: statistics.competitionTopThreePlacements ?? 0,
        },
      ];

  return (
    <dl
      className={`grid border-y [border-color:var(--profile-border)] ${profile.anonymous ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"}`}
      data-profile-statistics="true"
    >
      {items.map((statistic, index) => (
        <div
          key={statistic.label}
          className={`min-w-0 py-3.5 ${centered ? "px-3" : "pr-3"} ${index > 0 ? "border-t [border-color:var(--profile-border)] pl-0 sm:border-l sm:border-t-0 sm:pl-4" : ""}`}
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
  if (profile.socials.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${centered ? "justify-center" : ""}`}
      data-profile-actions="true"
    >
      <SocialLinks socials={profile.socials} style={profile.socialStyle} centered={centered} />
    </div>
  );
}

function ProfileDetails({
  centered = false,
  compact = false,
  profile,
  statistics,
}: {
  centered?: boolean;
  compact?: boolean;
  profile: PublicProfileIdentity;
  statistics: PublicProfileStatistics;
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
      <div className="mt-6"><ProfileStatistics centered={centered} profile={profile} statistics={statistics} /></div>
      <div className="mt-5"><ProfileActions profile={profile} centered={centered} /></div>
    </div>
  );
}

interface ProfileHeaderProps {
  profile: PublicProfileIdentity;
  statistics: PublicProfileStatistics;
}

function ContactSheetHeader({ profile, statistics }: ProfileHeaderProps) {
  const avatarVisible = hasVisibleAvatar(profile);
  return (
    <header className={!avatarVisible
      ? "py-9 sm:py-12"
      : "grid gap-7 py-8 sm:py-10 md:grid-cols-[160px_minmax(0,1fr)] md:items-start md:gap-9 lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-11"}
      data-profile-header="true"
    >
      <Avatar profile={profile} />
      <div className="min-w-0">
        <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[var(--profile-muted)]">Member mini-portfolio</p>
        <ProfileDetails profile={profile} statistics={statistics} />
      </div>
    </header>
  );
}

function PrintIndexHeader({ profile, statistics }: ProfileHeaderProps) {
  const avatarVisible = hasVisibleAvatar(profile);
  return (
    <header className="mx-auto flex max-w-4xl flex-col items-center py-9 text-center sm:py-12" data-profile-header="true">
      <Avatar alignment="center" profile={profile} />
      <p className={`${avatarVisible ? "mt-6" : ""} text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]`}>Purdue Photography Club</p>
      <div className="mt-3 min-w-0 max-w-full"><ProfileDetails profile={profile} statistics={statistics} centered /></div>
    </header>
  );
}

function SplitFrameHeader({ profile, statistics }: ProfileHeaderProps) {
  const avatarVisible = hasVisibleAvatar(profile);
  return (
    <header className={!avatarVisible
      ? "py-9 sm:py-12"
      : "grid gap-7 py-8 sm:py-10 md:grid-cols-[minmax(0,1fr)_240px] md:items-start md:gap-9 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-11"}
      data-profile-header="true"
    >
      <div className="order-2 min-w-0 md:order-1">
        <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]">Selected work</p>
        <ProfileDetails profile={profile} statistics={statistics} />
      </div>
      {avatarVisible && (
        <div data-profile-avatar-slot="feature" className="order-1 w-full md:order-2">
          <Avatar profile={profile} size="feature" />
        </div>
      )}
    </header>
  );
}

function NegativeStripHeader({ profile, statistics }: ProfileHeaderProps) {
  const avatarVisible = hasVisibleAvatar(profile);
  return (
    <header className="my-5 border-y-8 [border-color:var(--profile-border)] [background-color:var(--profile-surface)] sm:my-7" data-profile-header="true">
      <div aria-hidden="true" className="h-2.5 bg-[repeating-linear-gradient(90deg,transparent_0_18px,var(--profile-border)_18px_28px)]" />
      <div className={!avatarVisible
        ? "border-y [border-color:var(--profile-border)] px-5 py-8 sm:px-8"
        : "grid gap-7 border-y [border-color:var(--profile-border)] px-5 py-7 sm:px-8 md:grid-cols-[160px_minmax(0,1fr)] md:items-start md:gap-9"}
      >
        <Avatar profile={profile} />
        <div className="min-w-0"><ProfileDetails profile={profile} statistics={statistics} compact /></div>
      </div>
      <div aria-hidden="true" className="h-2.5 bg-[repeating-linear-gradient(90deg,transparent_0_18px,var(--profile-border)_18px_28px)]" />
    </header>
  );
}

function EditorialGridHeader({ profile, statistics }: ProfileHeaderProps) {
  const avatarVisible = hasVisibleAvatar(profile);
  return (
    <header className={!avatarVisible
      ? "py-9 sm:py-12"
      : "grid gap-7 py-8 sm:py-10 md:grid-cols-[minmax(0,1fr)_240px] md:items-start md:gap-9 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-11"}
      data-profile-header="true"
    >
      <div className="order-2 min-w-0 border-t [border-color:var(--profile-border)] pt-5 md:order-1 md:border-l md:border-t-0 md:pl-7 md:pt-0 lg:pl-9">
        <p className="mb-4 text-[9px] uppercase tracking-[0.28em] text-[var(--profile-muted)]">Photographer index</p>
        <ProfileDetails profile={profile} statistics={statistics} />
      </div>
      {avatarVisible && (
        <div data-profile-avatar-slot="feature" className="order-1 w-full md:order-2">
          <Avatar profile={profile} size="feature" />
        </div>
      )}
    </header>
  );
}

function DarkroomCardHeader({ profile, statistics }: ProfileHeaderProps) {
  const avatarVisible = hasVisibleAvatar(profile);
  return (
    <header className={!avatarVisible
      ? "my-6 border-y [border-color:var(--profile-border)] [background-color:var(--profile-chip)] px-5 py-8 sm:px-8 sm:py-10"
      : "my-6 grid gap-7 border-y [border-color:var(--profile-border)] [background-color:var(--profile-chip)] px-5 py-7 sm:px-8 md:grid-cols-[160px_minmax(0,1fr)] md:items-start md:gap-9 lg:grid-cols-[176px_minmax(0,1fr)]"}
      data-profile-header="true"
    >
      <Avatar profile={profile} />
      <div className="min-w-0">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--profile-muted)]">Darkroom record</p>
        <ProfileDetails profile={profile} statistics={statistics} compact />
      </div>
    </header>
  );
}

function DiptychHeader({ profile, statistics }: ProfileHeaderProps) {
  const avatarVisible = hasVisibleAvatar(profile);
  return (
    <header className={!avatarVisible
      ? "py-9 sm:py-12"
      : "grid gap-7 py-8 sm:py-10 md:grid-cols-[160px_minmax(0,1fr)] md:items-start md:gap-9 lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-11"}
      data-profile-header="true"
    >
      <Avatar profile={profile} />
      <div className="min-w-0 border-t [border-color:var(--profile-border)] pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0 lg:pl-9">
        <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]">Profile / selected work</p>
        <ProfileDetails profile={profile} statistics={statistics} />
      </div>
    </header>
  );
}

function SafeArea({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-profile-safe-area="true"
      className={`relative z-10 ${className}`}
    >
      {children}
    </div>
  );
}

function DecorationFrame({ children, decoration }: { children: ReactNode; decoration: ProfileDecoration }) {
  if (decoration === "none") {
    return <div data-profile-decoration-frame="none" data-profile-header-surface="true" className="overflow-hidden border-b [border-color:var(--profile-border)] [background-color:var(--profile-surface)]"><SafeArea>{children}</SafeArea></div>;
  }
  if (decoration === "film-frame") {
    return (
      <div
        data-profile-decoration-frame="film-frame"
        data-profile-header-surface="true"
        className="my-4 overflow-hidden border-[3px] border-double [border-color:var(--profile-border)] [background-color:var(--profile-surface)]"
      >
        <SafeArea className="px-4 sm:px-7"><span className="sr-only">Film frame</span>{children}</SafeArea>
      </div>
    );
  }
  if (decoration === "contact-marks") {
    return (
      <div data-profile-decoration-frame="contact-marks" data-profile-header-surface="true" className="relative overflow-hidden border-b [border-color:var(--profile-border)] [background-color:var(--profile-surface)] px-7 sm:px-10">
        <span aria-hidden="true" className="pointer-events-none absolute left-2 top-3 font-mono text-[8px] text-[var(--profile-muted)]">01A</span>
        <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-2 font-mono text-[8px] text-[var(--profile-muted)]">36</span>
        <span className="sr-only">Contact marks</span><SafeArea>{children}</SafeArea>
      </div>
    );
  }
  if (decoration === "viewfinder") {
    return (
      <div data-profile-decoration-frame="viewfinder" data-profile-header-surface="true" className="relative overflow-hidden border-b [border-color:var(--profile-border)] [background-color:var(--profile-surface)] px-7 before:pointer-events-none before:absolute before:left-1 before:top-4 before:size-7 before:border-l before:border-t before:[border-color:var(--profile-muted)] after:pointer-events-none after:absolute after:bottom-4 after:right-1 after:size-7 after:border-b after:border-r after:[border-color:var(--profile-muted)] sm:px-10">
        <span className="sr-only">Viewfinder</span><SafeArea>{children}</SafeArea>
      </div>
    );
  }
  if (decoration === "sprocket") {
    return (
      <div data-profile-decoration-frame="sprocket" data-profile-header-surface="true" className="my-4 overflow-hidden border-y-8 border-dotted [border-color:var(--profile-border)] [background-color:var(--profile-surface)] px-4 sm:px-7">
        <span className="sr-only">Sprocket holes</span><SafeArea>{children}</SafeArea>
      </div>
    );
  }
  if (decoration === "archival-stamp") {
    return (
      <div data-profile-decoration-frame="archival-stamp" data-profile-header-surface="true" className="overflow-hidden border-b [border-color:var(--profile-border)] [background-color:var(--profile-surface)] px-4 sm:px-7">
        <span className="sr-only">Archival stamp</span>
        <SafeArea>{children}</SafeArea>
        <div aria-hidden="true" className="relative z-10 mb-4 flex justify-end">
          <span className="-rotate-2 border [border-color:var(--profile-border)] [background-color:var(--profile-chip)] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--profile-ink)]">PPC archive / catalogued</span>
        </div>
      </div>
    );
  }
  return (
    <div data-profile-decoration-frame="grid-lines" data-profile-header-surface="true" className="overflow-hidden border-b [border-color:var(--profile-border)] bg-[linear-gradient(to_right,var(--profile-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--profile-border)_1px,transparent_1px)] bg-[size:32px_32px] [background-color:var(--profile-surface)] p-3 sm:p-5">
      <span className="sr-only">Grid lines</span>
      <SafeArea className="border [border-color:var(--profile-border)] px-4 sm:px-7">{children}</SafeArea>
    </div>
  );
}

function TemplateHeader({ profile, statistics }: ProfileHeaderProps) {
  if (profile.template === "print-index") return <PrintIndexHeader profile={profile} statistics={statistics} />;
  if (profile.template === "split-frame") return <SplitFrameHeader profile={profile} statistics={statistics} />;
  if (profile.template === "negative-strip") return <NegativeStripHeader profile={profile} statistics={statistics} />;
  if (profile.template === "editorial-grid") return <EditorialGridHeader profile={profile} statistics={statistics} />;
  if (profile.template === "darkroom-card") return <DarkroomCardHeader profile={profile} statistics={statistics} />;
  if (profile.template === "diptych") return <DiptychHeader profile={profile} statistics={statistics} />;
  return <ContactSheetHeader profile={profile} statistics={statistics} />;
}

export default function ProfileTemplateRenderer({
  children,
  profile,
  statistics = createEmptyPublicProfileStatistics(),
}: {
  children?: ReactNode;
  profile: PublicProfileIdentity;
  statistics?: PublicProfileStatistics;
}) {
  const visibleProfile: PublicProfileIdentity = profile.anonymous
    ? {
        ...profile,
        avatarUrl: null,
        bio: null,
        displayName: "PPC Member",
        nameStyle: "classic",
        showAvatar: false,
        socials: [],
        specialties: [],
        username: null,
      }
    : profile;
  const decoration = resolveProfileDecoration(profile);

  return (
    <section
      aria-label={`${DECORATION_LABELS[decoration]} member mini-portfolio`}
      className="relative isolate overflow-hidden bg-neutral-950 text-neutral-100"
      data-profile-decoration={decoration}
      data-profile-picture-visibility={hasVisibleAvatar(visibleProfile) ? "visible" : "hidden"}
      data-profile-template={profile.template}
    >
      <div
        className="relative overflow-hidden bg-neutral-950 text-[var(--profile-ink)]"
        data-profile-palette={profile.palette}
        data-profile-palette-mode={profile.paletteMode}
        data-profile-palette-scope="true"
        style={getProfilePaletteStyle(profile.palette, profile.paletteMode)}
      >
        <span className="sr-only">{PALETTE_LABELS[profile.palette]} profile palette</span>
        <DecorationFrame decoration={decoration}>
          <TemplateHeader profile={visibleProfile} statistics={statistics} />
        </DecorationFrame>
      </div>
      <div
        className="bg-neutral-950 text-neutral-100"
        data-profile-gallery-surface="true"
        style={PROFILE_PALETTE_CLASSES.monochrome}
      >
        {children}
      </div>
    </section>
  );
}
