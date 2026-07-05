interface Leader {
  name: string;
  role: string;
  term: string;
}

const currentLeaders: Leader[] = [
  { name: "Ethan Sahin", role: "President", term: "2026-2027" },
  { name: "Dylan Chu", role: "Vice President", term: "2026-2027" },
  { name: "Jacob Croteau-DeFreece", role: "Treasurer", term: "2026-2027" },
  { name: "Elyse Royer", role: "Secretary", term: "2026-2027" },
  { name: "Tyler Szydlo", role: "Darkroom Manager", term: "2026-2027" },
  { name: "Nathan Thomas", role: "Studio Manager", term: "2026-2027" },
  { name: "Alejandro Griffith", role: "Social Media Manager", term: "2026-2027" },
  { name: "Sasha Morrison", role: "Outreach/Event Coordinator", term: "2026-2027" },
];

const pastLeaders: Leader[] = [
  { name: "Sebastian Murariu", role: "President", term: "2025-2026" },
  { name: "Julian Vuong", role: "Vice President", term: "2025-2026" },
  { name: "Ethan Sahin", role: "Darkroom/Studio Manager", term: "2025-2026" },
  { name: "Kevin Kane", role: "Treasurer", term: "2025-2026" },
  { name: "Justin Lin", role: "Secretary", term: "2025-2026" },
  { name: "Kimberly Hung", role: "Outreach/Event Coordinator", term: "2025-2026" },
  { name: "Linzzi Ji", role: "Social Media Manager", term: "2025-2026" },
];

function LeaderCard({ leader, index }: { leader: Leader; index: number }) {
  const isVacant = leader.name === "Vacant";
  const initials = leader.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <article className="group relative aspect-[4/5] overflow-hidden border border-neutral-800 bg-neutral-950 transition-colors duration-300 hover:border-neutral-500">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(to right, #404040 1px, transparent 1px), linear-gradient(to bottom, #404040 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute inset-x-5 top-20 bottom-28 border border-neutral-800 bg-black/30" />
      <div className="absolute inset-x-8 top-24 bottom-32 flex items-center justify-center border border-neutral-800/80 bg-white/[0.02]">
        <span className={`text-5xl tracking-[0.08em] ${isVacant ? "text-neutral-700" : "text-neutral-300"}`} style={{ fontFamily: "'Playfair Display', serif" }}>
          {isVacant ? "TBD" : initials}
        </span>
      </div>
      <div className="absolute left-4 top-4 border border-neutral-700/80 bg-black/50 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-300">
        {leader.term}
      </div>
      <div className="absolute right-4 top-4 border border-neutral-700/80 bg-black/45 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-400">
        Board
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
                Current board, 2026-2027.
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
              Previous board, 2025-2026.
            </p>
          </div>
          <LeadershipGrid leaders={pastLeaders} />
        </section>
      </div>
    </div>
  );
}
