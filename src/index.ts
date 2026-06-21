import {
  partConstants,
  partIndexes,
  partMaxLengths,
  bankChecksums,
  BANK_ALGORITHMS,
  BRANCH_RANGES,
} from "./constants";

import type { BankChecksum, BankData, PartsObject } from "./models";

import {
  isString,
  isNumbersOnly,
  padLeft,
  inRanges,
  sumChars,
  getPaddedAccountArray,
} from "./utils";

type Layout = readonly [id: number, branch: number, base: number, suffix: number];

const UNDELIMITED_LAYOUTS: Readonly<Record<number, Layout>> = {
  15: [2, 4, 7, 2],
  16: [2, 4, 7, 3],
  18: [2, 4, 8, 4],
};

function splitByLayout(digits: string, layout: Layout): string[] {
  const [idLength, branchLength, baseLength, suffixLength] = layout;

  const idEnd = idLength;
  const branchEnd = idEnd + branchLength;
  const baseEnd = branchEnd + baseLength;
  const suffixEnd = baseEnd + suffixLength;

  return [
    digits.slice(0, idEnd),
    digits.slice(idEnd, branchEnd),
    digits.slice(branchEnd, baseEnd),
    digits.slice(baseEnd, suffixEnd),
  ];
}

function splitUndelimited(digits: string): string[] {
  const layout = UNDELIMITED_LAYOUTS[digits.length];

  if (layout) {
    return splitByLayout(digits, layout);
  }

  return [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 12),
    digits.slice(12),
  ].filter(Boolean);
}

function isPartsObject(obj: unknown = {}): obj is PartsObject {
  if (typeof obj !== "object" || obj === null) return false;
  const inputsKeys = Object.keys(obj);
  const requiredKeys = Object.keys(partConstants);
  const filteredKeys = requiredKeys.filter((k) => inputsKeys.indexOf(k) !== -1);

  return requiredKeys.length === filteredKeys.length;
}

const bankAccountValidator = {
  getId(input: string | PartsObject): string {
    return this.getPartsObject(input).id;
  },
  getBranch(input: string | PartsObject): string {
    return this.getPartsObject(input).branch;
  },
  getBase(input: string | PartsObject): string {
    return this.getPartsObject(input).base;
  },
  getSuffix(input: string | PartsObject): string {
    return this.getPartsObject(input).suffix;
  },

  splitString(str = ""): string[] {
    const parts = isString(str) ? str.split(/[^0-9]/) : [];

    if (parts.length === 1) {
      return splitUndelimited(parts[0]);
    }

    return parts.filter((i) => i.length);
  },

  getPartsObject(input: string | PartsObject): PartsObject {
    if (isPartsObject(input)) {
      return input;
    }

    if (!isString(input)) {
      return {} as PartsObject;
    }

    const parts = this.splitString(input);

    return {
      id: parts[partIndexes.id],
      branch: parts[partIndexes.branch],
      base: parts[partIndexes.base],
      suffix: parts[partIndexes.suffix],
    };
  },

  partsObjectValid(obj: Partial<PartsObject> = {}): boolean {
    const keys = Object.keys(obj);

    if (keys.length !== 4) {
      return false;
    }

    return keys.reduce((isValid, key) => {
      const value = obj[key as keyof PartsObject];
      const onlyNumbers = isNumbersOnly(value);
      const withinMaxLength =
        isString(value) &&
        value.length <= partMaxLengths[key as keyof PartsObject];
      const valueValid = onlyNumbers && withinMaxLength;

      return isValid && valueValid;
    }, true);
  },

  validate(input: string | PartsObject): boolean {
    const partsObject = this.getPartsObject(input);

    if (!this.partsObjectValid(partsObject)) {
      return false;
    }

    const { id, branch, base } = partsObject;

    const bankDataEntry = this.getBankData(id, branch);

    if (!bankDataEntry) {
      return false;
    }

    const algorithm = this.getChecksum(bankDataEntry, base);

    if (!algorithm) {
      return false;
    }

    const { weighting, modulo, specialCase } = algorithm;

    const earlyExit = !specialCase;

    const result = getPaddedAccountArray(partsObject).reduce(
      (result, num, idx) => {
        const multiplied = parseInt(num, 10) * weighting[idx];

        if (earlyExit || multiplied < 10) {
          return result + multiplied;
        }

        const summed = sumChars(multiplied);
        const summedTwice = sumChars(summed);
        const final = summed < 10 ? summed : summedTwice;

        return result + final;
      },
      0
    );

    // Final modulo test
    return result % modulo === 0;
  },

  getBankData(id: string, branch: string): BankData | undefined {
    const paddedId = padLeft(id, partMaxLengths.id);
    const branchNumber = Number(branch);

    const algorithmKey = BANK_ALGORITHMS[paddedId];

    if (!algorithmKey) {
      return undefined;
    }

    const ranges = BRANCH_RANGES[paddedId];

    if (!ranges || !inRanges(branchNumber, ranges)) {
      return undefined;
    }

    return { key: algorithmKey };
  },

  getChecksum(bankData: BankData, base: string): BankChecksum | undefined {
    let key: string = bankData.key;

    if (key === "AB") {
      key = parseInt(base, 10) < 990000 ? "A" : "B";
    }

    return bankChecksums[key];
  },
};

export default bankAccountValidator;
