import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadJourney, saveJourney } from "@/lib/journey-storage";
import { USAGE_MESSAGES } from "@/lib/usage-form";
import { UsageStep } from "./UsageStep";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderStep() {
  const user = userEvent.setup();
  render(<UsageStep />);
  const submit = () => user.click(screen.getByRole("button", { name: "Continue" }));
  const chooseMethod = (name: RegExp) => user.click(screen.getByRole("radio", { name }));
  return { user, submit, chooseMethod };
}

function errorSummary() {
  return screen.getByRole("heading", { name: "There is a problem" }).parentElement as HTMLElement;
}

beforeEach(() => {
  push.mockReset();
  saveJourney({ regionCode: "C" });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("UsageStep", () => {
  it("asks for a postcode first when there is no region", () => {
    window.localStorage.clear();
    renderStep();
    expect(screen.getByRole("link", { name: "Enter your postcode" })).toHaveAttribute(
      "href",
      "/postcode",
    );
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });

  it("shows the region with a way to change it", () => {
    renderStep();
    expect(screen.getByText("London")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change your postcode" })).toBeInTheDocument();
  });

  it("asks which way to answer when nothing is chosen", async () => {
    const { submit } = renderStep();
    await submit();

    expect(errorSummary()).toHaveFocus();
    expect(screen.getByRole("link", { name: USAGE_MESSAGES.method })).toHaveAttribute(
      "href",
      "#usage-method",
    );
    expect(document.title).toBe("Error: Your usage | Switchboard");
    expect(push).not.toHaveBeenCalled();
  });

  it("accepts a figure from a bill and moves on", async () => {
    const { user, submit, chooseMethod } = renderStep();
    await chooseMethod(/yes, i will enter it/i);
    await user.type(screen.getByRole("textbox", { name: /yearly electricity use/i }), "2,700");
    await submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/tariffs"));
    expect(loadJourney()).toEqual({
      regionCode: "C",
      annualKwh: 2700,
      usage: { method: "known" },
    });
  });

  it("explains a figure that is not a number", async () => {
    const { user, submit, chooseMethod } = renderStep();
    await chooseMethod(/yes, i will enter it/i);
    const input = screen.getByRole("textbox", { name: /yearly electricity use/i });
    await user.type(input, "about 3000");
    await submit();

    expect(screen.getByRole("link", { name: USAGE_MESSAGES.kwhInvalid })).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("estimates usage from three questions and shows the figure as you answer", async () => {
    const { user, submit, chooseMethod } = renderStep();
    await chooseMethod(/no, help me estimate it/i);

    expect(screen.getByText("Answer the questions above to see your estimate.")).toBeInTheDocument();

    const homeType = screen.getByRole("group", { name: "What type of home do you live in?" });
    await user.click(within(homeType).getByRole("radio", { name: /medium house/i }));
    await user.type(screen.getByRole("textbox", { name: "How many people live there?" }), "2");
    await user.click(screen.getByRole("checkbox", { name: /electric car/i }));

    expect(screen.getByText("4,500 kWh a year")).toBeInTheDocument();

    await submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/tariffs"));
    expect(loadJourney()).toMatchObject({
      annualKwh: 4500,
      usage: { method: "estimate", homeSize: "medium-house", occupants: 2, hasElectricVehicle: true },
    });
  });

  it("lists every missing estimate answer in page order", async () => {
    const { submit, chooseMethod } = renderStep();
    await chooseMethod(/no, help me estimate it/i);
    await submit();

    const links = within(errorSummary()).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      USAGE_MESSAGES.homeSize,
      USAGE_MESSAGES.occupantsEmpty,
    ]);
    expect(links[0]).toHaveAttribute("href", "#home-size");
  });

  it("clears errors that no longer apply when switching how to answer", async () => {
    const { submit, chooseMethod } = renderStep();
    await chooseMethod(/no, help me estimate it/i);
    await submit();
    expect(screen.getByRole("heading", { name: "There is a problem" })).toBeInTheDocument();

    await chooseMethod(/yes, i will enter it/i);
    expect(screen.queryByRole("heading", { name: "There is a problem" })).toBeNull();
    expect(document.title).toBe("Your usage | Switchboard");
  });

  it("fills in previous answers for people who come back", () => {
    saveJourney({
      annualKwh: 7600,
      usage: {
        method: "estimate",
        homeSize: "large-house",
        occupants: 3,
        hasElectricVehicle: false,
        hasHeatPump: true,
      },
    });
    renderStep();

    expect(screen.getByRole("radio", { name: /no, help me estimate it/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /large house/i })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "How many people live there?" })).toHaveValue("3");
    expect(screen.getByRole("checkbox", { name: /heat pump/i })).toBeChecked();
    // Large house 3,800 + one extra person 300 + heat pump 3,500
    expect(screen.getByText("7,600 kWh a year")).toBeInTheDocument();
  });
});
