import { useMemo } from "react";
import useSWR from "swr";
import { Users, ArrowRight, Film, Trophy, Image, Instagram, Mail, ShoppingBag } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import {
  formatEventMonth,
  normalizeEvent,
  splitEvents,
} from "@/lib/events";
import {
  getGalleryImageSources,
  normalizeGalleryPageForUrl,
  type GalleryPage,
} from "@/lib/gallery-images";
import { fetchPublicJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

const heroImg = "/hero/hero.webp";
const alejandroPhoto = "/hero/aleg-photo.webp";
const justin = "/hero/justin.webp";
const lightTrails = "/hero/light-trails.webp";
const galleryPlaceholders = ["gallery-placeholder-1", "gallery-placeholder-2", "gallery-placeholder-3", "gallery-placeholder-4", "gallery-placeholder-5", "gallery-placeholder-6"];
const statPlaceholders = ["stat-placeholder-1", "stat-placeholder-2", "stat-placeholder-3", "stat-placeholder-4"];
const eventPlaceholders = ["event-placeholder-1", "event-placeholder-2", "event-placeholder-3", "event-placeholder-4"];

interface GalleryItem { height: number | null; img: string; label: string; film: boolean; width: number | null }
interface EventItem { title: string; date: string; desc: string }
interface CompItem { label: string; theme: string; winner: string; winnerTitle: string; img: string }
interface ClubStats {
  galleryPhotos: number;
  completedCompetitions: number;
  rollsDeveloped: number;
  activeMembers: number;
}
interface LatestWinner {
  title: string;
  theme: string | null;
  description: string | null;
  entryId: string;
  entryTitle: string | null;
  winnerName: string | null;
}

function statusFromSwr(data: unknown, error: unknown): "loading" | "loaded" | "error" {
  if (data === undefined && !error) return "loading";
  return error ? "error" : "loaded";
}

function mapGalleryRows(rows: Record<string, unknown>[]): GalleryItem[] {
  const items: GalleryItem[] = [];
  for (const r of rows.slice(0, 6)) {
    const source = getGalleryImageSources(r);
    if (!source) continue;
    items.push({
      height: source.height,
      img: source.previewSrc,
      label: source.title,
      film: source.medium === "Film",
      width: source.width,
    });
  }
  return items;
}

function mapEventRows(rows: Record<string, unknown>[]): EventItem[] {
  const loadedEvents = rows.map(normalizeEvent);
  const { past } = splitEvents(loadedEvents);
  return past.slice(0, 4).map((e) => ({
    title: e.title,
    date: formatEventMonth(e.date),
    desc: e.description || "",
  }));
}

async function fetchLatestCompetition(): Promise<CompItem | null> {
  const winner = await fetchPublicJson<LatestWinner | null>("/api/competitions/latest-winner");
  if (!winner) return null;

  return {
    label: winner.title,
    theme: winner.theme || "Photography",
    winner: winner.winnerName || "PPC Member",
    winnerTitle: winner.entryTitle || winner.description || "Untitled",
    img: `/api/competitions/image/photo/${winner.entryId}?variant=thumbnail`,
  };
}

async function fetchHomeGalleryPage(url: string) {
  const data = await fetchPublicJson<unknown>(url);
  return normalizeGalleryPageForUrl<Record<string, unknown>>(data, url, 6);
}

type LoadStatus = "loading" | "loaded" | "error";

interface HomeTheme {
  border: string;
  cardBg: string;
  faintText: string;
  heading: string;
  mutedText: string;
  subText: string;
  tagBg: string;
  tagBorder: string;
}

const homeTheme: HomeTheme = {
  border: "border-neutral-800",
  cardBg: "bg-white/[0.02]",
  faintText: "text-neutral-600",
  heading: "text-neutral-100",
  mutedText: "text-neutral-500",
  subText: "text-neutral-400",
  tagBg: "bg-neutral-900/80 text-neutral-400",
  tagBorder: "border-neutral-700",
};

const merchHighlights = [
  { label: "Current Drops", icon: ShoppingBag },
  { label: "Prints", icon: Image },
  { label: "Rolls", icon: Film },
];

const visitorPaths = [
  {
    title: "Join PPC",
    desc: "Membership covers club programming, Discord, competitions, and the steps for darkroom or studio access.",
    href: "/membership",
    label: "Start Membership",
    icon: Users,
  },
  {
    title: "Browse Work",
    desc: "See member photography across film, digital, competitions, and recent gallery uploads.",
    href: "/gallery",
    label: "Open Gallery",
    icon: Image,
  },
  {
    title: "Request Photos",
    desc: "Need coverage for an event, portrait, or organization program? Send the details.",
    href: "/request",
    label: "Request a Photographer",
    icon: Film,
  },
];

const updateLinks = [
  {
    title: "Discord",
    desc: "Meeting reminders, room changes, competition prompts, and darkroom coordination.",
    href: "/discord",
    label: "Join Discord",
    icon: Users,
  },
  {
    title: "Instagram",
    desc: "Photo walks, member work, merch drops, and public announcements.",
    href: "https://www.instagram.com/purduephotoclub/",
    label: "Follow Instagram",
    icon: Instagram,
  },
  {
    title: "Email",
    desc: "Questions about membership, facilities, or photographer requests.",
    href: "mailto:photo@purdue.edu",
    label: "Email PPC",
    icon: Mail,
  },
];

function HomeHero({ theme }: { theme: HomeTheme }) {
  const { heading } = theme;

  return (
    <section className="relative flex min-h-[calc(100svh-7rem)] items-center justify-center overflow-hidden py-14 md:min-h-[calc(100svh-6rem)]">
      <div className="absolute top-0 left-0 right-0 h-32 z-10 bg-gradient-to-b from-neutral-950 to-transparent" />
      <div className="absolute inset-0">
        <ImageWithFallback src={heroImg} alt="Vintage camera" className="size-full object-cover grayscale opacity-40" loading="eager" decoding="async" fetchPriority="high" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/60 via-transparent to-neutral-950" />

      <div className="relative z-10 text-center px-4 sm:px-6 md:px-8 w-full max-w-6xl -mt-8 md:-mt-14">
        <h1
          className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl tracking-[0.05em] sm:tracking-[0.08em] md:tracking-[0.1em] mb-4 ${heading}`}
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Purdue Photography Club
        </h1>
        <p className="text-neutral-300 text-sm md:text-base tracking-[0.4em] uppercase mb-2">
          Est. 1934 · West Lafayette, Indiana
        </p>
        <a
          href="/membership"
          className="inline-block mt-5 px-10 py-4 border border-neutral-400 text-neutral-200 text-sm tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-all duration-300"
        >
          Join the Club
        </a>
        <div className="w-16 h-px bg-neutral-400 mx-auto my-8" />
        <p className="text-neutral-300 max-w-xl mx-auto text-base tracking-wider select-text">
          A meeting ground for hundreds of photographers since 1934, we proudly welcome all students ranging in skill from novice to advanced.
        </p>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-8 bg-neutral-950"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, transparent, transparent 4px, #262626 4px, #262626 5px, transparent 5px, transparent 28px)`,
          backgroundSize: "32px 100%",
        }}
      />
    </section>
  );
}

function VisitorPathsSection({ theme }: { theme: HomeTheme }) {
  const { border, cardBg, heading, mutedText, subText } = theme;

  return (
    <section className={`px-6 py-16 md:py-20 border-b ${border}`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-end">
          <div>
            <h2 className={`text-3xl md:text-4xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
              Find Your First Frame
            </h2>
          </div>
          <p className={`max-w-2xl text-sm ${subText} tracking-wider leading-relaxed select-text md:justify-self-end`}>
            New here? Start with what you need. The archive, calendar, and club resources are all still close by.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
          {visitorPaths.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className={`group min-h-56 border ${border} ${cardBg} p-6 transition-colors hover:border-neutral-600 focus:outline-none focus-visible:border-neutral-400`}
            >
              <item.icon size={22} className={`${mutedText} mb-8 transition-colors group-hover:text-neutral-200`} strokeWidth={1.4} />
              <h3 className={`mb-3 text-2xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                {item.title}
              </h3>
              <p className={`mb-8 text-xs ${mutedText} tracking-wider leading-relaxed select-text`}>
                {item.desc}
              </p>
              <span className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] ${subText} transition-colors group-hover:text-white`}>
                {item.label} <ArrowRight size={12} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function MerchStoreSection({ theme }: { theme: HomeTheme }) {
  const { border, heading, mutedText, subText } = theme;

  return (
    <section className={`relative overflow-hidden py-14 px-6 md:py-24 border-b ${border}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950/90 to-neutral-950" />
      <div className="relative max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 sm:gap-8 md:gap-12 items-center">
        <div className="relative mx-auto h-[340px] w-full max-w-md sm:h-[460px] sm:max-w-xl md:h-[560px] md:max-w-2xl xl:mx-0 xl:h-[500px] xl:max-w-none">
          <figure className="group absolute left-2 top-1 z-10 w-[50%] max-w-sm rotate-[-5deg] bg-neutral-100 p-2 shadow-2xl shadow-black/50 sm:left-8 sm:-top-6 sm:w-[48%] sm:p-3">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-900">
              <ImageWithFallback src={alejandroPhoto} alt="Child playing among bubbles in a city square" className="size-full object-cover" loading="lazy" decoding="async" />
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-3 pb-3 pt-10 text-[9px] uppercase tracking-[0.22em] text-white opacity-100 transition-opacity motion-reduce:transition-none sm:opacity-0 sm:group-hover:opacity-100">
                Photo by Alejandro Griffith
              </figcaption>
            </div>
          </figure>
          <figure className="group absolute right-2 top-4 z-10 w-[58%] max-w-md rotate-[4deg] bg-neutral-100 p-2 shadow-2xl shadow-black/50 sm:right-0 sm:top-4 sm:w-[54%] sm:p-3">
            <div className="relative aspect-[4/5] overflow-hidden bg-neutral-900">
              <ImageWithFallback src={justin} alt="Member standing beneath the Milky Way at Mobius Arch" className="size-full object-cover" loading="lazy" decoding="async" />
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-3 pb-3 pt-10 text-[9px] uppercase tracking-[0.22em] text-white opacity-100 transition-opacity motion-reduce:transition-none sm:opacity-0 sm:group-hover:opacity-100">
                Photo by Justin Lin
              </figcaption>
            </div>
          </figure>
        </div>

        <div className="xl:pl-6">
          <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-4`}>New in the Club Store</p>
          <h2 className={`text-3xl md:text-5xl tracking-wider mb-6 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
            Take a Piece of PPC With You
          </h2>
          <p className={`text-sm ${subText} tracking-wider leading-relaxed mb-8 max-w-xl select-text`}>
            Current drops, prints, and film rolls live in one place now. Anyone can buy!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-10 max-w-xl">
            {merchHighlights.map((item) => (
              <div key={item.label} className="border border-neutral-800 bg-white/[0.02] p-4">
                <item.icon size={18} className="mb-3 text-neutral-500" strokeWidth={1.3} />
                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">{item.label}</p>
              </div>
            ))}
          </div>
          <a
            href="/merch"
            className="inline-flex items-center gap-3 border border-neutral-300 px-7 py-3 text-xs uppercase tracking-[0.3em] text-neutral-100 transition-colors hover:bg-white hover:text-black"
          >
            Browse Merch <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

interface FeaturedPhotosSectionProps {
  galleryPhotos: GalleryItem[];
  galleryStatus: LoadStatus;
  theme: HomeTheme;
}

function FeaturedPhotosSection({ galleryPhotos, galleryStatus, theme }: FeaturedPhotosSectionProps) {
  const { mutedText, subText, tagBg, tagBorder } = theme;
  const placeholderClass = galleryStatus === "error" ? "aspect-[3/4] bg-neutral-900/50 border border-neutral-800" : "aspect-[3/4] bg-neutral-800/50 animate-pulse";

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-12 text-center`}>
          Recent Work by Our Members
        </p>
        {galleryStatus !== "loaded" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
            {galleryPlaceholders.map((placeholder) => (
              <div key={placeholder} className={placeholderClass} />
            ))}
          </div>
        ) : galleryPhotos.length === 0 ? (
          <p className={`text-center text-sm ${mutedText} tracking-wider`}>No photos are published yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
            {galleryPhotos.map((item) => (
              <div key={item.img} className="group relative aspect-[3/4] overflow-hidden">
                <div className="size-full">
                  <ImageWithFallback
                    src={item.img}
                    alt={item.label}
                    className="size-full object-cover transition-all duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 50vw"
                    width={item.width ?? undefined}
                    height={item.height ?? undefined}
                  />
                </div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500" />
                <div className="absolute top-3 left-3">
                  <span className={`text-[8px] tracking-[0.2em] uppercase px-2 py-1 ${item.film ? `${tagBg} border ${tagBorder}` : "bg-white/10 backdrop-blur-sm text-neutral-300"}`}>
                    {item.film ? "Film" : "Digital"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="text-center mt-10">
          <a href="/gallery" className={`inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase ${subText} hover:text-white transition-colors`}>
            View Full Gallery <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

function ClubStatsSection({ clubStats, theme }: { clubStats?: ClubStats; theme: HomeTheme }) {
  const { border, faintText, heading, mutedText } = theme;
  const statItems = clubStats ? [
    { icon: Film, title: "Darkroom", desc: "Film development, enlarging, and scanning in our fully-equipped PMU basement darkroom.", link: "/facilities", stat: `${clubStats.rollsDeveloped}`, statLabel: "rolls developed" },
    { icon: Image, title: "Gallery", desc: "Member photography showcased in our community gallery, film and digital alike.", link: "/gallery", stat: `${clubStats.galleryPhotos}`, statLabel: "photos shared" },
    { icon: Trophy, title: "Competitions", desc: "Themed competitions where members share their best shots through Discord.", link: "/competitions", stat: `${clubStats.completedCompetitions}`, statLabel: "competitions held" },
    { icon: Users, title: "Community", desc: "Photographers across membership and Discord, from analog purists to digital innovators.", link: "/membership", stat: `${clubStats.activeMembers}`, statLabel: "community members" },
  ] : [];

  return (
    <section className={`py-24 px-6 border-t ${border}`}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {clubStats ? statItems.map((item) => (
          <div key={item.title}>
            <a href={item.link} className="block group">
              <item.icon size={24} className={`${faintText} mb-4 group-hover:text-white transition-colors duration-300`} strokeWidth={1} />
              <div className={`text-2xl font-light ${heading} mb-1`}>{item.stat}</div>
              <p className={`text-[10px] ${mutedText} tracking-widest uppercase mb-3`}>{item.statLabel}</p>
              <h3 className={`text-sm tracking-[0.2em] uppercase mb-3 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>{item.title}</h3>
              <p className={`text-xs ${mutedText} tracking-wider leading-relaxed`}>{item.desc}</p>
            </a>
          </div>
        )) : statPlaceholders.map((placeholder) => (
          <div key={placeholder} className="animate-pulse">
            <div className="size-6 bg-neutral-800 rounded mb-4" />
            <div className="h-7 bg-neutral-800 rounded w-16 mb-1" />
            <div className="h-3 bg-neutral-800/50 rounded w-24 mb-3" />
            <div className="h-4 bg-neutral-800 rounded w-28 mb-3" />
            <div className="space-y-1.5">
              <div className="h-3 bg-neutral-800/50 rounded w-full" />
              <div className="h-3 bg-neutral-800/50 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface PastEventsSectionProps {
  events: EventItem[];
  eventsStatus: LoadStatus;
  theme: HomeTheme;
}

function PastEventsSection({ events, eventsStatus, theme }: PastEventsSectionProps) {
  const { border, heading, mutedText, subText } = theme;
  const placeholderClass = eventsStatus === "error" ? "h-56 bg-neutral-900/50 border border-neutral-800" : "h-56 bg-neutral-800/50 animate-pulse";

  return (
    <section id="past-events" className={`py-24 px-6 border-t ${border}`}>
      <div className="max-w-7xl mx-auto">
        <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-4 text-center`}>
          What We've Been Up To
        </p>
        <h2 className={`text-3xl md:text-4xl tracking-wider text-center mb-16 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
          Past Events
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
          {eventsStatus !== "loaded" ? (
            eventPlaceholders.map((placeholder) => (
              <div key={placeholder} className={placeholderClass} />
            ))
          ) : events.length === 0 ? (
            <div className="col-span-full">
              <p className={`text-center text-sm ${mutedText} tracking-wider`}>No events to display</p>
            </div>
          ) : (
            events.map((event, eventIndex) => (
              <a key={`${event.title}-${event.date}`} href="/events" className="group relative min-h-56 overflow-hidden border border-neutral-800 bg-white/[0.02] p-5 transition-colors hover:border-neutral-600">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-2 opacity-40"
                  style={{
                    backgroundImage: "repeating-linear-gradient(to right, #737373 0, #737373 4px, transparent 4px, transparent 16px)",
                  }}
                />
                <div className="mb-10 flex items-start justify-between gap-4">
                  <span className="border border-neutral-800 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-neutral-500">
                    {event.date}
                  </span>
                  <span className="text-xs text-neutral-700">0{eventIndex + 1}</span>
                </div>
                <h3 className="mb-3 text-lg tracking-wider text-neutral-100 group-hover:text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{event.title}</h3>
                <p className="text-[11px] text-neutral-500 tracking-wider leading-relaxed">{event.desc || "Event details archived by the club."}</p>
              </a>
            ))
          )}
        </div>
        <div className="text-center mt-10">
          <a href="/events" className={`inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase ${subText} hover:text-white transition-colors`}>
            View All Events <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

interface CompetitionTeaserSectionProps {
  compStatus: LoadStatus;
  latestComp: CompItem | null | undefined;
  theme: HomeTheme;
}

function CompetitionTeaserSection({ compStatus, latestComp, theme }: CompetitionTeaserSectionProps) {
  const { border, cardBg, faintText, heading, mutedText, subText } = theme;

  return (
    <section className={`py-24 px-6 border-t ${border}`}>
      <div className="max-w-5xl mx-auto">
        {compStatus === "loading" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 items-stretch">
            <div className="aspect-[4/3] md:aspect-auto bg-neutral-800/50 animate-pulse" />
            <div className="p-8 md:p-12 border border-neutral-800 bg-neutral-800/30 animate-pulse min-h-[300px]" />
          </div>
        ) : compStatus === "error" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 items-stretch">
            <div className="aspect-[4/3] md:aspect-auto bg-neutral-900/50 border border-neutral-800" />
            <div className="p-8 md:p-12 border border-neutral-800 bg-neutral-900/50 min-h-[300px]" />
          </div>
        ) : !latestComp ? (
          <div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 items-stretch">
            <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-neutral-950">
              <div className="size-full">
                <ImageWithFallback src={latestComp.img} alt="Competition winner" className="size-full object-contain" loading="lazy" decoding="async" />
              </div>
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-sm border border-neutral-700 text-amber-400">
                <Trophy size={13} />
                <span className="text-[10px] tracking-[0.2em] uppercase">1st Place</span>
              </div>
            </div>
            <div className={`flex flex-col justify-center p-8 md:p-12 border ${border} ${cardBg}`}>
              <p className={`text-[10px] tracking-[0.3em] uppercase ${faintText} mb-2`}>
                {latestComp.label}
              </p>
              <h3 className={`text-2xl tracking-wider mb-2 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                Theme: "{latestComp.theme}"
              </h3>
              <p className={`text-sm ${subText} tracking-wider mb-1 mt-3 select-text`}>
                Winner: {latestComp.winner}
              </p>
              <p className={`text-xs ${mutedText} tracking-wider italic mb-6 select-text`}>
                "{latestComp.winnerTitle}"
              </p>
              <p className={`text-xs ${mutedText} tracking-wider leading-relaxed mb-8`}>
                Members compete with their best shot around a unique theme. Entries and winner decisions happen in Discord.
              </p>
              <a href="/competitions" className={`inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase ${subText} hover:text-white transition-colors`}>
                View All Competitions <ArrowRight size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface FollowUpdatesSectionProps {
  theme: HomeTheme;
}

function FollowUpdatesSection({ theme }: FollowUpdatesSectionProps) {
  const { border, cardBg, heading, mutedText, subText } = theme;

  return (
    <section id="updates" className={`py-24 px-6 border-t ${border}`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div>
            <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-4`}>Stay in the Loop</p>
            <h2 className={`text-3xl md:text-4xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
              Follow the Next Roll
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
          {updateLinks.map((item) => {
            const isExternal = item.href.startsWith("http");
            return (
              <a
                key={item.title}
                href={item.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className={`group flex min-h-48 flex-col border ${border} ${cardBg} p-6 transition-colors hover:border-neutral-600 focus:outline-none focus-visible:border-neutral-400`}
              >
                <item.icon size={20} className={`${mutedText} mb-7 transition-colors group-hover:text-neutral-200`} strokeWidth={1.4} />
                <h3 className={`mb-3 text-xl tracking-wider ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                  {item.title}
                </h3>
                <p className={`mb-8 text-xs ${mutedText} tracking-wider leading-relaxed select-text`}>
                  {item.desc}
                </p>
                <span className={`mt-auto inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] ${subText} transition-colors group-hover:text-white`}>
                  {item.label} <ArrowRight size={12} />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RequestCtaSection({ theme }: { theme: HomeTheme }) {
  const { heading, mutedText, subText } = theme;

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-32 z-10 bg-gradient-to-b from-neutral-950 to-transparent" />
      <div className="absolute inset-0 opacity-30">
        <ImageWithFallback src={lightTrails} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      </div>
      <div className="absolute inset-0 bg-neutral-950/70" />
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <p className={`text-xs tracking-[0.4em] uppercase ${mutedText} mb-6`}>Ready to shoot?</p>
        <h2 className={`text-3xl md:text-4xl tracking-wider mb-8 ${heading}`} style={{ fontFamily: "'Playfair Display', serif" }}>
          Request a Photographer
        </h2>
        <p className={`${subText} text-sm tracking-wider mb-10 select-text`}>
          Need photos for your event? Our members shoot film and digital, you choose the aesthetic.
        </p>
        <a href="/request" className="inline-block px-8 py-3 text-xs tracking-[0.3em] uppercase transition-colors bg-white text-black hover:bg-neutral-200">
          Submit a Request
        </a>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: galleryPage, error: galleryError } = useSWR<GalleryPage<Record<string, unknown>>>(
    "/api/gallery?page=1&per_page=6",
    fetchHomeGalleryPage,
    PUBLIC_API_SWR_OPTIONS,
  );
  const { data: eventRows, error: eventsError } = useSWR<Record<string, unknown>[]>("/api/events?limit=12", fetchPublicJson, PUBLIC_API_SWR_OPTIONS);
  const { data: latestComp, error: compError } = useSWR<CompItem | null>("home-latest-competition", fetchLatestCompetition, PUBLIC_API_SWR_OPTIONS);
  const { data: clubStats } = useSWR<ClubStats>("/api/stats", fetchPublicJson, PUBLIC_API_SWR_OPTIONS);
  const galleryRows = galleryPage?.photos;
  const galleryPhotos = useMemo(() => mapGalleryRows(galleryRows ?? []), [galleryRows]);
  const events = useMemo(() => mapEventRows(eventRows ?? []), [eventRows]);
  const galleryStatus = statusFromSwr(galleryPage, galleryError);
  const eventsStatus = statusFromSwr(eventRows, eventsError);
  const compStatus = statusFromSwr(latestComp, compError);

  return (
    <div className="overflow-x-hidden">
      <HomeHero theme={homeTheme} />
      <VisitorPathsSection theme={homeTheme} />
      <FeaturedPhotosSection galleryPhotos={galleryPhotos} galleryStatus={galleryStatus} theme={homeTheme} />
      <ClubStatsSection clubStats={clubStats} theme={homeTheme} />
      <PastEventsSection events={events} eventsStatus={eventsStatus} theme={homeTheme} />
      <CompetitionTeaserSection compStatus={compStatus} latestComp={latestComp} theme={homeTheme} />
      <MerchStoreSection theme={homeTheme} />
      <FollowUpdatesSection theme={homeTheme} />
      <RequestCtaSection theme={homeTheme} />
    </div>
  );
}
