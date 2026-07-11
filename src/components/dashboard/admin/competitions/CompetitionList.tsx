import { Edit3, Plus, Trash2, Trophy } from "lucide-react";
import {
  STATUS_TRANSITIONS,
  adminCompetitionStatusColor,
  type Competition,
  type CompetitionResult,
  type CompetitionStatus,
} from "./types";

interface CompetitionListProps {
  competitions: Competition[];
  onAdvanceStatus: (id: string, status: CompetitionStatus) => void;
  onCompetitionEdit: (competition: Competition) => void;
  onDeleteRequest: (competition: Competition) => void;
  onResultEdit: (competitionId: string, result: CompetitionResult) => void;
  onResultUpload: (competitionId: string, place: number) => void;
}

function formatDeadline(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function placeLabel(place: number) {
  if (place === 1) return "1st Place";
  if (place === 2) return "2nd Place";
  return "3rd Place";
}

export default function CompetitionList({
  competitions,
  onAdvanceStatus,
  onCompetitionEdit,
  onDeleteRequest,
  onResultEdit,
  onResultUpload,
}: CompetitionListProps) {
  if (competitions.length === 0) {
    return (
      <div className="border border-dashed border-neutral-800 px-5 py-14 text-center">
        <p className="text-sm text-neutral-400">No competitions on this page.</p>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">Create a draft to begin the next photo challenge.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {competitions.map((competition) => {
        const nextStatus = STATUS_TRANSITIONS[competition.status];
        const results = (competition.results ?? []).toSorted((first, second) => first.place - second.place);
        const nextOpenPlace = ([1, 2, 3] as const).find((place) => !results.some((result) => result.place === place));

        return (
          <article key={competition.id} className="border border-neutral-800 bg-white/[0.02] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm text-neutral-100">{competition.title}</h2>
                  <span className={`text-[10px] uppercase tracking-[0.16em] ${adminCompetitionStatusColor[competition.status]}`}>{competition.status}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {competition.theme && <span className="text-[10px] text-neutral-500">Theme: {competition.theme}</span>}
                  {competition.submissionDeadline && <span className="text-[10px] text-neutral-500">Due {formatDeadline(competition.submissionDeadline)}</span>}
                  <span className="text-[10px] text-neutral-600">{results.length}/3 results</span>
                </div>
                {competition.description && <p className="mt-3 max-w-3xl text-xs leading-relaxed text-neutral-400">{competition.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                <button
                  type="button"
                  disabled={!nextOpenPlace}
                  onClick={() => nextOpenPlace && onResultUpload(competition.id, nextOpenPlace)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-800 px-3 text-[10px] uppercase tracking-[0.1em] text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white disabled:cursor-not-allowed disabled:text-neutral-700"
                >
                  <Plus size={12} /> {nextOpenPlace ? "Add Result" : "Results Full"}
                </button>
                <button
                  type="button"
                  onClick={() => onCompetitionEdit(competition)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-800 px-3 text-[10px] uppercase tracking-[0.1em] text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
                >
                  <Edit3 size={12} /> Edit
                </button>
                {nextStatus && (
                  <button
                    type="button"
                    onClick={() => onAdvanceStatus(competition.id, nextStatus)}
                    className="min-h-11 border border-neutral-800 px-3 text-[10px] uppercase tracking-[0.1em] text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
                  >
                    Move to {nextStatus}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteRequest(competition)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-red-950/70 px-3 text-[10px] uppercase tracking-[0.1em] text-red-400 transition-colors hover:border-red-900 hover:text-red-300"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>

            {results.length > 0 && (
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                {results.map((result) => {
                  const thumbnailUrl = result.thumbnailUrl ?? result.imageUrl;
                  return (
                    <div key={result.id} className="overflow-hidden border border-neutral-800 bg-black/20">
                      <div className="aspect-[4/3] overflow-hidden bg-neutral-900">
                        <img
                          src={thumbnailUrl}
                          alt={result.entryTitle || "Competition result"}
                          loading="lazy"
                          decoding="async"
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="size-full object-cover"
                        />
                      </div>
                      <div className="flex items-end justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="mb-1.5 flex items-center gap-1.5 text-amber-400">
                            <Trophy size={12} />
                            <span className="text-[10px] uppercase tracking-[0.13em]">{placeLabel(result.place)}</span>
                          </div>
                          <p className="truncate text-xs text-neutral-200">{result.entryTitle || "Untitled"}</p>
                          <p className="mt-1 truncate text-[10px] text-neutral-500">{result.photographerName || "Unknown photographer"}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Edit ${placeLabel(result.place)} result`}
                          onClick={() => onResultEdit(competition.id, result)}
                          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-neutral-400 transition-colors hover:text-white"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
