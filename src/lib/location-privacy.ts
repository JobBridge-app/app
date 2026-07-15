const PUBLIC_COORDINATE_DECIMALS = 2;

type CoordinateInput = string | number | null | undefined;

export type ResolvedLocationCoordinates =
  | { status: "absent" }
  | { status: "invalid" }
  | {
      status: "valid";
      privateLatitude: number;
      privateLongitude: number;
      publicLatitude: number;
      publicLongitude: number;
    };

export function parseCoordinate(value: CoordinateInput) {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Public map coordinates are deliberately quantized to roughly a one-kilometre
 * grid. Exact geocoder coordinates belong only in job_private_details.
 */
export function coarsenPublicCoordinates(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return {
    lat: Number(lat.toFixed(PUBLIC_COORDINATE_DECIMALS)),
    lng: Number(lng.toFixed(PUBLIC_COORDINATE_DECIMALS)),
  };
}

/**
 * Resolves one submitted coordinate pair without ever publishing its exact
 * values. A completely absent pair may use the product fallback, while any
 * partially supplied or invalid pair must be rejected by the caller.
 */
export function resolveLocationCoordinates(
  latitudeInput: CoordinateInput,
  longitudeInput: CoordinateInput,
): ResolvedLocationCoordinates {
  const latitudeWasSupplied = latitudeInput !== null && latitudeInput !== undefined;
  const longitudeWasSupplied = longitudeInput !== null && longitudeInput !== undefined;

  if (!latitudeWasSupplied && !longitudeWasSupplied) {
    return { status: "absent" };
  }

  if (!latitudeWasSupplied || !longitudeWasSupplied) {
    return { status: "invalid" };
  }

  const privateLatitude = parseCoordinate(latitudeInput);
  const privateLongitude = parseCoordinate(longitudeInput);
  if (privateLatitude === null || privateLongitude === null) {
    return { status: "invalid" };
  }

  const publicCoordinates = coarsenPublicCoordinates(privateLatitude, privateLongitude);
  if (!publicCoordinates) {
    return { status: "invalid" };
  }

  return {
    status: "valid",
    privateLatitude,
    privateLongitude,
    publicLatitude: publicCoordinates.lat,
    publicLongitude: publicCoordinates.lng,
  };
}
