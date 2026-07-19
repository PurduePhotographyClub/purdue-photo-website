import assert from "node:assert/strict";
import test from "node:test";

import {
  formatClubTenure,
  normalizePublicProfileStatistics,
} from "../src/lib/profile-statistics.ts";

test("club tenure is formatted as readable elapsed months and years", () => {
  assert.equal(formatClubTenure(0), "New member");
  assert.equal(formatClubTenure(6), "6 months");
  assert.equal(formatClubTenure(24), "2 years");
  assert.equal(formatClubTenure(null), "Not available");
});

test("public profile statistics reject malformed or identifying anonymous values", () => {
  assert.deepEqual(normalizePublicProfileStatistics({
    clubTenureMonths: 23,
    competitionTopThreePlacements: 3,
    photographs: 12,
  }, false), {
    clubTenureMonths: 23,
    competitionTopThreePlacements: 3,
    photographs: 12,
  });

  assert.deepEqual(normalizePublicProfileStatistics({
    clubTenureMonths: -1,
    competitionTopThreePlacements: -1,
    photographs: -3,
  }, false), {
    clubTenureMonths: null,
    competitionTopThreePlacements: 0,
    photographs: 0,
  });

  assert.deepEqual(normalizePublicProfileStatistics({
    clubTenureMonths: 23,
    competitionTopThreePlacements: 99,
    photographs: 12,
  }, true), {
    clubTenureMonths: null,
    competitionTopThreePlacements: null,
    photographs: 12,
  });
});
