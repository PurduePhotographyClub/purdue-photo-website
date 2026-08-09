import type { SVGProps } from "react";

interface InstagramIconProps extends Omit<SVGProps<SVGSVGElement>, "height" | "width"> {
  size?: number | string;
}

export default function InstagramIcon({ size = 24, ...props }: InstagramIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <rect height="18" rx="5" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" fill="currentColor" r="1" stroke="none" />
    </svg>
  );
}
