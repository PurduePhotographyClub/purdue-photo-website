import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
  type Dispatch,
  type SetStateAction,
} from "react";
import useSWR from "swr";
import AccessUpsellPanel from "@/components/dashboard/AccessUpsellPanel";
import ModalDialog from "@/components/ModalDialog";
import GalleryPhotoEditModal from "@/components/dashboard/gallery/GalleryPhotoEditModal";
import GalleryPhotoPreviewModal from "@/components/dashboard/gallery/GalleryPhotoPreviewModal";
import type {
  GalleryPhoto,
  GalleryPhotoUpdates,
} from "@/components/dashboard/gallery/types";
import {
  fetchApi,
  fetchJson,
  readErrorMessage,
  readJson,
} from "@/lib/http";
import {
  GALLERY_TAGS,
  getPrimaryGalleryTag,
  makeGalleryTagPrimary,
  serializeGalleryTags,
} from "@/lib/gallery-tags";

function changeGalleryManagerPage(
  setExpanded: Dispatch<SetStateAction<string | null>>,
  setEditTarget: Dispatch<SetStateAction<string | null>>,
  setDeleteTarget: Dispatch<SetStateAction<string | null>>,
  setPage: Dispatch<SetStateAction<number>>,
  nextPage: number,
) {
  setExpanded(null);
  setEditTarget(null);
  setDeleteTarget(null);
  setPage(nextPage);
}
import {
  getGalleryUploadValidationError,
  getGalleryUploadSourceValidationError,
  normalizeGalleryPageForUrl,
  prepareGalleryUploadImages,
  type GalleryPage,
} from "@/lib/gallery-images";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";

const GALLERY_MANAGER_PAGE_SIZE = 15;
const EMPTY_GALLERY_PHOTOS: GalleryPhoto[] = [];
const GALLERY_INPUT_CLASS =
  "w-full px-4 py-3 bg-white/[0.02] border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors";

interface Props {
  userRole: string;
  userTier: string | null;
}

async function fetchGalleryPhotos(url: string) {
  const data = await fetchJson<unknown>(url);
  return normalizeGalleryPageForUrl<GalleryPhoto>(data, url, GALLERY_MANAGER_PAGE_SIZE);
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

interface GalleryManagerPaginationProps {
  meta: GalleryPage<GalleryPhoto>["meta"];
  onPageChange: (page: number) => void;
  pageNumbers: number[];
}

function GalleryManagerPagination({
  meta,
  onPageChange,
  pageNumbers,
}: GalleryManagerPaginationProps) {
  if (meta.totalPages <= 1) return null;

  return (
    <nav aria-label="Member gallery pagination" className="flex flex-wrap items-center justify-center gap-2">
      <p role="status" aria-live="polite" className="w-full text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600">
        Page {meta.page} of {meta.totalPages}
      </p>
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
          aria-label={`Go to member gallery page ${pageNumber}`}
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

interface GalleryManagerState {
  uploading: boolean;
  title: string;
  description: string;
  selectedTags: string[];
  camera: string;
  lens: string;
  showName: boolean;
  error: string;
  editError: string;
  success: string;
  preview: string | null;
  expanded: string | null;
  editTarget: string | null;
  savingEdit: boolean;
  deleteTarget: string | null;
  deleting: boolean;
}

const initialGalleryManagerState: GalleryManagerState = {
  uploading: false,
  title: "",
  description: "",
  selectedTags: [],
  camera: "",
  lens: "",
  showName: true,
  error: "",
  editError: "",
  success: "",
  preview: null,
  expanded: null,
  editTarget: null,
  savingEdit: false,
  deleteTarget: null,
  deleting: false,
};

interface GalleryUploadPanelProps {
  camera: string;
  description: string;
  errorMessage: string;
  fileRef: RefObject<HTMLInputElement | null>;
  inputClass: string;
  lens: string;
  onCameraChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFileChange: () => void;
  onLensChange: (value: string) => void;
  onShowNameToggle: () => void;
  onSubmit: (event: FormEvent) => void;
  onTagMakePrimary: (tag: string) => void;
  onTagToggle: (tag: string) => void;
  onTitleChange: (value: string) => void;
  preview: string | null;
  selectedTags: string[];
  showName: boolean;
  success: string;
  title: string;
  uploading: boolean;
}

function GalleryUploadPanel({
  camera,
  description,
  errorMessage,
  fileRef,
  inputClass,
  lens,
  onCameraChange,
  onDescriptionChange,
  onFileChange,
  onLensChange,
  onShowNameToggle,
  onSubmit,
  onTagMakePrimary,
  onTagToggle,
  onTitleChange,
  preview,
  selectedTags,
  showName,
  success,
  title,
  uploading,
}: GalleryUploadPanelProps) {
  return (
    <div className="bg-white/[0.02] border border-neutral-800 p-4 sm:p-6">
      <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-4">Upload Photo</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <input
              aria-label="Photo upload"
              ref={fileRef}
              type="file"
              accept="image/jpeg,.jpg,.jpeg"
              required
              onChange={onFileChange}
              className="block w-full max-w-full text-xs leading-6 text-neutral-500 file:mr-4 file:py-2.5 file:px-4 file:border file:border-neutral-800 file:text-[10px] file:tracking-wider file:uppercase file:bg-transparent file:text-neutral-400 hover:file:text-white hover:file:border-neutral-600 file:cursor-pointer file:transition-colors"
            />
            <p className="text-[10px] text-neutral-600 mt-1.5 tracking-wider">JPG / JPEG only · Up to 1.5 MB after optimization</p>
          </div>
          {preview && (
            <div className="size-20 shrink-0 overflow-hidden border border-neutral-800">
              <img src={preview} alt="Preview" className="size-full object-cover" />
            </div>
          )}
        </div>
        <input aria-label="Title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Title"
          required
          className={inputClass}
        />
        <input aria-label="Description"
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Description (optional)"
          maxLength={1000}
          className={inputClass}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input aria-label="Camera"
            type="text"
            value={camera}
            onChange={(e) => onCameraChange(e.target.value)}
            placeholder="Camera (optional)"
            className={inputClass}
          />
          <input aria-label="Lens"
            type="text"
            value={lens}
            onChange={(e) => onLensChange(e.target.value)}
            placeholder="Lens (optional)"
            className={inputClass}
          />
        </div>
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-2">Tags (optional)</p>
          <div className="flex flex-wrap gap-2">
            {GALLERY_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onTagToggle(tag)}
                  className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase border transition-colors ${
                    active
                      ? "border-white text-white bg-white/[0.06]"
                      : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {selectedTags.length > 0 && (
            <div className="mt-3 border-l border-neutral-800 pl-3">
              <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">Main tag</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTags.map((tag, index) => (
                  <button
                    key={tag}
                    type="button"
                    aria-label={index === 0 ? `${tag} is the main tag` : `Make ${tag} the main tag`}
                    aria-pressed={index === 0}
                    disabled={index === 0}
                    onClick={() => onTagMakePrimary(tag)}
                    className={`min-h-9 border px-3 text-[9px] uppercase tracking-wider transition-colors ${index === 0 ? "border-white bg-white/[0.08] text-white" : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"}`}
                  >
                    {tag}{index === 0 ? " (Main)" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 cursor-pointer group">
          <button
            type="button"
            aria-label={showName ? "Hide my name on photo" : "Show my name on photo"}
            onClick={onShowNameToggle}
            className={`w-9 h-5 rounded-full relative transition-colors ${showName ? "bg-white" : "bg-neutral-800"}`}
          >
            <span className={`block size-3.5 rounded-full absolute top-[3px] transition-all ${showName ? "left-[18px] bg-black" : "left-[3px] bg-neutral-600"}`} />
          </button>
          <span className="text-[10px] tracking-[0.15em] uppercase text-neutral-500 group-hover:text-neutral-400 transition-colors">
            Show my name on photo
          </span>
        </div>
        {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}
        <button
          type="submit"
          disabled={uploading}
          className="w-full px-6 py-2.5 bg-white text-black text-[10px] tracking-[0.15em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50 sm:w-auto"
        >
          {uploading ? "Uploading" : "Upload"}
        </button>
      </form>
    </div>
  );
}

interface GalleryPhotoGridProps {
  canUpload: boolean;
  loading: boolean;
  onDelete: (photoId: string) => void;
  onEdit: (photoId: string) => void;
  onExpand: (photoId: string) => void;
  photos: GalleryPhoto[];
  total: number;
}

function GalleryPhotoGrid({ canUpload, loading, onDelete, onEdit, onExpand, photos, total }: GalleryPhotoGridProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">Your Photos</p>
        {!loading && photos.length > 0 && (
          <p className="text-[10px] text-neutral-600">{photos.length} shown · {total} total</p>
        )}
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-neutral-800/30 animate-pulse aspect-square" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="border border-dashed border-neutral-800 py-16 text-center">
          <p className="text-sm text-neutral-600 tracking-wider mb-1">No photos yet</p>
          <p className="text-[10px] text-neutral-700 tracking-wider">
            {canUpload ? "Upload your first photo above to get started" : "Your previous submissions will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => {
            const primaryTag = getPrimaryGalleryTag(photo.tags);
            return (
            <div key={photo.id} className="group relative bg-white/[0.02] border border-neutral-800 overflow-hidden">
              <img
                src={photo.thumbnailUrl}
                alt={photo.title || "Photo"}
                loading="lazy"
                className="w-full aspect-square object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.classList.add("min-h-[120px]");
                }}
              />
              <div className="absolute inset-0 flex items-end bg-black/60 p-3 pb-14 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <div className="flex-1 min-w-0">
                  {photo.title && (
                    <p className="text-xs text-white truncate">{photo.title}</p>
                  )}
                  {primaryTag && (
                    <p className="text-[10px] text-neutral-500 truncate mt-0.5">{primaryTag}</p>
                  )}
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {new Date(photo.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 border-t border-white/10 bg-black/90">
                  <button type="button"
                    onClick={() => onExpand(photo.id)}
                    className="min-h-11 w-full px-1 text-[10px] text-neutral-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white sm:min-w-11"
                  >
                    View
                  </button>
                  <button type="button"
                    onClick={() => onEdit(photo.id)}
                    className="min-h-11 w-full px-1 text-[10px] text-neutral-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white sm:min-w-11"
                  >
                    Edit
                  </button>
                  <button type="button"
                    onClick={() => onDelete(photo.id)}
                    className="min-h-11 w-full px-1 text-[10px] text-red-400 transition-colors hover:text-red-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-red-400 sm:min-w-11"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DeletePhotoModalProps {
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeletePhotoModal({ deleting, onClose, onConfirm }: DeletePhotoModalProps) {
  return (
    <ModalDialog ariaLabel="Delete gallery photo" onClose={onClose} preventClose={deleting} className="flex items-center justify-center bg-black/80 p-6">
      <button type="button" tabIndex={-1} aria-label="Close delete photo dialog" className="absolute inset-0 cursor-default" onMouseDown={() => !deleting && onClose()} />
      <div className="relative z-10 bg-neutral-950 border border-neutral-800 p-6 max-w-sm w-full">
        <p className="text-[9px] tracking-[0.3em] uppercase text-red-900 mb-2">Confirm</p>
        <p className="text-sm text-neutral-200 tracking-wider mb-1">Delete this photo?</p>
        <p className="text-xs text-neutral-500 mb-6">This will permanently remove the image. This action cannot be undone.</p>
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2.5 bg-red-600 text-[10px] tracking-[0.15em] uppercase text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting" : "Delete"}
          </button>
          <button type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 border border-neutral-800 text-[10px] tracking-[0.15em] uppercase text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

interface GalleryManagerDialogsProps {
  deleteTarget: string | null;
  deleting: boolean;
  editError: string;
  editPhoto: GalleryPhoto | undefined;
  expandedPhoto: GalleryPhoto | undefined;
  onCloseDelete: () => void;
  onCloseEdit: () => void;
  onClosePreview: () => void;
  onConfirmDelete: () => void;
  onDelete: (photoId: string) => void;
  onEdit: (photoId: string) => void;
  onSaveEdit: (photoId: string, updates: GalleryPhotoUpdates) => void;
  savingEdit: boolean;
}

function GalleryManagerDialogs({
  deleteTarget,
  deleting,
  editError,
  editPhoto,
  expandedPhoto,
  onCloseDelete,
  onCloseEdit,
  onClosePreview,
  onConfirmDelete,
  onDelete,
  onEdit,
  onSaveEdit,
  savingEdit,
}: GalleryManagerDialogsProps) {
  return (
    <>
      {expandedPhoto && (
        <GalleryPhotoPreviewModal
          onClose={onClosePreview}
          onDelete={onDelete}
          onEdit={onEdit}
          photo={expandedPhoto}
        />
      )}
      {editPhoto && (
        <GalleryPhotoEditModal
          errorMessage={editError}
          onClose={onCloseEdit}
          onSave={onSaveEdit}
          photo={editPhoto}
          saving={savingEdit}
        />
      )}
      {deleteTarget && (
        <DeletePhotoModal
          deleting={deleting}
          onClose={onCloseDelete}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  );
}

export default function GalleryManager({ userRole, userTier }: Props) {
  const [page, setPage] = useState(1);
  const [state, dispatchState] = useReducer(
    keyedStateReducer<GalleryManagerState>,
    initialGalleryManagerState,
  );
  const {
    uploading,
    title,
    description,
    selectedTags,
    camera,
    lens,
    showName,
    error,
    editError,
    success,
    preview,
    expanded,
    editTarget,
    savingEdit,
    deleteTarget,
    deleting,
  } = state;
  const setUploading = createKeyedStateSetter(dispatchState, "uploading");
  const setTitle = createKeyedStateSetter(dispatchState, "title");
  const setDescription = createKeyedStateSetter(dispatchState, "description");
  const setSelectedTags = createKeyedStateSetter(dispatchState, "selectedTags");
  const setCamera = createKeyedStateSetter(dispatchState, "camera");
  const setLens = createKeyedStateSetter(dispatchState, "lens");
  const setShowName = createKeyedStateSetter(dispatchState, "showName");
  const setError = createKeyedStateSetter(dispatchState, "error");
  const setEditError = createKeyedStateSetter(dispatchState, "editError");
  const setSuccess = createKeyedStateSetter(dispatchState, "success");
  const setPreview = createKeyedStateSetter(dispatchState, "preview");
  const setExpanded = createKeyedStateSetter(dispatchState, "expanded");
  const setEditTarget = createKeyedStateSetter(dispatchState, "editTarget");
  const setSavingEdit = createKeyedStateSetter(dispatchState, "savingEdit");
  const setDeleteTarget = createKeyedStateSetter(dispatchState, "deleteTarget");
  const setDeleting = createKeyedStateSetter(dispatchState, "deleting");
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const canUpload = userRole === "admin" || userRole === "officer" || !!userTier;
  const {
    data: galleryPage,
    error: loadError,
    isLoading: loading,
    mutate: mutatePhotos,
  } = useSWR<GalleryPage<GalleryPhoto>>(
    `/api/gallery?mine=true&page=${page}&per_page=${GALLERY_MANAGER_PAGE_SIZE}&format=page`,
    fetchGalleryPhotos,
  );
  const photos = galleryPage?.photos ?? EMPTY_GALLERY_PHOTOS;
  const pageNumbers = galleryPage
    ? getVisiblePageNumbers(galleryPage.meta.page, galleryPage.meta.totalPages)
    : [];
  const replacePreview = (nextPreview: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = nextPreview;
    setPreview(nextPreview);
  };
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const handleFileChange = async () => {
    const file = fileRef.current?.files?.[0];
    if (file) {
      const validationError = await getGalleryUploadSourceValidationError(file);
      if (fileRef.current?.files?.[0] !== file) return;
      if (validationError) {
        replacePreview(null);
        setError(validationError);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      setError("");
      replacePreview(URL.createObjectURL(file));
    } else {
      replacePreview(null);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const validationError = getGalleryUploadValidationError(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);

    let preparedImages;
    try {
      preparedImages = await prepareGalleryUploadImages(file);
    } catch {
      setError("Unable to optimize this JPEG. Please try another photo.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", preparedImages.file, preparedImages.file.name);
    formData.append("thumbnail", preparedImages.thumbnail, preparedImages.thumbnail.name);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("tags", serializeGalleryTags(selectedTags) ?? "");
    if (camera.trim()) formData.append("camera", camera.trim());
    if (lens.trim()) formData.append("lens", lens.trim());
    formData.append("showName", showName ? "true" : "false");

    try {
      const res = await fetchApi("/api/gallery/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        setError(await readErrorMessage(res, "Upload failed."));
        setUploading(false);
        return;
      }

      setTitle("");
      setDescription("");
      setSelectedTags([]);
      setCamera("");
      setLens("");
      setShowName(true);
      replacePreview(null);
      if (fileRef.current) fileRef.current.value = "";
      setSuccess("Photo uploaded successfully!");
      setTimeout(() => setSuccess(""), 4000);

      if (page === 1) {
        void mutatePhotos();
      } else {
        setPage(1);
      }
    } catch {
      setError("Upload failed. Please try again.");
    }
    setUploading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchApi(`/api/gallery/${deleteTarget}`, { method: "DELETE" });
      if (res.ok) {
        const refreshedPage = await mutatePhotos();
        if (refreshedPage && refreshedPage.meta.page !== page) {
          setPage(refreshedPage.meta.page);
        }
        setExpanded(null);
      } else {
        setError(await readErrorMessage(res, "Failed to delete photo."));
      }
    } catch {
      setError("Unable to delete photo. Please try again.");
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const saveEdit = async (photoId: string, updates: GalleryPhotoUpdates) => {
    setSavingEdit(true);
    setEditError("");
    try {
      const res = await fetchApi(`/api/gallery/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        setEditError(await readErrorMessage(res, "Failed to update photo."));
        return;
      }

      const updated = await readJson<GalleryPhoto>(res);
      void mutatePhotos((current) => current
        ? {
          ...current,
          photos: current.photos.map((photo) => photo.id === updated.id
            ? { ...photo, ...updated }
            : photo),
        }
        : current, { revalidate: false });
      setEditTarget(null);
    } catch {
      setEditError("Unable to update photo. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const expandedPhoto = photos.find((photo) => photo.id === expanded);
  const editPhoto = photos.find((photo) => photo.id === editTarget);
  const openEdit = (photoId: string) => {
    setEditError("");
    setEditTarget(photoId);
  };
  const closeEdit = () => {
    setEditError("");
    setEditTarget(null);
  };
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((selectedTag) => selectedTag !== tag) : [...prev, tag]
    );
  };
  const handlePageChange = (nextPage: number) => {
    if (!galleryPage || nextPage < 1 || nextPage > galleryPage.meta.totalPages) return;
    changeGalleryManagerPage(setExpanded, setEditTarget, setDeleteTarget, setPage, nextPage);
  };

  return (
    <div className="space-y-8">
      {canUpload ? (
        <GalleryUploadPanel
          camera={camera}
          description={description}
          errorMessage={error || loadError ? error || "Unable to load photos. Please refresh the page." : ""}
          fileRef={fileRef}
          inputClass={GALLERY_INPUT_CLASS}
          lens={lens}
          onCameraChange={setCamera}
          onDescriptionChange={setDescription}
          onFileChange={handleFileChange}
          onLensChange={setLens}
          onShowNameToggle={() => setShowName((value) => !value)}
          onSubmit={handleUpload}
          onTagMakePrimary={(tag) => setSelectedTags((tags) => makeGalleryTagPrimary(tags, tag))}
          onTagToggle={handleTagToggle}
          onTitleChange={setTitle}
          preview={preview}
          selectedTags={selectedTags}
          showName={showName}
          success={success}
          title={title}
          uploading={uploading}
        />
      ) : (
        <AccessUpsellPanel
          eyebrow="Gallery archive"
          title="Upload new photos"
          description="Your previous submissions stay available here, and you can delete them any time. Renew your membership to add new work to the club gallery."
          ctaLabel="Buy Membership"
        />
      )}

      <GalleryPhotoGrid
        canUpload={canUpload}
        loading={loading}
        onDelete={setDeleteTarget}
        onEdit={openEdit}
        onExpand={setExpanded}
        photos={photos}
        total={galleryPage?.meta.total ?? photos.length}
      />

      {galleryPage && (
        <GalleryManagerPagination
          meta={galleryPage.meta}
          onPageChange={handlePageChange}
          pageNumbers={pageNumbers}
        />
      )}

      <GalleryManagerDialogs
        deleteTarget={deleteTarget}
        deleting={deleting}
        editError={editError}
        editPhoto={editPhoto}
        expandedPhoto={expandedPhoto}
        onCloseDelete={() => setDeleteTarget(null)}
        onCloseEdit={closeEdit}
        onClosePreview={() => setExpanded(null)}
        onConfirmDelete={confirmDelete}
        onDelete={setDeleteTarget}
        onEdit={(photoId) => {
          setExpanded(null);
          openEdit(photoId);
        }}
        onSaveEdit={saveEdit}
        savingEdit={savingEdit}
      />
    </div>
  );
}
