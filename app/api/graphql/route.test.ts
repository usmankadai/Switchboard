import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

/** These requests fail validation or are introspection, so no upstream API is called. */
const url = (query: string) =>
  `http://localhost/api/graphql?query=${encodeURIComponent(query)}`;

describe("GraphQL route", () => {
  it("answers a GET that carries a JSON content type, as Apollo Client sends", async () => {
    const response = await GET(
      new NextRequest(url("{ __typename }"), {
        headers: { "content-type": "application/json", "apollo-require-preflight": "true" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { __typename: "Query" } });
  });

  it("keeps CSRF protection: a GET without a preflight header is refused", async () => {
    const response = await GET(new NextRequest(url("{ __typename }")));
    expect(response.status).toBe(400);
  });
});
