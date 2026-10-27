import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JOURNEY_STORAGE_KEY, loadJourney, saveJourney } from "@/lib/journey-storage";
import { SIGNUP_MESSAGES } from "@/lib/signup-form";
import { comparisonReply } from "../../../tests/e2e/graphqlMock";
import { TariffComparisonQuery } from "../tariffs/useTariffComparison";
import { SIGNUP_UNAVAILABLE, StartSwitchMutation } from "./SignupForm";
import { SignupStep } from "./SignupStep";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const TARIFF_ID = "E-1R-AGILE-24-10-01-C";

const comparison: MockLink.MockedResponse = {
  request: { query: TariffComparisonQuery, variables: { regionCode: "C", annualKwh: 2700 } },
  result: comparisonReply,
};

/** Exactly what the server receives: no address lines, only the postcode. */
const startSwitchRequest = {
  query: StartSwitchMutation,
  variables: {
    input: {
      fullName: "Sam Taylor",
      email: "sam@example.com",
      regionCode: "C",
      tariffId: TARIFF_ID,
      supplyPostcode: "SW1A 2AA",
    },
  },
};

const switched: MockLink.MockedResponse = {
  request: startSwitchRequest,
  result: {
    data: {
      startSwitch: { __typename: "StartSwitchResult", reference: "SB-3F9A1C2E", tariffId: TARIFF_ID },
    },
  },
};

const fieldError = (field: string, message: string, code = "BAD_USER_INPUT"): MockLink.MockedResponse => ({
  request: startSwitchRequest,
  result: {
    errors: [
      new GraphQLError(message, {
        extensions: { code, field, ...(code === "BAD_USER_INPUT" ? { fieldErrors: [{ field, message }] } : {}) },
      }),
    ],
  },
});

function renderStep(mocks: MockLink.MockedResponse[] = []) {
  const user = userEvent.setup();
  render(
    <MockedProvider mocks={[comparison, ...mocks]}>
      <SignupStep />
    </MockedProvider>,
  );

  const field = (name: string | RegExp) => screen.getByRole("textbox", { name });
  const submit = () => user.click(screen.getByRole("button", { name: "Confirm and switch" }));
  const summaryLinks = () =>
    within(screen.getByRole("heading", { name: "There is a problem" }).parentElement as HTMLElement)
      .getAllByRole("link")
      .map((link) => link.textContent);

  async function completeForm() {
    await user.type(field("Full name"), "Sam Taylor");
    await user.type(field("Email address"), "sam@example.com");
    await user.type(field("Address line 1"), "10 Downing Street");
    await user.type(field("Town or city"), "London");
    await user.type(field("Postcode"), "SW1A 2AA");
    await user.click(screen.getByRole("checkbox", { name: /I understand this is a demo/ }));
  }

  return { user, field, submit, summaryLinks, completeForm };
}

beforeEach(() => {
  push.mockReset();
  saveJourney({
    regionCode: "C",
    annualKwh: 2700,
    usage: { method: "known" },
    tariffId: TARIFF_ID,
  });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("SignupStep", () => {
  it("asks for a tariff choice first", () => {
    window.localStorage.clear();
    saveJourney({ regionCode: "C", annualKwh: 2700 });
    renderStep();
    expect(screen.getByRole("link", { name: "Compare tariffs" })).toHaveAttribute("href", "/tariffs");
  });

  it("confirms the chosen tariff from the comparison", async () => {
    renderStep();
    expect(await screen.findByText("Agile Octopus")).toBeInTheDocument();
  });

  it("groups the supply address fields, as in the GOV.UK address pattern", () => {
    const { field } = renderStep();
    const group = screen.getByRole("group", { name: "Supply address" });
    expect(within(group).getAllByRole("textbox").map((input) => input.getAttribute("autocomplete"))).toEqual([
      "address-line1",
      "address-line2",
      "address-level2",
      "postal-code",
    ]);
    expect(field("Address line 2 (optional)")).toBeInTheDocument();
    // No made-up addresses and no lookup any more.
    expect(screen.queryByRole("button", { name: "Find address" })).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("lists every missing answer in page order", async () => {
    const { submit, summaryLinks } = renderStep();
    await submit();

    expect(summaryLinks()).toEqual([
      SIGNUP_MESSAGES.nameEmpty,
      SIGNUP_MESSAGES.emailEmpty,
      "Enter address line 1, typically the building and street",
      "Enter town or city",
      "Enter postcode",
      SIGNUP_MESSAGES.confirm,
    ]);
    expect(screen.getByRole("link", { name: "Enter town or city" })).toHaveAttribute(
      "href",
      "#address-town",
    );
    expect(document.title).toBe("Error: Sign up | Switchboard");
  });

  it("checks the postcode format before sending anything", async () => {
    const { user, field, submit } = renderStep();
    await user.type(field("Postcode"), "SW1");
    await submit();
    expect(screen.getByRole("link", { name: "Enter a full UK postcode" })).toBeInTheDocument();
  });

  it("sends only name, email and postcode, keeps only the reference, and moves on", async () => {
    const { completeForm, submit } = renderStep([switched]);
    await completeForm();
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/confirmation"));
    expect(loadJourney().reference).toBe("SB-3F9A1C2E");

    const stored = window.localStorage.getItem(JOURNEY_STORAGE_KEY) ?? "";
    for (const personal of ["Sam", "example.com", "Downing", "London", "SW1A"]) {
      expect(stored).not.toContain(personal);
    }
  });

  it("shows the server's region check against the postcode field", async () => {
    const message =
      "This postcode is in North Scotland, but your prices are for London. Go back to the start to get prices for this address.";
    const { completeForm, submit, field } = renderStep([fieldError("address-postcode", message)]);
    await completeForm();
    await submit();

    expect(await screen.findByRole("link", { name: message })).toHaveAttribute("href", "#address-postcode");
    expect(field("Postcode")).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a postcode the server could not find against the postcode field", async () => {
    const { completeForm, submit } = renderStep([
      fieldError(
        "address-postcode",
        "We could not find that postcode. Check it and try again",
        "POSTCODE_NOT_FOUND",
      ),
    ]);
    await completeForm();
    await submit();

    expect(
      await screen.findByRole("link", { name: "We could not find that postcode. Check it and try again" }),
    ).toHaveAttribute("href", "#address-postcode");
  });

  it("shows the server's field errors", async () => {
    const { completeForm, submit } = renderStep([fieldError("email", SIGNUP_MESSAGES.emailInvalid)]);
    await completeForm();
    await submit();

    expect(
      await screen.findByRole("link", { name: SIGNUP_MESSAGES.emailInvalid }),
    ).toHaveAttribute("href", "#email");
  });

  it("offers a retry when the service is down", async () => {
    const { completeForm, submit } = renderStep([
      { request: startSwitchRequest, error: new Error("Failed to fetch") },
      switched,
    ]);
    await completeForm();
    await submit();
    expect(await screen.findByText(SIGNUP_UNAVAILABLE)).toBeInTheDocument();

    await submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/confirmation"));
  });
});
