import type { GraphQLResolveInfo } from 'graphql';
import type { GraphQLContext } from '@/graphql/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type PriceSummary = {
  __typename?: 'PriceSummary';
  /** Usage-weighted average, pence per kWh. */
  averagePence: Scalars['Float']['output'];
  /** Number of days the prices cover. */
  days: Scalars['Int']['output'];
  maxPence: Scalars['Float']['output'];
  minPence: Scalars['Float']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Look up the electricity region for a UK postcode. */
  region: Region;
  /**
   * Everything the tariff step needs in one request: region, the tariffs on
   * sale there, current prices and an estimated annual cost for the given usage.
   */
  tariffComparison: TariffComparison;
};


export type QueryRegionArgs = {
  postcode: Scalars['String']['input'];
};


export type QueryTariffComparisonArgs = {
  annualKwh: Scalars['Int']['input'];
  postcode: Scalars['String']['input'];
};

export type Region = {
  __typename?: 'Region';
  /** Region letter, for example C. */
  code: Scalars['ID']['output'];
  /** Friendly name, for example London. */
  name: Scalars['String']['output'];
};

export type TariffComparison = {
  __typename?: 'TariffComparison';
  annualKwh: Scalars['Int']['output'];
  /** When the prices were checked, as an ISO 8601 timestamp. */
  pricesCheckedAt: Scalars['String']['output'];
  /** Ordered Flexible, Fixed, Tracker, Agile. Types not on sale are left out. */
  quotes: Array<TariffQuote>;
  region: Region;
};

export type TariffKind =
  | 'AGILE'
  | 'FIXED'
  | 'FLEXIBLE'
  | 'TRACKER';

export type TariffQuote = {
  __typename?: 'TariffQuote';
  displayName: Scalars['String']['output'];
  /** Estimated annual cost in whole pence, rounded once. */
  estimatedAnnualCostPence: Scalars['Int']['output'];
  /** Fee for leaving early, in whole pence. */
  exitFeePence: Scalars['Int']['output'];
  /** The regional tariff code, for example E-1R-AGILE-24-10-01-C. */
  id: Scalars['ID']['output'];
  kind: TariffKind;
  /** True when the unit rate changes daily or half-hourly, so the cost is an estimate from recent prices. */
  priceVaries: Scalars['Boolean']['output'];
  productCode: Scalars['String']['output'];
  /** Recent price range, for tariffs whose price varies. */
  recentPrices: Maybe<PriceSummary>;
  /** Pence per day inc VAT, kept fractional. */
  standingChargePencePerDay: Scalars['Float']['output'];
  /** Contract length in months, or null for no fixed term. */
  termMonths: Maybe<Scalars['Int']['output']>;
  /**
   * Pence per kWh inc VAT, kept fractional. For tariffs whose price changes
   * daily this is the usage-weighted average of recent prices.
   */
  unitRatePence: Scalars['Float']['output'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  PriceSummary: ResolverTypeWrapper<PriceSummary>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Region: ResolverTypeWrapper<Region>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  TariffComparison: ResolverTypeWrapper<TariffComparison>;
  TariffKind: TariffKind;
  TariffQuote: ResolverTypeWrapper<TariffQuote>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  PriceSummary: PriceSummary;
  Query: Record<PropertyKey, never>;
  Region: Region;
  String: Scalars['String']['output'];
  TariffComparison: TariffComparison;
  TariffQuote: TariffQuote;
};

export type PriceSummaryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PriceSummary'] = ResolversParentTypes['PriceSummary']> = {
  averagePence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  days?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  maxPence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minPence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  region?: Resolver<ResolversTypes['Region'], ParentType, ContextType, RequireFields<QueryRegionArgs, 'postcode'>>;
  tariffComparison?: Resolver<ResolversTypes['TariffComparison'], ParentType, ContextType, RequireFields<QueryTariffComparisonArgs, 'annualKwh' | 'postcode'>>;
};

export type RegionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Region'] = ResolversParentTypes['Region']> = {
  code?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type TariffComparisonResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TariffComparison'] = ResolversParentTypes['TariffComparison']> = {
  annualKwh?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pricesCheckedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  quotes?: Resolver<Array<ResolversTypes['TariffQuote']>, ParentType, ContextType>;
  region?: Resolver<ResolversTypes['Region'], ParentType, ContextType>;
};

export type TariffQuoteResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TariffQuote'] = ResolversParentTypes['TariffQuote']> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  estimatedAnnualCostPence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  exitFeePence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['TariffKind'], ParentType, ContextType>;
  priceVaries?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  productCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  recentPrices?: Resolver<Maybe<ResolversTypes['PriceSummary']>, ParentType, ContextType>;
  standingChargePencePerDay?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  termMonths?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  unitRatePence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  PriceSummary?: PriceSummaryResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Region?: RegionResolvers<ContextType>;
  TariffComparison?: TariffComparisonResolvers<ContextType>;
  TariffQuote?: TariffQuoteResolvers<ContextType>;
};

