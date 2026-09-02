import { useEffect, useMemo, useRef, useState } from "react";
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
  const labelItems = useMemo(
    () => items
      .filter((item) => item.ownerId === null && item.assetTag)
      .sort((left, right) => (left.assetTag || "").localeCompare(right.assetTag || "")),
    [items],
  );

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

  return (
    <div className="space-y-5">
      <section className="border border-neutral-800 bg-white/[0.02] p-4 sm:p-5">
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">PPC equipment desk</p>
          <h2 className="text-lg font-medium text-neutral-100">Barcode scan station</h2>
          <p className="max-w-2xl text-xs leading-relaxed text-neutral-500">
            Select the physical action first, then scan the Code 128 asset-tag label. The selected mode stays active after every scan.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2" aria-label="Scanner action">
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
                      ? "border-blue-500 bg-blue-500/10 text-blue-200"
                      : "border-green-500 bg-green-500/10 text-green-200"
                    : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"
                }`}
              >
                {MODE_COPY[mode].label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-600">{activeCopy.description}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
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
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Scan label or type PPC-001"
              className="w-full border border-neutral-700 bg-black px-4 py-4 font-mono text-base tracking-[0.08em] text-white placeholder:text-neutral-700 focus:border-white focus:outline-none disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !barcode.trim()}
            className="w-full bg-white px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {busy ? "Processing" : `${activeCopy.label} scanned item`}
          </button>
        </form>

        <div aria-live="polite" className="mt-4 min-h-16">
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
              {result.discordSyncWarning && (
                <p className="mt-2 text-[10px] text-amber-300">{result.discordSyncWarning}</p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="border border-neutral-800 p-4">
          <p className="text-[9px] uppercase tracking-[0.24em] text-neutral-500">NETUM setup</p>
          <ol className="mt-3 space-y-2 text-xs leading-relaxed text-neutral-500">
            <li>1. Pair the scanner in Bluetooth HID mode so it acts like a keyboard.</li>
            <li>2. Configure an Enter suffix (CR) and leave the Code ID prefix disabled.</li>
            <li>3. Keep this scan field focused. Each scan submits when the scanner sends Enter.</li>
          </ol>
        </div>

        <details className="border border-neutral-800 p-4">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            Code 128 label values ({labelItems.length})
          </summary>
          <p className="mt-3 text-xs leading-relaxed text-neutral-600">
            In the label maker, choose Code 128 and encode the asset tag exactly as shown. Print the same value as human-readable text.
          </p>
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {labelItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border-t border-neutral-900 py-2 text-xs">
                <span className="min-w-0 truncate text-neutral-400">{item.name}</span>
                <code className="shrink-0 text-neutral-200">{item.assetTag}</code>
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}
