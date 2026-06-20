#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { loadBankData } from "./lib/load-bank-data.mjs";

const DEFAULT_REGISTER_URL =
  "https://www.paymentsnz.co.nz/resources/industry-registers/bank-branch-register/download/csv/";
const DEFAULT_REGISTER_PAGE =
  "https://www.paymentsnz.co.nz/resources/industry-registers/bank-branch-register/";

function parseArgs(argv) {
  const options = {
    file: undefined,
    fix: false,
    report: undefined,
    snapshotDir: undefined,
    snapshotIndex: undefined,
    url: DEFAULT_REGISTER_URL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--file") {
      options.file = argv[++index];
    } else if (arg === "--fix") {
      options.fix = true;
    } else if (arg === "--report") {
      options.report = argv[++index];
    } else if (arg === "--snapshot-dir") {
      options.snapshotDir = argv[++index];
    } else if (arg === "--snapshot-index") {
      options.snapshotIndex = argv[++index];
    } else if (arg === "--url") {
      options.url = argv[++index];
    } else if (arg === "--suggest-fix") {
      // Accepted for workflow readability. Suggestions are included by default.
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((value) => value.length > 0));
}

function normalizeHeader(header) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rowsToObjects(rows) {
  const [headers, ...dataRows] = rows;

  if (!headers) {
    throw new Error("CSV contains no header row.");
  }

  return dataRows.map((row) => {
    return headers.reduce((record, header, index) => {
      record[normalizeHeader(header)] = row[index] ?? "";
      return record;
    }, {});
  });
}

function getColumn(row, names) {
  for (const name of names) {
    if (row[name] !== undefined) {
      return row[name];
    }
  }

  return undefined;
}

function toBankId(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits.padStart(2, "0");
}

function toBranchNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return Number.NaN;
  }

  return Number(digits);
}

function parseRegister(csv) {
  const rows = rowsToObjects(parseCsv(csv));

  return rows
    .map((row) => {
      const status = String(
        getColumn(row, ["lateststatus", "status", "branchstatus"]) ?? ""
      ).trim();

      return {
        bankId: toBankId(getColumn(row, ["banknumber", "bank"])),
        branchNumber: toBranchNumber(getColumn(row, ["branchnumber", "branch"])),
        status,
      };
    })
    .filter((row) => {
      const normalizedStatus = row.status.toLowerCase();
      return normalizedStatus === "active" || normalizedStatus === "a";
    });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "nz-bank-validator bank-register-check" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function getRegisterDate(options) {
  if (options.file) {
    return "fixture";
  }

  try {
    const html = await fetchText(DEFAULT_REGISTER_PAGE);
    const match = html.match(/\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b/);
    return match?.[0] ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function loadRegisterCsv(options) {
  if (options.file) {
    return readFileSync(options.file, "utf8");
  }

  return fetchText(options.url);
}

function analyze(activeRows, bankData) {
  const { BANK_ALGORITHMS, BRANCH_RANGES, CURRENT_BANK_ALGORITHMS, LEGACY_BANK_ALGORITHMS } =
    bankData;
  const errors = [];
  const warnings = [];
  const uncovered = [];
  const activeByBank = new Map();

  for (const row of activeRows) {
    if (!/^\d{2}$/.test(row.bankId) || !Number.isInteger(row.branchNumber)) {
      errors.push(`Malformed active row: ${row.bankId}-${row.branchNumber}`);
      continue;
    }

    if (!activeByBank.has(row.bankId)) {
      activeByBank.set(row.bankId, new Set());
    }
    activeByBank.get(row.bankId).add(row.branchNumber);

    if (!BANK_ALGORITHMS[row.bankId]) {
      errors.push(`Active bank ${row.bankId} has no algorithm mapping.`);
      continue;
    }

    if (!inRangesLocal(row.branchNumber, BRANCH_RANGES[row.bankId])) {
      uncovered.push(row);
    }
  }

  for (const bankId of Object.keys(BRANCH_RANGES)) {
    if (!activeByBank.has(bankId)) {
      warnings.push(`Local bank ${bankId} has no active rows in the current register.`);
    }
  }

  for (const bankId of Object.keys(LEGACY_BANK_ALGORITHMS)) {
    if (!CURRENT_BANK_ALGORITHMS[bankId]) {
      warnings.push(`Legacy bank ${bankId} is accepted locally but is not a current IRD Bank ID.`);
    }
  }

  if (uncovered.length > 0) {
    errors.push(`${uncovered.length} active branch row(s) are outside local ranges.`);
  }

  return { activeByBank, errors, uncovered, warnings };
}

function inRangesLocal(value, ranges = []) {
  return ranges.some(([start, end]) => value >= start && value <= end);
}

function getSafeSuggestion(row, ranges) {
  if (
    row.bankId === "03" &&
    row.branchNumber === 5050 &&
    !inRangesLocal(5050, ranges)
  ) {
    return { bankId: "03", range: [5000, 5099] };
  }

  return undefined;
}

function applySafeFixes(uncovered, bankData) {
  const suggestions = uncovered
    .map((row) => getSafeSuggestion(row, bankData.BRANCH_RANGES[row.bankId]))
    .filter(Boolean);

  if (suggestions.length === 0) {
    return [];
  }

  const sourcePath = "src/constants.ts";
  let source = readFileSync(sourcePath, "utf8");
  const applied = [];

  for (const suggestion of suggestions) {
    const [start, end] = suggestion.range;
    const rangeText = `    [${start}, ${end}],`;

    if (source.includes(rangeText)) {
      continue;
    }

    if (suggestion.bankId === "03" && source.includes("    [1900, 1999],")) {
      source = source.replace(
        "    [1900, 1999],\n",
        `    [1900, 1999],\n${rangeText}\n`
      );
      applied.push(suggestion);
    }
  }

  if (applied.length > 0) {
    writeFileSync(sourcePath, source);
  }

  return applied;
}

function formatBranch(row) {
  return `${row.bankId}-${String(row.branchNumber).padStart(4, "0")}`;
}

function getBranchIds(activeRows) {
  return Array.from(new Set(activeRows.map(formatBranch))).sort();
}

function parseSnapshotDate(value) {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  const textMatch = value.match(/^(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})$/);

  if (!textMatch) {
    return undefined;
  }

  const months = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11,
  };
  const [, day, month, year] = textMatch;
  const monthIndex = months[month];

  if (monthIndex === undefined) {
    return undefined;
  }

  return new Date(Date.UTC(Number(year), monthIndex, Number(day)));
}

function toDateSlug(value) {
  const parsed = parseSnapshotDate(value);

  if (parsed) {
    return parsed.toISOString().slice(0, 10);
  }

  if (value === "fixture") {
    return "fixture";
  }

  return new Date().toISOString().slice(0, 10);
}

function readSnapshot(filePath) {
  const branches = readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  return {
    branches,
    file: filePath,
    name: basename(filePath),
    slug: basename(filePath, ".txt"),
  };
}

function diffBranches(currentBranches, previousBranches) {
  const current = new Set(currentBranches);
  const previous = new Set(previousBranches);

  return {
    added: currentBranches.filter((branch) => !previous.has(branch)),
    removed: previousBranches.filter((branch) => !current.has(branch)),
  };
}

function findPreviousSnapshot(snapshotDir, currentSlug) {
  if (!existsSync(snapshotDir)) {
    return undefined;
  }

  const snapshots = readdirSync(snapshotDir)
    .filter((file) => file.endsWith(".txt"))
    .map((file) => basename(file, ".txt"))
    .filter((slug) => slug !== currentSlug)
    .sort();

  const earlierSnapshots = snapshots.filter((slug) => slug < currentSlug);
  const previousSlug =
    earlierSnapshots[earlierSnapshots.length - 1] ?? snapshots[snapshots.length - 1];

  if (!previousSlug) {
    return undefined;
  }

  return readSnapshot(join(snapshotDir, `${previousSlug}.txt`));
}

function findSnapshotAtLeastMonthsOld(snapshotDir, currentSlug, monthsBack) {
  const currentDate = parseSnapshotDate(currentSlug);

  if (!currentDate || !existsSync(snapshotDir)) {
    return undefined;
  }

  const threshold = new Date(currentDate);
  threshold.setUTCMonth(threshold.getUTCMonth() - monthsBack);

  const candidates = readdirSync(snapshotDir)
    .filter((file) => file.endsWith(".txt"))
    .map((file) => basename(file, ".txt"))
    .filter((slug) => slug !== currentSlug)
    .map((slug) => ({ date: parseSnapshotDate(slug), slug }))
    .filter((snapshot) => snapshot.date && snapshot.date <= threshold)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const candidate = candidates[candidates.length - 1];

  if (!candidate) {
    return undefined;
  }

  return readSnapshot(join(snapshotDir, `${candidate.slug}.txt`));
}

function writeSnapshotIndex(snapshotDir, snapshotIndex, currentSnapshot) {
  const snapshots = readdirSync(snapshotDir)
    .filter((file) => file.endsWith(".txt"))
    .sort()
    .map((file) => {
      const snapshot = readSnapshot(join(snapshotDir, file));

      return {
        activeBranches: snapshot.branches.length,
        file: `snapshots/${file}`,
        registerDate: snapshot.slug,
      };
    });

  writeFileSync(
    snapshotIndex,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        latest: {
          activeBranches: currentSnapshot.branches.length,
          file: `snapshots/${currentSnapshot.name}`,
          registerDate: currentSnapshot.slug,
        },
        snapshots,
      },
      null,
      2
    )}\n`
  );
}

function writeSnapshot({ activeRows, options, registerDate }) {
  if (!options.snapshotDir) {
    return undefined;
  }

  const snapshotDir = options.snapshotDir;
  const snapshotIndex = options.snapshotIndex ?? join(snapshotDir, "..", "index.json");
  const currentSlug = toDateSlug(registerDate);
  const currentBranches = getBranchIds(activeRows);
  const previousSnapshot = findPreviousSnapshot(snapshotDir, currentSlug);
  const snapshotPath = join(snapshotDir, `${currentSlug}.txt`);

  mkdirSync(snapshotDir, { recursive: true });

  writeFileSync(
    snapshotPath,
    [
      "# Payments NZ Bank Branch Register",
      `# Register date: ${registerDate}`,
      `# Retrieved at: ${new Date().toISOString()}`,
      `# Active branches: ${currentBranches.length}`,
      ...currentBranches,
      "",
    ].join("\n")
  );

  const currentSnapshot = readSnapshot(snapshotPath);
  const comparison = previousSnapshot
    ? {
        ...diffBranches(currentBranches, previousSnapshot.branches),
        previous: previousSnapshot,
      }
    : undefined;

  const lagComparisons = [1, 3, 6, 12]
    .map((months) => {
      const snapshot = findSnapshotAtLeastMonthsOld(snapshotDir, currentSlug, months);

      if (!snapshot) {
        return undefined;
      }

      return {
        months,
        snapshot,
        ...diffBranches(currentBranches, snapshot.branches),
      };
    })
    .filter(Boolean);

  writeSnapshotIndex(snapshotDir, snapshotIndex, currentSnapshot);

  return { comparison, current: currentSnapshot, lagComparisons };
}

function addBranchList(lines, branches) {
  if (branches.length === 0) {
    lines.push("- None");
    return;
  }

  branches.forEach((branch) => lines.push(`- ${branch}`));
}

function buildReport({
  activeRows,
  analysis,
  appliedFixes,
  registerDate,
  snapshotReport,
}) {
  const covered = activeRows.length - analysis.uncovered.length;
  const lines = [
    "# Payments NZ Bank Branch Register coverage report",
    "",
    `Register date: ${registerDate}`,
    "",
    "## Coverage",
    "",
    `- Covered active branches: ${covered}`,
    `- Uncovered active branches: ${analysis.uncovered.length}`,
    "",
  ];

  if (analysis.uncovered.length > 0) {
    lines.push("## Uncovered active branches", "");
    analysis.uncovered
      .map(formatBranch)
      .sort()
      .forEach((branch) => lines.push(`- ${branch}`));
    lines.push("");
  }

  const suggestions = analysis.uncovered
    .map((row) => getSafeSuggestion(row, BRANCH_RANGES[row.bankId]))
    .filter(Boolean);

  if (suggestions.length > 0) {
    lines.push("## Suggested safe changes", "");
    suggestions.forEach((suggestion) => {
      const [start, end] = suggestion.range;
      lines.push(`- ${suggestion.bankId}: add [${start}, ${end}]`);
    });
    lines.push("");
  }

  if (appliedFixes.length > 0) {
    lines.push("## Applied fixes", "");
    appliedFixes.forEach((suggestion) => {
      const [start, end] = suggestion.range;
      lines.push(`- ${suggestion.bankId}: added [${start}, ${end}]`);
    });
    lines.push("");
  }

  if (snapshotReport) {
    lines.push("## Register movement", "");

    if (snapshotReport.comparison) {
      lines.push(`Compared with: ${snapshotReport.comparison.previous.slug}`, "");
      lines.push(`Added active branches: ${snapshotReport.comparison.added.length}`, "");
      addBranchList(lines, snapshotReport.comparison.added);
      lines.push("");
      lines.push(`Removed active branches: ${snapshotReport.comparison.removed.length}`, "");
      addBranchList(lines, snapshotReport.comparison.removed);
    } else {
      lines.push("No previous snapshot found. This run wrote the baseline snapshot.");
    }

    lines.push("");
  }

  if (snapshotReport?.lagComparisons.length > 0) {
    lines.push("## Update-lag simulation", "");
    snapshotReport.lagComparisons.forEach((comparison) => {
      lines.push(
        `- ${comparison.months} month(s): ${comparison.added.length} active branch(es) were added since ${comparison.snapshot.slug}; ${comparison.removed.length} branch(es) were removed.`
      );
    });
    lines.push("");
  }

  if (analysis.warnings.length > 0) {
    lines.push("## Warnings", "");
    analysis.warnings.forEach((warning) => lines.push(`- ${warning}`));
    lines.push("");
  }

  if (analysis.errors.length > 0) {
    lines.push("## Errors", "");
    analysis.errors.forEach((error) => lines.push(`- ${error}`));
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const options = parseArgs(process.argv.slice(2));
const bankData = loadBankData();
const { BRANCH_RANGES } = bankData;

try {
  const [csv, registerDate] = await Promise.all([
    loadRegisterCsv(options),
    getRegisterDate(options),
  ]);
  const activeRows = parseRegister(csv);

  if (activeRows.length === 0) {
    throw new Error("No active rows found; check CSV format and status column names.");
  }

  let analysis = analyze(activeRows, bankData);
  let appliedFixes = [];
  const snapshotReport = writeSnapshot({ activeRows, options, registerDate });

  if (options.fix && analysis.uncovered.length > 0) {
    appliedFixes = applySafeFixes(analysis.uncovered, bankData);

    if (appliedFixes.length > 0) {
      const reloadedBankData = loadBankData({ reload: true });
      analysis = analyze(activeRows, reloadedBankData);
    }
  }

  const report = buildReport({
    activeRows,
    analysis,
    appliedFixes,
    registerDate,
    snapshotReport,
  });

  if (options.report) {
    writeFileSync(options.report, report);
  } else {
    process.stdout.write(report);
  }

  if (analysis.errors.length > 0) {
    process.exit(1);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Bank register check failed: ${message}`);
  process.exit(1);
}
