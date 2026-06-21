import { useMemo, useReducer } from "react";
import useSWR from "swr";
import { CheckCircle2, Edit3, ExternalLink, Film, Image as ImageIcon, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";
import {
  DEFAULT_MERCH_CATEGORIES,
  getMerchImageUrl,
  MERCH_STATUSES,
  type MerchCategoryContent,
  type MerchProductContent,
  type MerchProductStatus,
} from "../../../lib/merch-content";
import { fetchApi } from "@/lib/http";

type SubmitState = "idle" | "loading" | "success" | "error";

interface MerchResponse {
  products?: MerchProductContent[];
  product?: MerchProductContent | null;
  categories?: MerchCategoryContent[];
  error?: string;
}

interface ProductFormState {
  name: string;
  description: string;
  category: string;
  price: string;
  buyUrl: string;
  status: MerchProductStatus;
  inventoryLabel: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: string;
}

function getProductIcon(category: string, categoryName = "") {
  const value = `${category} ${categoryName}`.toLowerCase();
  if (value.includes("roll") || value.includes("film")) return Film;
  return ImageIcon;
}

function priceToInputValue(price: string) {
  return price.replace(/^\$/, "").trim();
}

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  category: "current-drops",
  price: "",
  buyUrl: "",
  status: "available",
  inventoryLabel: "",
  isActive: true,
  isFeatured: false,
  sortOrder: "0",
};

function cloneForm(product: MerchProductContent): ProductFormState {
  return {
    name: product.name,
    description: product.description,
    category: product.category,
    price: priceToInputValue(product.price),
    buyUrl: product.buyUrl,
    status: product.status,
    inventoryLabel: product.inventoryLabel,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    sortOrder: String(product.sortOrder),
  };
}

async function fetchMerchResponse(url: string): Promise<MerchResponse> {
  const res = await fetchApi(url);
  const data = await res.json().catch(() => ({})) as MerchResponse;
  if (!res.ok) {
    throw new Error(data.error || "Failed to load merch products.");
  }
  return data;
}

interface AdminMerchState {
  form: ProductFormState;
  editingProduct: MerchProductContent | null;
  imageFile: File | null;
  removeImage: boolean;
  submitState: SubmitState;
  notice: string;
  deleteTarget: MerchProductContent | null;
  deleteLoading: boolean;
  filter: "all" | string;
}

const initialAdminMerchState: AdminMerchState = {
  form: emptyForm,
  editingProduct: null,
  imageFile: null,
  removeImage: false,
  submitState: "idle",
  notice: "",
  deleteTarget: null,
  deleteLoading: false,
  filter: "all",
};

type ProductFieldUpdater = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => void;

interface MerchProductFormProps {
  categories: MerchCategoryContent[];
  editingProduct: MerchProductContent | null;
  form: ProductFormState;
  hasImage: boolean;
  imageFile: File | null;
  inputClass: string;
  noticeIsError: boolean;
  noticeMessage: string;
  onDeleteRequest: (product: MerchProductContent) => void;
  onFieldChange: ProductFieldUpdater;
  onImageFileChange: (file: File | null) => void;
  onRemoveImageChange: (remove: boolean) => void;
  onReset: () => void;
  onSubmit: (event: React.FormEvent) => void;
  removeImage: boolean;
  submitState: SubmitState;
}

function MerchProductForm({
  categories,
  editingProduct,
  form,
  hasImage,
  imageFile,
  inputClass,
  noticeIsError,
  noticeMessage,
  onDeleteRequest,
  onFieldChange,
  onImageFileChange,
  onRemoveImageChange,
  onReset,
  onSubmit,
  removeImage,
  submitState,
}: MerchProductFormProps) {
  const categoryName = categories.find((category) => category.id === form.category)?.name || "";
  const PlaceholderIcon = getProductIcon(form.category, categoryName);

  return (
    <form id="merch-product-form" onSubmit={onSubmit} className="border border-neutral-800 bg-white/[0.02] p-5">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] uppercase tracking-[0.24em] text-neutral-600">
            {editingProduct ? "Editing Product" : "New Product"}
          </p>
          <h2 className="text-xl tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
            {editingProduct ? editingProduct.name : "Add Merch"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/merch"
            className="inline-flex items-center gap-2 border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
          >
            <ExternalLink size={12} />
            View Page
          </a>
          {editingProduct && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 border border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
            >
              <Plus size={12} />
              New
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Name</span>
              <input
                value={form.name}
                onChange={(e) => onFieldChange("name", e.target.value)}
                maxLength={100}
                required
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Price</span>
              <div className="flex min-h-10 items-center border border-neutral-800 bg-black/20 focus-within:border-neutral-600">
                <span className="px-3 text-2xl leading-none text-neutral-200" style={{ fontFamily: "'Playfair Display', serif" }}>$</span>
                <input aria-label="15.00"
                  type="number"
                  value={form.price}
                  onChange={(e) => onFieldChange("price", e.target.value)}
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="15.00"
                  required
                  className="w-full bg-transparent px-1 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-700"
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              maxLength={800}
              rows={4}
              className={`${inputClass} resize-none leading-6`}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Category</span>
              <select
                value={form.category}
                onChange={(e) => onFieldChange("category", e.target.value)}
                className={inputClass}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Status</span>
              <select
                value={form.status}
                onChange={(e) => onFieldChange("status", e.target.value as MerchProductStatus)}
                className={inputClass}
              >
                {MERCH_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Inventory Label</span>
              <input aria-label="In stock"
                value={form.inventoryLabel}
                onChange={(e) => onFieldChange("inventoryLabel", e.target.value)}
                maxLength={80}
                placeholder="In stock"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Sort</span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => onFieldChange("sortOrder", e.target.value)}
                min={-999}
                max={9999}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Buy Link</span>
            <input aria-label="https://"
              type="text"
              value={form.buyUrl}
              onChange={(e) => onFieldChange("buyUrl", e.target.value)}
              maxLength={500}
              placeholder="https://"
              className={inputClass}
            />
          </label>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => onFieldChange("isActive", e.target.checked)}
                className="size-4 accent-neutral-200"
              />
              Published
            </label>
            <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => onFieldChange("isFeatured", e.target.checked)}
                className="size-4 accent-neutral-200"
              />
              Featured
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-neutral-500">Product Image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                onImageFileChange(file);
                if (file) onRemoveImageChange(false);
              }}
              className="block w-full cursor-pointer border border-neutral-800 bg-black/20 text-xs text-neutral-500 file:mr-3 file:border-0 file:bg-neutral-800 file:px-3 file:py-2.5 file:text-[10px] file:uppercase file:tracking-[0.16em] file:text-neutral-300 hover:file:bg-neutral-700"
            />
          </label>

          <div className="relative aspect-[4/3] overflow-hidden border border-neutral-800 bg-neutral-900">
            {imageFile ? (
              <div className="flex h-full w-full items-center justify-center px-5 text-center">
                <p className="break-all text-xs leading-relaxed tracking-wider text-neutral-400">{imageFile.name}</p>
              </div>
            ) : hasImage && editingProduct?.imageR2Key ? (
              <img
                src={getMerchImageUrl(editingProduct.imageR2Key)}
                alt={editingProduct.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <PlaceholderIcon size={48} className="text-neutral-700" />
              </div>
            )}
          </div>

          {editingProduct?.imageR2Key && (
            <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              <input
                type="checkbox"
                checked={removeImage}
                onChange={(e) => {
                  onRemoveImageChange(e.target.checked);
                  if (e.target.checked) onImageFileChange(null);
                }}
                className="size-4 accent-neutral-200"
              />
              Remove Image
            </label>
          )}
        </div>
      </div>

      <div className="mt-5 min-h-5">
        {noticeMessage && (
          <p className={`flex items-center gap-2 text-xs ${noticeIsError ? "text-red-400" : "text-green-400"}`}>
            {submitState === "success" && <CheckCircle2 size={14} />}
            {noticeMessage}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {editingProduct && (
          <button
            type="button"
            onClick={() => onDeleteRequest(editingProduct)}
            className="inline-flex items-center gap-2 border border-red-950/70 px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-red-500 transition-colors hover:border-red-800 hover:text-red-400"
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
        <button
          type="submit"
          disabled={submitState === "loading" || !form.name.trim() || !form.price.trim()}
          className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitState === "loading" ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save Product
        </button>
      </div>
    </form>
  );
}

interface MerchProductListProps {
  categories: MerchCategoryContent[];
  filter: string;
  filteredProducts: MerchProductContent[];
  iconButtonClass: string;
  onEdit: (product: MerchProductContent) => void;
  onFilterChange: (filter: string) => void;
  products: MerchProductContent[];
}

function MerchProductList({
  categories,
  filter,
  filteredProducts,
  iconButtonClass,
  onEdit,
  onFilterChange,
  products,
}: MerchProductListProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Products</h2>
          <p className="mt-1 text-[10px] text-neutral-700">{products.length} total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", name: "All" },
            ...categories.map((category) => ({ id: category.id, name: category.name })),
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={`border px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] transition-colors ${
                filter === item.id
                  ? "border-neutral-200 bg-white text-black"
                  : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="border border-neutral-800 px-4 py-8 text-center text-xs text-neutral-600">
          No merch products yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const ProductIcon = getProductIcon(product.category, product.categoryName);

            return (
              <article key={product.id} className="border border-neutral-800 bg-white/[0.02]">
                <div className="grid grid-cols-[96px_1fr] gap-4 p-3">
                  <div className="aspect-square overflow-hidden bg-neutral-900">
                    {product.imageR2Key ? (
                      <img src={getMerchImageUrl(product.imageR2Key)} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ProductIcon size={28} className="text-neutral-700" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm text-neutral-200">{product.name}</h3>
                        <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-neutral-600">{product.categoryName} · {product.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className={iconButtonClass}
                        aria-label={`Edit ${product.name}`}
                        title="Edit product"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${
                        product.isActive
                          ? "border-green-900/70 text-green-400"
                          : "border-neutral-800 text-neutral-600"
                      }`}>
                        {product.isActive ? "Published" : "Hidden"}
                      </span>
                      {product.isFeatured && (
                        <span className="border border-neutral-700 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-neutral-400">
                          Featured
                        </span>
                      )}
                      <span className="border border-neutral-800 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-neutral-500">
                        {product.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DeleteMerchProductModalProps {
  deleteLoading: boolean;
  iconButtonClass: string;
  onClose: () => void;
  onConfirm: () => void;
  target: MerchProductContent;
}

function DeleteMerchProductModal({
  deleteLoading,
  iconButtonClass,
  onClose,
  onConfirm,
  target,
}: DeleteMerchProductModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex h-dvh w-dvw items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md border border-neutral-800 bg-neutral-950 p-6 shadow-2xl shadow-black/60">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[9px] uppercase tracking-[0.24em] text-red-500">Delete Product</p>
            <h3 className="text-xl tracking-wider text-neutral-100" style={{ fontFamily: "'Playfair Display', serif" }}>
              {target.name}
            </h3>
          </div>
          <button type="button" onClick={onClose} className={iconButtonClass} aria-label="Close delete dialog" title="Close">
            <X size={14} />
          </button>
        </div>
        <p className="mb-6 text-sm leading-relaxed tracking-wider text-neutral-500">
          This product will be removed from the store and dashboard.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-neutral-800 px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleteLoading}
            className="inline-flex items-center gap-2 border border-red-900 bg-red-950/30 px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-red-300 transition-colors hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleteLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMerch() {
  const [state, dispatchState] = useReducer(keyedStateReducer<AdminMerchState>, initialAdminMerchState);
  const {
    form,
    editingProduct,
    imageFile,
    removeImage,
    submitState,
    notice,
    deleteTarget,
    deleteLoading,
    filter,
  } = state;
  const setForm = createKeyedStateSetter(dispatchState, "form");
  const setEditingProduct = createKeyedStateSetter(dispatchState, "editingProduct");
  const setImageFile = createKeyedStateSetter(dispatchState, "imageFile");
  const setRemoveImage = createKeyedStateSetter(dispatchState, "removeImage");
  const setSubmitState = createKeyedStateSetter(dispatchState, "submitState");
  const setNotice = createKeyedStateSetter(dispatchState, "notice");
  const setDeleteTarget = createKeyedStateSetter(dispatchState, "deleteTarget");
  const setDeleteLoading = createKeyedStateSetter(dispatchState, "deleteLoading");
  const setFilter = createKeyedStateSetter(dispatchState, "filter");

  const inputClass = "box-border w-full border border-neutral-800 bg-black/20 px-3 py-2 text-sm text-neutral-200 outline-none transition-colors placeholder:text-neutral-700 focus:border-neutral-600";
  const iconButtonClass = "inline-flex size-9 items-center justify-center border border-neutral-800 text-neutral-500 transition-colors hover:border-neutral-600 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40";
  const {
    data: merchData,
    error: loadError,
    isLoading: loading,
    mutate: mutateMerch,
  } = useSWR<MerchResponse>("/api/admin/merch", fetchMerchResponse);
  const products = useMemo(
    () => Array.isArray(merchData?.products) ? merchData.products : [],
    [merchData?.products],
  );
  const categories = useMemo(
    () => Array.isArray(merchData?.categories) && merchData.categories.length > 0
      ? merchData.categories
      : DEFAULT_MERCH_CATEGORIES,
    [merchData?.categories],
  );
  const noticeMessage = notice || (loadError instanceof Error ? loadError.message : loadError ? "Failed to load merch products." : "");

  const filteredProducts = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((product) => product.category === filter);
  }, [filter, products]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setImageFile(null);
    setRemoveImage(false);
    setSubmitState("idle");
    setNotice("");
  };

  const startEditing = (product: MerchProductContent) => {
    setEditingProduct(product);
    setForm(cloneForm(product));
    setImageFile(null);
    setRemoveImage(false);
    setNotice("");
    setSubmitState("idle");
    document.getElementById("merch-product-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateField = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const buildPayload = () => {
    const payload = new FormData();
    payload.set("name", form.name);
    payload.set("description", form.description);
    payload.set("category", form.category);
    payload.set("price", form.price);
    payload.set("buyUrl", form.buyUrl);
    payload.set("status", form.status);
    payload.set("inventoryLabel", form.inventoryLabel);
    payload.set("isActive", form.isActive ? "true" : "false");
    payload.set("isFeatured", form.isFeatured ? "true" : "false");
    payload.set("sortOrder", form.sortOrder);
    payload.set("removeImage", removeImage ? "true" : "false");
    if (imageFile) {
      payload.set("image", imageFile);
    }
    return payload;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitState("loading");
    setNotice("");

    try {
      const endpoint = editingProduct ? `/api/admin/merch/${editingProduct.id}` : "/api/admin/merch";
      const res = await fetchApi(endpoint, {
        method: editingProduct ? "PATCH" : "POST",
        body: buildPayload(),
      });
      const data = await res.json().catch(() => ({})) as MerchResponse;

      if (!res.ok || !data.product) {
        throw new Error(data.error || "Failed to save product.");
      }

      void mutateMerch((current) => {
        const currentProducts = Array.isArray(current?.products) ? current.products : [];
        if (editingProduct) {
          return {
            ...current,
            products: currentProducts.map((product) => product.id === data.product!.id ? data.product! : product),
          };
        }
        return { ...current, products: [data.product!, ...currentProducts] };
      }, { revalidate: false });
      setEditingProduct(data.product);
      setForm(cloneForm(data.product));
      setImageFile(null);
      setRemoveImage(false);
      setSubmitState("success");
      setNotice("Product saved.");
      setTimeout(() => {
        setSubmitState("idle");
        setNotice("");
      }, 4000);
    } catch (err) {
      setSubmitState("error");
      setNotice(err instanceof Error ? err.message : "Failed to save product.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setNotice("");

    try {
      const res = await fetchApi(`/api/admin/merch/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({})) as MerchResponse;
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete product.");
      }

      void mutateMerch((current) => ({
        ...current,
        products: (Array.isArray(current?.products) ? current.products : []).filter((product) => product.id !== deleteTarget.id),
      }), { revalidate: false });
      if (editingProduct?.id === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      setSubmitState("success");
      setNotice("Product deleted.");
      setTimeout(() => {
        setSubmitState("idle");
        setNotice("");
      }, 4000);
    } catch (err) {
      setSubmitState("error");
      setNotice(err instanceof Error ? err.message : "Failed to delete product.");
    }

    setDeleteLoading(false);
  };

  const hasImage = Boolean(editingProduct?.imageR2Key) && !removeImage;

  if (loading) return <p className="text-xs text-neutral-500">Loading merch products</p>;

  return (
    <div className="space-y-8">
      <MerchProductForm
        categories={categories}
        editingProduct={editingProduct}
        form={form}
        hasImage={hasImage}
        imageFile={imageFile}
        inputClass={inputClass}
        noticeIsError={submitState === "error" || Boolean(loadError)}
        noticeMessage={noticeMessage}
        onDeleteRequest={setDeleteTarget}
        onFieldChange={updateField}
        onImageFileChange={setImageFile}
        onRemoveImageChange={setRemoveImage}
        onReset={resetForm}
        onSubmit={handleSubmit}
        removeImage={removeImage}
        submitState={submitState}
      />

      <MerchProductList
        categories={categories}
        filter={filter}
        filteredProducts={filteredProducts}
        iconButtonClass={iconButtonClass}
        onEdit={startEditing}
        onFilterChange={setFilter}
        products={products}
      />

      {deleteTarget && (
        <DeleteMerchProductModal
          deleteLoading={deleteLoading}
          iconButtonClass={iconButtonClass}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          target={deleteTarget}
        />
      )}
    </div>
  );
}
