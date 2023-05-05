import {
  partConstants,
  partIndexes,
  partMaxLengths,
  bankData,
  bankChecksums,
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

function isPartsObject(obj: unknown = {}): obj is PartsObject {
  if (typeof obj !== "object" || obj === null) return false;
  const inputsKeys = Object.keys(obj);
  const requiredKeys = Object.keys(partConstants);
  const filteredKeys = requiredKeys.filter((k) => inputsKeys.includes(k));

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

  isPartsObject(obj: unknown = {}): obj is PartsObject {
    if (typeof obj !== "object" || obj === null) return false;
    const inputsKeys = Object.keys(obj);
    const requiredKeys = Object.keys(partConstants);
    const filteredKeys = requiredKeys.filter((k) => inputsKeys.includes(k));

    return requiredKeys.length === filteredKeys.length;
  },

  splitString(str = ""): string[] {
    const parts = isString(str) ? str.split(/[^0-9]/) : [];

    // If the input string had no delimiters, and its length is
    // long enough, manually forge an array.
    if (parts.length === 1) {
      parts[0] = str.slice(0, 2);
      parts[1] = str.slice(2, 5);
      parts[2] = str.slice(5, 12);
      parts[3] = str.slice(12);
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

    return bankData.find((r) => {
      r.branches;
      const ranges = r.branches[paddedId];

      return ranges && inRanges(parseInt(branch, 10), ranges);
    });
  },

  getChecksum(bankData: BankData, base: string): BankChecksum | undefined {
    let { key } = bankData;

    if (key === "AB") {
      key = parseInt(base, 10) < 990000 ? "A" : "B";
    }

    return bankChecksums[key];
  },
};

export default bankAccountValidator;
