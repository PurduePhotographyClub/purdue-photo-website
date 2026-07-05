import { useMemo, useState } from "react";
import useSWR from "swr";
import { Aperture, ExternalLink, Film, Image as ImageIcon, PackageCheck, ShoppingBag } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import {
  DEFAULT_MERCH_CATEGORIES,
  getMerchImageUrl,
  getMerchPriceParts,
  type MerchCategoryContent,
  type MerchProductContent,
  type MerchProductStatus,
} from "../lib/merch-content";
import { fetchPublicJson, PUBLIC_API_SWR_OPTIONS } from "@/lib/http";

type Filter = "all" | string;

interface MerchResponse {
  products?: MerchProductContent[];
  categories?: MerchCategoryContent[];
}

const heroImg = "/merch/hero.webp";

const statusStyle: Record<MerchProductStatus, string> = {
  available: "border-green-900/60 bg-green-950/20 text-green-300",
  limited: "border-amber-900/70 bg-amber-950/20 text-amber-300",
  sold_out: "border-neutral-800 bg-neutral-950/70 text-neutral-500",
};

const statusLabel: Record<MerchProductStatus, string> = {
  available: "Available",
  limited: "Limited",
  sold_out: "Sold Out",
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function getCategoryIcon(category: string, categoryName: string) {
  const value = `${category} ${categoryName}`.toLowerCase();
  if (value.includes("roll") || value.includes("film")) return Film;
  if (value.includes("print")) return ImageIcon;
  return ShoppingBag;
}

function ProductVisual({ product }: { product: MerchProductContent }) {
  const imageUrl = getMerchImageUrl(product.imageR2Key);
  const Icon = getCategoryIcon(product.category, product.categoryName);

  if (imageUrl) {
    return (
      <ImageWithFallback
        src={imageUrl}
        alt={product.name}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-900">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.16), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.08), transparent 45%)" }} />
      <div className="absolute left-5 top-5 h-20 w-16 rotate-[-8deg] border border-neutral-700 bg-neutral-100/10" />
      <div className="absolute bottom-8 right-6 h-24 w-20 rotate-[10deg] border border-neutral-600 bg-neutral-100/5" />
      <div className="relative flex size-28 items-center justify-center border border-neutral-700 bg-black/30">
        <Icon size={44} className="text-neutral-500" strokeWidth={1.4} />
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: MerchProductContent }) {
  const external = isExternalHref(product.buyUrl);
  const canBuy = product.buyUrl && product.status !== "sold_out";
  const CategoryIcon = getCategoryIcon(product.category, product.categoryName);
  const priceParts = getMerchPriceParts(product.price);

  return (
    <article className={`group border bg-white/[0.02] transition-colors ${
      product.isFeatured ? "border-neutral-500" : "border-neutral-800 hover:border-neutral-600"
    }`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-900">
        <ProductVisual product={product} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 border border-neutral-700 bg-neutral-950/80 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-neutral-300 backdrop-blur-sm">
            <CategoryIcon size={10} />
            {product.categoryName}
          </span>
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              <PackageCheck size={10} />
              Featured
            </span>
          )}
        </div>
        <div className="absolute bottom-4 right-4">
          <span className={`border px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] ${statusStyle[product.status]}`}>
            {product.inventoryLabel || statusLabel[product.status]}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="min-h-32 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl leading-tight tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
              {product.name}
            </h2>
            <p className="flex shrink-0 items-start tracking-wider text-neutral-200" aria-label={product.price}>
              <span className="mt-1 text-xl leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>{priceParts.symbol}</span>
              <span className="text-3xl leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>{priceParts.whole}</span>
              <span className="mt-1 text-xs leading-none text-neutral-500">.{priceParts.cents}</span>
            </p>
          </div>
          {product.description && (
            <p className="text-xs leading-relaxed tracking-wider text-neutral-500">{product.description}</p>
          )}
        </div>

        {canBuy ? (
          <a
            href={product.buyUrl}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
            className="flex min-h-11 w-full items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
          >
            Buy
            {external && <ExternalLink size={12} />}
          </a>
        ) : (
          <span className="flex w-full items-center justify-center border border-neutral-800 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-neutral-600">
            {product.status === "sold_out" ? "Sold Out" : "Ask at Meeting"}
          </span>
        )}
      </div>
    </article>
  );
}

export default function Merch() {
  const { data, error, isLoading } = useSWR<MerchResponse>("/api/merch", fetchPublicJson, PUBLIC_API_SWR_OPTIONS);
  const responseProducts = data?.products;
  const responseCategories = data?.categories;
  const products = useMemo(() => (Array.isArray(responseProducts) ? responseProducts : []), [responseProducts]);
  const categories = useMemo(
    () => (Array.isArray(responseCategories) && responseCategories.length > 0 ? responseCategories : DEFAULT_MERCH_CATEGORIES),
    [responseCategories]
  );
  const status: "loading" | "loaded" | "error" = isLoading ? "loading" : error ? "error" : "loaded";
  const [filter, setFilter] = useState<Filter>("all");

  const filteredProducts = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((product) => product.category === filter);
  }, [filter, products]);

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const product of products) {
      byCategory.set(product.category, (byCategory.get(product.category) || 0) + 1);
    }
    return byCategory;
  }, [products]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <section className="relative min-h-[58vh] overflow-hidden border-b border-neutral-800 px-6 py-24">
        <div className="absolute top-0 left-0 right-0 h-32 z-10 bg-gradient-to-b from-neutral-950 to-transparent" />
        <div className="absolute inset-0">
          <ImageWithFallback src={heroImg} alt="PPC merch display with a film is not dead sign" className="h-full w-full opacity-35" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/75 via-neutral-950/50 to-neutral-950" />
        <div
          className="absolute bottom-0 left-0 right-0 h-8 opacity-80"
          style={{
            backgroundImage: "repeating-linear-gradient(to right, transparent, transparent 4px, #262626 4px, #262626 5px, transparent 5px, transparent 28px)",
            backgroundSize: "32px 100%",
          }}
        />

        <div className="relative z-10 mx-auto flex min-h-[38vh] max-w-6xl flex-col justify-center">
          <p className="mb-4 text-xs uppercase tracking-[0.4em] text-neutral-500">Club Store</p>
          <h1 className="max-w-3xl text-4xl tracking-[0.08em] text-neutral-100 sm:text-5xl md:text-6xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Our Merch
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed tracking-wider text-neutral-300">
            Current drops, prints, rolls, and small-batch PPC pieces for the photographers who still like something they can hold.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.4em] text-neutral-500">Categories</p>
              <h2 className="text-3xl tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
                Available Products
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", name: "All", count: products.length },
                ...categories.map((category) => ({
                  id: category.id,
                  name: category.name,
                  count: counts.get(category.id) || 0,
                })),
              ].map((item) => {
                const Icon = item.id === "all" ? ShoppingBag : getCategoryIcon(item.id, item.name);
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={`inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 ${
                      active
                        ? "border-neutral-200 bg-white text-black"
                        : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"
                    }`}
                  >
                    <Icon size={12} />
                    {item.name}
                    <span className={active ? "text-black/60" : "text-neutral-700"}>{item.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {status === "loading" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border border-neutral-800 bg-white/[0.02]">
                  <div className="aspect-[4/5] animate-pulse bg-neutral-900" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 animate-pulse bg-neutral-800" />
                    <div className="h-3 w-full animate-pulse bg-neutral-900" />
                    <div className="h-10 w-full animate-pulse bg-neutral-900" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="border border-red-950/60 bg-red-950/10 px-6 py-10 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-red-400">Could not load the store right now.</p>
            </div>
          )}

          {status === "loaded" && products.length === 0 && (
            <div className="grid grid-cols-1 items-center gap-8 border border-neutral-800 bg-white/[0.02] p-8 md:grid-cols-[0.9fr_1.1fr] md:p-12">
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-900">
                <ImageWithFallback src="/hero/film.webp" alt="Film negatives" className="h-full w-full object-cover grayscale opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <Aperture size={72} className="absolute bottom-6 right-6 text-neutral-400" strokeWidth={1.2} />
              </div>
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-600">Between Drops</p>
                <h3 className="mb-4 text-3xl tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
                  New merch is being prepared.
                </h3>
                <p className="max-w-xl text-sm leading-relaxed tracking-wider text-neutral-500">
                  Check back for fresh prints, film stock, and limited club pieces after the next admin update.
                </p>
              </div>
            </div>
          )}

          {status === "loaded" && products.length > 0 && filteredProducts.length === 0 && (
            <div className="border border-neutral-800 px-6 py-12 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-600">No products in this category yet.</p>
            </div>
          )}

          {status === "loaded" && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
