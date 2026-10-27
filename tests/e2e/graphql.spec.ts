import { expect, test } from "./fixtures";

/**
 * Checks the deployed GraphQL route is wired up. These cases fail validation
 * before any upstream call, so they do not depend on the Octopus API being up.
 */
test.describe("GraphQL endpoint", () => {
  test.skip(({ isMobile }) => isMobile, "API tests do not need a mobile run");

  test("rejects a badly formatted postcode with a field-level error", async ({ request }) => {
    const response = await request.post("/api/graphql", {
      data: {
        query: `query ($postcode: String!) { region(postcode: $postcode) { code name } }`,
        variables: { postcode: "not a postcode" },
      },
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.errors[0].extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "postcode",
    });
  });

  test("rejects impossible usage before fetching prices", async ({ request }) => {
    const response = await request.post("/api/graphql", {
      data: {
        query: `query { tariffComparison(regionCode: "C", annualKwh: 0) { annualKwh } }`,
      },
    });

    const body = await response.json();
    expect(body.errors[0].extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "annualKwh",
    });
  });
});
