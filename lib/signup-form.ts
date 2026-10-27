import { checkPostcodeInput } from "./postcode";

/**
 * Signup validation. `checkSignupDetails` is shared by the form (instant
 * feedback) and the startSwitch resolver (the server never trusts the
 * browser), so both always agree.
 *
 * Privacy: these values are personal. They live in component state only and
 * are never written to storage, logs or monitoring.
 */

export const SIGNUP_FIELDS = {
  fullName: "full-name",
  email: "email",
  addressPostcode: "address-postcode",
  address: "address",
  confirm: "confirm-demo",
} as const;

export type SignupFieldId = (typeof SIGNUP_FIELDS)[keyof typeof SIGNUP_FIELDS];

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;

export const SIGNUP_MESSAGES = {
  nameEmpty: "Enter your full name",
  nameTooLong: `Full name must be ${MAX_NAME_LENGTH} characters or fewer`,
  emailEmpty: "Enter your email address",
  emailInvalid: "Enter an email address in the correct format, like name@example.com",
  addressNotFound: "Find your address, then select it from the list",
  addressNotSelected: "Select your address",
  confirm: "Confirm that you understand this is a demo",
} as const;

export type SignupError = { fieldId: SignupFieldId; message: string };

/** Deliberately loose: the only real check is sending an email to it. */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignupDetails = { fullName: string; email: string };

/** Name and email: checked in the browser and again on the server. */
export function checkSignupDetails({ fullName, email }: SignupDetails): SignupError[] {
  const errors: SignupError[] = [];
  const name = fullName.trim();
  const address = email.trim();

  if (name === "") {
    errors.push({ fieldId: SIGNUP_FIELDS.fullName, message: SIGNUP_MESSAGES.nameEmpty });
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.push({ fieldId: SIGNUP_FIELDS.fullName, message: SIGNUP_MESSAGES.nameTooLong });
  }

  if (address === "") {
    errors.push({ fieldId: SIGNUP_FIELDS.email, message: SIGNUP_MESSAGES.emailEmpty });
  } else if (address.length > MAX_EMAIL_LENGTH || !EMAIL_FORMAT.test(address)) {
    errors.push({ fieldId: SIGNUP_FIELDS.email, message: SIGNUP_MESSAGES.emailInvalid });
  }

  return errors;
}

export type SignupFormValues = SignupDetails & {
  addressPostcode: string;
  /** Addresses found for the postcode, or null if no search has run yet. */
  addressOptions: readonly string[] | null;
  address: string;
  confirmed: boolean;
};

export const EMPTY_SIGNUP_FORM: SignupFormValues = {
  fullName: "",
  email: "",
  addressPostcode: "",
  addressOptions: null,
  address: "",
  confirmed: false,
};

/** The whole form, with errors in page order for the error summary. */
export function validateSignupForm(values: SignupFormValues): SignupError[] {
  const errors = checkSignupDetails(values);

  if (values.addressOptions === null) {
    const postcode = checkPostcodeInput(values.addressPostcode);
    errors.push(
      postcode.ok
        ? { fieldId: SIGNUP_FIELDS.addressPostcode, message: SIGNUP_MESSAGES.addressNotFound }
        : { fieldId: SIGNUP_FIELDS.addressPostcode, message: postcode.message },
    );
  } else if (!values.addressOptions.includes(values.address)) {
    errors.push({ fieldId: SIGNUP_FIELDS.address, message: SIGNUP_MESSAGES.addressNotSelected });
  }

  if (!values.confirmed) {
    errors.push({ fieldId: SIGNUP_FIELDS.confirm, message: SIGNUP_MESSAGES.confirm });
  }

  return errors;
}
