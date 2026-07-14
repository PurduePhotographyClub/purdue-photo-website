import { Camera } from "lucide-react";
import {
  getProfileSocialHref,
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

function Avatar({ profile, sizeClass }: { profile: PublicProfileIdentity; sizeClass: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-700 bg-neutral-900 text-neutral-600 ${sizeClass}`}>
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt={`${profile.displayName || "Member"} profile picture`} className="size-full object-cover" />
      ) : (
        <Camera aria-hidden="true" size={24} />
      )}
    </div>
  );
}

function Name({ profile, centered = false }: { profile: PublicProfileIdentity; centered?: boolean }) {
  const style = profile.nameStyle || "classic";
  return (
    <h1
      className={`break-words text-3xl text-neutral-100 sm:text-4xl ${centered ? "text-center" : ""} ${NAME_CLASSES[style]}`}
      style={style === "film-credit" ? undefined : { fontFamily: "'Playfair Display', serif" }}
    >
      {profile.displayName || "PPC member"}
    </h1>
  );
}

function SocialLinks({ socials }: { socials: ProfileSocial[] }) {
  const links = socials.flatMap((social) => {
    const href = getProfileSocialHref(social);
    return href ? [{ ...social, href }] : [];
  });
  if (links.length === 0) return null;

  return (
    <nav aria-label="Profile social links" className="flex flex-wrap items-center gap-1">
      {links.map((social) => {
        const external = social.platform !== "email";
        return (
          <a
            key={social.platform}
            href={social.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            aria-label={social.platform === "vsco" ? "VSCO" : social.platform}
            title={social.platform === "vsco" ? "VSCO" : social.platform}
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
        <span key={specialty} className="border border-neutral-800 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.16em] text-neutral-500">
          {specialty}
        </span>
      ))}
    </div>
  );
}

function AnonymousHeader() {
  return (
    <header className="mx-auto max-w-3xl border-b border-neutral-800 py-12 text-center sm:py-16">
      <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-600">Member portfolio</p>
      <h1 className="mt-4 text-3xl tracking-[0.04em] text-neutral-100 sm:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
        Anonymous photographer
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-xs leading-5 text-neutral-500">This member has chosen to share photographs without identifying details.</p>
    </header>
  );
}

function ContactSheetHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="grid gap-7 border-b border-neutral-800 py-10 sm:py-14 lg:grid-cols-[160px_minmax(0,1fr)_minmax(220px,0.7fr)] lg:items-start lg:gap-10">
      <Avatar profile={profile} sizeClass="size-28 sm:size-36" />
      <div className="min-w-0">
        <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-neutral-600">Member portfolio</p>
        <Name profile={profile} />
        {profile.bio && <p className="mt-4 max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-neutral-400">{profile.bio}</p>}
        <div className="mt-4"><SocialLinks socials={profile.socials} /></div>
      </div>
      <div className="min-w-0 border-t border-neutral-800 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
        <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-neutral-600">Photography roles</p>
        <Specialties specialties={profile.specialties} />
      </div>
    </header>
  );
}

function PrintIndexHeader({ profile }: { profile: PublicProfileIdentity }) {
  return (
    <header className="mx-auto flex max-w-2xl flex-col items-center border-b border-neutral-800 py-12 text-center sm:py-16">
      <Avatar profile={profile} sizeClass="size-24 sm:size-28" />
      <div className="mt-5 min-w-0 max-w-full"><Name profile={profile} centered /></div>
      {profile.bio && <p className="mt-4 max-w-xl whitespace-pre-wrap break-words text-sm leading-6 text-neutral-400">{profile.bio}</p>}
      <div className="mt-4"><SocialLinks socials={profile.socials} /></div>
      <div className="mt-5"><Specialties specialties={profile.specialties} centered /></div>
    </header>
  );
}

export default function ProfileTemplateRenderer({ profile }: { profile: PublicProfileIdentity }) {
  if (profile.anonymous) return <AnonymousHeader />;
  return profile.template === "print-index"
    ? <PrintIndexHeader profile={profile} />
    : <ContactSheetHeader profile={profile} />;
}
