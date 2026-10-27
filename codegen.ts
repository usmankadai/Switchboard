import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "graphql/schema/typeDefs.ts",
  documents: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  ignoreNoDocuments: true,
  generates: {
    // Typed graphql() function, documents and fragment masking for the client.
    "generated/": {
      preset: "client",
      config: {
        enumsAsTypes: true,
        useTypeImports: true,
      },
    },
    // Resolver signatures for the server.
    "generated/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        contextType: "@/graphql/context#GraphQLContext",
        enumsAsTypes: true,
        useTypeImports: true,
        avoidOptionals: { field: true },
      },
    },
  },
};

export default config;
