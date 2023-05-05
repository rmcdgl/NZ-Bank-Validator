import { partMaxLengths } from "./constants";
import type { PartMaxLengths } from "./models";

const isString = (x: unknown): x is string => x === x + "";

const isNumbersOnly = (x: string | undefined): boolean =>
  !!x && /^[0-9]+$/.test(x);

const padLeft = (input: string | number, length: number, token = "0"): string =>
  Array(length - String(input).length + 1).join(token) + input;

const inRange = (start: number, value: number, end: number): boolean =>
  value >= start && value <= end;

const inRanges = (
  value: number,
  ranges: Array<[number, number]> = []
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

const getPaddedAccountArray = (partsObj: Record<string, string>): string[] => {
  return Object.keys(partsObj).reduce((a, k) => {
    const key = k as keyof PartMaxLengths;
    const paddedValue = padLeft(partsObj[k], partMaxLengths[key]);
    const splitValues = paddedValue.split("");

    return a.concat(splitValues);
  }, [] as string[]);
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
