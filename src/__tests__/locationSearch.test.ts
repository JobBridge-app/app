import { describe, expect, it } from "vitest";
import {
  getResultPostcode,
  getSelectedLocationLabel,
  openPlzToSearchResults,
  splitLocationQuery,
  type OpenPlzLocality,
} from "@/lib/locationSearch";

const berlinRows: OpenPlzLocality[] = [
  { postalCode: "10115", name: "Berlin", municipality: { key: "11000000", name: "Berlin, Stadt" }, federalState: { name: "Berlin" } },
  { postalCode: "10117", name: "Berlin", municipality: { key: "11000000", name: "Berlin, Stadt" }, federalState: { name: "Berlin" } },
];

const kerkenRows: OpenPlzLocality[] = [
  { postalCode: "47647", name: "Kerken", municipality: { key: "05154028", name: "Kerken" }, federalState: { name: "Nordrhein-Westfalen" } },
];

describe("location search", () => {
  it("splits postcode and city input", () => {
    expect(splitLocationQuery("47647 Kerken")).toEqual({ city: "Kerken", postcode: "47647" });
    expect(splitLocationQuery("Berlin")).toEqual({ city: "Berlin", postcode: "" });
  });

  it("keeps city-only labels simple", () => {
    const [result] = openPlzToSearchResults(kerkenRows, "Kerken");

    expect(getResultPostcode(result)).toBe("47647");
    expect(getSelectedLocationLabel(result, "Kerken", true)).toBe("Kerken");
  });

  it("allows cities with multiple postcodes without storing a random postcode", () => {
    const [result] = openPlzToSearchResults(berlinRows, "Berlin");

    expect(getResultPostcode(result)).toBe("");
    expect(getSelectedLocationLabel(result, "Berlin", true)).toBe("Berlin");
  });

  it("keeps postcode labels when the user searched by postcode", () => {
    const [result] = openPlzToSearchResults(berlinRows.slice(0, 1), "10115 Berlin");

    expect(getSelectedLocationLabel(result, "10115 Berlin", true)).toBe("10115 Berlin");
  });
});
