import { checkPostcodeInput } from "./postcode";

/**
 * Signup validation. `checkSignupDetails` is shared by the form (instant
 * feedback) and the startSwitch resolver (the server never trusts the
 * browser), so both always agree.
 *
 * The supply address follows the GOV.UK address pattern (multiple text
 * inputs): address line 1, address line 2 (optional), town or city, and
 * postcode. County is left out: Royal Mail does not use it and nor do we.
 *
 * Privacy: these values are personal. They live in component state only and
 * are never written to storage, logs or monitoring. Only the name, email and
 * supply postcode are sent to the server, to be checked and thrown away.
 */

export const SIGNUP_FIELDS = {
  fullName: "full-name",
  email: "email",
  addressLine1: "address-line-1",
  addressLine2: "address-line-2",
  addressTown: "address-town",
  addressPostcode: "address-postcode",
  confirm: "confirm-demo",
} as const;

export type SignupFieldId = (typeof SIGNUP_FIELDS)[keyof typeof SIGNUP_FIELDS];

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_ADDRESS_LINE_LENGTH = 100;

export const SIGNUP_MESSAGES = {
  nameEmpty: "Enter your full name",
  nameTooLong: `Full name must be ${MAX_NAME_LENGTH} characters or fewer`,
  emailEmpty: "Enter your email address",
  emailInvalid: "Enter an email address in the correct format, like name@example.com",
  // Address messages are the GOV.UK address pattern's own wording.
  line1Empty: "Enter address line 1, typically the building and street",
  line1TooLong: `Address line 1 must be ${MAX_ADDRESS_LINE_LENGTH} characters or fewer`,
  line2TooLong: `Address line 2 must be ${MAX_ADDRESS_LINE_LENGTH} characters or fewer`,
  townEmpty: "Enter town or city",
  townTooLong: `Town or city must be ${MAX_ADDRESS_LINE_LENGTH} characters or fewer`,
  postcodeEmpty: "Enter postcode",
  postcodeInvalid: "Enter a full UK postcode",
  confirm: "Confirm that you understand this is a demo",
} as const;

export type SignupError = { fieldId: SignupFieldId; message: string };

/** Deliberately loose: the only real check is sending an email to it. */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignupDetails = { fullName: string; email: string; supplyPostcode: string };

/** The supply postcode's format. Whether it is real is checked on the server. */
export function checkSupplyPostcode(input: string): SignupError | null {
  const check = checkPostcodeInput(input);
  if (check.ok) return null;
  return {
    fieldId: SIGNUP_FIELDS.addressPostcode,
    message: input.trim() === "" ? SIGNUP_MESSAGES.postcodeEmpty : SIGNUP_MESSAGES.postcodeInvalid,
  };
}

/**
 * Everything the server receives: name, email and supply postcode.
 * Checked in the browser and again on the server, in page order.
 */
export function checkSignupDetails({ fullName, email, supplyPostcode }: SignupDetails): SignupError[] {
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

  const postcodeError = checkSupplyPostcode(supplyPostcode);
  if (postcodeError) errors.push(postcodeError);

  return errors;
}

export type SignupFormValues = {
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  addressTown: string;
  addressPostcode: string;
  confirmed: boolean;
};

export const EMPTY_SIGNUP_FORM: SignupFormValues = {
  fullName: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  addressTown: "",
  addressPostcode: "",
  confirmed: false,
};

function checkLength(
  value: string,
  fieldId: SignupFieldId,
  tooLong: string,
): SignupError | null {
  return value.trim().length > MAX_ADDRESS_LINE_LENGTH ? { fieldId, message: tooLong } : null;
}

/** The whole form, with errors in page order for the error summary. */
export function validateSignupForm(values: SignupFormValues): SignupError[] {
  const errors: SignupError[] = [];
  const push = (error: SignupError | null) => {
    if (error) errors.push(error);
  };

  const details = checkSignupDetails({
    fullName: values.fullName,
    email: values.email,
    supplyPostcode: values.addressPostcode,
  });
  // Name and email come first on the page; the postcode comes after the address lines.
  errors.push(...details.filter((error) => error.fieldId !== SIGNUP_FIELDS.addressPostcode));

  if (values.addressLine1.trim() === "") {
    push({ fieldId: SIGNUP_FIELDS.addressLine1, message: SIGNUP_MESSAGES.line1Empty });
  } else {
    push(checkLength(values.addressLine1, SIGNUP_FIELDS.addressLine1, SIGNUP_MESSAGES.line1TooLong));
  }
  push(checkLength(values.addressLine2, SIGNUP_FIELDS.addressLine2, SIGNUP_MESSAGES.line2TooLong));
  if (values.addressTown.trim() === "") {
    push({ fieldId: SIGNUP_FIELDS.addressTown, message: SIGNUP_MESSAGES.townEmpty });
  } else {
    push(checkLength(values.addressTown, SIGNUP_FIELDS.addressTown, SIGNUP_MESSAGES.townTooLong));
  }
  errors.push(...details.filter((error) => error.fieldId === SIGNUP_FIELDS.addressPostcode));

  if (!values.confirmed) {
    push({ fieldId: SIGNUP_FIELDS.confirm, message: SIGNUP_MESSAGES.confirm });
  }

  return errors;
}
