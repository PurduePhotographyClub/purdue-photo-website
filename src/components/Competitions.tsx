import { useState } from "react";
import useSWR from "swr";
import { Trophy, Medal, Award, Instagram, ExternalLink, Film, Monitor } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import { fetchPublicJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

const DISCORD_COMPETITION_URL = "https://discord.com/channels/1182061172309106708/1338662150054608897";

interface Winner {
  place: 1 | 2 | 3;
  title: string;
  photographer: string;
  instagram: string | null;
  img: string;
  medium: "Film" | "Digital";
}

interface ResultCompetition {
  id: string;
  month: string;
  year: number;
  title: string;
  theme: string;
  description: string;
  winners: Winner[];
}

interface OpenCompetition {
  id: string;
  title: string;
  theme: string;
  description: string;
  submissionDeadline: string | null;
  month: string;
  year: number;
}

interface CompetitionPageData {
  competitions: ResultCompetition[];
  openCompetitions: OpenCompetition[];
}

function parseCompDate(dateStr: string | null | undefined) {
  try {
    if (!dateStr) throw new Error();
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) throw new Error();
    return { month: d.toLocaleDateString("en-US", { month: "long" }), year: d.getFullYear() };
  } catch {
    return { month: "Current", year: new Date().getFullYear() };
  }
}

const placeIcons = { 1: Trophy, 2: Medal, 3: Award } as const;
const placeLabels = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" } as const;
const placeColors = { 1: "text-amber-400", 2: "text-neutral-300", 3: "text-amber-700" } as const;

async function fetchCompetitionPageData(): Promise<CompetitionPageData> {
  const rows = await fetchPublicJson<any[]>("/api/competitions");
  const openRows = rows.filter((c) => c.status === "open");
  const openCompetitions = openRows.map((comp) => {
    const { month, year } = parseCompDate(comp.submissionDeadline || comp.submission_deadline || comp.createdAt || comp.created_at);
    return {
      id: comp.id,
      title: comp.title,
      theme: comp.theme || comp.title,
      description: comp.description || "",
      submissionDeadline: comp.submissionDeadline || comp.submission_deadline || null,
      month,
      year,
    };
  });

  const closedComps = rows.filter((c) => c.status === "closed");
  const loaded = await Promise.all(closedComps.map(async (comp) => {
    const { month, year } = parseCompDate(comp.submissionDeadline || comp.submission_deadline || comp.createdAt || comp.created_at);

    try {
      const results = await fetchPublicJson<any[]>(`/api/competitions/${comp.id}/results`);

      const winners: Winner[] = results
        .filter((r) => r.place && r.place <= 3)
        .sort((a, b) => a.place - b.place)
        .map((r) => {
          const r2Key = r.r2Key || r.r2_key || "";
          const instagram = r.photographerInstagram || r.photographer_instagram || null;
          return {
            place: r.place as 1 | 2 | 3,
            title: r.entryTitle || r.entry_title || "Untitled",
            photographer: r.photographerName || r.photographer_name || "PPC Member",
            instagram,
            img: r2Key ? `/api/competitions/image/${r2Key}` : "",
            medium: (r.medium === "film" ? "Film" : "Digital") as "Film" | "Digital",
          };
        });

      if (winners.length > 0) {
        return {
          id: comp.id,
          month,
          year,
          title: comp.title,
          theme: comp.theme || comp.title,
          description: comp.description || "",
          winners,
        };
      }
    } catch {
      // Skip this competition on error.
    }

    return null;
  }));

  return {
    competitions: loaded.filter((comp): comp is ResultCompetition => Boolean(comp)),
    openCompetitions,
  };
}

export default function Competitions() {
  const { data, error } = useSWR<CompetitionPageData>("competitions-page-data", fetchCompetitionPageData, PUBLIC_API_SWR_OPTIONS);
  const competitions = data?.competitions ?? [];
  const openCompetitions = data?.openCompetitions ?? [];
  const status: "loading" | "loaded" | "error" = data === undefined && !error ? "loading" : error ? "error" : "loaded";
  const [activePeriod, setActivePeriod] = useState(0);
  const [lightbox, setLightbox] = useState<Winner | null>(null);

  const heading = "text-neutral-100";
  const mutedText = "text-neutral-500";
  const faintText = "text-neutral-600";
  const subText = "text-neutral-400";
  const border = "border-neutral-800";
  const btnActive = "border-white text-white bg-white/5";
  const btnInactive = "border-neutral-800 text-neutral-500 hover:border-neutral-600";
  const ctaBorder = "border-neutral-600";
  const ctaHover = "hover:bg-white hover:text-black";
  const periodGroups = competitions.reduce<Array<{ key: string; month: string; year: number; competitions: ResultCompetition[] }>>((groups, comp) => {
    const key = `${comp.month}-${comp.year}`;
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.competitions.push(comp);
    } else {
      groups.push({ key, month: comp.month, year: comp.year, competitions: [comp] });
    }
    return groups;
  }, []);
  const activeGroup = periodGroups[activePeriod] || periodGroups[0];

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-4`}>Showcase Your Work</p>
          <h1 className={`text-4xl md:text-5xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>Competitions</h1>
          <p className={`text-sm ${subText} tracking-wider mt-6 max-w-xl mx-auto`}>
            Themes and submissions live in Discord. Once winners are decided, admins publish the final results here.
          </p>
        </div>

        {status === "loading" ? (
          <>
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 w-28 bg-neutral-800/50 animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-3 aspect-[21/9] bg-neutral-800/50 animate-pulse" />
              <div className="aspect-[3/4] bg-neutral-800/50 animate-pulse" />
              <div className="aspect-[3/4] bg-neutral-800/50 animate-pulse" />
            </div>
          </>
        ) : status === "error" ? (
          <div className="text-center py-24">
            <p className={`text-sm ${mutedText} tracking-wider`}>Unable to load competitions right now. Please try again later.</p>
          </div>
        ) : (
          <>
            {openCompetitions.length > 0 && (
              <div className={`mb-20 border ${border} bg-white/[0.02] p-6 md:p-8`}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                  <div>
                    <p className={`text-[10px] tracking-[0.3em] uppercase ${faintText} mb-3`}>Open Now</p>
                    <h2 className={`text-2xl md:text-3xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                      {openCompetitions[0].title}
                    </h2>
                    <p className={`text-sm ${subText} tracking-wider mt-2`}>Theme: "{openCompetitions[0].theme}"</p>
                    {openCompetitions[0].description && (
                      <p className={`text-sm ${mutedText} tracking-wider max-w-2xl mt-4`}>{openCompetitions[0].description}</p>
                    )}
                    {openCompetitions[0].submissionDeadline && (
                      <p className={`text-xs ${faintText} tracking-[0.2em] uppercase mt-4`}>
                        Due {new Date(openCompetitions[0].submissionDeadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <a href={DISCORD_COMPETITION_URL} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 border ${ctaBorder} text-xs tracking-[0.25em] uppercase ${ctaHover} transition-all duration-300 shrink-0`}>
                    Upload In Discord <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {competitions.length === 0 ? (
              <p className={`text-center text-sm ${mutedText} tracking-wider`}>
                {openCompetitions.length > 0 ? "Past results will appear here after winners are posted." : "No competitions to display"}
              </p>
            ) : activeGroup ? (
              <>
                <div className="flex flex-wrap justify-center gap-2 mb-16">
                  {periodGroups.map((group, i) => (
                    <button type="button" key={group.key} onClick={() => setActivePeriod(i)}
                      className={`text-xs tracking-[0.2em] uppercase px-5 py-2.5 border transition-all duration-300 ${activePeriod === i ? btnActive : btnInactive}`}>
                      {group.month} {group.year}
                    </button>
                  ))}
                </div>

                <div key={activeGroup.key} className="space-y-24">
                  {activeGroup.competitions.map((active) => (
                    <div key={active.id}>
                      <div className="text-center mb-14">
                        <p className={`text-xs tracking-[0.3em] uppercase ${faintText} mb-2`}>{active.month} {active.year}</p>
                        <h2 className={`text-2xl md:text-3xl tracking-wider mb-3 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                          {active.title}
                        </h2>
                        <h3 className={`text-xl md:text-2xl tracking-wider mb-4 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                          "{active.theme}"
                        </h3>
                        <p className={`text-sm ${mutedText} tracking-wider max-w-md mx-auto`}>{active.description}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {active.winners.map((winner) => {
                          const PlaceIcon = placeIcons[winner.place];
                          return (
                            <div key={`${active.id}-${winner.place}-${winner.title}`}
                              className={`group relative overflow-hidden border border-neutral-800 bg-neutral-950 ${winner.place === 1 ? "md:col-span-3" : ""}`}>
                              <button type="button"
                                aria-label={`Open ${winner.title} by ${winner.photographer}`}
                                className="block w-full cursor-pointer appearance-none bg-transparent p-0 text-left"
                                onClick={() => setLightbox(winner)}>
                                <div className={`relative overflow-hidden ${winner.place === 1 ? "aspect-[16/10] md:aspect-[16/9]" : "aspect-[4/3]"}`}>
                                <ImageWithFallback src={winner.img} alt={winner.title}
                                  className={`w-full h-full object-contain ${winner.medium === "Film" ? "grayscale" : ""}`} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <div className="absolute top-4 left-4">
                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-sm border border-neutral-700 ${placeColors[winner.place]}`}>
                                    <PlaceIcon size={13} />
                                    <span className="text-[10px] tracking-[0.2em] uppercase">{placeLabels[winner.place]}</span>
                                  </div>
                                </div>
                                <div className="absolute top-4 right-4">
                                  <span className={`flex items-center gap-1 text-[9px] tracking-[0.2em] uppercase px-2 py-1 ${winner.medium === "Film" ? "bg-neutral-900/80 text-neutral-400 border border-neutral-700" : "bg-white/10 backdrop-blur-sm text-neutral-300"}`}>
                                    {winner.medium === "Film" ? <Film size={9} /> : <Monitor size={9} />}{winner.medium}
                                  </span>
                                </div>
                                <div className={`absolute bottom-0 left-0 right-0 p-6 ${winner.instagram ? "pr-32" : ""}`}>
                                  <h3 className={`tracking-wider mb-2 text-white ${winner.place === 1 ? "text-2xl" : "text-sm"}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                                    "{winner.title}"
                                  </h3>
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <p className="text-xs text-neutral-300 tracking-wider">{winner.photographer}</p>
                                  </div>
                                </div>
                              </div>
                              </button>
                              {winner.instagram && (
                                <a href={`https://instagram.com/${winner.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                                  className="absolute bottom-6 right-6 z-10 flex max-w-28 items-center gap-1.5 truncate text-[10px] tracking-wider text-neutral-400 transition-colors hover:text-white">
                                  <Instagram size={11} className="shrink-0" /><span className="truncate">{winner.instagram}</span>
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}

        <div className={`mt-32 border-t ${border} pt-16`}>
          <h3 className={`text-center text-xl tracking-wider mb-12 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Theme Opens", desc: "Open competitions are announced here and in Discord." },
              { step: "02", title: "Upload In Discord", desc: "All entries are posted in the competition channel." },
              { step: "03", title: "Results Posted", desc: "After winners are decided, admins add the final images and placements here." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <p className={`text-2xl tracking-wider ${faintText} mb-3`} style={{ fontFamily: "'Playfair Display', serif" }}>{item.step}</p>
                <h4 className={`text-xs tracking-[0.2em] uppercase mb-2 ${heading}`}>{item.title}</h4>
                <p className={`text-xs ${mutedText} tracking-wider leading-relaxed`}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href={DISCORD_COMPETITION_URL} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-8 py-3 border ${ctaBorder} text-xs tracking-[0.3em] uppercase ${ctaHover} transition-all duration-300`}>
              Go to Competition Channel <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/95 p-6">
          <button type="button" aria-label="Close lightbox" className="absolute inset-0 cursor-default" onMouseDown={() => setLightbox(null)} />
          <button type="button" className="absolute top-6 right-6 z-10 text-neutral-400 hover:text-white text-xs tracking-[0.2em] uppercase" onClick={() => setLightbox(null)}>Close</button>
          <div className="relative z-10 max-w-4xl w-full flex flex-col items-center">
            <img
              src={lightbox.img} alt={lightbox.title} className="max-w-full max-h-[70vh] object-contain mb-6" />
            <div className="text-center">
              <h3 className="text-xl tracking-wider mb-2 text-white" style={{ fontFamily: "'Playfair Display', serif" }}>"{lightbox.title}"</h3>
              <p className="text-sm text-neutral-300 tracking-wider mb-1">{lightbox.photographer}</p>
              {lightbox.instagram && (
                <a href={`https://instagram.com/${lightbox.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs tracking-wider text-neutral-400 hover:text-white transition-colors">
                  <Instagram size={12} />{lightbox.instagram}
                </a>
              )}
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className={`flex items-center gap-1 text-xs tracking-[0.2em] uppercase ${placeColors[lightbox.place]}`}>
                  {(() => { const Icon = placeIcons[lightbox.place]; return <Icon size={12} />; })()}{placeLabels[lightbox.place]}
                </span>
                <span className="text-neutral-700">|</span>
                <span className="flex items-center gap-1 text-xs tracking-wider text-neutral-500">
                  {lightbox.medium === "Film" ? <Film size={10} /> : <Monitor size={10} />}{lightbox.medium}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
