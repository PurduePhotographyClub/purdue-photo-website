import { useEffect, useRef, type ReactNode } from "react";

interface ModalDialogProps {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  onClose: () => void;
  preventClose?: boolean;
}

export default function ModalDialog({
  ariaLabel,
  children,
  className = "",
  onClose,
  preventClose = false,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={ariaLabel}
      onCancel={(event) => {
        if (preventClose) event.preventDefault();
      }}
      onClose={onClose}
      className={`fixed inset-0 z-[120] m-0 h-dvh max-h-none w-dvw max-w-none border-0 p-0 text-inherit backdrop:bg-transparent ${className}`}
    >
      {children}
    </dialog>
  );
}
