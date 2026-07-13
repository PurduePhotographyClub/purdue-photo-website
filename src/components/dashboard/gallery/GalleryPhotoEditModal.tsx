import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import ModalDialog from "@/components/ModalDialog";
import {
  GALLERY_TAGS,
  parseGalleryTags,
  serializeGalleryTags,
} from "@/lib/gallery-tags";
import type { GalleryPhoto, GalleryPhotoUpdates } from "./types";

interface Props {
  errorMessage: string;
  onClose: () => void;
  onSave: (photoId: string, updates: GalleryPhotoUpdates) => void;
  photo: GalleryPhoto;
  saving: boolean;
}

export default function GalleryPhotoEditModal({
  errorMessage,
  onClose,
  onSave,
  photo,
  saving,
}: Props) {
  const [title, setTitle] = useState(photo.title ?? "");
  const [titleError, setTitleError] = useState("");
  const [description, setDescription] = useState(photo.description ?? "");
  const [camera, setCamera] = useState(photo.camera ?? "");
  const [lens, setLens] = useState(photo.lens ?? "");
  const [selectedTags, setSelectedTags] = useState(() => parseGalleryTags(photo.tags));
  const legacyTags = selectedTags.filter((tag) => !GALLERY_TAGS.some((galleryTag) => galleryTag === tag));

  const inputClass = "w-full border border-neutral-800 bg-white/[0.02] px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-700 focus:border-neutral-500 focus:outline-none";
  const toggleTag = (tag: string) => {
    setSelectedTags((currentTags) => currentTags.includes(tag)
      ? currentTags.filter((currentTag) => currentTag !== tag)
      : [...currentTags, tag]);
  };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setTitleError("Title cannot be blank.");
      return;
    }
    setTitleError("");
    onSave(photo.id, {
      title: normalizedTitle,
      description: description.trim() || null,
      tags: serializeGalleryTags(selectedTags),
      camera: camera.trim() || null,
      lens: lens.trim() || null,
    });
  };

  return (
    <ModalDialog
      ariaLabel="Edit gallery photo"
      onClose={onClose}
      preventClose={saving}
      className="flex items-center justify-center overflow-y-auto bg-black/85 p-2 sm:p-6"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close edit photo backdrop"
        className="absolute inset-0 cursor-default"
        onMouseDown={() => !saving && onClose()}
      />
      <div className="relative z-10 max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto border border-neutral-800 bg-neutral-950 p-5 sm:max-h-[calc(100dvh-3rem)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600">Gallery</p>
            <h2 className="mt-2 text-base tracking-wider text-neutral-100">Edit Photo</h2>
          </div>
          <button
            type="button"
            aria-label="Close edit photo dialog"
            disabled={saving}
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center text-neutral-500 transition-colors hover:text-white disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">Title</span>
            <input
              aria-label="Edit title"
              aria-describedby={titleError ? "member-gallery-title-error" : undefined}
              aria-invalid={titleError ? true : undefined}
              required
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (titleError) setTitleError("");
              }}
              maxLength={200}
              className={inputClass}
            />
            {titleError && <p id="member-gallery-title-error" role="alert" className="text-xs text-red-400">{titleError}</p>}
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">Description (optional)</span>
            <textarea aria-label="Edit description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} className={`${inputClass} resize-y`} />
          </label>

          <fieldset>
            <legend className="text-[10px] uppercase tracking-wider text-neutral-500">Tags (optional)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {GALLERY_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTag(tag)}
                    className={`min-h-9 border px-3 text-[10px] uppercase tracking-wider transition-colors ${active ? "border-white bg-white/[0.06] text-white" : "border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-300"}`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {legacyTags.length > 0 && (
              <div className="mt-3">
                <p className="text-[9px] uppercase tracking-wider text-neutral-600">Existing custom tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {legacyTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      aria-label={`Remove legacy tag ${tag}`}
                      onClick={() => toggleTag(tag)}
                      className="min-h-9 border border-neutral-800 px-3 text-[10px] text-neutral-500 transition-colors hover:border-red-900 hover:text-red-400"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </fieldset>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Camera (optional)</span>
              <input aria-label="Edit camera" value={camera} onChange={(event) => setCamera(event.target.value)} maxLength={200} className={inputClass} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Lens (optional)</span>
              <input aria-label="Edit lens" value={lens} onChange={(event) => setLens(event.target.value)} maxLength={200} className={inputClass} />
            </label>
          </div>

          {errorMessage && <p role="alert" className="text-xs text-red-400">{errorMessage}</p>}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button type="submit" disabled={saving} className="min-h-11 bg-white px-6 text-[10px] uppercase tracking-[0.15em] text-black transition-colors hover:bg-neutral-200 disabled:opacity-50">
              {saving ? "Saving" : "Save Changes"}
            </button>
            <button type="button" disabled={saving} onClick={onClose} className="min-h-11 border border-neutral-800 px-5 text-[10px] uppercase tracking-[0.15em] text-neutral-500 transition-colors hover:text-white disabled:opacity-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ModalDialog>
  );
}
