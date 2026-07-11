import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCompetitionPage,
  normalizeCompetitionPageForUrl,
} from "../src/lib/competition-data.ts";

test("competition page normalization accepts the aggregate page contract", () => {
  const page = normalizeCompetitionPage({
    competitions: [{ id: "comp-1", results: [{ id: "result-1" }] }],
    meta: {
      hasNextPage: true,
      hasPreviousPage: false,
      page: 1,
      perPage: 15,
      total: 18,
      totalPages: 2,
    },
  }, { page: 1, perPage: 15 });

  assert.equal(page.legacy, false);
  assert.equal(page.competitions[0].results[0].id, "result-1");
  assert.equal(page.meta.totalPages, 2);
});

test("competition page normalization preserves a legacy array during API-first rollout", () => {
  const page = normalizeCompetitionPageForUrl(
    [{ id: "legacy-1" }],
    "/api/competitions?page=3&per_page=15&format=page",
    15,
  );

  assert.equal(page.legacy, true);
  assert.deepEqual(page.competitions, [{ id: "legacy-1" }]);
  assert.equal(page.meta.page, 3);
  assert.equal(page.meta.hasPreviousPage, true);
});

test("competition page normalization rejects malformed metadata safely", () => {
  const page = normalizeCompetitionPage({
    competitions: [{ id: "comp-1" }],
    meta: { page: 0 },
  }, { page: 1, perPage: 15 });

  assert.equal(page.legacy, true);
  assert.deepEqual(page.competitions, []);
});
