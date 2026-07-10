import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type RefObject
} from "react";
import useSWR from "swr";
import AccessUpsellPanel from "@/components/dashboard/AccessUpsellPanel";
import ModalDialog from "@/components/ModalDialog";
import {
  fetchApi,
  fetchJson,
  readErrorMessage
} from "@/lib/http";
import {
  getGalleryUploadValidationError,
  normalizeGalleryPageForUrl,
  prepareGalleryUploadImages,
  type GalleryPage,
} from "@/lib/gallery-images";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";

const GALLERY_TAGS = [
  "Film",
  "Digital",
] as const;
const GALLERY_MANAGER_PAGE_SIZE = 60;

interface Photo {
  id: string;
  title: string | null;
  description: string | null;
  tags: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  createdAt: string;
}
const EMPTY_GALLERY_PHOTOS: Photo[] = [];

interface Props {
  userRole: string;
  userTier: string | null;
}

async function fetchGalleryPhotos(url: string) {
  const data = await fetchJson<unknown>(url);
  return normalizeGalleryPageForUrl<Photo>(data, url, GALLERY_MANAGER_PAGE_SIZE);
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
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
  success: string;
  preview: string | null;
  expanded: string | null;
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
  success: "",
  preview: null,
  expanded: null,
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
            <p className="text-[10px] text-neutral-600 mt-1.5 tracking-wider">JPG / JPEG only · optimized automatically to 3 MB</p>
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
          placeholder="Description"
          required
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
  onExpand: (photoId: string) => void;
  photos: Photo[];
  total: number;
}

function GalleryPhotoGrid({ canUpload, loading, onDelete, onExpand, photos, total }: GalleryPhotoGridProps) {
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
          {photos.map((photo) => (
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
              <div className="absolute inset-0 flex items-end bg-black/60 p-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <div className="flex-1 min-w-0">
                  {photo.title && (
                    <p className="text-xs text-white truncate">{photo.title}</p>
                  )}
                  {photo.tags && (
                    <p className="text-[10px] text-neutral-500 truncate mt-0.5">{photo.tags}</p>
                  )}
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {new Date(photo.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0 ml-2">
                  <button type="button"
                    onClick={() => onExpand(photo.id)}
                    className="text-[10px] text-neutral-300 hover:text-white transition-colors"
                  >
                    View
                  </button>
                  <button type="button"
                    onClick={() => onDelete(photo.id)}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ExpandedPhotoModalProps {
  onClose: () => void;
  onDelete: (photoId: string) => void;
  photo: Photo;
}

function ExpandedPhotoModal({ onClose, onDelete, photo }: ExpandedPhotoModalProps) {
  return (
    <ModalDialog ariaLabel="Gallery photo preview" onClose={onClose} className="flex items-center justify-center bg-black/95 p-6">
      <button type="button" tabIndex={-1} aria-label="Close expanded photo" className="absolute inset-0 cursor-default" onMouseDown={onClose} />
      <button type="button"
        className="absolute top-6 right-6 z-10 text-neutral-400 hover:text-white text-sm"
        onClick={onClose}
      >
        ✕
      </button>
      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center">
        <img
          src={photo.imageUrl}
          alt={photo.title || "Photo"}
          className="max-w-full max-h-[75vh] object-contain"
        />
        <div className="mt-4 text-center">
          {photo.title && (
            <p className="text-sm text-neutral-200 tracking-wider">{photo.title}</p>
          )}
          {photo.description && (
            <p className="text-xs text-neutral-500 mt-1">{photo.description}</p>
          )}
          {photo.tags && (
            <p className="text-[10px] text-neutral-600 mt-2 tracking-wider">{photo.tags}</p>
          )}
          <p className="text-[10px] text-neutral-700 mt-2">
            {new Date(photo.createdAt).toLocaleDateString()}
          </p>
          <button type="button"
            onClick={() => onDelete(photo.id)}
            className="mt-4 px-4 py-2 border border-red-900 text-[10px] tracking-[0.15em] uppercase text-red-400 hover:bg-red-900/20 transition-colors"
          >
            Delete Photo
          </button>
        </div>
      </div>
    </ModalDialog>
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
    success,
    preview,
    expanded,
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
  const setSuccess = createKeyedStateSetter(dispatchState, "success");
  const setPreview = createKeyedStateSetter(dispatchState, "preview");
  const setExpanded = createKeyedStateSetter(dispatchState, "expanded");
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
  } = useSWR<GalleryPage<Photo>>(
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

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0];
    if (file) {
      const validationError = getGalleryUploadValidationError(file);
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
    formData.append("tags", selectedTags.join(", "));
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

  const inputClass =
    "w-full px-4 py-3 bg-white/[0.02] border border-neutral-800 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors";
  const expandedPhoto = photos.find((photo) => photo.id === expanded);
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((selectedTag) => selectedTag !== tag) : [...prev, tag]
    );
  };
  const handlePageChange = (nextPage: number) => {
    if (!galleryPage || nextPage < 1 || nextPage > galleryPage.meta.totalPages) return;
    setExpanded(null);
    setDeleteTarget(null);
    setPage(nextPage);
  };

  return (
    <div className="space-y-8">
      {canUpload ? (
        <GalleryUploadPanel
          camera={camera}
          description={description}
          errorMessage={error || loadError ? error || "Unable to load photos. Please refresh the page." : ""}
          fileRef={fileRef}
          inputClass={inputClass}
          lens={lens}
          onCameraChange={setCamera}
          onDescriptionChange={setDescription}
          onFileChange={handleFileChange}
          onLensChange={setLens}
          onShowNameToggle={() => setShowName((value) => !value)}
          onSubmit={handleUpload}
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
        onExpand={setExpanded}
        photos={photos}
        total={galleryPage?.meta.total ?? photos.length}
      />

      {galleryPage && galleryPage.meta.totalPages > 1 && (
        <nav aria-label="Member gallery pagination" className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={!galleryPage.meta.hasPreviousPage}
            onClick={() => handlePageChange(galleryPage.meta.page - 1)}
            className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 disabled:opacity-30"
          >
            Previous
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              aria-label={`Go to member gallery page ${pageNumber}`}
              aria-current={pageNumber === galleryPage.meta.page ? "page" : undefined}
              onClick={() => handlePageChange(pageNumber)}
              className={`min-h-11 min-w-11 border px-3 text-xs ${pageNumber === galleryPage.meta.page ? "border-white text-white" : "border-neutral-800 text-neutral-500"}`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            disabled={!galleryPage.meta.hasNextPage}
            onClick={() => handlePageChange(galleryPage.meta.page + 1)}
            className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 disabled:opacity-30"
          >
            Next
          </button>
        </nav>
      )}

      {expandedPhoto && (
        <ExpandedPhotoModal
          onClose={() => setExpanded(null)}
          onDelete={setDeleteTarget}
          photo={expandedPhoto}
        />
      )}

      {deleteTarget && (
        <DeletePhotoModal
          deleting={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
