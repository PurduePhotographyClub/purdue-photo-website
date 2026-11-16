import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import './helpers/register-typescript-jsx-paths.mjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('the shared navbar links to the holiday event and the letter links to group booking', async () => {
  const [header, layout, page, dialog] = await Promise.all([
    readFile(new URL('../src/components/Header.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/holiday-event.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/holiday/HolidayInfoDialog.astro', import.meta.url), 'utf8'),
  ]);

  assert.match(header, /specialEventLink\s*=\s*\{\s*to:\s*"\/holiday-event",\s*label:\s*"Holiday event"\s*\}/);
  assert.match(layout, /<Header theme=\{theme\} client:load\s*\/>/);
  assert.match(page, /2026-11-19/);
  assert.match(page, /4:00–9:00 PM EST/);
  assert.match(dialog, /<a\b[^>]+href="https:\/\/www\.signupgenius\.com\/go\/10C0A4FACAA2AA3FDC52-67667693-ppcholiday#\/"[^>]*>Sign up<\/a>/);
  assert.match(dialog, /15-minute slot/);
  assert.match(dialog, /Purdue email address/);
});

test('the holiday calendar covers Thursday, November 19 from 4 to 9 PM EST', async () => {
  const calendar = await readFile(new URL('../public/holiday-event/save-the-date.ics', import.meta.url), 'utf8');
  const fields = new Map(calendar.trim().split(/\r?\n/).map((line) => {
    const separator = line.indexOf(':');
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));

  assert.equal(fields.get('DTSTART'), '20261119T210000Z');
  assert.equal(fields.get('DTEND'), '20261120T020000Z');
  assert.match(fields.get('SUMMARY'), /Holiday photos.*Purdue Photography Club/);
  assert.match(fields.get('DESCRIPTION'), /15-minute slot/);
  assert.equal(fields.get('TRANSP'), 'TRANSPARENT');
  assert.match(fields.get('LOCATION'), /Purdue Memorial Union/);
  assert.equal(fields.has('ORGANIZER'), false);
  assert.equal(fields.has('ATTENDEE'), false);
  assert.equal(fields.get('BEGIN'), 'VEVENT');
  assert.equal(fields.get('END'), 'VCALENDAR');
});

test('the shared event bar uses holiday colors without changing its event content', async () => {
  const { default: LiveEventBar } = await import('../src/components/LiveEventBar.tsx');
  const event = {
    id: 'holiday-preview',
    title: 'Club photo walk',
    date: '2026-11-01T18:00:00.000Z',
    location: 'Campus',
    description: '',
  };
  const html = renderToStaticMarkup(createElement(LiveEventBar, {
    featuredEvents: { currentEvents: [], upcomingEvent: event },
    theme: 'holiday-event',
  }));
  assert.match(html, /holiday-live-event/);
  assert.match(html, /Club photo walk/);
  assert.match(html, /Next event/);
  assert.match(html, /href="\/events#upcoming-events"/);
});
