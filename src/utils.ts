import { partMaxLengths } from "./constants";
import type { BranchRange, PartsObject } from "./models";

const ORDERED_PART_KEYS = ["id", "branch", "base", "suffix"] as const;

const isString = (x: unknown): x is string => x === x + "";

const isNumbersOnly = (x: string | undefined): boolean =>
  !!x && /^[0-9]+$/.test(x);

const padLeft = (input: string | number, length: number, token = "0"): string =>
  Array(length - String(input).length + 1).join(token) + input;

const inRange = (start: number, value: number, end: number): boolean =>
  value >= start && value <= end;

const inRanges = (
  value: number,
  ranges: readonly BranchRange[] = []
): boolean => {
  return ranges.reduce((bool, range) => {
    const [start, end] = range;

    return bool || inRange(start, value, end);
  }, false);
};

const sumChars = (int: number): number => {
  return (int + "").split("").reduce((acc, num) => {
    return acc + parseInt(num, 10);
  }, 0);
};

const getPaddedAccountArray = (partsObj: PartsObject): string[] => {
  return ORDERED_PART_KEYS.flatMap((key) =>
    padLeft(partsObj[key], partMaxLengths[key]).split("")
  );
};

export {
  isString,
  isNumbersOnly,
  padLeft,
  inRange,
  inRanges,
  sumChars,
  getPaddedAccountArray,
};
