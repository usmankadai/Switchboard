"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Checkboxes } from "@/components/Checkboxes";
import type { FormError } from "@/components/ErrorSummary";
import formStyles from "@/components/form.module.css";
import { Radios } from "@/components/Radios";
import { markStepNavigation } from "@/components/stepNavigation";
import { TextInput } from "@/components/TextInput";
import { saveJourney } from "@/lib/journey-storage";
import { trackFunnel } from "@/lib/monitoring/funnel";
import type { HomeSize } from "@/lib/usage";
import { formatKwh } from "@/lib/usage";
import {
  previewEstimate,
  USAGE_FIELDS,
  validateUsageForm,
  type UsageExtra,
  type UsageFormValues,
  type UsageMethod,
} from "@/lib/usage-form";

const METHOD_ITEMS = [
  {
    value: "known",
    label: "Yes, I will enter it",
    hint: "From an annual statement or a recent bill",
  },
  {
    value: "estimate",
    label: "No, help me estimate it",
    hint: "Answer three quick questions about your home",
  },
] as const satisfies readonly { value: UsageMethod; label: string; hint: string }[];

const HOME_ITEMS = [
  { value: "flat", label: "Flat or maisonette" },
  { value: "small-house", label: "Small house", hint: "1 or 2 bedrooms" },
  { value: "medium-house", label: "Medium house", hint: "3 bedrooms" },
  { value: "large-house", label: "Large house", hint: "4 or more bedrooms" },
] as const satisfies readonly { value: HomeSize; label: string; hint?: string }[];

const EXTRA_ITEMS = [
  { value: "electric-vehicle", label: "An electric car you charge at home" },
  { value: "heat-pump", label: "A heat pump", hint: "For heating and hot water" },
] as const satisfies readonly { value: UsageExtra; label: string; hint?: string }[];

type UsageFormProps = {
  initialValues: UsageFormValues;
  errors: readonly FormError[];
  onInvalid: (errors: FormError[]) => void;
  /** Called when errors no longer apply: on success, or when the questions change. */
  onClearErrors: () => void;
};

export function UsageForm({
  initialValues,
  errors,
  onInvalid,
  onClearErrors,
}: UsageFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);

  const errorFor = (fieldId: string) =>
    errors.find((error) => error.fieldId === fieldId)?.message;

  function update<K extends keyof UsageFormValues>(key: K, value: UsageFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateUsageForm(values);
    if (!result.ok) {
      onInvalid(result.errors);
      return;
    }
    onClearErrors();
    saveJourney({ annualKwh: result.annualKwh, usage: result.usage });
    trackFunnel("usage", "completed", result.usage.method === "known" ? "usage-known" : "usage-estimate");
    markStepNavigation();
    router.push("/tariffs");
  }

  const estimate = values.method === "estimate" ? previewEstimate(values) : null;

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Radios
        id={USAGE_FIELDS.method}
        name="method"
        legend="Do you know how much electricity you use a year?"
        error={errorFor(USAGE_FIELDS.method)}
        items={METHOD_ITEMS}
        value={values.method}
        onChange={(method) => {
          update("method", method);
          // Errors for the other set of questions would link to hidden fields.
          if (errors.length > 0) onClearErrors();
        }}
      />

      {values.method === "known" ? (
        <div className={formStyles.conditional}>
          <TextInput
            id={USAGE_FIELDS.annualKwh}
            name="annualKwh"
            label="Yearly electricity use, in kWh"
            hint="It is on your annual statement or a recent bill. Ofgem's typical figures are 1,600 kWh (low), 2,500 kWh (medium) and 3,800 kWh (high) a year."
            error={errorFor(USAGE_FIELDS.annualKwh)}
            value={values.annualKwh}
            onChange={(event) => update("annualKwh", event.target.value)}
            inputMode="numeric"
            spellCheck={false}
            autoComplete="off"
            widthChars={7}
          />
        </div>
      ) : null}

      {values.method === "estimate" ? (
        <div className={formStyles.conditional}>
          <Radios
            id={USAGE_FIELDS.homeSize}
            name="homeSize"
            legend="What type of home do you live in?"
            error={errorFor(USAGE_FIELDS.homeSize)}
            items={HOME_ITEMS}
            value={values.homeSize}
            onChange={(homeSize) => update("homeSize", homeSize)}
          />
          <TextInput
            id={USAGE_FIELDS.occupants}
            name="occupants"
            label="How many people live there?"
            hint="Include children."
            error={errorFor(USAGE_FIELDS.occupants)}
            value={values.occupants}
            onChange={(event) => update("occupants", event.target.value)}
            inputMode="numeric"
            spellCheck={false}
            autoComplete="off"
            widthChars={2}
          />
          <Checkboxes
            id="usage-extras"
            name="extras"
            legend="Do you have either of these?"
            hint="Select all that apply. Leave both unticked if you have neither."
            items={EXTRA_ITEMS}
            values={values.extras}
            onChange={(extras) => update("extras", extras)}
          />
          <div className={formStyles.estimate}>
            {estimate === null ? (
              <p>Answer the questions above to see your estimate.</p>
            ) : (
              <>
                <p>Your estimate</p>
                <p className={formStyles.estimateFigure}>{formatKwh(estimate)} a year</p>
                <p>Based on typical homes like yours. You can change it later.</p>
              </>
            )}
          </div>
        </div>
      ) : null}

      <Button type="submit">Continue</Button>
    </form>
  );
}
