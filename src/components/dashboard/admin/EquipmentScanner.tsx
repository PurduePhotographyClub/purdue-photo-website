import { useDeferredValue, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readJson,
  readJsonOrNull,
} from "@/lib/http";

type ScanAction = "checkout" | "return";

interface Borrower {
  email: string;
  id: string;
  name: string;
}

interface BorrowerSearchResponse {
  borrowers: Borrower[];
}

interface ScanErrorResponse {
  code?: string;
  error?: string;
}

interface ScanResponse {
  action: ScanAction;
  discordSyncWarning?: string;
  equipment: {
    assetTag: string | null;
    id: string;
    name: string;
  };
  loan: {
    borrowerName: string;
    dueDate: string | null;
    id: string;
    status: "active" | "returned";
  };
}

interface EquipmentScannerProps {
  onCompleted: () => void;
}

const MODE_COPY: Record<ScanAction, { description: string; label: string }> = {
  checkout: {
    description: "Scan an approved request, or open walk-up checkout to assign the gear at the desk.",
    label: "Checkout",
  },
  return: {
    description: "Use when PPC gear is back at the equipment desk.",
    label: "Return",
  },
};

const fieldClass =
  "w-full border border-neutral-800 bg-transparent px-3 py-3 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-neutral-500 focus:outline-none disabled:opacity-50 [color-scheme:dark]";

export default function EquipmentScanner({ onCompleted }: EquipmentScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [action, setAction] = useState<ScanAction>("checkout");
  const [barcode, setBarcode] = useState("");
  const [borrowerQuery, setBorrowerQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [walkUpCheckout, setWalkUpCheckout] = useState(false);
  const deferredBorrowerQuery = useDeferredValue(borrowerQuery.trim());
  const borrowerSearchUrl = walkUpCheckout && !selectedBorrower && deferredBorrowerQuery.length >= 2
    ? `/api/equipment/scan?search=${encodeURIComponent(deferredBorrowerQuery)}`
    : null;
  const minimumDueDate = new Date(Date.now() + 24 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 10);
  const {
    data: borrowerData,
    error: borrowerLoadError,
    isLoading: borrowersLoading,
  } = useSWR<BorrowerSearchResponse>(
    borrowerSearchUrl,
    fetchJson,
    PUBLIC_API_SWR_OPTIONS,
  );
  const borrowers = borrowerData?.borrowers ?? [];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const restoreFocus = () => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const chooseAction = (nextAction: ScanAction) => {
    setAction(nextAction);
    setError("");
    setResult(null);
    if (nextAction === "return") {
      setWalkUpCheckout(false);
    }
    restoreFocus();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode || busy) {
      if (!cleanBarcode) setError("Scan or enter an asset tag first.");
      restoreFocus();
      return;
    }
    if (action === "checkout" && walkUpCheckout && (!selectedBorrower || !dueDate)) {
      setError("Select a borrower and due date for walk-up checkout.");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetchApi("/api/equipment/scan", {
        body: JSON.stringify({
          action,
          barcode: cleanBarcode,
          ...(action === "checkout" && walkUpCheckout && selectedBorrower
            ? { borrowerId: selectedBorrower.id, dueDate }
            : {}),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        const failure = await readJsonOrNull<ScanErrorResponse>(response);
        if (failure?.code === "direct_checkout_details_required") {
          setWalkUpCheckout(true);
        }
        setError(failure?.error || "The scan could not be completed.");
        return;
      }

      const data = await readJson<ScanResponse>(response);
      setResult(data);
      setBarcode("");
      onCompleted();
    } catch {
      setError("The scan could not reach the equipment service. Try again.");
    } finally {
      setBusy(false);
      restoreFocus();
    }
  };

  const activeCopy = MODE_COPY[action];

  return (
    <section className="border border-neutral-800 bg-white/[0.02]">
      <header className="border-b border-neutral-800 px-4 py-5 sm:px-5">
        <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">PPC equipment</p>
        <h2
          className="mt-2 text-2xl text-neutral-100"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Scan station
        </h2>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-500">
          Scan the asset tag to check gear out or mark it returned.
        </p>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Desk mode</p>
          <div className="mt-2 grid grid-cols-2 gap-2" aria-label="Scanner action">
            {(["checkout", "return"] as const).map((mode) => {
              const selected = action === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={selected}
                  disabled={busy}
                  onClick={() => chooseAction(mode)}
                  className={`min-h-11 border px-4 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors disabled:opacity-50 ${
                    selected
                      ? "border-white bg-white text-black"
                      : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"
                  }`}
                >
                  {MODE_COPY[mode].label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-neutral-600">{activeCopy.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {action === "checkout" && (
            <div className="border-t border-neutral-800 pt-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={walkUpCheckout}
                  onChange={(event) => {
                    setWalkUpCheckout(event.target.checked);
                    setError("");
                  }}
                  className="size-4 accent-white"
                />
                Walk-up checkout
              </label>
              <p className="mt-1 text-[10px] leading-relaxed text-neutral-600">
                Use this when the borrower does not already have an approved request.
              </p>

              {walkUpCheckout && (
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
                  <div>
                    <label className="block space-y-2">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Borrower</span>
                      <input
                        aria-label="Search members by name or email"
                        type="search"
                        autoComplete="off"
                        maxLength={100}
                        value={borrowerQuery}
                        onChange={(event) => {
                          setBorrowerQuery(event.target.value);
                          setSelectedBorrower(null);
                        }}
                        placeholder="Search members by name or email"
                        className={fieldClass}
                      />
                    </label>
                    {deferredBorrowerQuery.length >= 2 && !selectedBorrower && (
                      <div className="max-h-44 overflow-y-auto border-x border-b border-neutral-800 bg-neutral-950">
                        {borrowersLoading && <p className="p-3 text-xs text-neutral-600">Searching</p>}
                        {borrowerLoadError && <p className="p-3 text-xs text-red-400">Members could not be loaded.</p>}
                        {!borrowersLoading && !borrowerLoadError && borrowers.map((borrower) => (
                          <button
                            key={borrower.id}
                            type="button"
                            onClick={() => {
                              setSelectedBorrower(borrower);
                              setBorrowerQuery(`${borrower.name} · ${borrower.email}`);
                            }}
                            className="block min-h-11 w-full border-b border-neutral-900 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-white/[0.04]"
                          >
                            <span className="block text-xs text-neutral-200">{borrower.name}</span>
                            <span className="block text-[10px] text-neutral-500">{borrower.email}</span>
                          </button>
                        ))}
                        {!borrowersLoading && !borrowerLoadError && borrowers.length === 0 && (
                          <p className="p-3 text-xs text-neutral-600">No eligible members found.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <label className="block space-y-2">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Due date</span>
                    <input
                      aria-label="Walk-up checkout due date"
                      type="date"
                      value={dueDate}
                      min={minimumDueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Asset tag</span>
            <input
              ref={inputRef}
              aria-label="Scan PPC equipment asset tag"
              autoComplete="off"
              autoFocus
              disabled={busy}
              enterKeyHint="done"
              inputMode="text"
              maxLength={80}
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Scan or type an asset tag"
              className={`${fieldClass} font-mono tracking-[0.08em]`}
            />
          </label>

          <button
            type="submit"
            disabled={busy || !barcode.trim()}
            className="w-full bg-white px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {busy ? "Processing" : `${activeCopy.label} item`}
          </button>
        </form>

        <div aria-live="polite">
          {error && (
            <div role="alert" className="border border-red-900/50 bg-red-900/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}
          {result && (
            <div role="status" className="border border-green-900/50 bg-green-900/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-green-400">
                {result.action === "checkout" ? "Checkout complete" : "Return complete"}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm text-neutral-100">{result.equipment.name}</span>
                <span className="font-mono text-xs text-neutral-400">{result.equipment.assetTag}</span>
                <span className="text-xs text-neutral-500">{result.loan.borrowerName}</span>
                {result.loan.dueDate && (
                  <span className="text-xs text-neutral-500">
                    Due {new Date(result.loan.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {result.discordSyncWarning && (
                <p className="mt-2 text-[10px] text-amber-300">{result.discordSyncWarning}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
