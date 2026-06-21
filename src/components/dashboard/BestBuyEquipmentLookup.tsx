import { useDeferredValue, useState } from "react";
import useSWR from "swr";
import { Loader2, Search, X } from "lucide-react";
import { fetchApi, PUBLIC_API_SWR_OPTIONS, readErrorMessage, readJson } from "@/lib/http";
import { getEquipmentCategoryLabel, type EquipmentCategory } from "@/lib/equipment";

export interface EquipmentAutofill {
  name: string;
  model: string;
  description: string;
  category: EquipmentCategory;
}

interface BestBuySuggestion {
  sku: number;
  name: string;
  manufacturer: string | null;
  model: string | null;
  description: string | null;
  category: EquipmentCategory;
  image: string | null;
  price: number | null;
}

interface BestBuySearchResponse {
  results?: BestBuySuggestion[];
}

interface Props {
  onSelect: (fields: EquipmentAutofill) => void;
  className?: string;
  inputClassName?: string;
}

const BEST_BUY_SEARCH_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  dedupingInterval: 30_000,
};

async function fetchBestBuySuggestions(url: string): Promise<BestBuySearchResponse> {
  const response = await fetchApi(url);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Unable to search Best Buy."));
  }
  return readJson<BestBuySearchResponse>(response);
}

export default function BestBuyEquipmentLookup({ onSelect, className = "", inputClassName = "" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim();
  const searchKey = trimmed.length >= 2 ? `/api/equipment/bestbuy-search?q=${encodeURIComponent(trimmed)}` : null;
  const { data, error: searchError, isLoading, isValidating } = useSWR<BestBuySearchResponse>(
    searchKey,
    fetchBestBuySuggestions,
    BEST_BUY_SEARCH_SWR_OPTIONS,
  );
  const results = data?.results || [];
  const loading = Boolean(searchKey && (isLoading || isValidating));
  const error = searchError instanceof Error ? searchError.message : searchError ? "Unable to search Best Buy." : "";

  const selectResult = (result: BestBuySuggestion) => {
    onSelect({
      name: result.name,
      model: result.model || "",
      description: result.description || "",
      category: result.category,
    });
    setQuery([result.manufacturer, result.model].filter(Boolean).join(" ") || result.name);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
        <input aria-label="Search Best Buy model"
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder="Search Best Buy model"
          autoComplete="off"
          className={`${inputClassName} pl-9 pr-10`}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-neutral-500" aria-hidden="true" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 transition-colors hover:text-neutral-300"
            aria-label="Clear Best Buy search"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open && (results.length > 0 || error) && (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/50">
          {error ? (
            <p className="p-3 text-xs text-red-400">{error}</p>
          ) : (
            results.map((result) => (
              <button
                key={result.sku}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectResult(result)}
                className="flex w-full items-center gap-3 border-b border-neutral-900 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.04]"
              >
                {result.image ? (
                  <img src={result.image} alt="" className="size-11 shrink-0 object-contain" />
                ) : (
                  <div className="size-11 shrink-0 border border-neutral-800 bg-neutral-900" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-neutral-200">{result.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-neutral-500">
                    {result.model && <span>{result.model}</span>}
                    <span>{getEquipmentCategoryLabel(result.category)}</span>
                    {typeof result.price === "number" && <span>${result.price.toFixed(2)}</span>}
                  </span>
                  {result.description && (
                    <span className="mt-1 block max-h-8 overflow-hidden text-[10px] leading-4 text-neutral-600">
                      {result.description}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
