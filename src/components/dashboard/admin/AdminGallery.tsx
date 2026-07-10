import { useMemo, useReducer, useState } from "react";
import useSWR from "swr";
import { Search, X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage,
  readJson
} from "@/lib/http";
import {
  normalizeGalleryPageForUrl,
  type GalleryPage,
} from "@/lib/gallery-images";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";

const ADMIN_GALLERY_PAGE_SIZE = 60;
const ADMIN_GALLERY_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  keepPreviousData: false,
};

interface Photo {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string | null;
  description: string | null;
  tags: string | null;
  camera: string | null;
  lens: string | null;
  uploaderId: string;
  uploaderName: string | null;
  createdAt: string;
}
const EMPTY_ADMIN_GALLERY_PHOTOS: Photo[] = [];

async function fetchAdminGalleryPage(url: string) {
  const data = await fetchJson<unknown>(url);
  return normalizeGalleryPageForUrl<Photo>(data, url, ADMIN_GALLERY_PAGE_SIZE);
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

interface AdminGalleryState {
  error: string;
  success: string;
  deleteId: string | null;
  deleting: boolean;
  editPhoto: Photo | null;
  editTitle: string;
  editDescription: string;
  editTags: string;
  editCamera: string;
  editLens: string;
  saving: boolean;
  previewPhoto: Photo | null;
  filterTag: string | null;
  filterUser: string | null;
  userSearch: string;
  newTagInput: string;
}

const initialAdminGalleryState: AdminGalleryState = {
  error: "",
  success: "",
  deleteId: null,
  deleting: false,
  editPhoto: null,
  editTitle: "",
  editDescription: "",
  editTags: "",
  editCamera: "",
  editLens: "",
  saving: false,
  previewPhoto: null,
  filterTag: null,
  filterUser: null,
  userSearch: "",
  newTagInput: "",
};

function AdminGallerySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white/[0.02] border border-neutral-800 animate-pulse">
          <div className="aspect-square bg-neutral-800/50" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-neutral-800 rounded w-2/3" />
            <div className="h-2 bg-neutral-800/50 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface AdminGalleryFiltersProps {
  allTags: string[];
  allUploaders: [string, string][];
  filterTag: string | null;
  inputClass: string;
  onTagChange: (tag: string | null) => void;
  onUploaderSelect: (id: string, name: string) => void;
  onUserSearchChange: (value: string) => void;
  userSearch: string;
}

function AdminGalleryFilters({
  allTags,
  allUploaders,
  filterTag,
  inputClass,
  onTagChange,
  onUploaderSelect,
  onUserSearchChange,
  userSearch,
}: AdminGalleryFiltersProps) {
  const exactUploaderMatch = allUploaders.some(([, name]) => name.toLowerCase() === userSearch.toLowerCase());
  const uploaderMatches = userSearch && !exactUploaderMatch
    ? allUploaders.filter(([, name]) => name.toLowerCase().includes(userSearch.toLowerCase()))
    : [];

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
        <input aria-label="Search by uploader"
          type="text"
          placeholder="Search by uploader"
          value={userSearch}
          onChange={(e) => onUserSearchChange(e.target.value)}
          className={`${inputClass} pl-9 w-full`}
        />
        {uploaderMatches.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-neutral-950 border border-neutral-800 shadow-lg max-h-40 overflow-y-auto">
            {uploaderMatches.map(([id, name]) => (
              <button key={id} type="button" onClick={() => onUploaderSelect(id, name)}
                className="block w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 transition-colors">
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
      <select
        aria-label="Filter gallery by tag"
        value={filterTag || "all"}
        onChange={(e) => onTagChange(e.target.value === "all" ? null : e.target.value)}
        className={inputClass}
      >
        <option value="all">All tags</option>
        {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
      </select>
    </div>
  );
}

interface AdminGalleryGridProps {
  filterTag: string | null;
  filteredPhotos: Photo[];
  onDelete: (id: string) => void;
  onEdit: (photo: Photo) => void;
  onPreview: (photo: Photo) => void;
  onTagChange: (tag: string | null) => void;
  photos: Photo[];
}

function AdminGalleryGrid({
  filterTag,
  filteredPhotos,
  onDelete,
  onEdit,
  onPreview,
  onTagChange,
  photos,
}: AdminGalleryGridProps) {
  if (photos.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-neutral-800 p-12 text-center">
        <p className="text-xs text-neutral-600">No photos in the gallery yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {filteredPhotos.map((photo) => (
        <div key={photo.id} className="group bg-white/[0.02] border border-neutral-800 hover:border-neutral-600 transition-all overflow-hidden">
          <button type="button"
            className="aspect-square bg-neutral-900 relative cursor-pointer overflow-hidden"
            onClick={() => onPreview(photo)}
          >
            <img
              src={photo.thumbnailUrl}
              alt={photo.title || "Gallery photo"}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.classList.add("flex", "items-center", "justify-center");
                const span = document.createElement("span");
                span.className = "text-[10px] text-neutral-700";
                span.textContent = "Image unavailable";
                (e.target as HTMLImageElement).parentElement!.appendChild(span);
              }}
            />
          </button>

          <div className="p-3 space-y-1.5">
            <p className="text-xs text-neutral-200 truncate">{photo.title || "Untitled"}</p>
            <div className="flex items-center gap-2">
              {photo.uploaderName && (
                <span className="text-[10px] text-neutral-500 truncate">{photo.uploaderName}</span>
              )}
              <span className="text-[10px] text-neutral-700">{new Date(photo.createdAt).toLocaleDateString()}</span>
            </div>
            {photo.tags && (
              <div className="flex flex-wrap gap-1">
                {photo.tags.split(",").map((tag) => {
                  const trimmed = tag.trim();
                  if (!trimmed) return null;
                  const isActive = filterTag?.toLowerCase() === trimmed.toLowerCase();
                  return (
                    <button type="button"
                      key={trimmed}
                      onClick={(e) => { e.stopPropagation(); onTagChange(isActive ? null : trimmed); }}
                      className={`text-[9px] px-1.5 py-0.5 border uppercase tracking-wider transition-colors ${
                        isActive
                          ? "border-white text-white bg-white/10"
                          : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400"
                      }`}
                    >
                      {trimmed}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button type="button"
                onClick={() => onEdit(photo)}
                className="text-[10px] text-neutral-600 hover:text-neutral-200 transition-colors"
              >
                Edit
              </button>
              <span className="text-neutral-800">·</span>
              <button type="button"
                onClick={() => onDelete(photo.id)}
                className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface PhotoPreviewModalProps {
  onClose: () => void;
  photo: Photo;
}

function PhotoPreviewModal({ onClose, photo }: PhotoPreviewModalProps) {
  return (
    <ModalDialog ariaLabel="Gallery photo preview" onClose={onClose} className="flex items-center justify-center bg-black/90 p-4">
      <button type="button" tabIndex={-1} aria-label="Close photo preview" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <div className="relative z-10 max-w-4xl max-h-[90vh] w-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-neutral-200">{photo.title || "Untitled"}</p>
            {photo.uploaderName && <p className="text-[10px] text-neutral-500">by {photo.uploaderName}</p>}
          </div>
          <button type="button" aria-label="Close photo preview" onClick={onClose} className="text-neutral-600 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <img
          src={photo.imageUrl}
          alt={photo.title || "Gallery photo"}
          className="w-full max-h-[75vh] object-contain rounded"
        />
        <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-neutral-500">
          {photo.camera && <span>Camera: {photo.camera}</span>}
          {photo.lens && <span>Lens: {photo.lens}</span>}
          {photo.description && <span className="basis-full text-neutral-400">{photo.description}</span>}
        </div>
      </div>
    </ModalDialog>
  );
}

interface DeletePhotoModalProps {
  deleting: boolean;
  onClose: () => void;
  onDelete: () => void;
  target: Photo;
}

function DeletePhotoModal({ deleting, onClose, onDelete, target }: DeletePhotoModalProps) {
  return (
    <ModalDialog ariaLabel="Delete gallery photo" onClose={onClose} preventClose={deleting} className="flex items-center justify-center bg-black/80 p-4">
      <button type="button" tabIndex={-1} aria-label="Close delete photo dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !deleting && onClose()} />
      <div className="relative z-10 bg-neutral-950 border border-red-900/30 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm tracking-wider text-red-400">Delete Photo</h3>
          <button type="button" aria-label="Close delete photo dialog" disabled={deleting} onClick={onClose} className="text-neutral-600 hover:text-neutral-400 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-4 mb-4">
          <img
            src={target.thumbnailUrl}
            alt=""
            className="size-20 object-cover border border-neutral-800 flex-shrink-0"
          />
          <div>
            <p className="text-xs text-neutral-200">{target.title || "Untitled"}</p>
            {target.uploaderName && <p className="text-[10px] text-neutral-500 mt-0.5">by {target.uploaderName}</p>}
            <p className="text-[10px] text-neutral-700 mt-0.5">{new Date(target.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <p className="text-xs text-neutral-400 mb-6">
          This will permanently delete the photo and its image files. This action cannot be undone.
        </p>
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={onDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-[10px] tracking-wider uppercase text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting" : "Permanently Delete"}
          </button>
          <button type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-neutral-800 text-[10px] tracking-wider uppercase text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

interface EditPhotoModalProps {
  allTags: string[];
  editCamera: string;
  editDescription: string;
  editLens: string;
  editTagSet: Set<string>;
  editTags: string;
  editTitle: string;
  inputClass: string;
  newTagInput: string;
  onAddTag: (tag: string) => void;
  onCameraChange: (value: string) => void;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onLensChange: (value: string) => void;
  onNewTagInputChange: (value: string) => void;
  onRemoveTag: (tag: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onTitleChange: (value: string) => void;
  photo: Photo;
  saving: boolean;
}

function EditPhotoModal({
  allTags,
  editCamera,
  editDescription,
  editLens,
  editTagSet,
  editTags,
  editTitle,
  inputClass,
  newTagInput,
  onAddTag,
  onCameraChange,
  onClose,
  onDescriptionChange,
  onLensChange,
  onNewTagInputChange,
  onRemoveTag,
  onSubmit,
  onTitleChange,
  photo,
  saving,
}: EditPhotoModalProps) {
  const trimmedNewTag = newTagInput.trim();

  return (
    <ModalDialog ariaLabel="Edit gallery photo" onClose={onClose} preventClose={saving} className="flex items-center justify-center bg-black/80 p-4">
      <button type="button" tabIndex={-1} aria-label="Close edit photo dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !saving && onClose()} />
      <div className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto border border-neutral-800 bg-neutral-950 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm tracking-wider text-neutral-200">Edit Photo</h3>
          <button type="button" aria-label="Close edit photo dialog" disabled={saving} onClick={onClose} className="text-neutral-600 hover:text-neutral-400 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-4 mb-5">
          <img
            src={photo.thumbnailUrl}
            alt=""
            className="size-24 object-cover border border-neutral-800 flex-shrink-0"
          />
          <div className="text-[10px] text-neutral-500 space-y-0.5">
            {photo.uploaderName && <p>Uploaded by {photo.uploaderName}</p>}
            <p>{new Date(photo.createdAt).toLocaleDateString()}</p>
            <p className="text-neutral-700 break-all">ID: {photo.id}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="AdminGallery-title" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Title</label>
            <input id="AdminGallery-title" aria-label="Untitled" type="text" value={editTitle} onChange={(e) => onTitleChange(e.target.value)} placeholder="Untitled" className={inputClass} />
          </div>
          <div>
            <label htmlFor="AdminGallery-description" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Description</label>
            <textarea id="AdminGallery-description" aria-label="Description" value={editDescription} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Description" rows={3} className={inputClass + " resize-none"} />
          </div>
          <div>
            <label htmlFor="AdminGallery-new-tag" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Tags</label>
            {editTags && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editTags.split(",").map((tag) => {
                  const trimmed = tag.trim();
                  if (!trimmed) return null;
                  return (
                    <button
                      key={trimmed}
                      type="button"
                      onClick={() => onRemoveTag(trimmed)}
                      className="inline-flex items-center gap-1 text-[9px] px-2 py-1 border border-neutral-700 text-neutral-300 bg-white/5 hover:border-red-800 hover:text-red-400 transition-colors uppercase tracking-wider group"
                    >
                      {trimmed}
                      <span className="text-neutral-600 group-hover:text-red-400">✕</span>
                    </button>
                  );
                })}
              </div>
            )}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {allTags.flatMap((tag) => editTagSet.has(tag.toLowerCase()) ? [] : [
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onAddTag(tag)}
                    className="text-[9px] px-1.5 py-0.5 border border-dashed border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-wider"
                  >
                    + {tag}
                  </button>,
                ])}
              </div>
            )}
            <div className="flex gap-2">
              <input id="AdminGallery-new-tag" aria-label="Add custom tag"
                type="text"
                value={newTagInput}
                onChange={(e) => onNewTagInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && trimmedNewTag) {
                    e.preventDefault();
                    onAddTag(trimmedNewTag);
                  }
                }}
                placeholder="Add custom tag"
                className={inputClass}
              />
              {trimmedNewTag && (
                <button
                  type="button"
                  onClick={() => onAddTag(trimmedNewTag)}
                  className="px-3 py-2.5 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors whitespace-nowrap"
                >
                  Add
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="AdminGallery-camera" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Camera</label>
              <input id="AdminGallery-camera" aria-label="e.g. Canon AE-1" type="text" value={editCamera} onChange={(e) => onCameraChange(e.target.value)} placeholder="e.g. Canon AE-1" className={inputClass} />
            </div>
            <div>
              <label htmlFor="AdminGallery-lens" className="block text-[10px] tracking-wider uppercase text-neutral-600 mb-1.5">Lens</label>
              <input id="AdminGallery-lens" aria-label="e.g. 50mm f/1.4" type="text" value={editLens} onChange={(e) => onLensChange(e.target.value)} placeholder="e.g. 50mm f/1.4" className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 border border-neutral-800 text-[10px] tracking-wider uppercase text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ModalDialog>
  );
}

interface AdminGalleryPaginationProps {
  meta: GalleryPage<Photo>["meta"];
  onPageChange: (page: number) => void;
  pageNumbers: number[];
}

function AdminGalleryPagination({ meta, onPageChange, pageNumbers }: AdminGalleryPaginationProps) {
  if (meta.totalPages <= 1) return null;

  return (
    <nav aria-label="Admin gallery pagination" className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={!meta.hasPreviousPage}
        onClick={() => onPageChange(meta.page - 1)}
        className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 disabled:opacity-30"
      >
        Previous
      </button>
      {pageNumbers.map((pageNumber) => (
        <button
          type="button"
          key={pageNumber}
          aria-label={`Go to admin gallery page ${pageNumber}`}
          aria-current={pageNumber === meta.page ? "page" : undefined}
          onClick={() => onPageChange(pageNumber)}
          className={`min-h-11 min-w-11 border px-3 text-xs ${pageNumber === meta.page ? "border-white text-white" : "border-neutral-800 text-neutral-500"}`}
        >
          {pageNumber}
        </button>
      ))}
      <button
        type="button"
        disabled={!meta.hasNextPage}
        onClick={() => onPageChange(meta.page + 1)}
        className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 disabled:opacity-30"
      >
        Next
      </button>
    </nav>
  );
}

export default function AdminGallery() {
  const [page, setPage] = useState(1);
  const [state, dispatchState] = useReducer(keyedStateReducer<AdminGalleryState>, initialAdminGalleryState);
  const {
    error,
    success,
    deleteId,
    deleting,
    editPhoto,
    editTitle,
    editDescription,
    editTags,
    editCamera,
    editLens,
    saving,
    previewPhoto,
    filterTag,
    filterUser,
    userSearch,
    newTagInput,
  } = state;
  const setError = createKeyedStateSetter(dispatchState, "error");
  const setSuccess = createKeyedStateSetter(dispatchState, "success");
  const setDeleteId = createKeyedStateSetter(dispatchState, "deleteId");
  const setDeleting = createKeyedStateSetter(dispatchState, "deleting");
  const setEditPhoto = createKeyedStateSetter(dispatchState, "editPhoto");
  const setEditTitle = createKeyedStateSetter(dispatchState, "editTitle");
  const setEditDescription = createKeyedStateSetter(dispatchState, "editDescription");
  const setEditTags = createKeyedStateSetter(dispatchState, "editTags");
  const setEditCamera = createKeyedStateSetter(dispatchState, "editCamera");
  const setEditLens = createKeyedStateSetter(dispatchState, "editLens");
  const setSaving = createKeyedStateSetter(dispatchState, "saving");
  const setPreviewPhoto = createKeyedStateSetter(dispatchState, "previewPhoto");
  const setFilterTag = createKeyedStateSetter(dispatchState, "filterTag");
  const setFilterUser = createKeyedStateSetter(dispatchState, "filterUser");
  const setUserSearch = createKeyedStateSetter(dispatchState, "userSearch");
  const setNewTagInput = createKeyedStateSetter(dispatchState, "newTagInput");

  const inputClass = "w-full bg-transparent border border-neutral-800 px-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:border-neutral-600 focus:outline-none transition-colors";

  const {
    data: galleryPage,
    error: loadError,
    isLoading: loading,
    mutate: mutatePhotos,
  } = useSWR<GalleryPage<Photo>>(
    `/api/gallery?page=${page}&per_page=${ADMIN_GALLERY_PAGE_SIZE}&format=page`,
    fetchAdminGalleryPage,
    ADMIN_GALLERY_SWR_OPTIONS,
  );
  const photos = galleryPage?.photos ?? EMPTY_ADMIN_GALLERY_PHOTOS;
  const pageNumbers = galleryPage
    ? getVisiblePageNumbers(galleryPage.meta.page, galleryPage.meta.totalPages)
    : [];

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetchApi(`/api/gallery/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        const refreshedPage = await mutatePhotos();
        if (refreshedPage && refreshedPage.meta.page !== page) {
          setPage(refreshedPage.meta.page);
        }
        setSuccess("Photo deleted.");
        setDeleteId(null);
      } else {
        setError(await readErrorMessage(res, "Failed to delete photo."));
      }
    } catch {
      setError("Unable to delete photo.");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (photo: Photo) => {
    setEditPhoto(photo);
    setEditTitle(photo.title || "");
    setEditDescription(photo.description || "");
    setEditTags(photo.tags || "");
    setEditCamera(photo.camera || "");
    setEditLens(photo.lens || "");
    setError("");
    setSuccess("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPhoto) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetchApi(`/api/gallery/${editPhoto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle || null,
          description: editDescription || null,
          tags: editTags || null,
          camera: editCamera || null,
          lens: editLens || null,
        }),
      });
      if (res.ok) {
        const updated = await readJson<Photo>(res);
        void mutatePhotos((current) => current
          ? {
            ...current,
            photos: current.photos.map((photo) => photo.id === updated.id ? { ...photo, ...updated } : photo),
          }
          : current, { revalidate: false });
        setSuccess("Photo updated.");
        setEditPhoto(null);
      } else {
        setError(await readErrorMessage(res, "Failed to update photo."));
      }
    } catch {
      setError("Failed to update photo.");
    } finally {
      setSaving(false);
    }
  };

  const deleteTarget = photos.find((p) => p.id === deleteId);

  // Derive unique tags and uploaders
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    photos.forEach((p) => {
      if (p.tags) p.tags.split(",").forEach((t) => { const trimmed = t.trim(); if (trimmed) tagSet.add(trimmed); });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [photos]);

  const editTagSet = useMemo(
    () => new Set(editTags.split(",").flatMap((tag) => {
      const normalized = tag.trim().toLowerCase();
      return normalized ? [normalized] : [];
    })),
    [editTags],
  );

  const allUploaders = useMemo(() => {
    const map = new Map<string, string>();
    photos.forEach((p) => {
      if (p.uploaderName && !map.has(p.uploaderId)) map.set(p.uploaderId, p.uploaderName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    let result = photos;
    if (filterTag) {
      result = result.filter((p) => p.tags?.split(",").some((t) => t.trim().toLowerCase() === filterTag.toLowerCase()));
    }
    if (filterUser) {
      if (filterUser === "__searching__") {
        const q = userSearch.toLowerCase();
        result = result.filter((p) => p.uploaderName?.toLowerCase().includes(q));
      } else {
        result = result.filter((p) => p.uploaderId === filterUser);
      }
    }
    return result;
  }, [photos, filterTag, filterUser, userSearch]);

  const handleUserSearchChange = (value: string) => {
    setUserSearch(value);
    if (!value) {
      setFilterUser(null);
    } else {
      const match = allUploaders.find(([, name]) => name.toLowerCase() === value.toLowerCase());
      setFilterUser(match ? match[0] : "__searching__");
    }
  };

  const handleAddEditTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!editTagSet.has(trimmed.toLowerCase())) {
      setEditTags(editTags ? `${editTags}, ${trimmed}` : trimmed);
    }
    setNewTagInput("");
  };

  const handleRemoveEditTag = (tag: string) => {
    const updated = editTags
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.toLowerCase() !== tag.toLowerCase())
      .join(", ");
    setEditTags(updated);
  };
  const handlePageChange = (nextPage: number) => {
    if (!galleryPage || nextPage < 1 || nextPage > galleryPage.meta.totalPages) return;
    setFilterTag(null);
    setFilterUser(null);
    setUserSearch("");
    setPreviewPhoto(null);
    setPage(nextPage);
  };

  if (loading) return <AdminGallerySkeleton />;

  return (
    <div className="space-y-6">
      {(error || loadError) && <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/30 px-4 py-3">{error || "Failed to load gallery."}</p>}
      {success && <p className="text-xs text-green-400 bg-green-900/10 border border-green-900/30 px-4 py-3">{success}</p>}

      <AdminGalleryFilters
        allTags={allTags}
        allUploaders={allUploaders}
        filterTag={filterTag}
        inputClass={inputClass}
        onTagChange={setFilterTag}
        onUploaderSelect={(id, name) => { setFilterUser(id); setUserSearch(name); }}
        onUserSearchChange={handleUserSearchChange}
        userSearch={userSearch}
      />

      <p className="text-[10px] text-neutral-600 tracking-wider">
        Showing {filteredPhotos.length} on this page · {galleryPage?.meta.total ?? photos.length} total photo{(galleryPage?.meta.total ?? photos.length) !== 1 ? "s" : ""}
        {(filterTag || filterUser) && " · filters apply to this page"}
      </p>

      <AdminGalleryGrid
        filterTag={filterTag}
        filteredPhotos={filteredPhotos}
        onDelete={setDeleteId}
        onEdit={openEdit}
        onPreview={setPreviewPhoto}
        onTagChange={setFilterTag}
        photos={photos}
      />

      {galleryPage && (
        <AdminGalleryPagination
          meta={galleryPage.meta}
          onPageChange={handlePageChange}
          pageNumbers={pageNumbers}
        />
      )}

      {previewPhoto && (
        <PhotoPreviewModal onClose={() => setPreviewPhoto(null)} photo={previewPhoto} />
      )}

      {deleteId && deleteTarget && (
        <DeletePhotoModal
          deleting={deleting}
          onClose={() => setDeleteId(null)}
          onDelete={handleDelete}
          target={deleteTarget}
        />
      )}

      {editPhoto && (
        <EditPhotoModal
          allTags={allTags}
          editCamera={editCamera}
          editDescription={editDescription}
          editLens={editLens}
          editTagSet={editTagSet}
          editTags={editTags}
          editTitle={editTitle}
          inputClass={inputClass}
          newTagInput={newTagInput}
          onAddTag={handleAddEditTag}
          onCameraChange={setEditCamera}
          onClose={() => setEditPhoto(null)}
          onDescriptionChange={setEditDescription}
          onLensChange={setEditLens}
          onNewTagInputChange={setNewTagInput}
          onRemoveTag={handleRemoveEditTag}
          onSubmit={handleSaveEdit}
          onTitleChange={setEditTitle}
          photo={editPhoto}
          saving={saving}
        />
      )}
    </div>
  );
}
