# 1. GraphQL as a backend for frontend

Date: 27 October 2026. Status: accepted.

## Context

The tariff comparison screen needs data from at least six REST calls to the Octopus API, plus postcodes.io. Doing this in the browser would mean every visitor hits the upstream APIs and the pricing logic would live in components.

## Decision

Add a GraphQL layer (Apollo Server in a Next.js route handler) that exposes queries shaped for the UI, such as `tariffComparison(postcode, annualKwh)`. Datasource functions cache upstream calls with `'use cache'`. Resolvers combine data and call pure functions in `/lib` for the maths.

## Consequences

- One request per screen, typed end to end with GraphQL Code Generator.
- Caching lives in one place, so a traffic spike mostly hits the cache.
- Extra code to maintain. To keep it worthwhile, resolvers must aggregate and shape data, not mirror REST endpoints. If a query ever maps to a single REST call with no shaping, question whether it belongs here.
