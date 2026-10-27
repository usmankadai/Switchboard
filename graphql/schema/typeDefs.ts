export const typeDefs = /* GraphQL */ `
  # Cache hints for Apollo Server's cache control plugin, which turns them into
  # a Cache-Control header on GET responses. The route handler adds a CDN
  # header from it. Responses with errors are never given a cache header.
  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(
    maxAge: Int
    scope: CacheControlScope
    inheritMaxAge: Boolean
  ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

  type Query {
    """
    Look up the electricity region for a UK postcode. Deliberately no cache
    hint: it is sent as POST so the postcode never appears in a URL.
    """
    region(postcode: String!): Region!

    """
    Everything the tariff step needs in one request: the tariffs on sale in a
    region, current prices and an estimated annual cost for the given usage.
    Takes a region code (from the region query) rather than a postcode, so the
    journey never has to keep the customer's full postcode.
    """
    tariffComparison(regionCode: ID!, annualKwh: Int!): TariffComparison!
      @cacheControl(maxAge: 300)
  }

  type Mutation {
    """
    Demo only. Checks the signup details and returns a made-up reference.
    Nothing is stored, sent or logged, and no account is created.
    """
    startSwitch(input: StartSwitchInput!): StartSwitchResult!
  }

  input StartSwitchInput {
    fullName: String!
    email: String!
    "Region letter from the postcode step."
    regionCode: ID!
    "The chosen tariff's id from tariffComparison."
    tariffId: ID!
    """
    Postcode of the supply address. Checked to be real and in the same region
    as the prices, then thrown away. Address lines are not sent: the server
    has no use for them.
    """
    supplyPostcode: String!
  }

  type StartSwitchResult {
    "A made-up reference, for example SB-3F9A1C2E."
    reference: ID!
    tariffId: ID!
  }

  type Region @cacheControl(inheritMaxAge: true) {
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

  type TariffComparison @cacheControl(inheritMaxAge: true) {
    region: Region!
    annualKwh: Int!
    "Ordered Flexible, Fixed, Tracker, Agile. Types not on sale are left out."
    quotes: [TariffQuote!]!
    """
    Tariff types we could not price just now because an upstream service
    failed. The other quotes are still shown; the UI offers a retry.
    """
    unavailableKinds: [TariffKind!]!
    "When the prices were checked, as an ISO 8601 timestamp."
    pricesCheckedAt: String!
  }

  type TariffQuote @cacheControl(inheritMaxAge: true) {
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

  type PriceSummary @cacheControl(inheritMaxAge: true) {
    "Usage-weighted average, pence per kWh."
    averagePence: Float!
    minPence: Float!
    maxPence: Float!
    "Number of days the prices cover."
    days: Int!
    "Average price for each half hour of the day across those days, in UK time."
    byTimeOfDay: [TimeOfDayPrice!]!
  }

  type TimeOfDayPrice @cacheControl(inheritMaxAge: true) {
    "Half-hour slot of the day in UK time: 0 is 00:00 to 00:30, 47 is 23:30 to midnight."
    slot: Int!
    "Average price in that half hour, pence per kWh inc VAT."
    averagePence: Float!
  }
`;
