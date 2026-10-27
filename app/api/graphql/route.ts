import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import type { NextRequest } from "next/server";
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

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
