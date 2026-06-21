import useSWR from "swr";
import { fetchJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  source: string;
}

interface NewsletterResponse {
  count: number;
  subscribers: Subscriber[];
}

export default function AdminNewsletter() {
  const { data = { count: 0, subscribers: [] }, error, isLoading } = useSWR<NewsletterResponse>("/api/admin/newsletter", fetchJson, PUBLIC_API_SWR_OPTIONS);

  if (isLoading) return <p className="text-xs text-neutral-500">Loading</p>;

  return (
    <div className="space-y-6">
      {error && <p className="text-xs text-red-400">Failed to load newsletter subscribers.</p>}
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-400">{data.count} active subscribers</p>
        <a
          href="/api/admin/newsletter?format=csv"
          className="px-4 py-2 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
        >
          Export CSV
        </a>
      </div>

      <div className="space-y-2">
        {data.subscribers.map((s) => (
          <div key={s.id} className="bg-white/[0.02] border border-neutral-800 p-3 flex items-center justify-between">
            <p className="text-sm text-neutral-300">{s.email}</p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-neutral-600 capitalize">{s.source}</span>
              <span className="text-[10px] text-neutral-700">{new Date(s.subscribedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
