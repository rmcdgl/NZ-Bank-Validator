# NZ Bank Validator

A small, zero dependency JavaScript NZ bank account validation library that runs everywhere.

This package validates New Zealand bank account structure and checksum using [IRD guidance](https://www.ird.govt.nz/digital-service-providers/services-catalogue/returns-and-information/payday-filing/payroll-calculations-and-business-rules). Bank/branch validation uses broad ranges informed by the [Payments NZ Bank Branch Register](https://www.paymentsnz.co.nz/resources/industry-registers/bank-branch-register/).

It does not prove that an account exists, that an account is open, or that a branch is currently active.

Forked from [Josh Hollinshead](https://github.com/kiwi-josh)'s [`nz-bank-account-validator`](https://github.com/kiwi-josh/NZ-Bank-Account-Validator).
The project was converted to Typescript and updated without any changes to the API.

## Getting Started

Using npm:

```shell
$ npm i --save nz-bank-validator
```

Using yarn:

```shell
$ yarn add nz-bank-validator
```

### Installation

In Node.js (require):

```js
const bankValidator = require("nz-bank-validator");

bankValidator.validate("01-902-0068389-00");
// => true
```

ES6 Modules:

```js
import bankValidator from "nz-bank-validator";

bankValidator.validate("01-902-0068389-00");
// => true
```

## Usage

```js
const bankValidator = require("nz-bank-validator");

bankValidator.getId("01-902-0068389-00"); // '01'
bankValidator.getBranch("01-902-0068389-00"); // '902'
bankValidator.getBase("01-902-0068389-00"); // '0068389'
bankValidator.getSuffix("01-902-0068389-00"); // '00'

bankValidator.getPartsObject("01-902-0068389-00"); // { id: '01', branch: '902', base: '0068389', suffix: '00' }

bankValidator.validate("01-902-0068389-00"); // true
bankValidator.validate({
  id: "01",
  branch: "902",
  base: "0068389",
  suffix: "00",
}); // true

bankValidator.validate("01-902-XXXXX-00"); // false
bankValidator.validate("01-902--00"); // false
bankValidator.validate("01-902-123456-00"); // false
```

## Running the tests

To run the tests locally:

```shell
npm i
npm test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## References

- [IRD - Payroll calculations and business rules](https://www.ird.govt.nz/digital-service-providers/services-catalogue/returns-and-information/payday-filing/payroll-calculations-and-business-rules)
- [Payments NZ - Bank Branch Register](https://www.paymentsnz.co.nz/resources/industry-registers/bank-branch-register/)
