export function initializeHolidayInfoDialog(root: HTMLElement) {
  const trigger = root.querySelector<HTMLButtonElement>('[data-holiday-info-open]');
  const dialog = root.querySelector<HTMLDialogElement>('[data-holiday-info-dialog]');
  if (!trigger || !dialog) return () => {};

  const closeButton = dialog.querySelector<HTMLButtonElement>('[data-holiday-info-close]');
  const heading = dialog.querySelector<HTMLElement>('[data-holiday-info-title]');
  const scroller = dialog.querySelector<HTMLElement>('[data-holiday-letter-scroll]');
  const pageStyle = root.ownerDocument.documentElement.style;
  let previousOverflow = pageStyle.overflow;
  let scrollLocked = false;

  const open = () => {
    if (dialog.open) return;
    previousOverflow = pageStyle.overflow;
    dialog.showModal();
    pageStyle.overflow = 'hidden';
    scrollLocked = true;
    if (scroller) scroller.scrollTop = 0;
    heading?.focus({ preventScroll: true });
  };
  const restore = () => {
    if (!scrollLocked || dialog.open) return;
    pageStyle.overflow = previousOverflow;
    scrollLocked = false;
    trigger.focus({ preventScroll: true });
  };
  const close = () => {
    dialog.close();
    restore();
  };
  const cancel = (event: Event) => {
    event.preventDefault();
    close();
  };
  const containFocus = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], summary, [tabindex="0"]'))
      .filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) return;
    const active = root.ownerDocument.activeElement;
    if (event.shiftKey && (active === first || active === heading)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || active === heading)) {
      event.preventDefault();
      first.focus();
    }
  };
  const dismissBackdrop = (event: MouseEvent) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside = event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom;
    if (outside) close();
  };

  trigger.addEventListener('click', open);
  closeButton?.addEventListener('click', close);
  dialog.addEventListener('close', restore);
  dialog.addEventListener('cancel', cancel);
  dialog.addEventListener('keydown', containFocus);
  dialog.addEventListener('click', dismissBackdrop);

  return () => {
    if (dialog.open) close();
    trigger.removeEventListener('click', open);
    closeButton?.removeEventListener('click', close);
    dialog.removeEventListener('close', restore);
    dialog.removeEventListener('cancel', cancel);
    dialog.removeEventListener('keydown', containFocus);
    dialog.removeEventListener('click', dismissBackdrop);
  };
}
