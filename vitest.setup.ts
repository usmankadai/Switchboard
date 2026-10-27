import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom does not implement layout, so scrolling is a no-op in tests.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
