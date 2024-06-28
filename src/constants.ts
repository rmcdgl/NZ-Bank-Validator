import type {
  BankData,
  BankChecksums,
  PartsObject,
  PartIndexes,
  PartMaxLengths,
} from "./models";

const partConstants: PartsObject = {
  id: "id",
  branch: "branch",
  base: "base",
  suffix: "suffix",
};

const partIndexes: PartIndexes = {
  id: 0,
  branch: 1,
  base: 2,
  suffix: 3,
};

const partMaxLengths: PartMaxLengths = {
  id: 2,
  branch: 4,
  base: 8,
  suffix: 4,
};

// The ranges used for branches are inclusive
const bankData: BankData[] = [
  {
    key: "AB",
    branches: {
      "01": [
        [1, 999],
        [1100, 1199],
        [1800, 1899],
        [6150, 6150],
      ],

      "02": [
        [1, 999],
        [1200, 1299],
        [2025, 2055],
      ],

      "03": [
        [1, 999],
        [1300, 1399],
        [1500, 1599],
        [1700, 1799],
        [1900, 1999],
        [7350, 7399],
      ],

      "04": [[2014, 2024]], // Lower bound from https://www.paymentsnz.co.nz/resources/industry-registers/bank-branch-register/

      "05": [[8884, 8889]], // China Construction Bank, see https://www.paymentsnz.co.nz/resources/industry-registers/bank-branch-register/

      "06": [
        [1, 999],
        [1400, 1499],
      ],

      10: [[5165, 5169]],

      11: [
        [5000, 6499],
        [6600, 8999],
      ],

      12: [
        [3000, 3299],
        [3400, 3499],
        [3600, 3699],
      ],

      13: [[4900, 4999]],

      14: [[4700, 4799]],

      15: [[3900, 3999]],

      16: [[4400, 4499]],

      17: [[3300, 3399]],

      18: [[3500, 3599]],

      19: [[4600, 4649]],

      20: [[4100, 4199]],

      21: [[4800, 4899]],

      22: [[4000, 4049]],

      23: [[3700, 3799]],

      24: [[4300, 4349]],

      27: [[3800, 3849]],

      30: [[2900, 2949]],

      35: [[2400, 2499]],

      38: [[9000, 9499]],

      88: [[8800, 8805]], // Bank of China, see https://www.paymentsnz.co.nz/resources/industry-registers/bank-branch-register/
    },
  },

  {
    key: "D",
    branches: {
      "08": [[6500, 6599]],
    },
  },

  {
    key: "F",
    branches: {
      25: [[2500, 2599]],
    },
  },

  {
    key: "X",
    branches: {
      31: [[2800, 2849]],
    },
  },
];

const bankChecksums: BankChecksums = {
  A: {
    weighting: [0, 0, 6, 3, 7, 9, 0, 0, 10, 5, 8, 4, 2, 1, 0, 0, 0, 0],
    modulo: 11,
  },

  B: {
    weighting: [0, 0, 0, 0, 0, 0, 0, 0, 10, 5, 8, 4, 2, 1, 0, 0, 0, 0],
    modulo: 11,
  },

  C: {
    weighting: [3, 7, 0, 0, 0, 0, 9, 1, 10, 5, 3, 4, 2, 1, 0, 0, 0, 0],
    modulo: 11,
  },

  D: {
    weighting: [0, 0, 0, 0, 0, 0, 0, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0],
    modulo: 11,
  },

  E: {
    weighting: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 4, 3, 2, 0, 0, 0, 1],
    modulo: 11,
    specialCase: true,
  },

  F: {
    weighting: [0, 0, 0, 0, 0, 0, 0, 1, 7, 3, 1, 7, 3, 1, 0, 0, 0, 0],
    modulo: 10,
  },

  G: {
    weighting: [0, 0, 0, 0, 0, 0, 0, 1, 3, 7, 1, 3, 7, 1, 0, 3, 7, 1],
    modulo: 10,
    specialCase: true,
  },

  X: {
    weighting: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    modulo: 1,
  },
};

export { partConstants, partIndexes, partMaxLengths, bankData, bankChecksums };
