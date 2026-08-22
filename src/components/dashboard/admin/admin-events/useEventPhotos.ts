import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { normalizeEvent } from "@/lib/events";
import {
  getGalleryUploadSourceValidationError,
  prepareGalleryUploadImages,
} from "@/lib/gallery-images";
import {
  ADMIN_EVENTS_SWR_OPTIONS,
  fetchApi,
  fetchFreshJson,
  readErrorMessage,
} from "@/lib/http";

export function useEventPhotos(eventId: string | null) {
  const { data, error: loadError, isLoading, mutate } = useSWR<Record<string, unknown>>(
    eventId ? `/api/events/${eventId}` : null,
    fetchFreshJson,
    ADMIN_EVENTS_SWR_OPTIONS,
  );
  const event = useMemo(() => data ? normalizeEvent(data) : null, [data]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setFileInputKey((current) => current + 1);
  };

  const chooseFile = async (file: File | null) => {
    setError("");
    setNotice("");
    if (!file) {
      clearSelection();
      return;
    }

    const validationError = await getGalleryUploadSourceValidationError(file);
    if (validationError) {
      clearSelection();
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadPhoto = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!eventId || !selectedFile || uploading) return;

    setError("");
    setNotice("");
    setUploading(true);
    try {
      const preparedImages = await prepareGalleryUploadImages(selectedFile);
      const formData = new FormData();
      formData.append("file", preparedImages.file, preparedImages.file.name);
      formData.append("thumbnail", preparedImages.thumbnail, preparedImages.thumbnail.name);
      formData.append("caption", caption.trim());

      const response = await fetchApi(`/api/events/${eventId}/photos`, {
        body: formData,
        method: "POST",
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Failed to upload event photo."));
        return;
      }

      clearSelection();
      setNotice("Event photo uploaded.");
      await mutate();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload event photo.");
    } finally {
      setUploading(false);
    }
  };

  const updateCaption = async (photoId: string, nextCaption: string) => {
    if (!eventId || busyPhotoId) return false;
    setError("");
    setNotice("");
    setBusyPhotoId(photoId);
    try {
      const response = await fetchApi(`/api/events/${eventId}/photos/${photoId}`, {
        body: JSON.stringify({ caption: nextCaption.trim() || null }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Failed to update the caption."));
        return false;
      }
      setNotice("Photo caption updated.");
      await mutate();
      return true;
    } catch {
      setError("Unable to update the caption.");
      return false;
    } finally {
      setBusyPhotoId(null);
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!eventId || busyPhotoId) return;
    setError("");
    setNotice("");
    setBusyPhotoId(photoId);
    try {
      const response = await fetchApi(`/api/events/${eventId}/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, "Failed to delete event photo."));
        return;
      }
      setNotice("Event photo deleted.");
      await mutate();
    } catch {
      setError("Unable to delete event photo.");
    } finally {
      setBusyPhotoId(null);
    }
  };

  return {
    busyPhotoId,
    caption,
    chooseFile,
    deletePhoto,
    error: error || (loadError ? "Failed to load event photos." : ""),
    fileInputKey,
    isLoading,
    notice,
    photos: event?.photos ?? [],
    previewUrl,
    selectedFile,
    setCaption,
    updateCaption,
    uploadPhoto,
    uploading,
  };
}
