"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import { RaceMap, RaceMapEvent } from "../RaceMap";

const events: RaceMapEvent[] = [
  { id: "race-1", name: "Test Race", date: "Jan 1", location: "Somewhere", lat: 60, lon: 10, courseId: "c1" },
];

describe("RaceMap", () => {
  it("renders markers and selects on click", () => {
    render(<RaceMap events={events} />);
    expect(screen.getByText("Test Race")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Test Race"));
    expect(screen.getAllByText("Test Race").length).toBeGreaterThan(1);
  });
});
