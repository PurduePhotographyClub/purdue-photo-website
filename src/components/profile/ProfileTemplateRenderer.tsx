import { Camera } from "lucide-react";
import type { ReactNode } from "react";
import {
  getProfileSocialHref,
  type ProfileDecoration,
  type ProfileNameStyle,
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
};

const DECORATION_LABELS: Record<ProfileDecoration, string> = {
  none: "No decoration",
  "film-frame": "Film frame",
  "contact-marks": "Contact marks",
  viewfinder: "Viewfinder",
};

function Avatar({ profile, sizeClass, square = false }: { profile: PublicProfileIdentity; sizeClass: string; square?: boolean }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-neutral-700 bg-neutral-900 text-neutral-600 ${square ? "rounded-none" : "rounded-full"} ${sizeClass}`}>
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt={`${profile.displayName || "Member"} portrait`} className="size-full object-cover" />
      ) : (
        <Camera aria-hidden="true" size={22} />
      )}
    </div>
  );
}

function Name({ profile, centered = false, compact = false }: { profile: PublicProfileIdentity; centered?: boolean; compact?: boolean }) {
  const style = profile.nameStyle || "classic";
  return (
    <h1
      className={`break-words text-neutral-100 ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} ${centered ? "text-center" : ""} ${NAME_CLASSES[style]}`}
      style={style === "film-credit" ? undefined : { fontFamily: "'Playfair Display', serif" }}
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
            className="flex size-11 items-center justify-center text-neutral-500 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
          >
            <ProfileSocialIcon platform={social.icon} />
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
        <span key={specialty} className="border border-neutral-800 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.16em] text-neutral-500">{specialty}</span>
      ))}
    </div>
  );
}

function ProfileCopy({ profile, centered = false }: { profile: PublicProfileIdentity; centered?: boolean }) {
  return (
    <>
      {profile.bio && <p className={`mt-4 max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-neutral-400 ${centered ? "mx-auto" : ""}`}>{profile.bio}</p>}
      <div className="mt-3"><SocialLinks socials={profile.socials} centered={centered} /></div>
    </>
  );
}

function ContactSheetHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="grid gap-7 py-10 sm:py-14 lg:grid-cols-[140px_minmax(0,1fr)_minmax(200px,0.65fr)] lg:items-start lg:gap-9">
      <Avatar profile={profile} sizeClass="size-24 sm:size-32" />
      <div className="min-w-0">
        <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-neutral-600">Member portfolio</p>
        <Name profile={profile} />
        <ProfileCopy profile={profile} />
      </div>
      {profile.specialties.length > 0 && (
        <div className="min-w-0 border-t border-neutral-800 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-neutral-600">Photography roles</p>
          <Specialties specialties={profile.specialties} />
        </div>
      )}
    </header>
  );
}

function PrintIndexHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="mx-auto flex max-w-2xl flex-col items-center py-11 text-center sm:py-16">
      <Avatar profile={profile} sizeClass="size-20 sm:size-24" />
      <p className="mt-5 text-[9px] uppercase tracking-[0.3em] text-neutral-600">Purdue Photography Club</p>
      <div className="mt-2 min-w-0 max-w-full"><Name profile={profile} centered /></div>
      <ProfileCopy profile={profile} centered />
      <div className="mt-4"><Specialties specialties={profile.specialties} centered /></div>
    </header>
  );
}

function SplitFrameHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="grid min-h-64 overflow-hidden py-8 sm:grid-cols-[minmax(0,1fr)_220px] sm:py-10">
      <div className="flex min-w-0 flex-col justify-center border-y border-neutral-800 px-1 py-8 sm:border-r-0 sm:px-8">
        <p className="mb-3 text-[9px] uppercase tracking-[0.3em] text-neutral-600">Selected work</p>
        <Name profile={profile} />
        <ProfileCopy profile={profile} />
        <div className="mt-4"><Specialties specialties={profile.specialties} /></div>
      </div>
      <div className="flex items-center justify-center border border-neutral-800 bg-neutral-950/50 py-8">
        <Avatar profile={profile} sizeClass="size-28 sm:size-36" square />
      </div>
    </header>
  );
}

function NegativeStripHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="my-8 border-y-[10px] border-neutral-900 bg-neutral-950 sm:my-10">
      <div aria-hidden="true" className="h-3 bg-[repeating-linear-gradient(90deg,transparent_0_18px,#262626_18px_28px)]" />
      <div className="grid items-center gap-5 border-y border-neutral-800 px-4 py-7 sm:grid-cols-[74px_minmax(0,1fr)_auto] sm:px-7">
        <Avatar profile={profile} sizeClass="size-16" square />
        <div className="min-w-0">
          <Name profile={profile} compact />
          <ProfileCopy profile={profile} />
        </div>
        <div className="sm:max-w-64"><Specialties specialties={profile.specialties} /></div>
      </div>
      <div aria-hidden="true" className="h-3 bg-[repeating-linear-gradient(90deg,transparent_0_18px,#262626_18px_28px)]" />
    </header>
  );
}

function DecorationFrame({ children, decoration }: { children: ReactNode; decoration: ProfileDecoration }) {
  if (decoration === "none") return <div className="border-b border-neutral-800">{children}</div>;
  if (decoration === "film-frame") {
    return <div className="my-4 border-[3px] border-double border-neutral-700 px-4 sm:px-6"><span className="sr-only">Film frame</span>{children}</div>;
  }
  if (decoration === "contact-marks") {
    return (
      <div className="relative border-b border-neutral-800 px-3 sm:px-5">
        <span className="absolute left-0 top-3 font-mono text-[8px] text-neutral-700">01A</span>
        <span className="absolute bottom-3 right-0 font-mono text-[8px] text-neutral-700">36</span>
        <span className="sr-only">Contact marks</span>{children}
      </div>
    );
  }
  return (
    <div className="relative border-b border-neutral-800 px-4 before:absolute before:left-0 before:top-4 before:size-6 before:border-l before:border-t before:border-neutral-600 after:absolute after:bottom-4 after:right-0 after:size-6 after:border-b after:border-r after:border-neutral-600 sm:px-6">
      <span className="sr-only">Viewfinder</span>{children}
    </div>
  );
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
  const content = visibleProfile.template === "print-index"
    ? <PrintIndexHeader profile={visibleProfile} />
    : visibleProfile.template === "split-frame"
      ? <SplitFrameHeader profile={visibleProfile} />
      : visibleProfile.template === "negative-strip"
        ? <NegativeStripHeader profile={visibleProfile} />
        : <ContactSheetHeader profile={visibleProfile} />;

  return (
    <section aria-label={`${DECORATION_LABELS[profile.decoration]} profile header`}>
      <DecorationFrame decoration={profile.decoration}>{content}</DecorationFrame>
    </section>
  );
}
