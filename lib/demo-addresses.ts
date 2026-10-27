/**
 * Fake address lookup. Real UK address data (Royal Mail PAF) is licensed, so
 * this returns clearly made-up addresses on "Sample Road" for any postcode.
 * The UI labels them as demo addresses.
 */
export function demoAddressesFor(postcode: string): string[] {
  return [
    `Flat 1, 10 Sample Road, ${postcode}`,
    `Flat 2, 10 Sample Road, ${postcode}`,
    `12 Sample Road, ${postcode}`,
    `14 Sample Road, ${postcode}`,
    `16 Sample Road, ${postcode}`,
  ];
}
