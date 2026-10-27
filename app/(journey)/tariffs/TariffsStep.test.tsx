import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphQLError } from "graphql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadJourney, saveJourney } from "@/lib/journey-storage";
import { TariffsStep } from "./TariffsStep";
import { agileByTimeOfDay } from "../../../tests/e2e/graphqlMock";
import { COMPARISON_UNAVAILABLE, TariffComparisonQuery } from "./useTariffComparison";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const request = {
  query: TariffComparisonQuery,
  variables: { regionCode: "C", annualKwh: 2700 },
};

const quote = (overrides: Record<string, unknown>) => ({
  __typename: "TariffQuote",
  termMonths: null,
  exitFeePence: 0,
  priceVaries: false,
  recentPrices: null,
  ...overrides,
});

const comparison: MockLink.MockedResponse = {
  request,
  result: {
    data: {
      tariffComparison: {
        __typename: "TariffComparison",
        pricesCheckedAt: "2026-10-27T12:00:00.000Z",
        unavailableKinds: [],
        quotes: [
          quote({
            id: "E-1R-VAR-22-11-01-C",
            kind: "FLEXIBLE",
            displayName: "Flexible Octopus",
            unitRatePence: 26.5956,
            standingChargePencePerDay: 41.3869,
            estimatedAnnualCostPence: 86914,
          }),
          quote({
            id: "E-1R-OE-FIX-12M-26-10-27-C",
            kind: "FIXED",
            displayName: "Octopus 12M Fixed",
            termMonths: 12,
            exitFeePence: 5000,
            unitRatePence: 29.5934,
            standingChargePencePerDay: 41.3869,
            estimatedAnnualCostPence: 95008,
          }),
          quote({
            id: "E-1R-AGILE-24-10-01-C",
            kind: "AGILE",
            displayName: "Agile Octopus",
            termMonths: 12,
            priceVaries: true,
            unitRatePence: 28.19,
            standingChargePencePerDay: 37.6525,
            estimatedAnnualCostPence: 89868,
            recentPrices: {
              __typename: "PriceSummary",
              averagePence: 28.19,
              minPence: -7.34,
              maxPence: 67.053,
              days: 30,
              byTimeOfDay: agileByTimeOfDay,
            },
          }),
        ],
      },
    },
  },
};

const upstreamError: MockLink.MockedResponse = {
  request,
  result: {
    errors: [
      new GraphQLError("We could not get prices right now.", {
        extensions: { code: "UPSTREAM_UNAVAILABLE" },
      }),
    ],
  },
};

function renderStep(mocks: MockLink.MockedResponse[]) {
  const user = userEvent.setup();
  render(
    <MockedProvider mocks={mocks}>
      <TariffsStep />
    </MockedProvider>,
  );
  return { user };
}

const cards = () => within(screen.getByRole("list", { name: "Tariffs" })).getAllByRole("listitem");

beforeEach(() => {
  push.mockReset();
  saveJourney({ regionCode: "C", annualKwh: 2700, usage: { method: "known" } });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("TariffsStep", () => {
  it("asks for missing answers instead of comparing", () => {
    window.localStorage.clear();
    saveJourney({ regionCode: "C" });
    renderStep([]);
    expect(screen.getByRole("link", { name: "Tell us your usage" })).toHaveAttribute(
      "href",
      "/usage",
    );
  });

  it("says it is checking prices, then shows one card per tariff", async () => {
    renderStep([comparison]);
    expect(screen.getByRole("status")).toHaveTextContent("Checking today's prices");

    await screen.findByRole("list", { name: "Tariffs" });
    expect(cards()).toHaveLength(3);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    const flexible = screen.getByRole("listitem", { name: "Flexible Octopus" });
    expect(within(flexible).getByText("£869 a year")).toBeInTheDocument();
    expect(within(flexible).getByText("about £72 a month")).toBeInTheDocument();
    expect(within(flexible).getByText("26.60p per kWh")).toBeInTheDocument();
    expect(within(flexible).getByText("No fixed term")).toBeInTheDocument();
  });

  it("labels the cheapest tariff in words, not just colour", async () => {
    renderStep([comparison]);
    const flexible = await screen.findByRole("listitem", { name: "Flexible Octopus" });
    expect(within(flexible).getByText("Lowest estimated cost")).toBeInTheDocument();
    expect(screen.getAllByText("Lowest estimated cost")).toHaveLength(1);
  });

  it("explains that Agile is an estimate and when it suits people", async () => {
    renderStep([comparison]);
    const agile = await screen.findByRole("listitem", { name: "Agile Octopus" });
    expect(within(agile).getByText("28.19p per kWh on average")).toBeInTheDocument();
    expect(within(agile).getByText(/based on the last 30 days of prices/i)).toBeInTheDocument();

    const explainer = screen.getByRole("region", { name: "Is Agile Octopus right for you?" });
    expect(explainer).toHaveTextContent("-7.34p per kWh");
    expect(explainer).toHaveTextContent(/paid to use electricity/);
  });

  it("shows the fixed tariff's term and exit fee", async () => {
    renderStep([comparison]);
    const fixed = await screen.findByRole("listitem", { name: "Octopus 12M Fixed" });
    expect(within(fixed).getByText("Price fixed for 12 months")).toBeInTheDocument();
    expect(within(fixed).getByText("£50.00 to leave early")).toBeInTheDocument();
  });

  it("saves the chosen tariff and moves to signup", async () => {
    const { user } = renderStep([comparison]);
    await user.click(await screen.findByRole("button", { name: "Choose Octopus 12M Fixed" }));

    expect(loadJourney().tariffId).toBe("E-1R-OE-FIX-12M-26-10-27-C");
    expect(push).toHaveBeenCalledWith("/signup");
  });

  it("offers a retry when prices are unavailable", async () => {
    const { user } = renderStep([upstreamError, comparison]);

    const heading = await screen.findByRole("heading", { name: "Prices are not available" });
    await waitFor(() => expect(heading.parentElement).toHaveFocus());
    expect(screen.getByText(COMPARISON_UNAVAILABLE)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("list", { name: "Tariffs" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Prices are not available" })).toBeNull();
  });

  it("shows the tariffs that worked and says which could not be priced", async () => {
    const data = structuredClone(comparison.result) as {
      data: { tariffComparison: { quotes: { kind: string }[]; unavailableKinds: string[] } };
    };
    data.data.tariffComparison.quotes = data.data.tariffComparison.quotes.filter(
      (quote) => quote.kind !== "AGILE",
    );
    data.data.tariffComparison.unavailableKinds = ["AGILE"];
    renderStep([{ request, result: data }]);

    expect(
      await screen.findByText(/We could not get prices for Agile just now/),
    ).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
    expect(screen.queryByRole("region", { name: /Is Agile/ })).toBeNull();
  });

  it("passes on the server's message when no tariffs can be shown", async () => {
    renderStep([
      {
        request,
        result: {
          errors: [
            new GraphQLError("There are no tariffs we can show for this postcode right now.", {
              extensions: { code: "NO_TARIFFS_AVAILABLE" },
            }),
          ],
        },
      },
    ]);
    expect(
      await screen.findByText("There are no tariffs we can show for this postcode right now."),
    ).toBeInTheDocument();
  });
});
