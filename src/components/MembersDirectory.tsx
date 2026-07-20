import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  normalizeMemberDirectoryResponse,
  type MemberDirectoryMeta,
  type MemberDirectoryProfile,
} from "@/lib/member-directory";
import { fetchPublicJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

const MEMBERS_PAGE_SIZE = 24;
const MEMBERS_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  dedupingInterval: 10_000,
  keepPreviousData: false,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

interface MembersDirectoryViewProps {
  errorMessage: string;
  loading: boolean;
  meta: MemberDirectoryMeta;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  profiles: MemberDirectoryProfile[];
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

function MemberCard({ profile }: { profile: MemberDirectoryProfile }) {
  const avatarStyle = {
    objectPosition: `${profile.avatarPositionX}% ${profile.avatarPositionY}%`,
    transform: `scale(${profile.avatarZoom / 100})`,
    transformOrigin: `${profile.avatarPositionX}% ${profile.avatarPositionY}%`,
  };

  return (
    <a
      href={`/profile/${encodeURIComponent(profile.username)}`}
      aria-label={`View ${profile.displayName} profile`}
      className="group grid min-h-44 grid-cols-[7rem_minmax(0,1fr)] overflow-hidden border border-neutral-800 bg-white/[0.02] transition-colors hover:border-neutral-600 hover:bg-white/[0.035] focus-visible:border-neutral-400 focus-visible:outline-none sm:min-h-64 sm:grid-cols-1"
    >
      <div className="relative aspect-square overflow-hidden border-r border-neutral-800 bg-neutral-900 sm:border-b sm:border-r-0">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 motion-reduce:transition-none"
            style={avatarStyle}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-neutral-900 p-6">
            <img src="/ppc-logo.webp" alt="" className="size-16 rounded-full opacity-45 grayscale sm:size-20" />
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-white transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none" />
      </div>
      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <p className="truncate text-sm tracking-[0.08em] text-neutral-100 sm:text-base" style={{ fontFamily: "'Playfair Display', serif" }}>
          {profile.displayName}
        </p>
        <p className="mt-1 truncate text-[9px] uppercase tracking-[0.18em] text-neutral-600">
          @{profile.username}
        </p>
        {profile.bio && (
          <p className="mt-3 line-clamp-3 text-xs leading-5 text-neutral-500">
            {profile.bio}
          </p>
        )}
        {profile.specialties.length > 0 && (
          <div aria-label="Photography types" className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {profile.specialties.slice(0, 3).map((specialty) => (
              <span key={specialty} className="border border-neutral-800 px-2 py-1 text-[8px] uppercase tracking-[0.14em] text-neutral-500">
                {specialty}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

export function MembersDirectoryView({
  errorMessage,
  loading,
  meta,
  onPageChange,
  onRetry,
  profiles,
}: MembersDirectoryViewProps) {
  const pageNumbers = getVisiblePageNumbers(meta.page, meta.totalPages);

  return (
    <div className="min-h-screen px-5 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 border-b border-neutral-800 pb-8 sm:mb-14 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-neutral-600">Purdue Photography Club</p>
            <h1 className="text-4xl tracking-wide text-neutral-100 sm:text-5xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              Members
            </h1>
          </div>
          <p className="mt-4 max-w-lg text-xs leading-5 text-neutral-500 sm:mt-0 sm:text-right">
            Meet the photographers behind the club and explore their work.
          </p>
        </header>

        {loading ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">Loading members</span>
            <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grid min-h-44 grid-cols-[7rem_minmax(0,1fr)] animate-pulse overflow-hidden border border-neutral-800 bg-white/[0.02] sm:min-h-64 sm:grid-cols-1">
                  <div className="aspect-square border-r border-neutral-800 bg-neutral-900 sm:border-b sm:border-r-0" />
                  <div className="space-y-3 p-4 sm:p-5">
                    <div className="h-4 w-1/2 bg-neutral-800" />
                    <div className="h-3 w-4/5 bg-neutral-900" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : errorMessage ? (
          <div className="border border-neutral-800 py-16 text-center">
            <p role="alert" className="text-sm text-neutral-400">{errorMessage}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 min-h-11 border border-neutral-700 px-5 text-[10px] uppercase tracking-[0.18em] text-neutral-300 hover:border-neutral-500 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
            >Try again</button>
          </div>
        ) : profiles.length === 0 ? (
          <div className="border border-dashed border-neutral-800 py-20 text-center">
            <p role="status" className="text-sm text-neutral-500">No member profiles to show yet.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => <MemberCard key={profile.username} profile={profile} />)}
          </div>
        )}

        {!loading && !errorMessage && meta.totalPages > 1 && (
          <nav aria-label="Members pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
            <p role="status" aria-live="polite" className="w-full pb-2 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              Page {meta.page} of {meta.totalPages}
            </p>
            <button
              type="button"
              disabled={!meta.hasPreviousPage}
              onClick={() => onPageChange(meta.page - 1)}
              className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >Previous</button>
            {pageNumbers.map((pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                aria-label={`Go to members page ${pageNumber}`}
                aria-current={pageNumber === meta.page ? "page" : undefined}
                onClick={() => onPageChange(pageNumber)}
                className={`min-h-11 min-w-11 border px-3 text-xs ${pageNumber === meta.page ? "border-white text-white" : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white"}`}
              >{pageNumber}</button>
            ))}
            <button
              type="button"
              disabled={!meta.hasNextPage}
              onClick={() => onPageChange(meta.page + 1)}
              className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >Next</button>
          </nav>
        )}
      </div>
    </div>
  );
}

async function fetchMembers(url: string) {
  const response = await fetchPublicJson<unknown>(url, { cache: "no-store" });
  return normalizeMemberDirectoryResponse(response);
}

export default function MembersDirectory() {
  const [page, setPage] = useState(1);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const previousPageRef = useRef(1);
  const membersUrl = `/api/profiles?page=${page}&per_page=${MEMBERS_PAGE_SIZE}`;
  const { data, error, mutate } = useSWR(membersUrl, fetchMembers, MEMBERS_SWR_OPTIONS);
  const meta = data?.meta ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    page,
    perPage: MEMBERS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  useEffect(() => {
    if (!data || previousPageRef.current === data.meta.page) return;
    previousPageRef.current = data.meta.page;
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start" });
  }, [data]);

  return (
    <div ref={resultsRef} tabIndex={-1} className="scroll-mt-24 outline-none">
      <MembersDirectoryView
        errorMessage={error ? "Could not load members." : ""}
        loading={!data && !error}
        meta={meta}
        onPageChange={(nextPage) => {
          if (nextPage >= 1 && nextPage <= meta.totalPages && nextPage !== meta.page) {
            setPage(nextPage);
          }
        }}
        onRetry={() => void mutate()}
        profiles={data?.profiles ?? []}
      />
    </div>
  );
}
