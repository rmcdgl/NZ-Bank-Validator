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

export type Branches = {
  [key: string]: [number, number][];
};

export type BankData = {
  key: string;
  branches: Branches;
};

export type BankChecksum = {
  weighting: number[];
  modulo: number;
  specialCase?: boolean;
};

export type BankChecksums = {
  [key: string]: BankChecksum;
};
