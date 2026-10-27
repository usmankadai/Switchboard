import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { agileByTimeOfDay } from "../../../tests/e2e/graphqlMock";
import { AgilePriceChart, describeTimeOfDay } from "./AgilePriceChart";

const byTimeOfDay = agileByTimeOfDay.map(({ slot, averagePence }) => ({ slot, averagePence }));

describe("AgilePriceChart", () => {
  it("names the chart by its title and plain-English summary", () => {
    render(<AgilePriceChart byTimeOfDay={byTimeOfDay} days={30} />);
    const chart = screen.getByRole("img", { name: /Average price by time of day/ });
    expect(chart).toHaveAccessibleName(
      expect.stringContaining(
        "lowest on average from 00:00 to 03:00 (about 13.17p per kWh) and highest from 16:00 to 19:00 (about 45.00p per kWh)",
      ),
    );
  });

  it("shows the summary as text, not only inside the chart", () => {
    render(<AgilePriceChart byTimeOfDay={byTimeOfDay} days={30} />);
    expect(screen.getByText(/prices were lowest on average from 00:00 to 03:00/)).toBeVisible();
  });

  it("labels the cheapest and dearest windows in words", () => {
    const { container } = render(<AgilePriceChart byTimeOfDay={byTimeOfDay} days={30} />);
    const labels = Array.from(container.querySelectorAll("svg text")).map((t) => t.textContent);
    expect(labels).toEqual(expect.arrayContaining(["Cheapest 3 hours", "Dearest 3 hours"]));
  });

  it("lifts the second label onto its own row when the windows are neighbours", () => {
    // Cheapest 13:00 to 16:00 straight into dearest 16:00 to 19:00.
    const neighbours = byTimeOfDay.map(({ slot }) => ({
      slot,
      averagePence: slot >= 26 && slot < 32 ? 5 : slot >= 32 && slot < 38 ? 50 : 25,
    }));
    const { container } = render(<AgilePriceChart byTimeOfDay={neighbours} days={30} />);
    const label = (text: string) =>
      Array.from(container.querySelectorAll("svg text")).find((t) => t.textContent === text);
    expect(label("Cheapest 3 hours")?.getAttribute("y")).not.toBe(
      label("Dearest 3 hours")?.getAttribute("y"),
    );
  });

  it("draws one column per half hour", () => {
    const { container } = render(<AgilePriceChart byTimeOfDay={byTimeOfDay} days={30} />);
    expect(container.querySelectorAll("svg path")).toHaveLength(48);
  });

  it("offers every value as a table", async () => {
    render(<AgilePriceChart byTimeOfDay={byTimeOfDay} days={30} />);
    await userEvent.setup().click(screen.getByText("Show prices by time of day as a table"));

    const table = screen.getByRole("table", { name: /Average Agile price by time of day/ });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(49); // header + 48 half hours
    expect(within(table).getByRole("rowheader", { name: "16:00 to 16:30" })).toBeInTheDocument();
    expect(rows[33]).toHaveTextContent("16:00 to 16:3046.00p per kWh");
  });
});

describe("describeTimeOfDay", () => {
  it("falls back to a simple description without a full day of prices", () => {
    expect(describeTimeOfDay(null, null, 30)).toBe("Average prices by time of day over the last 30 days.");
  });
});
