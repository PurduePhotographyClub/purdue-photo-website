import { Instagram } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";

interface Leader {
  name: string;
  role: string;
  term: string;
  focus: string;
}

const portrait = "/leadership/kevin.webp";

const currentLeaders: Leader[] = [
  { name: "Ethan Sahin", role: "President", term: "2026-2027", focus: "50% 18%" },
  { name: "Dylan Chu", role: "Vice President", term: "2026-2027", focus: "44% 22%" },
  { name: "Jacob Croteau-DeFreece", role: "Treasurer", term: "2026-2027", focus: "56% 20%" },
  { name: "Elyse Royer", role: "Secretary", term: "2026-2027", focus: "48% 24%" },
  { name: "Tyler Szydlo", role: "Darkroom Manager", term: "2026-2027", focus: "42% 18%" },
  { name: "Nathan Thomas", role: "Studio Manager", term: "2026-2027", focus: "58% 22%" },
  { name: "Alejandro Griffith", role: "Social Media Manager", term: "2026-2027", focus: "52% 16%" },
  { name: "Sasha Morrison", role: "Outreach/Event Coordinator", term: "2026-2027", focus: "46% 20%" },
];

const pastLeaders: Leader[] = [
  { name: "Sebastian Murariu", role: "President", term: "2025-2026", focus: "50% 20%" },
  { name: "Julian Vuong", role: "Vice President", term: "2025-2026", focus: "45% 21%" },
  { name: "Ethan Sahin", role: "Darkroom/Studio Manager", term: "2025-2026", focus: "55% 18%" },
  { name: "Kevin Kane", role: "Treasurer", term: "2025-2026", focus: "49% 17%" },
  { name: "Justin Lin", role: "Secretary", term: "2025-2026", focus: "43% 20%" },
  { name: "Kimberly Hung", role: "Outreach/Event Coordinator", term: "2025-2026", focus: "57% 23%" },
  { name: "Linzzi Ji", role: "Social Media Manager", term: "2025-2026", focus: "51% 19%" },
];

function LeaderCard({ leader, index }: { leader: Leader; index: number }) {
  const isVacant = leader.name === "Vacant";

  return (
    <article className="group relative aspect-[4/5] overflow-hidden border border-neutral-800 bg-neutral-950 transition-colors duration-300 hover:border-neutral-500">
      <ImageWithFallback
        src={portrait}
        alt={`${leader.name}, ${leader.role}`}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${isVacant ? "opacity-35" : "opacity-90 group-hover:opacity-100"}`}
        style={{ objectPosition: leader.focus }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/5" />
      <div className="absolute left-4 top-4 border border-neutral-700/80 bg-black/50 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-300 backdrop-blur-sm">
        {leader.term}
      </div>
      <div className="absolute right-4 top-4 flex size-9 items-center justify-center border border-neutral-700/80 bg-black/45 text-neutral-200 backdrop-blur-sm transition-colors group-hover:border-neutral-300 group-hover:text-white">
        <Instagram size={15} strokeWidth={1.5} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="mb-2 break-words text-[10px] uppercase tracking-[0.18em] text-neutral-300 sm:tracking-[0.26em]">
          {leader.role}
        </p>
        <h3 className="text-2xl leading-tight tracking-wider text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
          {leader.name}
        </h3>
        <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">PPC</span>
          <span className="text-[10px] text-neutral-500">0{index + 1}</span>
        </div>
      </div>
    </article>
  );
}

function LeadershipGrid({ leaders }: { leaders: Leader[] }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-4">
      {leaders.map((leader, index) => (
        <LeaderCard key={`${leader.term}-${leader.role}-${leader.name}`} leader={leader} index={index} />
      ))}
    </div>
  );
}

export default function Leadership() {
  const heading = "text-neutral-100";
  const mutedText = "text-neutral-500";
  const border = "border-neutral-800";

  return (
    <div className="min-h-screen overflow-hidden px-6 pb-24 pt-14 md:py-24">
      <div className="mx-auto max-w-7xl">
        <header className={`relative mb-16 `}>

          <p className={`mb-5 text-xs uppercase tracking-[0.4em] ${mutedText}`}>Purdue Photography Club</p>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className={`text-5xl leading-none tracking-wider md:text-7xl ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                Leadership
              </h1>
              <p className="mt-6 max-w-2xl text-sm uppercase tracking-[0.24em] text-neutral-400">
                Current Leadership 2026-2027
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-neutral-500">
              <span className="h-px w-14 bg-neutral-700" />
              <span>Board Archive</span>
            </div>
          </div>
        </header>

        <section>
          <LeadershipGrid leaders={currentLeaders} />
        </section>

        <section className={`mt-24 border-t ${border} pt-14`}>
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={`mb-3 text-xs uppercase tracking-[0.4em] ${mutedText}`}>Past</p>
              <h2 className={`text-3xl leading-tight tracking-wider md:text-5xl ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                2025-2026
              </h2>
            </div>
            <p className="max-w-md text-xs uppercase tracking-[0.2em] text-neutral-600">
              Previous board
            </p>
          </div>
          <LeadershipGrid leaders={pastLeaders} />
        </section>
      </div>
    </div>
  );
}
