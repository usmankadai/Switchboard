import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadJourney, saveJourney } from "@/lib/journey-storage";
import { comparisonReply } from "../../../tests/e2e/graphqlMock";
import { TariffComparisonQuery } from "../tariffs/useTariffComparison";
import { ConfirmationStep } from "./ConfirmationStep";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderStep() {
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: TariffComparisonQuery, variables: { regionCode: "C", annualKwh: 2700 } },
          result: comparisonReply,
        },
      ]}
    >
      <ConfirmationStep />
    </MockedProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("ConfirmationStep", () => {
  it("shows the reference and the chosen tariff", async () => {
    saveJourney({
      regionCode: "C",
      annualKwh: 2700,
      tariffId: "E-1R-OE-FIX-12M-26-10-27-C",
      reference: "SB-3F9A1C2E",
    });
    renderStep();

    expect(
      screen.getByRole("heading", { level: 1, name: "Switch request received" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SB-3F9A1C2E")).toBeInTheDocument();
    expect(await screen.findByText("Octopus 12M Fixed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "This was a demo" })).toBeInTheDocument();
  });

  it("clears everything when starting again", async () => {
    saveJourney({ regionCode: "C", reference: "SB-3F9A1C2E" });
    renderStep();

    await userEvent.setup().click(screen.getByRole("button", { name: "Start again" }));
    expect(loadJourney()).toEqual({});
    expect(push).toHaveBeenCalledWith("/");
  });

  it("says there is nothing to confirm without a reference", () => {
    renderStep();
    expect(screen.getByRole("link", { name: "Start a quote" })).toHaveAttribute("href", "/postcode");
  });
});
