import { ApolloServer } from "@apollo/server";
import { describe, expect, it } from "vitest";
import { SIGNUP_MESSAGES } from "@/lib/signup-form";
import type { GraphQLContext } from "../context";
import type { EnergyDataSource } from "../datasources/types";
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
};

async function startSwitch(input: Record<string, unknown>) {
  const response = await server.executeOperation(
    { query: START_SWITCH, variables: { input } },
    {
      contextValue: {
        // The mutation never needs upstream data.
        dataSources: { energy: {} as EnergyDataSource },
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
  });

  it("runs the same checks as the form, listing every field problem", async () => {
    const result = await startSwitch({ ...valid, fullName: " ", email: "nope" });
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "full-name",
      fieldErrors: [
        { field: "full-name", message: SIGNUP_MESSAGES.nameEmpty },
        { field: "email", message: SIGNUP_MESSAGES.emailInvalid },
      ],
    });
  });

  it("never echoes personal details back in errors", async () => {
    const result = await startSwitch({ ...valid, email: "sam.taylor.private@" });
    expect(JSON.stringify(result.errors)).not.toContain("sam.taylor.private");
  });

  it.each([
    ["a tariff from another region", { tariffId: "E-1R-AGILE-24-10-01-A" }],
    ["an unknown region", { regionCode: "Z", tariffId: "E-1R-AGILE-24-10-01-Z" }],
    ["a made-up tariff id", { tariffId: "anything" }],
  ])("rejects %s", async (_label, overrides) => {
    const result = await startSwitch({ ...valid, ...overrides });
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "tariffId",
    });
  });
});
