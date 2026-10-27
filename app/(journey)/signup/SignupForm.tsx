"use client";

import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Checkboxes } from "@/components/Checkboxes";
import type { FormError } from "@/components/ErrorSummary";
import formStyles from "@/components/form.module.css";
import { Select } from "@/components/Select";
import { markStepNavigation } from "@/components/stepNavigation";
import { TextInput } from "@/components/TextInput";
import { graphql } from "@/generated";
import { demoAddressesFor } from "@/lib/demo-addresses";
import { saveJourney } from "@/lib/journey-storage";
import { checkPostcodeInput } from "@/lib/postcode";
import { REGION_NAMES } from "@/lib/regions";
import {
  EMPTY_SIGNUP_FORM,
  SIGNUP_FIELDS,
  validateSignupForm,
  type SignupFormValues,
} from "@/lib/signup-form";
import { RegionLookupQuery } from "../postcode/PostcodeForm";

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
export const ADDRESS_UNAVAILABLE =
  "We could not look up that postcode just now. Please try again in a moment.";

type SignupFormProps = {
  regionCode: string;
  regionName: string;
  tariffId: string;
  errors: readonly FormError[];
  /** Show these errors and move focus to the summary. */
  onInvalid: (errors: FormError[]) => void;
  /** Update errors without moving focus (for example, clearing one). */
  onErrorsChange: (errors: FormError[]) => void;
};

/** Map a failed mutation to messages for the form. */
function toFormErrors(error: unknown): FormError[] {
  if (CombinedGraphQLErrors.is(error)) {
    const extensions = error.errors[0]?.extensions;
    const fieldErrors = extensions?.fieldErrors;
    if (Array.isArray(fieldErrors)) {
      return fieldErrors.map((fieldError: { field: string; message: string }) => ({
        fieldId: fieldError.field,
        message: fieldError.message,
      }));
    }
    if (extensions?.field === "tariffId") {
      return [{ message: error.errors[0]?.message ?? SIGNUP_UNAVAILABLE }];
    }
  }
  return [{ message: SIGNUP_UNAVAILABLE }];
}

export function SignupForm({
  regionCode,
  regionName,
  tariffId,
  errors,
  onInvalid,
  onErrorsChange,
}: SignupFormProps) {
  const router = useRouter();
  const client = useApolloClient();
  const [startSwitch] = useMutation(StartSwitchMutation);

  // Personal details live here only: never in storage, logs or monitoring.
  const [values, setValues] = useState<SignupFormValues>(EMPTY_SIGNUP_FORM);
  const [finding, setFinding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Next.js keeps this page alive (hidden) after moving on, so reset busy
  // flags when it is hidden.
  useLayoutEffect(
    () => () => {
      setFinding(false);
      setSubmitting(false);
    },
    [],
  );

  const errorFor = (fieldId: string) => errors.find((error) => error.fieldId === fieldId)?.message;

  function update<K extends keyof SignupFormValues>(key: K, value: SignupFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  /** Drop the error for one field once it has been dealt with. */
  function clearError(fieldId: string) {
    if (errors.some((error) => error.fieldId === fieldId)) {
      onErrorsChange(errors.filter((error) => error.fieldId !== fieldId));
    }
  }

  async function findAddress() {
    if (finding) return;
    const check = checkPostcodeInput(values.addressPostcode);
    if (!check.ok) {
      onInvalid([{ fieldId: SIGNUP_FIELDS.addressPostcode, message: check.message }]);
      return;
    }

    setFinding(true);
    try {
      const { data } = await client.query({
        query: RegionLookupQuery,
        variables: { postcode: check.postcode },
      });
      if (!data) throw new Error("No data returned");

      // Tariffs are priced by region, so the supply address must match.
      if (data.region.code !== regionCode) {
        onInvalid([
          {
            fieldId: SIGNUP_FIELDS.addressPostcode,
            message: `This postcode is in ${REGION_NAMES[data.region.code] ?? data.region.name}, but your prices are for ${regionName}. Go back to the start to get prices for this address.`,
          },
        ]);
        return;
      }

      setValues((current) => ({
        ...current,
        addressPostcode: check.postcode,
        addressOptions: demoAddressesFor(check.postcode),
        address: "",
      }));
      clearError(SIGNUP_FIELDS.addressPostcode);
    } catch (error) {
      // A postcode the server could not find gets its own message; anything
      // else (an outage, no connection) gets a "try again".
      const first = CombinedGraphQLErrors.is(error) ? error.errors[0] : undefined;
      const isNotFound = ["BAD_USER_INPUT", "POSTCODE_NOT_FOUND"].includes(
        String(first?.extensions?.code),
      );
      onInvalid([
        {
          fieldId: SIGNUP_FIELDS.addressPostcode,
          message: isNotFound && first ? first.message : ADDRESS_UNAVAILABLE,
        },
      ]);
    } finally {
      setFinding(false);
    }
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
          },
        },
      });
      if (!data) throw new Error("No data returned");

      // Only the made-up reference is kept. Personal details are cleared
      // from memory too, as this page stays alive after moving on.
      saveJourney({ reference: data.startSwitch.reference });
      setValues(EMPTY_SIGNUP_FORM);
      onErrorsChange([]);
      markStepNavigation();
      router.push("/confirmation");
    } catch (error) {
      onInvalid(toFormErrors(error));
      setSubmitting(false);
    }
  }

  const addressCount = values.addressOptions?.length ?? 0;

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

      <h2 className={formStyles.sectionHeading}>Supply address</h2>
      <p className={formStyles.hint}>
        This is a demo, so the addresses are made up. Real address data needs a licence.
      </p>
      <div className={formStyles.inline}>
        <TextInput
          id={SIGNUP_FIELDS.addressPostcode}
          name="addressPostcode"
          label="Postcode"
          error={errorFor(SIGNUP_FIELDS.addressPostcode)}
          value={values.addressPostcode}
          onChange={(event) =>
            // A new postcode means the old address list no longer applies.
            setValues((current) => ({
              ...current,
              addressPostcode: event.target.value,
              addressOptions: null,
              address: "",
            }))
          }
          autoComplete="postal-code"
          autoCapitalize="characters"
          spellCheck={false}
          widthChars={8}
        />
        <Button
          variant="secondary"
          busy={finding}
          busyLabel="Finding addresses…"
          onClick={() => void findAddress()}
        >
          Find address
        </Button>
      </div>

      <p role="status" className="visually-hidden">
        {finding
          ? "Finding addresses"
          : values.addressOptions
            ? `${addressCount} addresses found`
            : ""}
      </p>

      {values.addressOptions ? (
        <Select
          id={SIGNUP_FIELDS.address}
          name="address"
          label="Select your address"
          error={errorFor(SIGNUP_FIELDS.address)}
          placeholder={`${addressCount} addresses found`}
          options={values.addressOptions.map((address) => ({ value: address, label: address }))}
          value={values.address}
          onChange={(event) => {
            update("address", event.target.value);
            clearError(SIGNUP_FIELDS.address);
          }}
          autoComplete="off"
        />
      ) : null}

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
