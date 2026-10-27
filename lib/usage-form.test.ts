import { describe, expect, it } from "vitest";
import {
  EMPTY_USAGE_FORM,
  formValuesFromSaved,
  previewEstimate,
  sanitiseSavedUsage,
  USAGE_FIELDS,
  USAGE_MESSAGES,
  validateUsageForm,
  type UsageFormValues,
} from "./usage-form";

const form = (overrides: Partial<UsageFormValues>): UsageFormValues => ({
  ...EMPTY_USAGE_FORM,
  ...overrides,
});

describe("validateUsageForm", () => {
  it("asks which way to answer first", () => {
    expect(validateUsageForm(EMPTY_USAGE_FORM)).toEqual({
      ok: false,
      errors: [{ fieldId: USAGE_FIELDS.method, message: USAGE_MESSAGES.method }],
    });
  });

  describe("with a figure from a bill", () => {
    it.each(["2700", "2,700", " 2 700 ", "2700 kWh", "2700kwh"])(
      "accepts %j",
      (annualKwh) => {
        expect(validateUsageForm(form({ method: "known", annualKwh }))).toEqual({
          ok: true,
          annualKwh: 2700,
          usage: { method: "known" },
        });
      },
    );

    it.each([
      ["", USAGE_MESSAGES.kwhEmpty],
      ["lots", USAGE_MESSAGES.kwhInvalid],
      ["2700.5", USAGE_MESSAGES.kwhInvalid],
      ["-20", USAGE_MESSAGES.kwhInvalid],
      ["0", USAGE_MESSAGES.kwhRange],
      ["50001", USAGE_MESSAGES.kwhRange],
    ])("rejects %j", (annualKwh, message) => {
      expect(validateUsageForm(form({ method: "known", annualKwh }))).toEqual({
        ok: false,
        errors: [{ fieldId: USAGE_FIELDS.annualKwh, message }],
      });
    });

    it("ignores estimate answers left over from switching options", () => {
      const result = validateUsageForm(
        form({ method: "known", annualKwh: "3100", homeSize: "flat", occupants: "x" }),
      );
      expect(result).toMatchObject({ ok: true, annualKwh: 3100 });
    });
  });

  describe("with an estimate", () => {
    it("works out yearly usage from the answers", () => {
      expect(
        validateUsageForm(
          form({
            method: "estimate",
            homeSize: "medium-house",
            occupants: "2",
            extras: ["electric-vehicle"],
          }),
        ),
      ).toEqual({
        ok: true,
        annualKwh: 4500,
        usage: {
          method: "estimate",
          homeSize: "medium-house",
          occupants: 2,
          hasElectricVehicle: true,
          hasHeatPump: false,
        },
      });
    });

    it("reports every missing answer, in page order", () => {
      const result = validateUsageForm(form({ method: "estimate" }));
      expect(result).toEqual({
        ok: false,
        errors: [
          { fieldId: USAGE_FIELDS.homeSize, message: USAGE_MESSAGES.homeSize },
          { fieldId: USAGE_FIELDS.occupants, message: USAGE_MESSAGES.occupantsEmpty },
        ],
      });
    });

    it.each([
      ["two", USAGE_MESSAGES.occupantsInvalid],
      ["0", USAGE_MESSAGES.occupantsRange],
      ["9", USAGE_MESSAGES.occupantsRange],
    ])("rejects %j people", (occupants, message) => {
      const result = validateUsageForm(
        form({ method: "estimate", homeSize: "flat", occupants }),
      );
      expect(result).toEqual({
        ok: false,
        errors: [{ fieldId: USAGE_FIELDS.occupants, message }],
      });
    });
  });
});

describe("previewEstimate", () => {
  it("waits until home type and people are both answered", () => {
    expect(previewEstimate(form({ homeSize: "flat" }))).toBeNull();
    expect(previewEstimate(form({ occupants: "2" }))).toBeNull();
    expect(previewEstimate(form({ homeSize: "flat", occupants: "2" }))).toBe(1600);
  });
});

describe("saved usage", () => {
  it("round trips an estimate through storage and back into the form", () => {
    const values = form({
      method: "estimate",
      homeSize: "large-house",
      occupants: "4",
      extras: ["heat-pump"],
    });
    const result = validateUsageForm(values);
    if (!result.ok) throw new Error("expected valid");

    const restored = formValuesFromSaved(
      sanitiseSavedUsage(JSON.parse(JSON.stringify(result.usage))),
      result.annualKwh,
    );
    expect(restored).toEqual(values);
  });

  it("restores a figure from a bill", () => {
    expect(formValuesFromSaved({ method: "known" }, 3100)).toEqual(
      form({ method: "known", annualKwh: "3100" }),
    );
  });

  it("drops anything invalid", () => {
    expect(sanitiseSavedUsage({ method: "estimate", homeSize: "castle", occupants: 2 })).toBeUndefined();
    expect(sanitiseSavedUsage({ method: "estimate", homeSize: "flat", occupants: 99 })).toBeUndefined();
    expect(sanitiseSavedUsage("known")).toBeUndefined();
  });
});
