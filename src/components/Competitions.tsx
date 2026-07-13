import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Award, ExternalLink, Film, Instagram, Medal, Monitor, Trophy, X } from "lucide-react";
import ModalDialog from "./ModalDialog";
import { ImageWithFallback } from "./ImageWithFallback";
import {
  normalizeCompetitionPageForUrl,
  type CompetitionPage,
} from "@/lib/competition-data";
import { fetchPublicJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

const DISCORD_COMPETITION_URL = "https://discord.com/channels/1182061172309106708/1338662150054608897";
const COMPETITIONS_PAGE_SIZE = 12;
const COMPETITIONS_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  keepPreviousData: false,
};

interface CompetitionResultRow {
  entryDescription?: string | null;
  entryId: string;
  entryTitle?: string | null;
  imageUrl: string;
  medium?: "film" | "digital" | null;
  photographerInstagram?: string | null;
  photographerName?: string | null;
  place: number | null;
  thumbnailUrl: string | null;
}

interface CompetitionRow {
  createdAt: string;
  description: string | null;
  id: string;
  results?: CompetitionResultRow[];
  status: "draft" | "open" | "judging" | "closed";
  submissionDeadline: string | null;
  theme: string | null;
  title: string;
}

interface Winner {
  imageUrl: string;
  instagram: string | null;
  medium: "Film" | "Digital";
  photographer: string;
  place: 1 | 2 | 3;
  thumbnailUrl: string;
  title: string;
}

interface ResultCompetition {
  description: string;
  id: string;
  month: string;
  theme: string;
  title: string;
  winners: Winner[];
  year: number;
}

interface OpenCompetition {
  description: string;
  id: string;
  month: string;
  submissionDeadline: string | null;
  theme: string;
  title: string;
  year: number;
}

function parseCompetitionDate(value: string | null | undefined) {
  if (!value) return { month: "Current", year: new Date().getFullYear() };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { month: "Current", year: new Date().getFullYear() };
  }
  return {
    month: date.toLocaleDateString("en-US", { month: "long" }),
    year: date.getFullYear(),
  };
}

function formatDeadline(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function mapCompetitionRows(rows: CompetitionRow[]) {
  const openCompetitions: OpenCompetition[] = [];
  const competitions: ResultCompetition[] = [];

  for (const competition of rows) {
    const { month, year } = parseCompetitionDate(competition.submissionDeadline || competition.createdAt);
    if (competition.status === "open") {
      openCompetitions.push({
        description: competition.description ?? "",
        id: competition.id,
        month,
        submissionDeadline: competition.submissionDeadline,
        theme: competition.theme || competition.title,
        title: competition.title,
        year,
      });
      continue;
    }

    if (competition.status !== "closed") continue;
    const winners = (competition.results ?? [])
      .filter((result): result is CompetitionResultRow & { place: 1 | 2 | 3 } =>
        result.place === 1 || result.place === 2 || result.place === 3)
      .sort((first, second) => first.place - second.place)
      .map((result): Winner => ({
        imageUrl: result.imageUrl,
        instagram: result.photographerInstagram ?? null,
        medium: result.medium === "film" ? "Film" : "Digital",
        photographer: result.photographerName || "PPC Member",
        place: result.place,
        thumbnailUrl: result.thumbnailUrl ?? result.imageUrl,
        title: result.entryTitle || "Untitled",
      }));

    if (winners.length > 0) {
      competitions.push({
        description: competition.description ?? "",
        id: competition.id,
        month,
        theme: competition.theme || competition.title,
        title: competition.title,
        winners,
        year,
      });
    }
  }

  return { competitions, openCompetitions };
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

async function fetchCompetitionPage(url: string) {
  const value = await fetchPublicJson<unknown>(url);
  return normalizeCompetitionPageForUrl<CompetitionRow>(value, url, COMPETITIONS_PAGE_SIZE);
}

const placeIcons = { 1: Trophy, 2: Medal, 3: Award } as const;
const placeLabels = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" } as const;
const placeColors = { 1: "text-amber-400", 2: "text-neutral-300", 3: "text-amber-700" } as const;

export default function Competitions() {
  const [page, setPage] = useState(1);
  const [activePeriod, setActivePeriod] = useState(0);
  const [lightbox, setLightbox] = useState<Winner | null>(null);
  const archiveRef = useRef<HTMLDivElement | null>(null);
  const previousArchivePageRef = useRef(1);
  const competitionUrl = `/api/competitions?page=${page}&per_page=${COMPETITIONS_PAGE_SIZE}&format=page&include=results`;
  const {
    data: competitionPage,
    error,
    mutate,
  } = useSWR<CompetitionPage<CompetitionRow>>(
    competitionUrl,
    fetchCompetitionPage,
    COMPETITIONS_SWR_OPTIONS,
  );
  const mappedCompetitions = useMemo(
    () => mapCompetitionRows(competitionPage?.competitions ?? []),
    [competitionPage?.competitions],
  );
  const { competitions, openCompetitions } = mappedCompetitions;
  const status: "loading" | "loaded" | "error" = !competitionPage && !error ? "loading" : error ? "error" : "loaded";
  const meta = competitionPage?.meta;
  const pageNumbers = meta ? getVisiblePageNumbers(meta.page, meta.totalPages) : [];
  const periodGroups = useMemo(
    () => competitions.reduce<Array<{ competitions: ResultCompetition[]; key: string; month: string; year: number }>>((groups, competition) => {
      const key = `${competition.month}-${competition.year}`;
      const matchingGroup = groups.find((group) => group.key === key);
      if (!matchingGroup) {
        return [...groups, { competitions: [competition], key, month: competition.month, year: competition.year }];
      }
      return groups.map((group) => group.key === key
        ? { ...group, competitions: [...group.competitions, competition] }
        : group);
    }, []),
    [competitions],
  );
  const activeGroup = periodGroups[activePeriod] || periodGroups[0];

  useEffect(() => {
    if (!competitionPage || previousArchivePageRef.current === competitionPage.meta.page) return;
    previousArchivePageRef.current = competitionPage.meta.page;
    archiveRef.current?.focus({ preventScroll: true });
    archiveRef.current?.scrollIntoView({ block: "start" });
  }, [competitionPage]);

  const handlePageChange = (nextPage: number) => {
    if (!meta || nextPage < 1 || nextPage > meta.totalPages || nextPage === meta.page) return;
    setActivePeriod(0);
    setLightbox(null);
    setPage(nextPage);
  };

  const heading = "text-neutral-100";
  const mutedText = "text-neutral-500";
  const faintText = "text-neutral-600";
  const subText = "text-neutral-400";
  const border = "border-neutral-800";
  const btnActive = "border-white text-white bg-white/5";
  const btnInactive = "border-neutral-800 text-neutral-500 hover:border-neutral-600";

  return (
    <div className="min-h-screen px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-16 text-center">
          <p className={`mb-4 text-xs uppercase tracking-[0.4em] ${mutedText}`}>Monthly Photo Challenges</p>
          <h1 className={`text-4xl tracking-wider md:text-5xl ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>Competitions</h1>
          <p className={`mx-auto mt-6 max-w-xl text-sm leading-relaxed tracking-wider ${subText}`}>
            Themes and submissions live in Discord. Once winners are decided, admins publish the final results here.
          </p>
        </header>

        {status === "loading" ? (
          <>
            <div className="mb-12 flex flex-wrap justify-center gap-2">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-11 w-28 animate-pulse bg-neutral-800/50" />)}
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="aspect-[16/10] animate-pulse bg-neutral-800/50 md:col-span-3" />
              <div className="aspect-[4/3] animate-pulse bg-neutral-800/50" />
              <div className="aspect-[4/3] animate-pulse bg-neutral-800/50" />
            </div>
          </>
        ) : status === "error" ? (
          <div className="py-24 text-center">
            <p className={`mb-5 text-sm tracking-wider ${mutedText}`}>Unable to load competitions right now. Please try again later.</p>
            <button type="button" onClick={() => void mutate()} className="min-h-11 border border-neutral-700 px-5 text-[10px] uppercase tracking-[0.2em] text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white">Try Again</button>
          </div>
        ) : (
          <>
            {openCompetitions.length > 0 && (
              <section className="mb-20 space-y-3" aria-label="Open competitions">
                {openCompetitions.map((competition) => (
                  <div key={competition.id} className={`border ${border} bg-white/[0.02] p-5 sm:p-6 md:p-8`}>
                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className={`mb-3 text-[10px] uppercase tracking-[0.3em] ${faintText}`}>Open Now</p>
                        <h2 className={`text-2xl tracking-wider md:text-3xl ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>{competition.title}</h2>
                        <p className={`mt-2 text-sm tracking-wider ${subText}`}>Theme: “{competition.theme}”</p>
                        {competition.description && <p className={`mt-4 max-w-2xl text-sm leading-relaxed tracking-wider ${mutedText}`}>{competition.description}</p>}
                        {competition.submissionDeadline && <p className={`mt-4 text-xs uppercase tracking-[0.2em] ${faintText}`}>Due {formatDeadline(competition.submissionDeadline)}</p>}
                      </div>
                      <a href={DISCORD_COMPETITION_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-neutral-600 px-6 py-3 text-xs uppercase tracking-[0.2em] text-neutral-200 transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400">
                        Upload in Discord <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <div ref={archiveRef} tabIndex={-1} className="scroll-mt-24 outline-none">
              {meta && <p role="status" aria-live="polite" className="mb-5 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600">Archive page {meta.page} of {meta.totalPages}</p>}

              {competitions.length === 0 ? (
                <p className={`text-center text-sm tracking-wider ${mutedText}`}>
                  {openCompetitions.length > 0 ? "Past results will appear here after winners are posted." : "No competition results are posted on this page."}
                </p>
              ) : activeGroup ? (
                <>
                  <div className="mb-12 flex gap-2 overflow-x-auto pb-2 sm:mb-16 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
                    {periodGroups.map((group, index) => (
                      <button
                        type="button"
                        key={group.key}
                        aria-pressed={activePeriod === index}
                        onClick={() => setActivePeriod(index)}
                        className={`min-h-11 shrink-0 border px-5 py-2.5 text-xs uppercase tracking-[0.16em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 ${activePeriod === index ? btnActive : btnInactive}`}
                      >
                        {group.month} {group.year}
                      </button>
                    ))}
                  </div>

                  <div key={activeGroup.key} className="space-y-20 sm:space-y-24">
                    {activeGroup.competitions.map((competition) => (
                      <section key={competition.id}>
                        <div className="mb-10 text-center sm:mb-14">
                          <p className={`mb-2 text-xs uppercase tracking-[0.3em] ${faintText}`}>{competition.month} {competition.year}</p>
                          <h2 className={`mb-3 text-2xl tracking-wider md:text-3xl ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>{competition.title}</h2>
                          <h3 className={`mb-4 text-xl tracking-wider md:text-2xl ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>“{competition.theme}”</h3>
                          {competition.description && <p className={`mx-auto max-w-lg text-sm leading-relaxed tracking-wider ${mutedText}`}>{competition.description}</p>}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          {competition.winners.map((winner) => {
                            const PlaceIcon = placeIcons[winner.place];
                            return (
                              <article key={`${competition.id}-${winner.place}-${winner.title}`} className={`group relative overflow-hidden border border-neutral-800 bg-neutral-950 ${winner.place === 1 ? "md:col-span-3" : ""}`}>
                                <button type="button" aria-label={`Open ${winner.title} by ${winner.photographer}`} onClick={() => setLightbox(winner)} className="block w-full appearance-none bg-transparent p-0 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400">
                                  <div className={`relative overflow-hidden ${winner.place === 1 ? "aspect-[16/10] md:aspect-[16/9]" : "aspect-[4/3]"}`}>
                                    <ImageWithFallback
                                      src={winner.thumbnailUrl}
                                      alt={winner.title}
                                      loading={winner.place === 1 ? "eager" : "lazy"}
                                      decoding="async"
                                      fetchPriority={winner.place === 1 ? "high" : "auto"}
                                      sizes="(min-width: 768px) 33vw, 100vw"
                                      className="size-full object-contain"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
                                      <div className={`flex items-center gap-1.5 border border-neutral-700 bg-black/70 px-3 py-1.5 backdrop-blur-sm ${placeColors[winner.place]}`}>
                                        <PlaceIcon size={13} />
                                        <span className="text-[10px] uppercase tracking-[0.16em]">{placeLabels[winner.place]}</span>
                                      </div>
                                    </div>
                                    <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
                                      <span className={`flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${winner.medium === "Film" ? "border border-neutral-700 bg-neutral-900/80 text-neutral-300" : "bg-white/10 text-neutral-200 backdrop-blur-sm"}`}>
                                        {winner.medium === "Film" ? <Film size={9} /> : <Monitor size={9} />}{winner.medium}
                                      </span>
                                    </div>
                                    <div className={`absolute inset-x-0 bottom-0 p-4 sm:p-6 ${winner.instagram ? "pr-28 sm:pr-32" : ""}`}>
                                      <h3 className={`mb-2 tracking-wider text-white ${winner.place === 1 ? "text-xl sm:text-2xl" : "text-sm"}`} style={{ fontFamily: "'Playfair Display', serif" }}>“{winner.title}”</h3>
                                      <p className="text-xs tracking-wider text-neutral-200">{winner.photographer}</p>
                                    </div>
                                  </div>
                                </button>
                                {winner.instagram && (
                                  <a href={`https://instagram.com/${winner.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 z-10 inline-flex min-h-11 max-w-24 items-center gap-1.5 truncate text-[10px] tracking-wider text-neutral-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 sm:bottom-5 sm:right-5 sm:max-w-28">
                                    <Instagram size={11} className="shrink-0" /><span className="truncate">{winner.instagram}</span>
                                  </a>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              ) : null}

              {meta && meta.totalPages > 1 && (
                <nav aria-label="Competition archive pagination" className="mt-14 flex flex-wrap items-center justify-center gap-2">
                  <button type="button" disabled={!meta.hasPreviousPage} onClick={() => handlePageChange(meta.page - 1)} className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
                  {pageNumbers.map((pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      aria-label={`Go to competition archive page ${pageNumber}`}
                      aria-current={pageNumber === meta.page ? "page" : undefined}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`min-h-11 min-w-11 border px-3 text-xs transition-colors ${pageNumber === meta.page ? btnActive : btnInactive}`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button type="button" disabled={!meta.hasNextPage} onClick={() => handlePageChange(meta.page + 1)} className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Next</button>
                </nav>
              )}
            </div>
          </>
        )}

        <section className={`mt-32 border-t ${border} pt-16`}>
          <h3 className={`mb-12 text-center text-xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>How It Works</h3>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Theme Opens", desc: "Open competitions are announced here and in Discord." },
              { step: "02", title: "Upload in Discord", desc: "All entries are posted in the competition channel." },
              { step: "03", title: "Results Posted", desc: "After winners are decided, admins add the final images and placements here." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <p className={`mb-3 text-2xl tracking-wider ${faintText}`} style={{ fontFamily: "'Playfair Display', serif" }}>{item.step}</p>
                <h4 className={`mb-2 text-xs uppercase tracking-[0.2em] ${heading}`}>{item.title}</h4>
                <p className={`text-xs leading-relaxed tracking-wider ${mutedText}`}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a href={DISCORD_COMPETITION_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-neutral-600 px-8 py-3 text-xs uppercase tracking-[0.25em] text-neutral-200 transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400">
              Open Competition Channel <ExternalLink size={12} />
            </a>
          </div>
        </section>
      </div>

      {lightbox && (
        <ModalDialog ariaLabel="Competition photo preview" onClose={() => setLightbox(null)} className="flex items-center justify-center bg-black/95 p-4 pt-16 sm:p-6 sm:pt-16">
          <button type="button" tabIndex={-1} aria-label="Close competition preview" className="absolute inset-0 cursor-default" onMouseDown={() => setLightbox(null)} />
          <button type="button" aria-label="Close competition preview" onClick={() => setLightbox(null)} className="absolute right-4 top-4 z-20 inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 sm:right-6 sm:top-6">
            <X size={22} />
          </button>
          <div className="relative z-10 flex max-h-full w-full max-w-5xl flex-col items-center gap-4">
            <img src={lightbox.imageUrl} alt={lightbox.title} loading="eager" decoding="async" className="min-h-0 max-h-[72vh] max-w-full shrink object-contain" />
            <div className="shrink-0 text-center">
              <h3 className="text-xl tracking-wider text-white" style={{ fontFamily: "'Playfair Display', serif" }}>“{lightbox.title}”</h3>
              <p className="mt-2 text-sm tracking-wider text-neutral-200">{lightbox.photographer}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <span className={`flex items-center gap-1 text-xs uppercase tracking-[0.16em] ${placeColors[lightbox.place]}`}>
                  {(() => { const Icon = placeIcons[lightbox.place]; return <Icon size={12} />; })()}{placeLabels[lightbox.place]}
                </span>
                <span className="text-neutral-700">|</span>
                <span className="flex items-center gap-1 text-xs text-neutral-400">{lightbox.medium === "Film" ? <Film size={10} /> : <Monitor size={10} />}{lightbox.medium}</span>
              </div>
              {lightbox.instagram && (
                <a href={`https://instagram.com/${lightbox.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs tracking-wider text-neutral-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400">
                  <Instagram size={12} />{lightbox.instagram}
                </a>
              )}
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
