import { Camera } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  getProfileSocialHref,
  type ProfileDecoration,
  type ProfileNameStyle,
  type ProfilePalette,
  type ProfileSocial,
  type ProfileSpecialty,
  type ProfileTemplate,
} from "@/lib/profile-model";
import ProfileSocialIcon from "./ProfileSocialIcon";

export interface PublicProfileIdentity {
  anonymous: boolean;
  avatarUrl: string | null;
  bio: string | null;
  decoration: ProfileDecoration;
  displayName: string | null;
  nameStyle: ProfileNameStyle | null;
  palette: ProfilePalette;
  socials: ProfileSocial[];
  specialties: ProfileSpecialty[];
  template: ProfileTemplate;
  username: string | null;
}

const NAME_CLASSES: Record<ProfileNameStyle, string> = {
  classic: "font-normal tracking-[0.04em]",
  "film-credit": "font-mono font-bold uppercase tracking-[0.14em]",
  editorial: "italic tracking-[0.02em]",
  "bold-print": "font-bold tracking-[0.01em]",
  condensed: "font-sans font-semibold uppercase tracking-[-0.04em]",
  typewriter: "font-mono tracking-[0.08em]",
  "small-caps": "font-serif uppercase tracking-[0.18em]",
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
    "--profile-border": "#303030",
    "--profile-muted": "#8a8a8a",
    "--profile-surface": "#0a0a0a",
  },
  amber: {
    "--profile-accent": "#fcd34d",
    "--profile-border": "#78350f",
    "--profile-muted": "#d6a949",
    "--profile-surface": "#1c1203",
  },
  cyanotype: {
    "--profile-accent": "#67e8f9",
    "--profile-border": "#155e75",
    "--profile-muted": "#6fb8c5",
    "--profile-surface": "#06171b",
  },
  forest: {
    "--profile-accent": "#86efac",
    "--profile-border": "#166534",
    "--profile-muted": "#6fae82",
    "--profile-surface": "#07170d",
  },
  burgundy: {
    "--profile-accent": "#fda4af",
    "--profile-border": "#881337",
    "--profile-muted": "#c77984",
    "--profile-surface": "#1b070b",
  },
  violet: {
    "--profile-accent": "#c4b5fd",
    "--profile-border": "#5b21b6",
    "--profile-muted": "#9f8bd5",
    "--profile-surface": "#120b22",
  },
};

function Avatar({
  profile,
  sizeClass,
  square = false,
}: {
  profile: PublicProfileIdentity;
  sizeClass: string;
  square?: boolean;
}) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden border [border-color:var(--profile-border)] [background-color:var(--profile-surface)] text-[var(--profile-muted)] ${square ? "rounded-none" : "rounded-full"} ${sizeClass}`}>
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt={`${profile.displayName || "Member"} portrait`} className="size-full object-cover" />
      ) : (
        <Camera aria-hidden="true" size={26} />
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
  return (
    <h1
      className={`break-words text-[var(--profile-accent)] ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} ${centered ? "text-center" : ""} ${NAME_CLASSES[style]}`}
      style={SERIF_NAME_STYLES.has(style) ? { fontFamily: "'Playfair Display', serif" } : undefined}
    >
      {profile.displayName || "PPC Member"}
    </h1>
  );
}

function SocialLinks({ socials, centered = false }: { socials: ProfileSocial[]; centered?: boolean }) {
  const links = socials.flatMap((social) => {
    const href = getProfileSocialHref(social);
    return href ? [{ ...social, href }] : [];
  });
  if (links.length === 0) return null;

  return (
    <nav aria-label="Profile social links" className={`flex flex-wrap items-center gap-1 ${centered ? "justify-center" : ""}`}>
      {links.map((social) => {
        const external = social.platform !== "email";
        const label = social.platform === "vsco" ? "VSCO" : social.platform;
        return (
          <a
            key={social.platform}
            href={social.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            aria-label={label}
            title={label}
            className="flex size-14 items-center justify-center text-[var(--profile-muted)] transition-colors hover:text-[var(--profile-accent)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--profile-accent)]"
          >
            <ProfileSocialIcon platform={social.icon} size={28} />
          </a>
        );
      })}
    </nav>
  );
}

function Specialties({ specialties, centered = false }: { specialties: ProfileSpecialty[]; centered?: boolean }) {
  if (specialties.length === 0) return null;
  return (
    <div aria-label="Photography roles" className={`flex flex-wrap gap-2 ${centered ? "justify-center" : ""}`}>
      {specialties.map((specialty) => (
        <span key={specialty} className="border [border-color:var(--profile-border)] px-2.5 py-1.5 text-[9px] uppercase tracking-[0.16em] text-[var(--profile-muted)]">{specialty}</span>
      ))}
    </div>
  );
}

function ProfileCopy({ profile, centered = false }: { profile: PublicProfileIdentity; centered?: boolean }) {
  return (
    <>
      {profile.bio && <p className={`mt-4 max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-[var(--profile-muted)] ${centered ? "mx-auto" : ""}`}>{profile.bio}</p>}
      <div className="mt-3"><SocialLinks socials={profile.socials} centered={centered} /></div>
    </>
  );
}

function ContactSheetHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="grid gap-7 py-10 sm:py-14 lg:grid-cols-[156px_minmax(0,1fr)_minmax(200px,0.65fr)] lg:items-start lg:gap-9">
      <Avatar profile={profile} sizeClass="size-28 sm:size-36" />
      <div className="min-w-0">
        <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[var(--profile-muted)]">Member portfolio</p>
        <Name profile={profile} />
        <ProfileCopy profile={profile} />
      </div>
      {profile.specialties.length > 0 && (
        <div className="min-w-0 border-t [border-color:var(--profile-border)] pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-[var(--profile-muted)]">Photography roles</p>
          <Specialties specialties={profile.specialties} />
        </div>
      )}
    </header>
  );
}

function PrintIndexHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="mx-auto flex max-w-2xl flex-col items-center py-11 text-center sm:py-16">
      <Avatar profile={profile} sizeClass="size-24 sm:size-28" />
      <p className="mt-5 text-[9px] uppercase tracking-[0.3em] text-[var(--profile-muted)]">Purdue Photography Club</p>
      <div className="mt-2 min-w-0 max-w-full"><Name profile={profile} centered /></div>
      <ProfileCopy profile={profile} centered />
      <div className="mt-4"><Specialties specialties={profile.specialties} centered /></div>
    </header>
  );
}

function SplitFrameHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="grid min-h-64 overflow-hidden py-8 sm:grid-cols-[minmax(0,1fr)_240px] sm:py-10">
      <div className="flex min-w-0 flex-col justify-center border-y [border-color:var(--profile-border)] px-1 py-8 sm:border-r-0 sm:px-8">
        <p className="mb-3 text-[9px] uppercase tracking-[0.3em] text-[var(--profile-muted)]">Selected work</p>
        <Name profile={profile} />
        <ProfileCopy profile={profile} />
        <div className="mt-4"><Specialties specialties={profile.specialties} /></div>
      </div>
      <div className="flex items-center justify-center border [border-color:var(--profile-border)] [background-color:var(--profile-surface)] py-8">
        <Avatar profile={profile} sizeClass="size-32 sm:size-40" square />
      </div>
    </header>
  );
}

function NegativeStripHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="my-8 border-y-[10px] [border-color:var(--profile-border)] [background-color:var(--profile-surface)] sm:my-10">
      <div aria-hidden="true" className="h-3 bg-[repeating-linear-gradient(90deg,transparent_0_18px,var(--profile-border)_18px_28px)]" />
      <div className="grid items-center gap-5 border-y [border-color:var(--profile-border)] px-4 py-7 sm:grid-cols-[84px_minmax(0,1fr)_auto] sm:px-7">
        <Avatar profile={profile} sizeClass="size-20" square />
        <div className="min-w-0">
          <Name profile={profile} compact />
          <ProfileCopy profile={profile} />
        </div>
        <div className="sm:max-w-64"><Specialties specialties={profile.specialties} /></div>
      </div>
      <div aria-hidden="true" className="h-3 bg-[repeating-linear-gradient(90deg,transparent_0_18px,var(--profile-border)_18px_28px)]" />
    </header>
  );
}

function EditorialGridHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="grid gap-6 py-10 sm:grid-cols-[64px_minmax(0,1fr)_180px] sm:items-end sm:py-16">
      <p aria-hidden="true" className="font-mono text-4xl text-[var(--profile-border)] sm:self-start">01</p>
      <div className="min-w-0 border-l [border-color:var(--profile-border)] pl-5 sm:pl-8">
        <p className="mb-4 text-[9px] uppercase tracking-[0.34em] text-[var(--profile-muted)]">Photographer index</p>
        <Name profile={profile} />
        <ProfileCopy profile={profile} />
        <div className="mt-5"><Specialties specialties={profile.specialties} /></div>
      </div>
      <Avatar profile={profile} sizeClass="size-32 justify-self-start sm:size-44 sm:justify-self-end" square />
    </header>
  );
}

function DarkroomCardHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="flex justify-center py-10 sm:py-16">
      <div className="grid w-full max-w-3xl gap-7 border [border-color:var(--profile-border)] [background-color:var(--profile-surface)] p-6 sm:grid-cols-[176px_minmax(0,1fr)] sm:items-center sm:p-9">
        <Avatar profile={profile} sizeClass="size-36 sm:size-44" />
        <div className="min-w-0">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--profile-muted)]">Darkroom record</p>
          <Name profile={profile} compact />
          <ProfileCopy profile={profile} />
          <div className="mt-4"><Specialties specialties={profile.specialties} /></div>
        </div>
      </div>
    </header>
  );
}

function DiptychHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="grid py-9 sm:grid-cols-2 sm:py-14">
      <div className="flex min-h-64 items-center justify-center border [border-color:var(--profile-border)] [background-color:var(--profile-surface)] p-8">
        <Avatar profile={profile} sizeClass="size-40 sm:size-48" square />
      </div>
      <div className="flex min-h-64 min-w-0 flex-col justify-center border border-t-0 [border-color:var(--profile-border)] p-7 sm:border-l-0 sm:border-t sm:p-10">
        <p className="mb-3 text-[9px] uppercase tracking-[0.3em] text-[var(--profile-muted)]">Profile / selected work</p>
        <Name profile={profile} />
        <ProfileCopy profile={profile} />
        <div className="mt-5"><Specialties specialties={profile.specialties} /></div>
      </div>
    </header>
  );
}

function DecorationFrame({ children, decoration }: { children: ReactNode; decoration: ProfileDecoration }) {
  if (decoration === "none") {
    return <div className="border-b [border-color:var(--profile-border)]">{children}</div>;
  }
  if (decoration === "film-frame") {
    return <div className="my-4 border-[3px] border-double [border-color:var(--profile-border)] px-4 sm:px-6"><span className="sr-only">Film frame</span>{children}</div>;
  }
  if (decoration === "contact-marks") {
    return (
      <div className="relative border-b [border-color:var(--profile-border)] px-3 sm:px-5">
        <span className="absolute left-0 top-3 font-mono text-[8px] text-[var(--profile-muted)]">01A</span>
        <span className="absolute bottom-3 right-0 font-mono text-[8px] text-[var(--profile-muted)]">36</span>
        <span className="sr-only">Contact marks</span>{children}
      </div>
    );
  }
  if (decoration === "viewfinder") {
    return (
      <div className="relative border-b [border-color:var(--profile-border)] px-4 before:absolute before:left-0 before:top-4 before:size-6 before:border-l before:border-t before:[border-color:var(--profile-muted)] after:absolute after:bottom-4 after:right-0 after:size-6 after:border-b after:border-r after:[border-color:var(--profile-muted)] sm:px-6">
        <span className="sr-only">Viewfinder</span>{children}
      </div>
    );
  }
  if (decoration === "sprocket") {
    return (
      <div className="my-4 border-y-8 border-dotted [border-color:var(--profile-border)] px-3 sm:px-5">
        <span className="sr-only">Sprocket holes</span>{children}
      </div>
    );
  }
  if (decoration === "archival-stamp") {
    return (
      <div className="relative border-b [border-color:var(--profile-border)] px-3 sm:px-5">
        <span aria-hidden="true" className="absolute right-3 top-5 z-10 -rotate-6 border [border-color:var(--profile-muted)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--profile-muted)]">PPC archive</span>
        <span className="sr-only">Archival stamp</span>{children}
      </div>
    );
  }
  return (
    <div className="border-b [border-color:var(--profile-border)] bg-[linear-gradient(to_right,var(--profile-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--profile-border)_1px,transparent_1px)] bg-[size:32px_32px] px-3 sm:px-5">
      <span className="sr-only">Grid lines</span>{children}
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

export default function ProfileTemplateRenderer({ profile }: { profile: PublicProfileIdentity }) {
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
      aria-label={`${DECORATION_LABELS[profile.decoration]} profile header`}
      data-profile-palette={profile.palette}
      style={PROFILE_PALETTE_CLASSES[profile.palette]}
    >
      <span className="sr-only">{PALETTE_LABELS[profile.palette]} profile palette</span>
      <DecorationFrame decoration={profile.decoration}>
        <TemplateHeader profile={visibleProfile} />
      </DecorationFrame>
    </section>
  );
}
