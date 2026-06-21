import {
  useEffect,
  useReducer,
  useRef,
  useState
} from "react";
import { AlertCircle, Bug, CheckCircle2, Loader2, Send, X } from "lucide-react";
import { fetchApi, readErrorMessage } from "@/lib/http";

const categories = [
  { value: "bug", label: "Bug" },
  { value: "access", label: "Access" },
  { value: "content", label: "Content" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

type SubmitState = "idle" | "loading" | "success" | "error";

interface ReportFormState {
  category: string;
  description: string;
  message: string;
  submitState: SubmitState;
  title: string;
}

type ReportFormAction =
  | { type: "fieldChanged"; field: "category" | "description" | "title"; value: string }
  | { type: "reset" }
  | { type: "submitStarted" }
  | { type: "submitSucceeded" }
  | { type: "submitFailed"; message: string };

const initialReportFormState: ReportFormState = {
  category: "bug",
  description: "",
  message: "",
  submitState: "idle",
  title: "",
};

function reportFormReducer(state: ReportFormState, action: ReportFormAction): ReportFormState {
  switch (action.type) {
    case "fieldChanged":
      return { ...state, [action.field]: action.value };
    case "reset":
      return initialReportFormState;
    case "submitStarted":
      return { ...state, message: "", submitState: "loading" };
    case "submitSucceeded":
      return { ...state, description: "", message: "Thanks. Your report was submitted.", submitState: "success", title: "" };
    case "submitFailed":
      return { ...state, message: action.message, submitState: "error" };
  }
}

export default function ReportIssueWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [{ category, description, message, submitState, title }, dispatch] = useReducer(reportFormReducer, initialReportFormState);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const resetForm = () => {
    dispatch({ type: "reset" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "submitStarted" });

    try {
      const res = await fetchApi("/api/report-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title,
          description,
          pageUrl: window.location.href,
          userAgent: window.navigator.userAgent,
        }),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Could not submit report."));
      }

      dispatch({ type: "submitSucceeded" });
    } catch (err) {
      dispatch({ type: "submitFailed", message: err instanceof Error ? err.message : "Could not submit report." });
    }
  };

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-[60]">
      {isOpen && (
        <div
          className="absolute bottom-14 right-0 w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950/95 shadow-2xl shadow-black/50 backdrop-blur-md"
          style={{ animation: "reportIssueSlideUp 0.2s ease-out" }}
        >
          <div className="flex items-center justify-between border-b border-neutral-800/80 px-4 py-3">
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.25em] text-neutral-400"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Report Issue
              </p>
              <p className="mt-1 text-[9px] tracking-[0.08em] text-neutral-600">
                Dashboard feedback goes to club maintainers.
              </p>
            </div>
            <button type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-600 transition-colors hover:text-white"
              aria-label="Close issue report panel"
            >
              <X size={12} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 p-4">
            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Type</span>
              <select
                value={category}
                onChange={(e) => dispatch({ type: "fieldChanged", field: "category", value: e.target.value })}
                className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px] tracking-wider text-neutral-300 outline-none transition-colors focus:border-neutral-600"
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Short Title</span>
              <input aria-label="What broke or felt confusing?"
                value={title}
                onChange={(e) => dispatch({ type: "fieldChanged", field: "title", value: e.target.value })}
                maxLength={120}
                required
                placeholder="What broke or felt confusing?"
                className="w-full rounded border border-neutral-800 bg-transparent px-3 py-2 text-[11px] tracking-wider text-neutral-200 outline-none transition-colors placeholder:text-neutral-700 focus:border-neutral-600"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Details</span>
              <textarea aria-label="Tell us what happened, what you expected, and any steps to reproduce it."
                value={description}
                onChange={(e) => dispatch({ type: "fieldChanged", field: "description", value: e.target.value })}
                maxLength={2000}
                required
                rows={5}
                placeholder="Tell us what happened, what you expected, and any steps to reproduce it."
                className="w-full resize-none rounded border border-neutral-800 bg-transparent px-3 py-2 text-[11px] leading-relaxed tracking-wider text-neutral-200 outline-none transition-colors placeholder:text-neutral-700 focus:border-neutral-600"
              />
            </label>

            {message && (
              <p className={`flex items-center gap-2 text-[10px] tracking-wider ${
                submitState === "success" ? "text-green-400" : "text-red-400"
              }`}>
                {submitState === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {message}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="text-[9px] uppercase tracking-[0.18em] text-neutral-600 transition-colors hover:text-neutral-400"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={submitState === "loading"}
                className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitState === "loading" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      <button type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="group flex items-center gap-2.5 rounded-full border border-neutral-800 bg-neutral-950/90 px-4 py-2.5 text-neutral-500 shadow-lg shadow-neutral-900/50 backdrop-blur-sm transition-all duration-300 hover:border-neutral-700 hover:text-neutral-300"
        title="Report an issue"
        aria-expanded={isOpen}
        aria-label="Open issue report panel"
      >
        <Bug
          size={14}
          className={`transition-transform duration-300 ${isOpen ? "rotate-12" : "group-hover:-rotate-6"}`}
        />
        <span
          className="hidden text-[10px] uppercase tracking-[0.15em] sm:inline"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          Report Issue
        </span>
      </button>

      <style>{`
        @keyframes reportIssueSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
