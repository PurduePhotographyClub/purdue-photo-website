import { Globe2, Instagram, Mail } from "lucide-react";
import type { ProfileSocialIconName } from "@/lib/profile-model";

interface Props {
  className?: string;
  platform: ProfileSocialIconName;
  size?: number;
}

export default function ProfileSocialIcon({ className = "", platform, size = 18 }: Props) {
  if (platform === "instagram") return <Instagram aria-hidden="true" className={className} size={size} />;
  if (platform === "globe") return <Globe2 aria-hidden="true" className={className} size={size} />;
  if (platform === "mail") return <Mail aria-hidden="true" className={className} size={size} />;

  if (platform === "discord") {
    return (
      <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.1 9a3 3 0 0 1 5.8 0" />
        <path d="M20.3 6.7a19.6 19.6 0 0 0-4.9-1.5l-.6 1.3a18 18 0 0 0-5.6 0l-.6-1.3a19.6 19.6 0 0 0-4.9 1.5A20.1 20.1 0 0 0 .3 18.1a19.7 19.7 0 0 0 6 3l1.3-2.1a12.7 12.7 0 0 1-2-1l.5-.3a14.1 14.1 0 0 0 12 0l.4.3c-.6.4-1.3.7-2 1l1.3 2.1a19.7 19.7 0 0 0 6-3 20.1 20.1 0 0 0-3.5-11.4Z" />
        <path d="M8.5 15.7a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Zm7 0a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5.5" strokeDasharray="1.5 1.5" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
