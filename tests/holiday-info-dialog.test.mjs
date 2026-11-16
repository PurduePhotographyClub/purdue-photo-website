import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeHolidayInfoDialog } from '../src/components/holiday/holiday-info-dialog.ts';

class Control extends EventTarget {
  focusCount = 0;
  focus() { this.focusCount += 1; this.onFocus?.(); }
  getClientRects() { return [{}]; }
  click() { this.dispatchEvent(new Event('click')); }
}

function fixture() {
  const trigger = new Control();
  const closeButton = new Control();
  const heading = new Control();
  const summary = new Control();
  const scroller = { scrollTop: 240 };
  const dialog = new Control();
  dialog.open = false;
  dialog.showCount = 0;
  dialog.showModal = () => { dialog.open = true; dialog.showCount += 1; };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new Event('close')); };
  dialog.getBoundingClientRect = () => ({ left: 100, right: 600, top: 100, bottom: 700 });
  dialog.querySelector = (selector) => ({
    '[data-holiday-info-close]': closeButton,
    '[data-holiday-info-title]': heading,
    '[data-holiday-letter-scroll]': scroller,
  })[selector];
  const documentElement = { style: { overflow: 'auto' } };
  const ownerDocument = { documentElement, activeElement: null };
  for (const control of [trigger, closeButton, heading, summary]) control.onFocus = () => { ownerDocument.activeElement = control; };
  dialog.querySelectorAll = () => [closeButton, summary];
  const root = {
    ownerDocument,
    querySelector: (selector) => selector === '[data-holiday-info-open]' ? trigger : dialog,
  };
  return { root, trigger, closeButton, heading, summary, scroller, dialog, documentElement };
}

test('The signup button opens one modal, focuses its heading, and locks background scrolling', () => {
  const state = fixture();
  initializeHolidayInfoDialog(state.root);
  state.trigger.click();
  state.trigger.click();
  assert.equal(state.dialog.open, true);
  assert.equal(state.dialog.showCount, 1);
  assert.equal(state.heading.focusCount, 1);
  assert.equal(state.documentElement.style.overflow, 'hidden');
  assert.equal(state.scroller.scrollTop, 0);
});

test('an old queued close event cannot unlock the page after a quick reopen', () => {
  const state = fixture();
  initializeHolidayInfoDialog(state.root);
  state.trigger.click();
  state.closeButton.click();
  state.trigger.click();
  state.dialog.dispatchEvent(new Event('close'));
  assert.equal(state.dialog.open, true);
  assert.equal(state.documentElement.style.overflow, 'hidden');
});

test('Close restores the previous scroll setting and returns focus to the signup button', () => {
  const state = fixture();
  initializeHolidayInfoDialog(state.root);
  state.trigger.click();
  state.closeButton.click();
  assert.equal(state.dialog.open, false);
  assert.equal(state.documentElement.style.overflow, 'auto');
  assert.equal(state.trigger.focusCount, 1);
});

test('native dismissal also restores scrolling and focus, and the dialog can reopen', () => {
  const state = fixture();
  initializeHolidayInfoDialog(state.root);
  state.trigger.click();
  state.dialog.close();
  assert.equal(state.documentElement.style.overflow, 'auto');
  assert.equal(state.trigger.focusCount, 1);
  state.trigger.click();
  assert.equal(state.dialog.open, true);
  assert.equal(state.documentElement.style.overflow, 'hidden');
});

test('a click inside the envelope stays open; a click on the backdrop dismisses it', () => {
  const state = fixture();
  initializeHolidayInfoDialog(state.root);
  state.trigger.click();
  state.dialog.dispatchEvent(Object.assign(new Event('click'), { clientX: 200, clientY: 200 }));
  assert.equal(state.dialog.open, true);
  state.dialog.dispatchEvent(Object.assign(new Event('click'), { clientX: 20, clientY: 200 }));
  assert.equal(state.dialog.open, false);
  assert.equal(state.documentElement.style.overflow, 'auto');
});

test('cleanup closes the dialog and removes its event handlers', () => {
  const state = fixture();
  const cleanup = initializeHolidayInfoDialog(state.root);
  state.trigger.click();
  cleanup();
  assert.equal(state.dialog.open, false);
  assert.equal(state.documentElement.style.overflow, 'auto');
  state.trigger.click();
  assert.equal(state.dialog.open, false);
});

test('an absent dialog leaves the page usable', () => {
  assert.doesNotThrow(() => initializeHolidayInfoDialog({ querySelector: () => null })());
});

test('Tab starts at Close and wraps in both directions without leaving the modal', () => {
  const state = fixture();
  initializeHolidayInfoDialog(state.root);
  state.trigger.click();
  const tab = (shiftKey = false) => state.dialog.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: 'Tab', shiftKey }));
  tab();
  assert.equal(state.root.ownerDocument.activeElement, state.closeButton);
  tab(true);
  assert.equal(state.root.ownerDocument.activeElement, state.summary);
  tab();
  assert.equal(state.root.ownerDocument.activeElement, state.closeButton);
});
