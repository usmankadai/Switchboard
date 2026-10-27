import { describe, expect, it } from "vitest";
import { demoAddressesFor } from "./demo-addresses";
import { POSTCODE_MESSAGES } from "./postcode";
import {
  checkSignupDetails,
  EMPTY_SIGNUP_FORM,
  SIGNUP_FIELDS,
  SIGNUP_MESSAGES,
  validateSignupForm,
  type SignupFormValues,
} from "./signup-form";

const addresses = demoAddressesFor("SW1A 1AA");

const complete: SignupFormValues = {
  fullName: "Sam Taylor",
  email: "sam@example.com",
  addressPostcode: "SW1A 1AA",
  addressOptions: addresses,
  address: addresses[2]!,
  confirmed: true,
};

describe("checkSignupDetails", () => {
  it("accepts a name and email, ignoring surrounding spaces", () => {
    expect(checkSignupDetails({ fullName: "  Sam  ", email: " sam@example.com " })).toEqual([]);
  });

  it.each(["sam", "sam@example", "sam @example.com", "@example.com"])(
    "rejects the email %j",
    (email) => {
      expect(checkSignupDetails({ fullName: "Sam", email })).toEqual([
        { fieldId: SIGNUP_FIELDS.email, message: SIGNUP_MESSAGES.emailInvalid },
      ]);
    },
  );

  it("rejects a name that is too long", () => {
    expect(checkSignupDetails({ fullName: "a".repeat(101), email: "sam@example.com" })).toEqual([
      { fieldId: SIGNUP_FIELDS.fullName, message: SIGNUP_MESSAGES.nameTooLong },
    ]);
  });
});

describe("validateSignupForm", () => {
  it("accepts a complete form", () => {
    expect(validateSignupForm(complete)).toEqual([]);
  });

  it("lists every problem in page order", () => {
    expect(validateSignupForm(EMPTY_SIGNUP_FORM).map((error) => error.message)).toEqual([
      SIGNUP_MESSAGES.nameEmpty,
      SIGNUP_MESSAGES.emailEmpty,
      POSTCODE_MESSAGES.empty,
      SIGNUP_MESSAGES.confirm,
    ]);
  });

  it("asks people to use the finder when the postcode looks right", () => {
    const errors = validateSignupForm({ ...complete, addressOptions: null, address: "" });
    expect(errors).toEqual([
      { fieldId: SIGNUP_FIELDS.addressPostcode, message: SIGNUP_MESSAGES.addressNotFound },
    ]);
  });

  it("asks people to pick an address once some are found", () => {
    expect(validateSignupForm({ ...complete, address: "" })).toEqual([
      { fieldId: SIGNUP_FIELDS.address, message: SIGNUP_MESSAGES.addressNotSelected },
    ]);
  });

  it("rejects an address that is not in the list", () => {
    expect(validateSignupForm({ ...complete, address: "Somewhere else" })).toHaveLength(1);
  });
});

describe("demoAddressesFor", () => {
  it("returns clearly made-up addresses for the postcode", () => {
    expect(addresses).toHaveLength(5);
    expect(addresses.every((address) => address.includes("Sample Road, SW1A 1AA"))).toBe(true);
  });
});
