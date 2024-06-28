import bankAccountValidator from "..";

const validateTests: [string, any, boolean][] = [
  //   Success tests
  ["Algorithm A test", "01-902-0068389-00", true],
  [
    "Algorithm A test as object",
    { id: "01", branch: "902", base: "0068389", suffix: "083" },
    true,
  ],
  ["Algorithm A test (No delimiters)", "01902006838900", true],
  ["Algorithm D test", "08-6523-1954512-001", true],
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
];

validateTests.forEach(([label, input, result]) => {
  test(label, () => {
    expect(bankAccountValidator.validate(input)).toBe(result);
  });
});
