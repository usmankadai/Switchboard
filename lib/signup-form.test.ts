import { describe, expect, it } from "vitest";
import {
  checkSignupDetails,
  EMPTY_SIGNUP_FORM,
  SIGNUP_FIELDS,
  SIGNUP_MESSAGES,
  validateSignupForm,
  type SignupFormValues,
} from "./signup-form";

const complete: SignupFormValues = {
  fullName: "Sam Taylor",
  email: "sam@example.com",
  addressLine1: "10 Downing Street",
  addressLine2: "",
  addressTown: "London",
  addressPostcode: "SW1A 2AA",
  confirmed: true,
};

const details = { fullName: "Sam", email: "sam@example.com", supplyPostcode: "SW1A 2AA" };

describe("checkSignupDetails (shared with the server)", () => {
  it("accepts a name, email and postcode, ignoring surrounding spaces", () => {
    expect(
      checkSignupDetails({ fullName: "  Sam  ", email: " sam@example.com ", supplyPostcode: " sw1a2aa " }),
    ).toEqual([]);
  });

  it.each(["sam", "sam@example", "sam @example.com", "@example.com"])(
    "rejects the email %j",
    (email) => {
      expect(checkSignupDetails({ ...details, email })).toEqual([
        { fieldId: SIGNUP_FIELDS.email, message: SIGNUP_MESSAGES.emailInvalid },
      ]);
    },
  );

  it("rejects a name that is too long", () => {
    expect(checkSignupDetails({ ...details, fullName: "a".repeat(101) })).toEqual([
      { fieldId: SIGNUP_FIELDS.fullName, message: SIGNUP_MESSAGES.nameTooLong },
    ]);
  });

  it.each([
    ["", SIGNUP_MESSAGES.postcodeEmpty],
    ["SW1", SIGNUP_MESSAGES.postcodeInvalid],
  ])("uses the GOV.UK message for the postcode %j", (supplyPostcode, message) => {
    expect(checkSignupDetails({ ...details, supplyPostcode })).toEqual([
      { fieldId: SIGNUP_FIELDS.addressPostcode, message },
    ]);
  });
});

describe("validateSignupForm", () => {
  it("accepts a complete form, with or without address line 2", () => {
    expect(validateSignupForm(complete)).toEqual([]);
    expect(validateSignupForm({ ...complete, addressLine2: "Westminster" })).toEqual([]);
  });

  it("lists every problem in page order, with GOV.UK's address messages", () => {
    expect(validateSignupForm(EMPTY_SIGNUP_FORM)).toEqual([
      { fieldId: SIGNUP_FIELDS.fullName, message: SIGNUP_MESSAGES.nameEmpty },
      { fieldId: SIGNUP_FIELDS.email, message: SIGNUP_MESSAGES.emailEmpty },
      { fieldId: SIGNUP_FIELDS.addressLine1, message: "Enter address line 1, typically the building and street" },
      { fieldId: SIGNUP_FIELDS.addressTown, message: "Enter town or city" },
      { fieldId: SIGNUP_FIELDS.addressPostcode, message: "Enter postcode" },
      { fieldId: SIGNUP_FIELDS.confirm, message: SIGNUP_MESSAGES.confirm },
    ]);
  });

  it("treats spaces as empty", () => {
    const errors = validateSignupForm({ ...complete, addressLine1: "   ", addressTown: " " });
    expect(errors.map((error) => error.fieldId)).toEqual([
      SIGNUP_FIELDS.addressLine1,
      SIGNUP_FIELDS.addressTown,
    ]);
  });

  it("rejects address lines that are too long", () => {
    const long = "a".repeat(101);
    const errors = validateSignupForm({ ...complete, addressLine1: long, addressLine2: long, addressTown: long });
    expect(errors.map((error) => error.message)).toEqual([
      SIGNUP_MESSAGES.line1TooLong,
      SIGNUP_MESSAGES.line2TooLong,
      SIGNUP_MESSAGES.townTooLong,
    ]);
  });

  it("accepts postcodes in different formats", () => {
    expect(validateSignupForm({ ...complete, addressPostcode: "sw1a2aa" })).toEqual([]);
  });
});
