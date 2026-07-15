import { describe, expect, it } from "vitest";
import {
  coarsenPublicCoordinates,
  parseCoordinate,
  resolveLocationCoordinates,
} from "@/lib/location-privacy";

describe("public job location privacy", () => {
  it("keeps exact inputs parseable for the private details row", () => {
    expect(parseCoordinate("50.625678")).toBe(50.625678);
    expect(parseCoordinate("not-a-coordinate")).toBeNull();
  });

  it("quantizes public map coordinates instead of exposing the geocoder result", () => {
    expect(coarsenPublicCoordinates(50.625678, 6.949312)).toEqual({
      lat: 50.63,
      lng: 6.95,
    });
  });

  it("rejects coordinates outside the world bounds", () => {
    expect(coarsenPublicCoordinates(91, 6.95)).toBeNull();
    expect(coarsenPublicCoordinates(50.63, 181)).toBeNull();
  });

  it("keeps exact private coordinates while returning only coarse public coordinates", () => {
    expect(resolveLocationCoordinates("50.625678", "6.949312")).toEqual({
      status: "valid",
      privateLatitude: 50.625678,
      privateLongitude: 6.949312,
      publicLatitude: 50.63,
      publicLongitude: 6.95,
    });
  });

  it("allows the product fallback only when no coordinate field was supplied", () => {
    expect(resolveLocationCoordinates(null, undefined)).toEqual({ status: "absent" });
  });

  it.each([
    ["50.625678", null],
    [null, "6.949312"],
    ["not-a-coordinate", "also-invalid"],
    ["", ""],
    ["   ", "   "],
    ["91", "6.95"],
  ])("rejects every partially supplied or invalid coordinate pair (%s, %s)", (latitude, longitude) => {
    expect(resolveLocationCoordinates(latitude, longitude)).toEqual({ status: "invalid" });
  });
});
