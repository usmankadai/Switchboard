/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query RegionLookup($postcode: String!) {\n    region(postcode: $postcode) {\n      code\n      name\n    }\n  }\n": typeof types.RegionLookupDocument,
    "\n  mutation StartSwitch($input: StartSwitchInput!) {\n    startSwitch(input: $input) {\n      reference\n      tariffId\n    }\n  }\n": typeof types.StartSwitchDocument,
    "\n  fragment AgileExplainer_quote on TariffQuote {\n    displayName\n    recentPrices {\n      averagePence\n      minPence\n      maxPence\n      days\n      byTimeOfDay {\n        slot\n        averagePence\n      }\n    }\n  }\n": typeof types.AgileExplainer_QuoteFragmentDoc,
    "\n  fragment TariffCard_quote on TariffQuote {\n    id\n    kind\n    displayName\n    termMonths\n    exitFeePence\n    unitRatePence\n    standingChargePencePerDay\n    estimatedAnnualCostPence\n    priceVaries\n    recentPrices {\n      days\n    }\n  }\n": typeof types.TariffCard_QuoteFragmentDoc,
    "\n  query TariffComparison($regionCode: ID!, $annualKwh: Int!) {\n    tariffComparison(regionCode: $regionCode, annualKwh: $annualKwh) {\n      pricesCheckedAt\n      unavailableKinds\n      quotes {\n        id\n        kind\n        displayName\n        estimatedAnnualCostPence\n        ...TariffCard_quote\n        ...AgileExplainer_quote\n      }\n    }\n  }\n": typeof types.TariffComparisonDocument,
};
const documents: Documents = {
    "\n  query RegionLookup($postcode: String!) {\n    region(postcode: $postcode) {\n      code\n      name\n    }\n  }\n": types.RegionLookupDocument,
    "\n  mutation StartSwitch($input: StartSwitchInput!) {\n    startSwitch(input: $input) {\n      reference\n      tariffId\n    }\n  }\n": types.StartSwitchDocument,
    "\n  fragment AgileExplainer_quote on TariffQuote {\n    displayName\n    recentPrices {\n      averagePence\n      minPence\n      maxPence\n      days\n      byTimeOfDay {\n        slot\n        averagePence\n      }\n    }\n  }\n": types.AgileExplainer_QuoteFragmentDoc,
    "\n  fragment TariffCard_quote on TariffQuote {\n    id\n    kind\n    displayName\n    termMonths\n    exitFeePence\n    unitRatePence\n    standingChargePencePerDay\n    estimatedAnnualCostPence\n    priceVaries\n    recentPrices {\n      days\n    }\n  }\n": types.TariffCard_QuoteFragmentDoc,
    "\n  query TariffComparison($regionCode: ID!, $annualKwh: Int!) {\n    tariffComparison(regionCode: $regionCode, annualKwh: $annualKwh) {\n      pricesCheckedAt\n      unavailableKinds\n      quotes {\n        id\n        kind\n        displayName\n        estimatedAnnualCostPence\n        ...TariffCard_quote\n        ...AgileExplainer_quote\n      }\n    }\n  }\n": types.TariffComparisonDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RegionLookup($postcode: String!) {\n    region(postcode: $postcode) {\n      code\n      name\n    }\n  }\n"): (typeof documents)["\n  query RegionLookup($postcode: String!) {\n    region(postcode: $postcode) {\n      code\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation StartSwitch($input: StartSwitchInput!) {\n    startSwitch(input: $input) {\n      reference\n      tariffId\n    }\n  }\n"): (typeof documents)["\n  mutation StartSwitch($input: StartSwitchInput!) {\n    startSwitch(input: $input) {\n      reference\n      tariffId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AgileExplainer_quote on TariffQuote {\n    displayName\n    recentPrices {\n      averagePence\n      minPence\n      maxPence\n      days\n      byTimeOfDay {\n        slot\n        averagePence\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment AgileExplainer_quote on TariffQuote {\n    displayName\n    recentPrices {\n      averagePence\n      minPence\n      maxPence\n      days\n      byTimeOfDay {\n        slot\n        averagePence\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment TariffCard_quote on TariffQuote {\n    id\n    kind\n    displayName\n    termMonths\n    exitFeePence\n    unitRatePence\n    standingChargePencePerDay\n    estimatedAnnualCostPence\n    priceVaries\n    recentPrices {\n      days\n    }\n  }\n"): (typeof documents)["\n  fragment TariffCard_quote on TariffQuote {\n    id\n    kind\n    displayName\n    termMonths\n    exitFeePence\n    unitRatePence\n    standingChargePencePerDay\n    estimatedAnnualCostPence\n    priceVaries\n    recentPrices {\n      days\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TariffComparison($regionCode: ID!, $annualKwh: Int!) {\n    tariffComparison(regionCode: $regionCode, annualKwh: $annualKwh) {\n      pricesCheckedAt\n      unavailableKinds\n      quotes {\n        id\n        kind\n        displayName\n        estimatedAnnualCostPence\n        ...TariffCard_quote\n        ...AgileExplainer_quote\n      }\n    }\n  }\n"): (typeof documents)["\n  query TariffComparison($regionCode: ID!, $annualKwh: Int!) {\n    tariffComparison(regionCode: $regionCode, annualKwh: $annualKwh) {\n      pricesCheckedAt\n      unavailableKinds\n      quotes {\n        id\n        kind\n        displayName\n        estimatedAnnualCostPence\n        ...TariffCard_quote\n        ...AgileExplainer_quote\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;