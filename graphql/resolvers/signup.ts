import { randomUUID } from "node:crypto";
import { GraphQLError } from "graphql";
import type { MutationResolvers } from "@/generated/resolvers-types";
import { REGION_NAMES } from "@/lib/regions";
import { checkSignupDetails, SIGNUP_FIELDS, type SignupError } from "@/lib/signup-form";
import type { GraphQLContext } from "../context";
import { resolveRegion } from "./tariffs";

/** A made-up, non-personal reference such as SB-3F9A1C2E. */
export function demoReference(): string {
  return `SB-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** Single-rate electricity tariff codes look like E-1R-<product>-<region>. */
function tariffIsInRegion(tariffId: string, regionCode: string): boolean {
  return /^E-1R-[A-Z0-9-]+-[A-Z]$/.test(tariffId) && tariffId.endsWith(`-${regionCode}`);
}

/** One error per field, in the shape the form shows next to each input. */
function fieldErrors(errors: SignupError[]): GraphQLError {
  return new GraphQLError(errors[0]!.message, {
    extensions: {
      code: "BAD_USER_INPUT",
      field: errors[0]!.fieldId,
      fieldErrors: errors.map(({ fieldId, message }) => ({ field: fieldId, message })),
    },
  });
}

export const signupMutations: MutationResolvers<GraphQLContext> = {
  /**
   * Demo signup. The same checks as the form run here, because the server
   * never trusts the browser. Personal details are only checked: they are
   * not stored, sent anywhere or logged, and error messages never echo them.
   */
  startSwitch: async (_parent, { input }, context) => {
    const errors = checkSignupDetails(input);
    if (errors.length > 0) throw fieldErrors(errors);

    const regionCode = input.regionCode.toUpperCase();
    if (!(regionCode in REGION_NAMES) || !tariffIsInRegion(input.tariffId, regionCode)) {
      throw new GraphQLError(
        "That tariff is not available in your region. Please choose a tariff again.",
        { extensions: { code: "BAD_USER_INPUT", field: "tariffId" } },
      );
    }

    // Tariffs are priced by region, so the supply address must be in the same
    // region as the prices. This also checks the postcode is real.
    const supplyRegion = await resolveRegion(
      input.supplyPostcode,
      context,
      SIGNUP_FIELDS.addressPostcode,
    );
    if (supplyRegion.code !== regionCode) {
      throw fieldErrors([
        {
          fieldId: SIGNUP_FIELDS.addressPostcode,
          message: `This postcode is in ${supplyRegion.name}, but your prices are for ${REGION_NAMES[regionCode]}. Go back to the start to get prices for this address.`,
        },
      ]);
    }

    return { reference: demoReference(), tariffId: input.tariffId };
  },
};
