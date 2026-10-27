import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JOURNEY_STORAGE_KEY, loadJourney, saveJourney } from "@/lib/journey-storage";
import { POSTCODE_MESSAGES } from "@/lib/postcode";
import { SIGNUP_MESSAGES } from "@/lib/signup-form";
import { comparisonReply } from "../../../tests/e2e/graphqlMock";
import { RegionLookupQuery } from "../postcode/PostcodeForm";
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

const region = (code: string, name: string): MockLink.MockedResponse => ({
  request: { query: RegionLookupQuery, variables: { postcode: "SW1A 1AA" } },
  result: { data: { region: { __typename: "Region", code, name } } },
});

const startSwitchRequest = {
  query: StartSwitchMutation,
  variables: {
    input: { fullName: "Sam Taylor", email: "sam@example.com", regionCode: "C", tariffId: TARIFF_ID },
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

function renderStep(mocks: MockLink.MockedResponse[] = []) {
  const user = userEvent.setup();
  render(
    <MockedProvider mocks={[comparison, ...mocks]}>
      <SignupStep />
    </MockedProvider>,
  );

  const submit = () => user.click(screen.getByRole("button", { name: "Confirm and switch" }));
  const summaryLinks = () =>
    within(
      screen.getByRole("heading", { name: "There is a problem" }).parentElement as HTMLElement,
    )
      .getAllByRole("link")
      .map((link) => link.textContent);

  async function fillDetails() {
    await user.type(screen.getByRole("textbox", { name: "Full name" }), "Sam Taylor");
    await user.type(screen.getByRole("textbox", { name: "Email address" }), "sam@example.com");
  }

  async function findAddress(postcode = "SW1A 1AA") {
    await user.type(screen.getByRole("textbox", { name: "Postcode" }), postcode);
    await user.click(screen.getByRole("button", { name: "Find address" }));
  }

  async function completeForm() {
    await fillDetails();
    await findAddress();
    const select = await screen.findByRole("combobox", { name: "Select your address" });
    await user.selectOptions(select, "12 Sample Road, SW1A 1AA");
    await user.click(screen.getByRole("checkbox", { name: /I understand this is a demo/ }));
  }

  return { user, submit, summaryLinks, fillDetails, findAddress, completeForm };
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

  it("lists every missing answer in page order", async () => {
    const { submit, summaryLinks } = renderStep();
    await submit();

    expect(summaryLinks()).toEqual([
      SIGNUP_MESSAGES.nameEmpty,
      SIGNUP_MESSAGES.emailEmpty,
      POSTCODE_MESSAGES.empty,
      SIGNUP_MESSAGES.confirm,
    ]);
    expect(document.title).toBe("Error: Sign up | Switchboard");
  });

  it("checks the postcode format before looking it up", async () => {
    const { findAddress } = renderStep();
    await findAddress("SW1");
    expect(screen.getByRole("link", { name: POSTCODE_MESSAGES.invalid })).toBeInTheDocument();
  });

  it("stops a supply address in a different region from the prices", async () => {
    const { findAddress } = renderStep([region("A", "Eastern England")]);
    await findAddress();
    expect(
      await screen.findByRole("link", {
        name: /This postcode is in Eastern England, but your prices are for London/,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("finds demo addresses, then asks for one to be picked", async () => {
    const { findAddress, submit, fillDetails, user } = renderStep([region("C", "London")]);
    await fillDetails();
    await findAddress();

    const select = await screen.findByRole("combobox", { name: "Select your address" });
    expect(within(select).getAllByRole("option")).toHaveLength(6);
    // Announced to screen readers, as the list appears out of their view.
    expect(screen.getByText("5 addresses found", { selector: '[role="status"]' })).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /I understand this is a demo/ }));
    await submit();
    expect(screen.getByRole("link", { name: SIGNUP_MESSAGES.addressNotSelected })).toHaveAttribute(
      "href",
      "#address",
    );
  });

  it("forgets the address list when the postcode changes", async () => {
    const { findAddress, user } = renderStep([region("C", "London")]);
    await findAddress();
    await screen.findByRole("combobox", { name: "Select your address" });

    await user.type(screen.getByRole("textbox", { name: "Postcode" }), "X");
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("sends the details, keeps only the reference and moves on", async () => {
    const { completeForm, submit } = renderStep([region("C", "London"), switched]);
    await completeForm();
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/confirmation"));
    expect(loadJourney().reference).toBe("SB-3F9A1C2E");

    const stored = window.localStorage.getItem(JOURNEY_STORAGE_KEY) ?? "";
    expect(stored).not.toContain("Sam");
    expect(stored).not.toContain("example.com");
    expect(stored).not.toContain("Sample Road");
  });

  it("shows the server's field errors", async () => {
    const { completeForm, submit } = renderStep([
      region("C", "London"),
      {
        request: startSwitchRequest,
        result: {
          errors: [
            new GraphQLError(SIGNUP_MESSAGES.emailInvalid, {
              extensions: {
                code: "BAD_USER_INPUT",
                field: "email",
                fieldErrors: [{ field: "email", message: SIGNUP_MESSAGES.emailInvalid }],
              },
            }),
          ],
        },
      },
    ]);
    await completeForm();
    await submit();

    expect(
      await screen.findByRole("link", { name: SIGNUP_MESSAGES.emailInvalid }),
    ).toHaveAttribute("href", "#email");
    expect(push).not.toHaveBeenCalled();
  });

  it("offers a retry when the service is down", async () => {
    const { completeForm, submit } = renderStep([
      region("C", "London"),
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
