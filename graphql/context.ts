import type { EnergyDataSource } from "./datasources/types";

export type GraphQLContext = {
  dataSources: { energy: EnergyDataSource };
  /** Injected so tests can fix the clock. */
  now: Date;
};
