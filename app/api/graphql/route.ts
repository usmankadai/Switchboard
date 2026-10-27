import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { cdnCacheControl } from "@/graphql/cacheHeaders";
import type { GraphQLContext } from "@/graphql/context";
import { octopusDataSource } from "@/graphql/datasources/octopus";
import { resolvers } from "@/graphql/resolvers";
import { typeDefs } from "@/graphql/schema/typeDefs";

const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  // The schema is public anyway; introspection helps people explore the demo.
  introspection: true,
});

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  server,
  {
    context: async () => ({
      dataSources: { energy: octopusDataSource },
      now: new Date(),
    }),
  },
);

/**
 * Queries arrive as GET so the CDN can cache them (see graphql/cacheHeaders).
 * Apollo's CSRF protection still applies: the client sends a preflight header.
 */
export async function GET(request: NextRequest) {
  const response = await handler(withoutBodyHeaders(request));
  const cdn = cdnCacheControl(response.headers.get("cache-control"));
  if (!cdn) return response;

  const headers = new Headers(response.headers);
  headers.set("CDN-Cache-Control", cdn);
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Apollo Client sends `content-type: application/json` even on GET, and the
 * Next integration then tries to parse a JSON body that GET does not have,
 * failing with a 500. A GET has no body, so drop the header.
 */
function withoutBodyHeaders(request: NextRequest): NextRequest {
  if (!request.headers.has("content-type")) return request;
  const headers = new Headers(request.headers);
  headers.delete("content-type");
  return new NextRequest(request.url, { method: "GET", headers });
}

export async function POST(request: NextRequest) {
  return handler(request);
}
