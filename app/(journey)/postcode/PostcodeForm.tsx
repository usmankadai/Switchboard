"use client";

import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useApolloClient } from "@apollo/client/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { ErrorSummary, type FormError } from "@/components/ErrorSummary";
import formStyles from "@/components/form.module.css";
import { markStepNavigation } from "@/components/stepNavigation";
import { TextInput } from "@/components/TextInput";
import { useSavedJourney } from "@/components/useSavedJourney";
import { graphql } from "@/generated";
import { saveJourney } from "@/lib/journey-storage";
import { checkPostcodeInput } from "@/lib/postcode";
import { REGION_NAMES } from "@/lib/regions";
import { stepCaption } from "../steps";

export const RegionLookupQuery = graphql(`
  query RegionLookup($postcode: String!) {
    region(postcode: $postcode) {
      code
      name
    }
  }
`);

const FIELD_ID = "postcode";
const PAGE_TITLE = "Your postcode | Switchboard";

export const UNAVAILABLE_MESSAGE =
  "We could not check your postcode just now. Please try again in a moment.";

/** Turn a failed lookup into a message for the form. */
function toFormError(error: unknown): FormError {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    const code = first?.extensions?.code;
    if (code === "BAD_USER_INPUT" || code === "POSTCODE_NOT_FOUND") {
      return { message: first?.message ?? UNAVAILABLE_MESSAGE, fieldId: FIELD_ID };
    }
  }
  // Upstream outages and network failures: not the customer's fault, and
  // not tied to the field, so no link. Pressing Continue again retries.
  return { message: UNAVAILABLE_MESSAGE };
}

export function PostcodeForm() {
  const client = useApolloClient();
  const router = useRouter();
  const savedJourney = useSavedJourney();

  const [value, setValue] = useState("");
  const [errors, setErrors] = useState<FormError[]>([]);
  const [submitCount, setSubmitCount] = useState(0);
  const [busy, setBusy] = useState(false);

  // Next.js keeps this page alive (hidden) after moving on. Reset the busy
  // state when it is hidden, so going Back shows a working button.
  useLayoutEffect(() => () => setBusy(false), []);

  // GOV.UK pattern: prefix the page title so screen reader users hear about
  // errors as soon as the page is announced.
  useEffect(() => {
    document.title = errors.length > 0 ? `Error: ${PAGE_TITLE}` : PAGE_TITLE;
  }, [errors]);

  const fieldError = errors.find((error) => error.fieldId === FIELD_ID)?.message;
  const savedRegion = savedJourney?.regionCode
    ? REGION_NAMES[savedJourney.regionCode]
    : undefined;

  function fail(error: FormError) {
    setErrors([error]);
    setSubmitCount((count) => count + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const check = checkPostcodeInput(value);
    if (!check.ok) {
      fail({ message: check.message, fieldId: FIELD_ID });
      return;
    }

    setBusy(true);
    try {
      const { data } = await client.query({
        query: RegionLookupQuery,
        variables: { postcode: check.postcode },
      });
      if (!data) throw new Error("No data returned");

      // Only the region is kept. The postcode itself is never stored.
      saveJourney({ regionCode: data.region.code });
      setErrors([]);
      markStepNavigation();
      router.push("/usage");
    } catch (error) {
      fail(toFormError(error));
      setBusy(false);
    }
  }

  return (
    <>
      <ErrorSummary errors={errors} submitCount={submitCount} />

      {savedRegion ? (
        <div className={formStyles.panel}>
          <p>
            We have your region as {savedRegion}.{" "}
            <Link href="/usage">Continue with {savedRegion}</Link>, or enter a
            different postcode below.
          </p>
        </div>
      ) : null}

      <form noValidate onSubmit={handleSubmit}>
        <p className={formStyles.caption}>{stepCaption("/postcode")}</p>
        <TextInput
          id={FIELD_ID}
          name="postcode"
          isPageHeading
          label="What is your postcode?"
          hint="Prices depend on your region. We only use your postcode to find it, and we do not keep it."
          error={fieldError}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="postal-code"
          autoCapitalize="characters"
          spellCheck={false}
          widthChars={8}
        />

        <Button type="submit" busy={busy} busyLabel="Finding your region…">
          Continue
        </Button>

        {/* Announces progress to screen readers while the lookup runs. */}
        <p role="status" className="visually-hidden">
          {busy ? "Finding your region" : ""}
        </p>
      </form>
    </>
  );
}
