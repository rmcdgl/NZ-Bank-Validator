export type PartsObject = {
  id: string;
  branch: string;
  base: string;
  suffix: string;
};

export type PartIndexes = {
  [key in keyof PartsObject]: number;
};

export type PartMaxLengths = {
  [key in keyof PartsObject]: number;
};

export type BranchRange = readonly [start: number, end: number];

export type BranchRanges = {
  readonly [key: string]: readonly BranchRange[];
};

export type BankAlgorithm = "AB" | "D" | "F" | "X";

export type BankAlgorithms = {
  readonly [key: string]: BankAlgorithm;
};

export type BankData = {
  key: BankAlgorithm;
};

export type BankChecksum = {
  weighting: number[];
  modulo: number;
  specialCase?: boolean;
};

export type BankChecksums = {
  [key: string]: BankChecksum;
};
