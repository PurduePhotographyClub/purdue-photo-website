import useSWR from "swr";
import { fetchJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

interface DarkroomStats {
  totalDeveloped: number;
  c41: number;
  bw: number;
  slide: number;
  topStocks: { name: string; rolls: number }[];
}

interface DarkroomResponse {
  stats?: DarkroomStats | null;
}

export default function DarkroomOverview() {
  const { data, isLoading } = useSWR<DarkroomResponse>("/api/darkroom", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const stats = data?.stats ?? null;

  if (isLoading) {
    return (
      <div className="animate-pulse border-t border-neutral-800/80 pt-5">
        <div className="mb-4 h-3 w-32 bg-neutral-800" />
        <div className="mb-3 h-8 w-48 bg-neutral-800/60" />
        <div className="h-3 w-72 max-w-full bg-neutral-800/30" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <a href="/dashboard/darkroom" className="group block border-t border-neutral-800/80 pt-5 transition-colors hover:border-neutral-600">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="mb-3 text-[9px] uppercase tracking-[0.3em] text-neutral-600">Darkroom</p>
          <p className="text-2xl text-neutral-200 transition-colors group-hover:text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            {stats.totalDeveloped} <span className="text-sm text-neutral-500">rolls developed</span>
          </p>
          {stats.topStocks.length > 0 && (
            <p className="mt-2 text-[10px] leading-5 tracking-wider text-neutral-700">
              Top stock: {stats.topStocks[0].name}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
          <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">C-41 {stats.c41}</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">B&W {stats.bw}</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">Slide {stats.slide}</span>
        </div>
      </div>
    </a>
  );
}
