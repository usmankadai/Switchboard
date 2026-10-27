"use client";

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import type { ReactNode } from "react";

/**
 * Client Components render on the server first, where relative URLs do not
 * work, so the server side needs the site's absolute address.
 */
function graphqlUri(): string {
  if (typeof window !== "undefined") return "/api/graphql";
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000");
  return `${origin}/api/graphql`;
}

function makeClient() {
  return new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
        // A comparison is identified by its inputs, not an id.
        TariffComparison: { keyFields: false },
        // Region letters are stable, so reuse them across queries.
        Region: { keyFields: ["code"] },
      },
    }),
    link: new HttpLink({ uri: graphqlUri() }),
  });
}

export function ApolloWrapper({ children }: { children: ReactNode }) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
