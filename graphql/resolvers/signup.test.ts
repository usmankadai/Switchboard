import { ApolloServer } from "@apollo/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SIGNUP_MESSAGES } from "@/lib/signup-form";
import type { GraphQLContext } from "../context";
import { UpstreamError, type EnergyDataSource } from "../datasources/types";
import { typeDefs } from "../schema/typeDefs";
import { resolvers } from "./index";

const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });

const START_SWITCH = /* GraphQL */ `
  mutation StartSwitch($input: StartSwitchInput!) {
    startSwitch(input: $input) { reference tariffId }
  }
`;

const valid = {
  fullName: "Sam Taylor",
  email: "sam@example.com",
  regionCode: "C",
  tariffId: "E-1R-AGILE-24-10-01-C",
  supplyPostcode: "sw1a 2aa",
};

/** Only the postcode checks are used by signup. */
function fakeEnergy(regionCode: string | null = "C", exists = true): EnergyDataSource {
  return {
    postcodeExists: vi.fn(async () => exists),
    lookupRegion: vi.fn(async () => regionCode),
  } as unknown as EnergyDataSource;
}

let energy: EnergyDataSource;

beforeEach(() => {
  energy = fakeEnergy();
});

async function startSwitch(input: Record<string, unknown>) {
  const response = await server.executeOperation(
    { query: START_SWITCH, variables: { input } },
    {
      contextValue: {
        dataSources: { energy },
        pricing: { getTariffPrices: async () => null },
        now: new Date("2026-10-27T12:00:00Z"),
      },
    },
  );
  if (response.body.kind !== "single") throw new Error("Expected a single result");
  return response.body.singleResult;
}

describe("startSwitch", () => {
  it("returns a made-up reference for valid details", async () => {
    const result = await startSwitch(valid);
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      startSwitch: { reference: expect.stringMatching(/^SB-[0-9A-F]{8}$/), tariffId: valid.tariffId },
    });
    // The supply postcode is tidied, then checked for real.
    expect(energy.lookupRegion).toHaveBeenCalledWith("SW1A 2AA");
  });

  it("runs the same checks as the form, listing every field problem", async () => {
    const result = await startSwitch({ ...valid, fullName: " ", email: "nope", supplyPostcode: "SW1" });
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "full-name",
      fieldErrors: [
        { field: "full-name", message: SIGNUP_MESSAGES.nameEmpty },
        { field: "email", message: SIGNUP_MESSAGES.emailInvalid },
        { field: "address-postcode", message: SIGNUP_MESSAGES.postcodeInvalid },
      ],
    });
    expect(energy.lookupRegion).not.toHaveBeenCalled();
  });

  it("never echoes personal details back in errors", async () => {
    const result = await startSwitch({ ...valid, email: "sam.taylor.private@" });
    expect(JSON.stringify(result.errors)).not.toContain("sam.taylor.private");
  });

  it("stops a supply address in a different region from the prices", async () => {
    energy = fakeEnergy("P");
    const result = await startSwitch(valid);
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "address-postcode",
      fieldErrors: [
        {
          field: "address-postcode",
          message:
            "This postcode is in North Scotland, but your prices are for London. Go back to the start to get prices for this address.",
        },
      ],
    });
    // The region is named, never the postcode itself.
    expect(JSON.stringify(result.errors)).not.toMatch(/SW1A/i);
  });

  it("reports a supply postcode that does not exist against the address field", async () => {
    energy = fakeEnergy(null, false);
    const result = await startSwitch(valid);
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "POSTCODE_NOT_FOUND",
      field: "address-postcode",
    });
  });

  it("turns an outage during the postcode check into a retryable error", async () => {
    vi.mocked(energy.lookupRegion).mockRejectedValue(new UpstreamError("503", "octopus"));
    const result = await startSwitch(valid);
    expect(result.errors?.[0]?.extensions).toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });

  it.each([
    ["a tariff from another region", { tariffId: "E-1R-AGILE-24-10-01-A" }],
    ["an unknown region", { regionCode: "Z", tariffId: "E-1R-AGILE-24-10-01-Z" }],
    ["a made-up tariff id", { tariffId: "anything" }],
  ])("rejects %s before any postcode lookup", async (_label, overrides) => {
    const result = await startSwitch({ ...valid, ...overrides });
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "tariffId",
    });
    expect(energy.lookupRegion).not.toHaveBeenCalled();
  });
});
