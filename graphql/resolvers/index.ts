import type { Resolvers } from "@/generated/resolvers-types";
import type { GraphQLContext } from "../context";
import { signupMutations } from "./signup";
import { tariffQueries } from "./tariffs";

export const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    ...tariffQueries,
  },
  Mutation: {
    ...signupMutations,
  },
};
