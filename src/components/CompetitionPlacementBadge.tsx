import { Award, Trophy } from "lucide-react";

export type CompetitionPlace = 1 | 2 | 3;

const PLACE_ICONS = { 1: Trophy, 2: Award, 3: Award } as const;
const PLACE_LABELS = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" } as const;
const PLACE_COLORS = { 1: "text-amber-400", 2: "text-neutral-300", 3: "text-orange-300" } as const;

interface CompetitionPlacementBadgeProps {
  className?: string;
  place: CompetitionPlace;
}

export function CompetitionPlacementBadge({ className = "", place }: CompetitionPlacementBadgeProps) {
  const Icon = PLACE_ICONS[place];
  return (
    <span className={`inline-flex items-center gap-1.5 ${PLACE_COLORS[place]} ${className}`.trim()}>
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
      <span>{PLACE_LABELS[place]}</span>
    </span>
  );
}
