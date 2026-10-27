import { NextResponse, type NextRequest } from "next/server";
import {
  decideTariffLayout,
  TARIFF_LAYOUT_COOKIE,
  TARIFF_LAYOUT_COOKIE_MAX_AGE,
} from "@/lib/experiments";

/**
 * The tariff layout A/B test (ADR 3). Runs before the page renders: puts a
 * visitor in a group once, remembers it in a cookie, and quietly rewrites
 * /tariffs to /tariffs/cards or /tariffs/table. The address bar still says
 * /tariffs, both layouts are prebuilt static pages, and nothing flickers.
 *
 * Set TARIFF_LAYOUT_EXPERIMENT=off to send everyone to the cards (control).
 */
export function proxy(request: NextRequest) {
  const { layout, isNew } = decideTariffLayout(
    request.cookies.get(TARIFF_LAYOUT_COOKIE)?.value,
    process.env.TARIFF_LAYOUT_EXPERIMENT,
  );

  const url = request.nextUrl.clone();
  url.pathname = `/tariffs/${layout}`;
  const response = NextResponse.rewrite(url);

  if (isNew) {
    response.cookies.set({
      name: TARIFF_LAYOUT_COOKIE,
      value: layout,
      path: "/",
      maxAge: TARIFF_LAYOUT_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

export const config = {
  // Only the tariffs step. Never static files, the API or other pages.
  matcher: ["/tariffs"],
};
