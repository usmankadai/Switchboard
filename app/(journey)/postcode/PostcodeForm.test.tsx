import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JOURNEY_STORAGE_KEY, saveJourney } from "@/lib/journey-storage";
import { PostcodeForm, RegionLookupQuery, UNAVAILABLE_MESSAGE } from "./PostcodeForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const lookup = (postcode: string) => ({
  request: { query: RegionLookupQuery, variables: { postcode } },
});

const found: MockLink.MockedResponse = {
  ...lookup("SW1A 1AA"),
  result: { data: { region: { __typename: "Region", code: "C", name: "London" } } },
};

function renderForm(mocks: MockLink.MockedResponse[] = []) {
  const user = userEvent.setup();
  render(
    <MockedProvider mocks={mocks}>
      <PostcodeForm />
    </MockedProvider>,
  );
  const input = screen.getByRole("textbox", { name: "What is your postcode?" });
  const submit = () => user.click(screen.getByRole("button", { name: "Continue" }));
  return { user, input, submit };
}

beforeEach(() => {
  push.mockReset();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("PostcodeForm", () => {
  it("uses the question as both the label and the page heading", () => {
    renderForm();
    expect(
      screen.getByRole("heading", { level: 1, name: "What is your postcode?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("shows a focused error summary and an inline error when left empty", async () => {
    const { input, submit } = renderForm();
    await submit();

    const summary = screen.getByRole("heading", { name: "There is a problem" })
      .parentElement as HTMLElement;
    expect(summary).toHaveFocus();
    expect(screen.getByRole("link", { name: "Enter your postcode" })).toHaveAttribute(
      "href",
      "#postcode",
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Error: Enter your postcode/);
    expect(document.title).toBe("Error: Your postcode | Switchboard");
  });

  it("moves focus to the field from the error summary link", async () => {
    const { user, input, submit } = renderForm();
    await submit();
    await user.click(screen.getByRole("link", { name: "Enter your postcode" }));
    expect(input).toHaveFocus();
  });

  it("explains the format without calling the server", async () => {
    const { user, input, submit } = renderForm();
    await user.type(input, "SW1");
    await submit();
    expect(
      screen.getByRole("link", { name: "Enter a full UK postcode, like SW1A 1AA" }),
    ).toBeInTheDocument();
  });

  it("saves only the region and moves to the usage step", async () => {
    const { user, input, submit } = renderForm([found]);
    await user.type(input, "sw1a1aa");
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/usage"));
    const stored = window.localStorage.getItem(JOURNEY_STORAGE_KEY);
    expect(JSON.parse(stored ?? "{}")).toEqual({ regionCode: "C" });
    expect(stored).not.toMatch(/SW1A/i);
  });

  it("shows the server's message when the postcode does not exist", async () => {
    const { user, input, submit } = renderForm([
      {
        ...lookup("ZZ1 1ZZ"),
        result: {
          errors: [
            new GraphQLError("We could not find that postcode. Check it and try again", {
              extensions: { code: "POSTCODE_NOT_FOUND", field: "postcode" },
            }),
          ],
        },
      },
    ]);
    await user.type(input, "ZZ1 1ZZ");
    await submit();

    expect(
      await screen.findByRole("link", {
        name: "We could not find that postcode. Check it and try again",
      }),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("offers a retry when the service is down, without blaming the field", async () => {
    const { user, input, submit } = renderForm([
      { ...lookup("SW1A 1AA"), error: new Error("Failed to fetch") },
      found,
    ]);
    await user.type(input, "SW1A 1AA");
    await submit();

    expect(await screen.findByText(UNAVAILABLE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: UNAVAILABLE_MESSAGE })).toBeNull();
    expect(input).not.toHaveAttribute("aria-invalid");

    await submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/usage"));
  });

  it("welcomes back someone who already gave their postcode", () => {
    saveJourney({ regionCode: "G" });
    renderForm();
    expect(
      screen.getByRole("link", { name: "Continue with North West England" }),
    ).toHaveAttribute("href", "/usage");
  });
});
