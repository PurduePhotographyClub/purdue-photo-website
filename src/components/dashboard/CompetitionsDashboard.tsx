import useSWR from "swr";
import { ExternalLink, Trophy } from "lucide-react";
import { fetchJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

const DISCORD_COMPETITION_URL = "https://discord.com/channels/1182061172309106708/1338662150054608897";
const competitionStatusBadge: Record<string, string> = {
  open: "text-green-400",
  judging: "text-yellow-500",
  closed: "text-neutral-500",
  draft: "text-neutral-700",
};

interface Competition {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  status: "draft" | "open" | "judging" | "closed";
  submissionDeadline: string | null;
}

export default function CompetitionsDashboard() {
  const { data, error, isLoading } = useSWR<Competition[]>("/api/competitions", fetchJson, PUBLIC_API_SWR_OPTIONS);
  const competitions = data || [];


  return (
    <div className="space-y-6">
      <div className="bg-white/[0.02] border border-neutral-800 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-neutral-400">Competition Entries</p>
          <p className="text-xs text-neutral-600 mt-2 max-w-2xl">
            Entries are collected in the Discord competition channel. After winners are decided, admins publish the final results on the competitions page.
          </p>
        </div>
        <a
          href={DISCORD_COMPETITION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
        >
          Upload in Discord <ExternalLink size={12} />
        </a>
      </div>

      {isLoading ? (
        <p className="text-xs text-neutral-500">Loading</p>
      ) : error ? (
        <p className="text-xs text-red-400">Failed to load competitions. Please refresh the page.</p>
      ) : competitions.length === 0 ? (
        <p className="text-xs text-neutral-600">No competitions available.</p>
      ) : (
        <div className="space-y-3">
          {competitions.map((comp) => (
            <div key={comp.id} className="bg-white/[0.02] border border-neutral-800 p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h3 className="text-sm text-neutral-200">{comp.title}</h3>
                  {comp.theme && (
                    <p className="text-[10px] tracking-wider text-neutral-500 mt-0.5">Theme: {comp.theme}</p>
                  )}
                  {comp.description && <p className="text-xs text-neutral-500 mt-2 max-w-xl">{comp.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={`text-[10px] tracking-wider capitalize ${competitionStatusBadge[comp.status] || "text-neutral-500"}`}>
                      {comp.status}
                    </span>
                    {comp.submissionDeadline && (
                      <span className="text-[10px] text-neutral-600">
                        Deadline: {new Date(comp.submissionDeadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {comp.status === "open" ? (
                  <a
                    href={DISCORD_COMPETITION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
                  >
                    Upload <ExternalLink size={12} />
                  </a>
                ) : comp.status === "closed" ? (
                  <a
                    href="/competitions"
                    className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
                  >
                    Results <Trophy size={12} />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
