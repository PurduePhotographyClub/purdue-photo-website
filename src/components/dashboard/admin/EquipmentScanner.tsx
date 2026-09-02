import { useEffect, useRef, useState } from "react";
import { fetchApi, readErrorMessage, readJson } from "@/lib/http";

type ScanAction = "checkout" | "return";

interface ScannerEquipmentItem {
  assetTag: string | null;
  id: string;
  name: string;
  ownerId: string | null;
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
  items: ScannerEquipmentItem[];
  onCompleted: () => void;
}

const MODE_COPY: Record<ScanAction, { description: string; label: string }> = {
  checkout: {
    description: "Use after a PPC request is approved and the gear is handed to the borrower.",
    label: "Checkout",
  },
  return: {
    description: "Use when PPC gear is physically back at the equipment desk.",
    label: "Return",
  },
};

export default function EquipmentScanner({ items, onCompleted }: EquipmentScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [action, setAction] = useState<ScanAction>("checkout");
  const [barcode, setBarcode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const ppcItems = items.filter((item) => item.ownerId === null);

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

    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetchApi("/api/equipment/scan", {
        body: JSON.stringify({ action, barcode: cleanBarcode }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "The scan could not be completed."));
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
  const actionAccent = action === "checkout" ? "bg-cyan-400/70" : "bg-emerald-400/70";
  const scannerStatus = busy ? "Processing scan" : "Ready for the next scan";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden border border-neutral-800/80 bg-white/[0.015]">
        <span className={`block h-px w-full ${actionAccent}`}></span>
        <div className="border-b border-neutral-800 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">PPC equipment desk</p>
              <h2 className="text-2xl uppercase tracking-[0.08em] text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
                Scan station
              </h2>
              <p className="max-w-2xl text-sm leading-7 tracking-wider text-neutral-500">
                Choose the desk action, then scan or type an asset tag. The mode stays locked until you change it.
              </p>
            </div>
            <div className="grid gap-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500 sm:min-w-48">
              <div className="border border-neutral-800/80 bg-white/[0.02] px-3 py-2">
                <span className="block text-[8px] tracking-[0.24em] text-neutral-600">Desk mode</span>
                <span className="mt-1 block text-neutral-200">{activeCopy.label}</span>
              </div>
              <div className="border border-neutral-800/80 bg-white/[0.02] px-3 py-2">
                <span className="block text-[8px] tracking-[0.24em] text-neutral-600">PPC inventory</span>
                <span className="mt-1 block text-neutral-200">{ppcItems.length} items</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(17rem,0.9fr)]">
          <div className="space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Desk mode</p>
              <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Scanner action">
                {(["checkout", "return"] as const).map((mode) => {
                  const selected = action === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={selected}
                      disabled={busy}
                      onClick={() => chooseAction(mode)}
                  className={`min-h-14 border px-4 py-3 text-xs uppercase tracking-[0.16em] transition-colors disabled:opacity-50 ${
                        selected
                          ? mode === "checkout"
                            ? "border-cyan-800/60 bg-cyan-950/30 text-cyan-200"
                            : "border-emerald-800/60 bg-emerald-950/30 text-emerald-200"
                          : "border-neutral-800/80 bg-white/[0.02] text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"
                      }`}
                    >
                      {MODE_COPY[mode].label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-neutral-600">{activeCopy.description}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block space-y-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Asset tag</span>
                <input
                  ref={inputRef}
                  aria-label="Scan PPC equipment asset tag"
                  autoComplete="off"
                  disabled={busy}
                  enterKeyHint="done"
                  inputMode="text"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="Scan or type an asset tag"
                  className="w-full border border-neutral-800 bg-black px-4 py-4 font-mono text-base tracking-[0.08em] text-white placeholder:text-neutral-700 focus:border-white focus:outline-none disabled:opacity-50"
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={busy || !barcode.trim()}
                  className="w-full bg-white px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {busy ? "Processing" : `${activeCopy.label} scanned item`}
                </button>
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                  Press Enter to send the active desk action.
                </p>
              </div>
            </form>
          </div>

          <article className="group relative border border-neutral-800/80 bg-white/[0.015] p-4 transition-colors hover:border-neutral-700 hover:bg-white/[0.03]">
            <span className="absolute inset-x-0 top-0 h-px bg-neutral-700"></span>
            <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">Scanner status</p>
            <p className="mt-6 text-lg text-neutral-100">{scannerStatus}</p>
            <p className="mt-2 min-h-10 text-[10px] leading-5 tracking-wider text-neutral-600">
              {result
                ? `${result.equipment.name} is linked to ${result.loan.borrowerName}.`
                : "Keep the cursor in the field and the desk can move through scans without resetting the workflow."}
            </p>
            <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-neutral-700">
              The equipment list refreshes after each completed scan.
            </p>
          </article>
        </div>

        <div aria-live="polite" className="border-t border-neutral-800 px-4 py-4 sm:px-5">
          {error && (
            <div role="alert" className="border border-red-900/60 bg-red-950/20 p-3 text-xs text-red-300">
              {error}
            </div>
          )}
          {result && (
            <div className="border border-green-900/60 bg-green-950/20 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-green-400">
                {result.action === "checkout" ? "Checkout complete" : "Return complete"}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm text-neutral-100">{result.equipment.name}</span>
                <span className="font-mono text-xs text-neutral-400">{result.equipment.assetTag}</span>
                <span className="text-xs text-neutral-500">{result.loan.borrowerName}</span>
              </div>
              {result.loan.dueDate && (
                <p className="mt-2 text-[10px] text-neutral-400">Due {result.loan.dueDate}</p>
              )}
              {result.discordSyncWarning && (
                <p className="mt-2 text-[10px] text-amber-300">{result.discordSyncWarning}</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
