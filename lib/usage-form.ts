import {
  estimateAnnualKwh,
  HOME_SIZES,
  MAX_ANNUAL_KWH,
  MAX_OCCUPANTS,
  MIN_OCCUPANTS,
  type HomeSize,
  type UsageAnswers,
} from "./usage";

/**
 * The usage step's form logic, kept out of the component so it can be unit
 * tested. Values are strings exactly as typed; this module turns them into
 * either a yearly kWh figure or a list of errors.
 */

export type UsageMethod = "known" | "estimate";
export type UsageExtra = "electric-vehicle" | "heat-pump";

export type UsageFormValues = {
  method: UsageMethod | "";
  annualKwh: string;
  homeSize: HomeSize | "";
  occupants: string;
  extras: UsageExtra[];
};

/** What gets saved for save and resume. Nothing here is personal data. */
export type SavedUsage =
  | { method: "known" }
  | ({ method: "estimate" } & UsageAnswers);

/** Field ids, used for labels and for error summary links. */
export const USAGE_FIELDS = {
  method: "usage-method",
  annualKwh: "annual-kwh",
  homeSize: "home-size",
  occupants: "occupants",
} as const;

export type UsageFieldId = (typeof USAGE_FIELDS)[keyof typeof USAGE_FIELDS];

export const USAGE_MESSAGES = {
  method: "Select whether you know how much electricity you use",
  kwhEmpty: "Enter how much electricity you use a year, in kWh",
  kwhInvalid: "Enter your yearly usage as a whole number, like 2700",
  kwhRange: `Enter a yearly usage between 1 and ${MAX_ANNUAL_KWH.toLocaleString("en-GB")} kWh`,
  homeSize: "Select the type of home you live in",
  occupantsEmpty: "Enter how many people live in your home",
  occupantsInvalid: "Enter the number of people as a whole number, like 2",
  occupantsRange: `Enter a number of people between ${MIN_OCCUPANTS} and ${MAX_OCCUPANTS}`,
} as const;

export const EMPTY_USAGE_FORM: UsageFormValues = {
  method: "",
  annualKwh: "",
  homeSize: "",
  occupants: "",
  extras: [],
};

type FieldError = { fieldId: UsageFieldId; message: string };

export type UsageFormResult =
  | { ok: true; annualKwh: number; usage: SavedUsage }
  | { ok: false; errors: FieldError[] };

/** Accepts "2700", "2,700", "2 700" and "2700 kWh". */
function parseWholeNumber(input: string): number | null {
  const cleaned = input.replace(/kwh/i, "").replace(/[\s,]/g, "");
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

function checkKwh(input: string): number | FieldError {
  const fieldId = USAGE_FIELDS.annualKwh;
  if (input.trim() === "") return { fieldId, message: USAGE_MESSAGES.kwhEmpty };
  const kwh = parseWholeNumber(input);
  if (kwh === null) return { fieldId, message: USAGE_MESSAGES.kwhInvalid };
  if (kwh < 1 || kwh > MAX_ANNUAL_KWH) return { fieldId, message: USAGE_MESSAGES.kwhRange };
  return kwh;
}

function checkOccupants(input: string): number | FieldError {
  const fieldId = USAGE_FIELDS.occupants;
  if (input.trim() === "") return { fieldId, message: USAGE_MESSAGES.occupantsEmpty };
  const occupants = parseWholeNumber(input);
  if (occupants === null) return { fieldId, message: USAGE_MESSAGES.occupantsInvalid };
  if (occupants < MIN_OCCUPANTS || occupants > MAX_OCCUPANTS) {
    return { fieldId, message: USAGE_MESSAGES.occupantsRange };
  }
  return occupants;
}

function isHomeSize(value: string): value is HomeSize {
  return (HOME_SIZES as readonly string[]).includes(value);
}

function answersFrom(
  values: UsageFormValues,
  homeSize: HomeSize,
  occupants: number,
): UsageAnswers {
  return {
    homeSize,
    occupants,
    hasElectricVehicle: values.extras.includes("electric-vehicle"),
    hasHeatPump: values.extras.includes("heat-pump"),
  };
}

/** Errors come back in page order, so the error summary matches the form. */
export function validateUsageForm(values: UsageFormValues): UsageFormResult {
  if (values.method === "known") {
    const kwh = checkKwh(values.annualKwh);
    return typeof kwh === "number"
      ? { ok: true, annualKwh: kwh, usage: { method: "known" } }
      : { ok: false, errors: [kwh] };
  }

  if (values.method === "estimate") {
    const errors: FieldError[] = [];
    if (!isHomeSize(values.homeSize)) {
      errors.push({ fieldId: USAGE_FIELDS.homeSize, message: USAGE_MESSAGES.homeSize });
    }
    const occupants = checkOccupants(values.occupants);
    if (typeof occupants !== "number") errors.push(occupants);

    if (errors.length > 0 || !isHomeSize(values.homeSize) || typeof occupants !== "number") {
      return { ok: false, errors };
    }
    const answers = answersFrom(values, values.homeSize, occupants);
    return {
      ok: true,
      annualKwh: estimateAnnualKwh(answers),
      usage: { method: "estimate", ...answers },
    };
  }

  return {
    ok: false,
    errors: [{ fieldId: USAGE_FIELDS.method, message: USAGE_MESSAGES.method }],
  };
}

/** The estimate so far, for showing as people answer. null until it can be worked out. */
export function previewEstimate(values: UsageFormValues): number | null {
  if (!isHomeSize(values.homeSize)) return null;
  const occupants = checkOccupants(values.occupants);
  if (typeof occupants !== "number") return null;
  return estimateAnnualKwh(answersFrom(values, values.homeSize, occupants));
}

/** Rebuild the form from a saved journey, so people can pick up where they left off. */
export function formValuesFromSaved(
  usage: SavedUsage | undefined,
  annualKwh: number | undefined,
): UsageFormValues {
  if (usage?.method === "known") {
    return {
      ...EMPTY_USAGE_FORM,
      method: "known",
      annualKwh: annualKwh === undefined ? "" : String(annualKwh),
    };
  }
  if (usage?.method === "estimate") {
    return {
      ...EMPTY_USAGE_FORM,
      method: "estimate",
      homeSize: usage.homeSize,
      occupants: String(usage.occupants),
      extras: [
        ...(usage.hasElectricVehicle ? (["electric-vehicle"] as const) : []),
        ...(usage.hasHeatPump ? (["heat-pump"] as const) : []),
      ],
    };
  }
  return EMPTY_USAGE_FORM;
}

/** Narrow unknown data from storage to a SavedUsage, or undefined. */
export function sanitiseSavedUsage(value: unknown): SavedUsage | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const raw = value as Record<string, unknown>;
  if (raw.method === "known") return { method: "known" };
  if (
    raw.method === "estimate" &&
    typeof raw.homeSize === "string" &&
    isHomeSize(raw.homeSize) &&
    typeof raw.occupants === "number" &&
    Number.isInteger(raw.occupants) &&
    raw.occupants >= MIN_OCCUPANTS &&
    raw.occupants <= MAX_OCCUPANTS
  ) {
    return {
      method: "estimate",
      homeSize: raw.homeSize,
      occupants: raw.occupants,
      hasElectricVehicle: raw.hasElectricVehicle === true,
      hasHeatPump: raw.hasHeatPump === true,
    };
  }
  return undefined;
}
