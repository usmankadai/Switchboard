export const typeDefs = /* GraphQL */ `
  type Query {
    "Look up the electricity region for a UK postcode."
    region(postcode: String!): Region!

    """
    Everything the tariff step needs in one request: the tariffs on sale in a
    region, current prices and an estimated annual cost for the given usage.
    Takes a region code (from the region query) rather than a postcode, so the
    journey never has to keep the customer's full postcode.
    """
    tariffComparison(regionCode: ID!, annualKwh: Int!): TariffComparison!
  }

  type Region {
    "Region letter, for example C."
    code: ID!
    "Friendly name, for example London."
    name: String!
  }

  enum TariffKind {
    FLEXIBLE
    FIXED
    TRACKER
    AGILE
  }

  type TariffComparison {
    region: Region!
    annualKwh: Int!
    "Ordered Flexible, Fixed, Tracker, Agile. Types not on sale are left out."
    quotes: [TariffQuote!]!
    "When the prices were checked, as an ISO 8601 timestamp."
    pricesCheckedAt: String!
  }

  type TariffQuote {
    "The regional tariff code, for example E-1R-AGILE-24-10-01-C."
    id: ID!
    kind: TariffKind!
    productCode: String!
    displayName: String!
    "Contract length in months, or null for no fixed term."
    termMonths: Int
    "Fee for leaving early, in whole pence."
    exitFeePence: Int!
    """
    Pence per kWh inc VAT, kept fractional. For tariffs whose price changes
    daily this is the usage-weighted average of recent prices.
    """
    unitRatePence: Float!
    "Pence per day inc VAT, kept fractional."
    standingChargePencePerDay: Float!
    "Estimated annual cost in whole pence, rounded once."
    estimatedAnnualCostPence: Int!
    "True when the unit rate changes daily or half-hourly, so the cost is an estimate from recent prices."
    priceVaries: Boolean!
    "Recent price range, for tariffs whose price varies."
    recentPrices: PriceSummary
  }

  type PriceSummary {
    "Usage-weighted average, pence per kWh."
    averagePence: Float!
    minPence: Float!
    maxPence: Float!
    "Number of days the prices cover."
    days: Int!
  }
`;
