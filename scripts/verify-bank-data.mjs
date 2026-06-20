#!/usr/bin/env node
import { loadBankData } from "./lib/load-bank-data.mjs";

const {
  BANK_ALGORITHMS,
  BRANCH_RANGES,
  CURRENT_BANK_ALGORITHMS,
  LEGACY_BANK_ALGORITHMS,
  bankChecksums,
} = loadBankData();

const errors = [];
const warnings = [];

function isInteger(value) {
  return Number.isInteger(value);
}

function checkRangeTable() {
  for (const [bankId, ranges] of Object.entries(BRANCH_RANGES)) {
    if (!BANK_ALGORITHMS[bankId]) {
      errors.push(`Bank ${bankId} has branch ranges but no algorithm mapping.`);
    }

    if (!Array.isArray(ranges) || ranges.length === 0) {
      errors.push(`Bank ${bankId} must have at least one branch range.`);
      continue;
    }

    let previousEnd = -1;

    ranges.forEach((range, index) => {
      const label = `${bankId} range ${index + 1}`;

      if (!Array.isArray(range) || range.length !== 2) {
        errors.push(`${label} must be a [start, end] pair.`);
        return;
      }

      const [start, end] = range;

      if (!isInteger(start) || !isInteger(end)) {
        errors.push(`${label} must use integer bounds.`);
      }

      if (start < 0 || end < 0 || start > 9999 || end > 9999) {
        errors.push(`${label} must stay within 0000-9999.`);
      }

      if (start > end) {
        errors.push(`${label} start must be <= end.`);
      }

      if (start <= previousEnd) {
        errors.push(`${label} overlaps or is not sorted.`);
      }

      previousEnd = end;
    });
  }
}

function checkAlgorithmMappings() {
  for (const [bankId, algorithm] of Object.entries(BANK_ALGORITHMS)) {
    if (!bankChecksums[algorithm] && algorithm !== "AB") {
      errors.push(`Bank ${bankId} maps to unknown algorithm ${algorithm}.`);
    }

    if (!BRANCH_RANGES[bankId]) {
      errors.push(`Bank ${bankId} has an algorithm mapping but no branch ranges.`);
    }
  }

  for (const bankId of Object.keys(CURRENT_BANK_ALGORITHMS)) {
    if (!BRANCH_RANGES[bankId]) {
      errors.push(`Current bank ${bankId} has no branch ranges.`);
    }
  }

  for (const bankId of Object.keys(LEGACY_BANK_ALGORITHMS)) {
    if (!BRANCH_RANGES[bankId]) {
      errors.push(`Legacy bank ${bankId} has no branch ranges.`);
    } else if (CURRENT_BANK_ALGORITHMS[bankId]) {
      warnings.push(`Bank ${bankId} is marked legacy but is also current.`);
    }
  }
}

checkRangeTable();
checkAlgorithmMappings();

if (warnings.length > 0) {
  console.warn("Bank data warnings:");
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length > 0) {
  console.error("Bank data verification failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Bank data verified: ${Object.keys(BANK_ALGORITHMS).length} bank IDs, ${Object.values(
    BRANCH_RANGES
  ).reduce((count, ranges) => count + ranges.length, 0)} branch ranges.`
);
