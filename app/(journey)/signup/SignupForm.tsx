"use client";

import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Checkboxes } from "@/components/Checkboxes";
import type { FormError } from "@/components/ErrorSummary";
import formStyles from "@/components/form.module.css";
import { markStepNavigation } from "@/components/stepNavigation";
import { TextInput } from "@/components/TextInput";
import { graphql } from "@/generated";
import { saveJourney } from "@/lib/journey-storage";
import { trackFunnel } from "@/lib/monitoring/funnel";
import {
  EMPTY_SIGNUP_FORM,
  SIGNUP_FIELDS,
  validateSignupForm,
  type SignupFormValues,
} from "@/lib/signup-form";

export const StartSwitchMutation = graphql(`
  mutation StartSwitch($input: StartSwitchInput!) {
    startSwitch(input: $input) {
      reference
      tariffId
    }
  }
`);

export const SIGNUP_UNAVAILABLE =
  "We could not complete your signup just now. Please try again in a moment.";

type SignupFormProps = {
  regionCode: string;
  tariffId: string;
  errors: readonly FormError[];
  /** Show these errors and move focus to the summary. */
  onInvalid: (errors: FormError[]) => void;
  /** Update errors without moving focus (for example, clearing one). */
  onErrorsChange: (errors: FormError[]) => void;
};

/** Map a failed mutation to messages for the form. */
function toFormErrors(error: unknown): FormError[] {
  if (!CombinedGraphQLErrors.is(error)) return [{ message: SIGNUP_UNAVAILABLE }];
  const first = error.errors[0];
  const extensions = first?.extensions;

  // Several field problems at once (name, email, postcode format).
  const fieldErrors = extensions?.fieldErrors;
  if (Array.isArray(fieldErrors)) {
    return fieldErrors.map((fieldError: { field: string; message: string }) => ({
      fieldId: fieldError.field,
      message: fieldError.message,
    }));
  }
  // A tariff that no longer fits: not tied to a field on this page.
  if (extensions?.field === "tariffId") {
    return [{ message: first?.message ?? SIGNUP_UNAVAILABLE }];
  }
  // One field problem, such as a supply postcode that does not exist.
  const isUserError = ["BAD_USER_INPUT", "POSTCODE_NOT_FOUND"].includes(String(extensions?.code));
  if (isUserError && typeof extensions?.field === "string" && first) {
    return [{ fieldId: extensions.field, message: first.message }];
  }
  // Outages and network failures: pressing the button again retries.
  return [{ message: SIGNUP_UNAVAILABLE }];
}

export function SignupForm({
  regionCode,
  tariffId,
  errors,
  onInvalid,
  onErrorsChange,
}: SignupFormProps) {
  const router = useRouter();
  const [startSwitch] = useMutation(StartSwitchMutation);

  // Personal details live here only: never in storage, logs or monitoring.
  const [values, setValues] = useState<SignupFormValues>(EMPTY_SIGNUP_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Next.js keeps this page alive (hidden) after moving on, so reset the busy
  // flag when it is hidden.
  useLayoutEffect(() => () => setSubmitting(false), []);

  const errorFor = (fieldId: string) => errors.find((error) => error.fieldId === fieldId)?.message;

  function update<K extends keyof SignupFormValues>(key: K, value: SignupFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const problems = validateSignupForm(values);
    if (problems.length > 0) {
      onInvalid(problems);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await startSwitch({
        variables: {
          input: {
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            regionCode,
            tariffId,
            // Only the postcode of the address is sent, to check its region.
            supplyPostcode: values.addressPostcode.trim(),
          },
        },
      });
      if (!data) throw new Error("No data returned");

      // Only the made-up reference is kept. Personal details are cleared
      // from memory too, as this page stays alive after moving on.
      saveJourney({ reference: data.startSwitch.reference });
      trackFunnel("signup", "completed");
      setValues(EMPTY_SIGNUP_FORM);
      onErrorsChange([]);
      markStepNavigation();
      router.push("/confirmation");
    } catch (error) {
      onInvalid(toFormErrors(error));
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <TextInput
        id={SIGNUP_FIELDS.fullName}
        name="fullName"
        label="Full name"
        error={errorFor(SIGNUP_FIELDS.fullName)}
        value={values.fullName}
        onChange={(event) => update("fullName", event.target.value)}
        autoComplete="name"
        spellCheck={false}
      />
      <TextInput
        id={SIGNUP_FIELDS.email}
        name="email"
        type="email"
        label="Email address"
        hint="We would use this to send your confirmation. In this demo, nothing is sent."
        error={errorFor(SIGNUP_FIELDS.email)}
        value={values.email}
        onChange={(event) => update("email", event.target.value)}
        autoComplete="email"
        spellCheck={false}
      />

      <fieldset className={formStyles.addressFieldset} aria-describedby="supply-address-hint">
        <legend className={formStyles.addressLegend}>
          <h2 className={formStyles.sectionHeading}>Supply address</h2>
        </legend>
        <p id="supply-address-hint" className={formStyles.hint}>
          Where you want your electricity supplied. It must be in the same region as your prices.
        </p>
        <TextInput
          id={SIGNUP_FIELDS.addressLine1}
          name="addressLine1"
          label="Address line 1"
          error={errorFor(SIGNUP_FIELDS.addressLine1)}
          value={values.addressLine1}
          onChange={(event) => update("addressLine1", event.target.value)}
          autoComplete="address-line1"
        />
        <TextInput
          id={SIGNUP_FIELDS.addressLine2}
          name="addressLine2"
          label="Address line 2 (optional)"
          error={errorFor(SIGNUP_FIELDS.addressLine2)}
          value={values.addressLine2}
          onChange={(event) => update("addressLine2", event.target.value)}
          autoComplete="address-line2"
        />
        <TextInput
          id={SIGNUP_FIELDS.addressTown}
          name="addressTown"
          label="Town or city"
          error={errorFor(SIGNUP_FIELDS.addressTown)}
          value={values.addressTown}
          onChange={(event) => update("addressTown", event.target.value)}
          autoComplete="address-level2"
          widthChars={30}
        />
        <TextInput
          id={SIGNUP_FIELDS.addressPostcode}
          name="addressPostcode"
          label="Postcode"
          error={errorFor(SIGNUP_FIELDS.addressPostcode)}
          value={values.addressPostcode}
          onChange={(event) => update("addressPostcode", event.target.value)}
          autoComplete="postal-code"
          autoCapitalize="characters"
          spellCheck={false}
          widthChars={10}
        />
      </fieldset>

      <Checkboxes
        id={SIGNUP_FIELDS.confirm}
        name="confirm"
        legend="Before you continue"
        error={errorFor(SIGNUP_FIELDS.confirm)}
        items={[
          {
            value: "confirmed",
            label: "I understand this is a demo. No account will be created and my energy supply will not change.",
          },
        ]}
        values={values.confirmed ? ["confirmed"] : []}
        onChange={(checked) => update("confirmed", checked.length > 0)}
      />

      <p>
        There are no payment details in this demo. A real switch would ask for them here.
      </p>

      <Button type="submit" busy={submitting} busyLabel="Sending…">
        Confirm and switch
      </Button>
      <p role="status" className="visually-hidden">
        {submitting ? "Sending your details" : ""}
      </p>
    </form>
  );
}
