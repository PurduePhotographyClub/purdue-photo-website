import { useDeferredValue, useEffect, useReducer, useRef, useState, type Dispatch, type SetStateAction } from "react";
import useSWR from "swr";
import {
  buildAdminMembersUrl,
  normalizeAdminMembersPageForUrl,
  type AdminMembersPage,
} from "@/lib/admin-members";
import {
  normalizeCompetitionPageForUrl,
  type CompetitionPage,
} from "@/lib/competition-data";
import {
  getGalleryUploadSourceValidationError,
  prepareGalleryUploadImages,
} from "@/lib/gallery-images";
import {
  fetchApi,
  fetchJson,
  PUBLIC_API_SWR_OPTIONS,
  readErrorMessage,
} from "@/lib/http";
import { createKeyedStateSetter, keyedStateReducer } from "@/lib/reducer-state";

function changeAdminCompetitionPage(
  resetMetadataEditor: () => void,
  closeResultModal: () => void,
  closeDeleteModal: () => void,
  setPage: Dispatch<SetStateAction<number>>,
  nextPage: number,
) {
  resetMetadataEditor();
  closeResultModal();
  closeDeleteModal();
  setPage(nextPage);
}
import {
  emptyResultForm,
  type Competition,
  type CompetitionResult,
  type CompetitionStatus,
  type Member,
  type ResultFormState,
} from "./types";

const ADMIN_COMPETITIONS_PAGE_SIZE = 12;
const COMPETITION_MEMBER_SEARCH_PAGE_SIZE = 30;
const ADMIN_COMPETITIONS_SWR_OPTIONS = {
  ...PUBLIC_API_SWR_OPTIONS,
  keepPreviousData: false,
};

type PreparedResultUploadImages = Awaited<ReturnType<typeof prepareGalleryUploadImages>>;

interface AdminCompetitionsState {
  deadline: string;
  deleteConfirmation: string;
  deleteError: string;
  deleteTarget: Competition | null;
  deleting: boolean;
  description: string;
  editingCompetitionId: string | null;
  editingResultId: string | null;
  editorOpen: boolean;
  generalError: string;
  memberQuery: string;
  metadataError: string;
  resultError: string;
  resultForm: ResultFormState;
  resultPreview: string | null;
  savingMetadata: boolean;
  status: CompetitionStatus;
  success: string;
  theme: string;
  title: string;
  uploading: boolean;
  uploadingFor: string | null;
}

const initialAdminCompetitionsState: AdminCompetitionsState = {
  deadline: "",
  deleteConfirmation: "",
  deleteError: "",
  deleteTarget: null,
  deleting: false,
  description: "",
  editingCompetitionId: null,
  editingResultId: null,
  editorOpen: false,
  generalError: "",
  memberQuery: "",
  metadataError: "",
  resultError: "",
  resultForm: emptyResultForm,
  resultPreview: null,
  savingMetadata: false,
  status: "draft",
  success: "",
  theme: "",
  title: "",
  uploading: false,
  uploadingFor: null,
};

async function fetchAdminCompetitionPage(url: string) {
  const value = await fetchJson<unknown>(url);
  return normalizeCompetitionPageForUrl<Competition>(value, url, ADMIN_COMPETITIONS_PAGE_SIZE);
}

async function fetchCompetitionMembers([url, search]: readonly [string, string]) {
  const value = await fetchJson<unknown>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ search }),
  });
  return normalizeAdminMembersPageForUrl<Member>(
    value,
    url,
    COMPETITION_MEMBER_SEARCH_PAGE_SIZE,
  );
}

async function prepareCompetitionResultImages(
  file: File,
): Promise<{ error: string } | { images: PreparedResultUploadImages }> {
  const validationError = await getGalleryUploadSourceValidationError(file);
  if (validationError) return { error: validationError };

  try {
    return { images: await prepareGalleryUploadImages(file) };
  } catch {
    return { error: "Unable to optimize this JPEG. Please try another photo." };
  }
}

function appendCompetitionResultImages(
  form: FormData,
  images: PreparedResultUploadImages | null,
) {
  if (!images) return;
  form.append("file", images.file, images.file.name);
  form.append("thumbnail", images.thumbnail, images.thumbnail.name);
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((first, second) => first - second);
}

export function useAdminCompetitions() {
  const [page, setPage] = useState(1);
  const [state, dispatchState] = useReducer(
    keyedStateReducer<AdminCompetitionsState>,
    initialAdminCompetitionsState,
  );
  const {
    deadline,
    deleteConfirmation,
    deleteError,
    deleteTarget,
    deleting,
    description,
    editingCompetitionId,
    editingResultId,
    editorOpen,
    generalError,
    memberQuery,
    metadataError,
    resultError,
    resultForm,
    resultPreview,
    savingMetadata,
    status,
    success,
    theme,
    title,
    uploading,
    uploadingFor,
  } = state;
  const setDeadline = createKeyedStateSetter(dispatchState, "deadline");
  const setDeleteConfirmation = createKeyedStateSetter(dispatchState, "deleteConfirmation");
  const setDeleteError = createKeyedStateSetter(dispatchState, "deleteError");
  const setDeleteTarget = createKeyedStateSetter(dispatchState, "deleteTarget");
  const setDeleting = createKeyedStateSetter(dispatchState, "deleting");
  const setDescription = createKeyedStateSetter(dispatchState, "description");
  const setEditingCompetitionId = createKeyedStateSetter(dispatchState, "editingCompetitionId");
  const setEditingResultId = createKeyedStateSetter(dispatchState, "editingResultId");
  const setEditorOpen = createKeyedStateSetter(dispatchState, "editorOpen");
  const setGeneralError = createKeyedStateSetter(dispatchState, "generalError");
  const setMemberQuery = createKeyedStateSetter(dispatchState, "memberQuery");
  const setMetadataError = createKeyedStateSetter(dispatchState, "metadataError");
  const setResultError = createKeyedStateSetter(dispatchState, "resultError");
  const setResultForm = createKeyedStateSetter(dispatchState, "resultForm");
  const setResultPreview = createKeyedStateSetter(dispatchState, "resultPreview");
  const setSavingMetadata = createKeyedStateSetter(dispatchState, "savingMetadata");
  const setStatus = createKeyedStateSetter(dispatchState, "status");
  const setSuccess = createKeyedStateSetter(dispatchState, "success");
  const setTheme = createKeyedStateSetter(dispatchState, "theme");
  const setTitle = createKeyedStateSetter(dispatchState, "title");
  const setUploading = createKeyedStateSetter(dispatchState, "uploading");
  const setUploadingFor = createKeyedStateSetter(dispatchState, "uploadingFor");
  const resultFileRef = useRef<HTMLInputElement>(null);
  const resultPreviewUrlRef = useRef<string | null>(null);
  const deferredMemberQuery = useDeferredValue(memberQuery);

  const competitionUrl = `/api/competitions?page=${page}&per_page=${ADMIN_COMPETITIONS_PAGE_SIZE}&format=page&include=results`;
  const {
    data: competitionPage,
    error: loadError,
    isLoading,
    mutate: refreshCompetitions,
  } = useSWR<CompetitionPage<Competition>>(
    competitionUrl,
    fetchAdminCompetitionPage,
    ADMIN_COMPETITIONS_SWR_OPTIONS,
  );
  const memberSearch = resultForm.userId && resultForm.userId !== "manual"
    ? resultForm.userId
    : deferredMemberQuery.trim();
  const memberSearchUrl = buildAdminMembersUrl({
    page: 1,
    perPage: COMPETITION_MEMBER_SEARCH_PAGE_SIZE,
  });
  const { data: memberPage, error: memberLoadError } = useSWR<AdminMembersPage<Member>>(
    uploadingFor && memberSearch
      ? [memberSearchUrl, memberSearch] as const
      : null,
    fetchCompetitionMembers,
    PUBLIC_API_SWR_OPTIONS,
  );
  const members = memberPage?.members ?? [];

  const competitions = competitionPage?.competitions ?? [];
  const activeResultCompetition = competitions.find((competition) => competition.id === uploadingFor);
  const pageNumbers = competitionPage
    ? getVisiblePageNumbers(competitionPage.meta.page, competitionPage.meta.totalPages)
    : [];
  const inputClass = "min-h-11 w-full border border-neutral-800 bg-transparent px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none [color-scheme:dark]";

  const revokeResultPreviewUrl = () => {
    if (resultPreviewUrlRef.current) {
      URL.revokeObjectURL(resultPreviewUrlRef.current);
      resultPreviewUrlRef.current = null;
    }
  };

  const clearResultPreview = () => {
    revokeResultPreviewUrl();
    setResultPreview(null);
  };

  useEffect(() => () => {
    if (resultPreviewUrlRef.current) URL.revokeObjectURL(resultPreviewUrlRef.current);
  }, []);

  const resetMetadataEditor = () => {
    setEditorOpen(false);
    setEditingCompetitionId(null);
    setTitle("");
    setTheme("");
    setDescription("");
    setDeadline("");
    setStatus("draft");
    setMetadataError("");
  };

  const startCompetitionCreate = () => {
    resetMetadataEditor();
    setEditorOpen(true);
  };

  const startCompetitionEdit = (competition: Competition) => {
    setEditingCompetitionId(competition.id);
    setTitle(competition.title);
    setTheme(competition.theme ?? "");
    setDescription(competition.description ?? "");
    setDeadline(competition.submissionDeadline?.slice(0, 10) ?? "");
    setStatus(competition.status);
    setMetadataError("");
    setEditorOpen(true);
  };

  const saveCompetition = async (event: React.FormEvent) => {
    event.preventDefault();
    setMetadataError("");
    setSavingMetadata(true);

    try {
      const endpoint = editingCompetitionId
        ? `/api/competitions/${editingCompetitionId}`
        : "/api/competitions";
      const res = await fetchApi(endpoint, {
        method: editingCompetitionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          theme: theme.trim() || null,
          description: description.trim() || null,
          submissionDeadline: deadline || null,
          status,
        }),
      });

      if (!res.ok) {
        setMetadataError(await readErrorMessage(res, editingCompetitionId ? "Failed to update competition." : "Failed to create competition."));
        return;
      }

      const wasEditing = Boolean(editingCompetitionId);
      resetMetadataEditor();
      setSuccess(wasEditing ? "Competition updated." : "Competition created as a draft.");
      if (!wasEditing && page !== 1) {
        setPage(1);
      } else {
        await refreshCompetitions();
      }
    } catch {
      setMetadataError(editingCompetitionId ? "Unable to update competition. Please try again." : "Unable to create competition. Please try again.");
    } finally {
      setSavingMetadata(false);
    }
  };

  const advanceStatus = async (id: string, nextStatus: CompetitionStatus) => {
    setGeneralError("");
    try {
      const res = await fetchApi(`/api/competitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        setGeneralError(await readErrorMessage(res, "Failed to update competition status."));
        return;
      }
      setSuccess(`Competition moved to ${nextStatus}.`);
      await refreshCompetitions();
    } catch {
      setGeneralError("Unable to update competition status. Please try again.");
    }
  };

  const handleResultFileChange = async () => {
    const file = resultFileRef.current?.files?.[0];
    setResultError("");
    if (!file) {
      clearResultPreview();
      return;
    }

    const validationError = await getGalleryUploadSourceValidationError(file);
    if (resultFileRef.current?.files?.[0] !== file) return;
    if (validationError) {
      clearResultPreview();
      setResultError(validationError);
      if (resultFileRef.current) resultFileRef.current.value = "";
      return;
    }

    revokeResultPreviewUrl();
    const nextPreview = URL.createObjectURL(file);
    resultPreviewUrlRef.current = nextPreview;
    setResultPreview(nextPreview);
  };

  const closeResultModal = () => {
    clearResultPreview();
    if (resultFileRef.current) resultFileRef.current.value = "";
    setUploadingFor(null);
    setEditingResultId(null);
    setResultForm(emptyResultForm);
    setMemberQuery("");
    setResultError("");
  };

  const startResultUpload = (competitionId: string, place = 1) => {
    clearResultPreview();
    setUploadingFor(competitionId);
    setEditingResultId(null);
    setResultForm({ ...emptyResultForm, place: String(place) });
    setMemberQuery("");
    setResultError("");
    if (resultFileRef.current) resultFileRef.current.value = "";
  };

  const startResultEdit = (competitionId: string, result: CompetitionResult) => {
    revokeResultPreviewUrl();
    setUploadingFor(competitionId);
    setEditingResultId(result.id);
    setResultForm({
      place: String(result.place),
      title: result.entryTitle ?? "",
      photographerName: result.pairedUserId ? "" : result.photographerName ?? "",
      photographerInstagram: result.photographerInstagram ?? "",
      description: result.entryDescription ?? "",
      medium: result.medium ?? "digital",
      userId: result.pairedUserId ?? "manual",
    });
    setMemberQuery("");
    setResultPreview(result.thumbnailUrl ?? result.imageUrl);
    setResultError("");
    if (resultFileRef.current) resultFileRef.current.value = "";
  };

  const uploadResult = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uploadingFor) return;

    const file = resultFileRef.current?.files?.[0];
    if (!editingResultId && !file) {
      setResultError("Choose an image before uploading a result.");
      return;
    }
    if (resultForm.userId !== "manual" && !resultForm.userId) {
      setResultError("Search for and select a member, or use a manual photographer name.");
      return;
    }

    setUploading(true);
    setResultError("");
    let preparedImages: PreparedResultUploadImages | null = null;

    try {
      if (file) {
        const prepared = await prepareCompetitionResultImages(file);
        if (resultFileRef.current?.files?.[0] !== file) return;
        if ("error" in prepared) {
          setResultError(prepared.error);
          return;
        }
        preparedImages = prepared.images;
      }

      const form = new FormData();
      if (editingResultId) form.append("resultId", editingResultId);
      form.append("place", resultForm.place);
      form.append("title", resultForm.title);
      form.append("photographerName", resultForm.photographerName);
      form.append("photographerInstagram", resultForm.photographerInstagram);
      form.append("description", resultForm.description);
      form.append("medium", resultForm.medium);
      form.append("userId", resultForm.userId);
      appendCompetitionResultImages(form, preparedImages);

      const res = await fetchApi(`/api/competitions/${uploadingFor}/results`, {
        method: editingResultId ? "PATCH" : "POST",
        body: form,
      });
      if (!res.ok) {
        setResultError(await readErrorMessage(res, editingResultId ? "Failed to save result." : "Failed to upload result."));
        return;
      }

      setSuccess(editingResultId ? "Competition result updated." : "Competition result uploaded.");
      closeResultModal();
      await refreshCompetitions();
    } catch {
      setResultError(editingResultId ? "Unable to save result. Please try again." : "Unable to upload result. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const requestDelete = (competition: Competition) => {
    setDeleteTarget(competition);
    setDeleteConfirmation("");
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteConfirmation("");
    setDeleteError("");
  };

  const deleteCompetition = async () => {
    if (!deleteTarget || deleteConfirmation !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetchApi(`/api/competitions/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError(await readErrorMessage(res, "Failed to delete competition."));
        return;
      }

      setDeleteTarget(null);
      setDeleteConfirmation("");
      setSuccess("Competition and its stored images were deleted.");
      const refreshedPage = await refreshCompetitions();
      if (refreshedPage && refreshedPage.meta.page !== page) {
        setPage(refreshedPage.meta.page);
      }
    } catch {
      setDeleteError("Unable to delete competition. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (!competitionPage || nextPage < 1 || nextPage > competitionPage.meta.totalPages || nextPage === competitionPage.meta.page) return;
    changeAdminCompetitionPage(resetMetadataEditor, closeResultModal, closeDeleteModal, setPage, nextPage);
  };

  return {
    activeResultCompetition,
    advanceStatus,
    closeDeleteModal,
    closeResultModal,
    competitionPage,
    competitions,
    deadline,
    deleteCompetition,
    deleteConfirmation,
    deleteError,
    deleteTarget,
    deleting,
    description,
    editingCompetitionId,
    editingResultId,
    editorOpen,
    generalError,
    handlePageChange,
    handleResultFileChange,
    inputClass,
    isLoading,
    loadError,
    memberLoadError,
    memberQuery,
    members,
    metadataError,
    pageNumbers,
    refreshCompetitions,
    requestDelete,
    resetMetadataEditor,
    resultError,
    resultFileRef,
    resultForm,
    resultPreview,
    saveCompetition,
    savingMetadata,
    setDeadline,
    setDeleteConfirmation,
    setDescription,
    setMemberQuery,
    setResultForm,
    setStatus,
    setTheme,
    setTitle,
    startCompetitionCreate,
    startCompetitionEdit,
    startResultEdit,
    startResultUpload,
    status,
    success,
    theme,
    title,
    uploadResult,
    uploading,
    uploadingFor,
  };
}
