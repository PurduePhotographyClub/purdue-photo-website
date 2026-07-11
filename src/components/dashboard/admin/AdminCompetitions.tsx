import { Loader2, Plus } from "lucide-react";
import CompetitionEditorPanel from "./competitions/CompetitionEditorPanel";
import CompetitionList from "./competitions/CompetitionList";
import DeleteCompetitionModal from "./competitions/DeleteCompetitionModal";
import ResultUploadModal from "./competitions/ResultUploadModal";
import { useAdminCompetitions } from "./competitions/useAdminCompetitions";

export default function AdminCompetitions() {
  const {
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
  } = useAdminCompetitions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-neutral-400">Create challenges, publish winners, and keep the archive current.</p>
          {competitionPage && <p className="mt-1 text-[10px] text-neutral-600">{competitionPage.meta.total} competitions total</p>}
        </div>
        {!editorOpen && (
          <button type="button" onClick={startCompetitionCreate} className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-700 px-4 text-[10px] uppercase tracking-[0.15em] text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white">
            <Plus size={13} /> New Competition
          </button>
        )}
      </div>

      {(generalError || loadError) && (
        <div className="flex flex-col gap-3 border border-red-950 bg-red-950/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p role="alert" className="text-xs leading-relaxed text-red-400">{generalError || "Failed to load competitions."}</p>
          {loadError && <button type="button" onClick={() => void refreshCompetitions()} className="min-h-11 border border-red-900 px-4 text-[10px] uppercase tracking-wider text-red-300">Try Again</button>}
        </div>
      )}
      {success && <p role="status" className="text-xs text-green-400">{success}</p>}

      {editorOpen && (
        <CompetitionEditorPanel
          deadline={deadline}
          description={description}
          editingCompetitionId={editingCompetitionId}
          error={metadataError}
          inputClass={inputClass}
          onCancel={resetMetadataEditor}
          onDeadlineChange={setDeadline}
          onDescriptionChange={setDescription}
          onSave={saveCompetition}
          onStatusChange={setStatus}
          onThemeChange={setTheme}
          onTitleChange={setTitle}
          saving={savingMetadata}
          status={status}
          theme={theme}
          title={title}
        />
      )}

      {isLoading ? (
        <div className="space-y-3" aria-label="Loading competitions">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-36 animate-pulse border border-neutral-800 bg-white/[0.02]" />)}
        </div>
      ) : (
        <CompetitionList
          competitions={competitions}
          onAdvanceStatus={advanceStatus}
          onCompetitionEdit={startCompetitionEdit}
          onDeleteRequest={requestDelete}
          onResultEdit={startResultEdit}
          onResultUpload={startResultUpload}
        />
      )}

      {competitionPage && competitionPage.meta.totalPages > 1 && (
        <nav aria-label="Admin competition pagination" className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" disabled={!competitionPage.meta.hasPreviousPage} onClick={() => handlePageChange(competitionPage.meta.page - 1)} className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 disabled:opacity-30">Previous</button>
          {pageNumbers.map((pageNumber) => (
            <button
              type="button"
              key={pageNumber}
              aria-label={`Go to admin competition page ${pageNumber}`}
              aria-current={pageNumber === competitionPage.meta.page ? "page" : undefined}
              onClick={() => handlePageChange(pageNumber)}
              className={`min-h-11 min-w-11 border px-3 text-xs ${pageNumber === competitionPage.meta.page ? "border-white text-white" : "border-neutral-800 text-neutral-500"}`}
            >
              {pageNumber}
            </button>
          ))}
          <button type="button" disabled={!competitionPage.meta.hasNextPage} onClick={() => handlePageChange(competitionPage.meta.page + 1)} className="min-h-11 border border-neutral-800 px-4 text-[10px] uppercase tracking-wider text-neutral-400 disabled:opacity-30">Next</button>
        </nav>
      )}

      {uploadingFor && activeResultCompetition && (
        <ResultUploadModal
          competition={activeResultCompetition}
          editingResultId={editingResultId}
          error={resultError || (memberLoadError ? "Unable to load members. Close this dialog and try again." : "")}
          inputClass={inputClass}
          memberQuery={memberQuery}
          members={members}
          onClose={closeResultModal}
          onFileChange={handleResultFileChange}
          onMemberQueryChange={setMemberQuery}
          onResultFormChange={setResultForm}
          onSubmit={uploadResult}
          resultFileRef={resultFileRef}
          resultForm={resultForm}
          resultPreview={resultPreview}
          uploading={uploading}
        />
      )}

      {deleteTarget && (
        <DeleteCompetitionModal
          confirmation={deleteConfirmation}
          deleting={deleting}
          error={deleteError}
          inputClass={inputClass}
          onClose={closeDeleteModal}
          onConfirm={deleteCompetition}
          onConfirmationChange={setDeleteConfirmation}
          target={deleteTarget}
        />
      )}

      {uploading && <span className="sr-only" role="status"><Loader2 className="animate-spin" />Optimizing and uploading result</span>}
    </div>
  );
}
