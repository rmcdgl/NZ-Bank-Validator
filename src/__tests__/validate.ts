import bankAccountValidator from "..";

type ValidatorInput = Parameters<typeof bankAccountValidator.validate>[0];

const validateTests: [string, unknown, boolean][] = [
  //   Success tests
  ["Algorithm A test", "01-902-0068389-00", true],
  [
    "Algorithm A test as object",
    { id: "01", branch: "902", base: "0068389", suffix: "083" },
    true,
  ],
  ["Algorithm A test (No delimiters)", "01902006838900", true],
  ["Algorithm A test with 15-digit compact form", "010902006838900", true],
  ["Algorithm A test with 18-digit compact form", "010902000683890000", true],
  ["Algorithm D test", "08-6523-1954512-001", true],
  ["Algorithm D test with 16-digit compact form", "0865231954512001", true],
  ["Algorithm D test with 18-digit compact form", "086523019545120001", true],
  ["Algorithm F test", "25-2500-0000000-00", true],
  ["Algorithm X test", "31-2825-12345678-0000", true],
  ["Random test 1", "12-3140-0171323-50", true],
  ["Random test 2", "12-3141-325080-00", true],
  ["ANZ institutional (added in 2020 spec)", "04-2021-0095861-15", true],

  // Failure tests
  ["String missing branch, base and suffix", "02-01", false],
  ["String missing base and suffix", "01-902", false],
  ["String missing suffix", "01-902-0068389", false],

  [
    "Object missing id",
    { branch: "902", base: "0068389", suffix: "083" },
    false,
  ],
  [
    "Object missing branch",
    { id: "01", base: "0068389", suffix: "083" },
    false,
  ],
  ["Object missing base", { id: "01", branch: "902", suffix: "083" }, false],
  [
    "Object missing suffix",
    { id: "01", branch: "902", base: "0068389" },
    false,
  ],
  ["Number instead of string or object", 12345678, false],
  ["Invalid random test", "01-9999-12312311-111", false],
  ["Invalid bank ID", "99-9999-1234567-00", false],
  ["Invalid branch for known bank ID", "08-0001-1954512-001", false],
];

validateTests.forEach(([label, input, result]) => {
  test(label, () => {
    expect(bankAccountValidator.validate(input as ValidatorInput)).toBe(result);
  });
});

test("object key order does not affect validation", () => {
  expect(
    bankAccountValidator.validate({
      id: "01",
      branch: "902",
      base: "0068389",
      suffix: "00",
    })
  ).toBe(true);

  expect(
    bankAccountValidator.validate({
      suffix: "00",
      base: "0068389",
      branch: "902",
      id: "01",
    })
  ).toBe(true);
});

test("branch examples are covered by broad ranges", () => {
  expect(bankAccountValidator.getBankData("03", "5050")).toBeDefined();
  expect(bankAccountValidator.getBankData("38", "9000")).toBeDefined();
  expect(bankAccountValidator.getBankData("08", "6523")).toBeDefined();
});

test("public parser helpers keep existing output", () => {
  expect(bankAccountValidator.getBranch("01-902-0068389-00")).toBe("902");
  expect(bankAccountValidator.splitString("01902006838900")).toEqual([
    "01",
    "902",
    "0068389",
    "00",
  ]);
});
