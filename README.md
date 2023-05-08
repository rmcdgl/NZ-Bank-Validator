# NZ Bank Validator

A small, zero dependency Javascript NZ bank account validation library that runs everywhere.

It is based on the [2020 documentation](https://www.ird.govt.nz/-/media/project/ir/home/documents/income-tax/withholding-taxes/rwt-nrwt-withholding-tax-certificate/2020-rwt-and-nrwt-certificate-filing-specification.pdf) and the [PaymentsNZ Bank Branch Register](https://www.paymentsnz.co.nz/resources/industry-registers/bank-branch-register/) which includes a number of branches not included in the IRD's specs. These have no validation applied other than the checking the branch number is within the published range.

Forked from [Josh Hollinshead](https://github.com/kiwi-josh)'s [`nz-bank-account-validator`](https://github.com/kiwi-josh/NZ-Bank-Account-Validator).
The project was converted to Typescript and updated to the 2020 spec from the 2016 spec without any changes to the API.

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
bankValidator.getBranch("01-902-0068389-00"); // '02'
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
npm run tests
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## References

- [IRD - Validating Bank Account Numbers](https://www.ird.govt.nz/-/media/project/ir/home/documents/income-tax/withholding-taxes/rwt-nrwt-withholding-tax-certificate/2020-rwt-and-nrwt-certificate-filing-specification.pdf)
