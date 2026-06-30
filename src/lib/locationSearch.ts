export type LocationSearchResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    house_number?: string | number;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    postcode?: string;
    state?: string;
    country?: string;
  };
};

export type OpenPlzLocality = {
  postalCode: string;
  name: string;
  municipality?: { key?: string; name?: string };
  district?: { name?: string };
  federalState?: { name?: string };
};

const POSTCODE_PATTERN = /\b\d{5}\b/;

export function splitLocationQuery(query: string) {
  const postcode = query.match(POSTCODE_PATTERN)?.[0] || "";
  const city = query
    .replace(POSTCODE_PATTERN, "")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return { city, postcode };
}

export function hasPostcodeQuery(query: string) {
  return Boolean(splitLocationQuery(query).postcode);
}

export function getResultCity(result: LocationSearchResult) {
  const address = result.address || {};

  return address.city || address.town || address.municipality || address.village || result.display_name.split(",")[0]?.trim() || "";
}

export function getResultPostcode(result: LocationSearchResult) {
  return result.address?.postcode || "";
}

export function getSelectedLocationLabel(result: LocationSearchResult, query: string, cityOnly: boolean) {
  const city = getResultCity(result);
  const postcode = getResultPostcode(result);

  if (cityOnly && !hasPostcodeQuery(query)) {
    return city;
  }

  return [postcode, city].filter(Boolean).join(" ");
}

function escapeOpenPlzRegex(value: string) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

export function buildOpenPlzUrl(query: string) {
  const { city, postcode } = splitLocationQuery(query);

  if (!city && !postcode) return "";

  const url = new URL("https://openplzapi.org/de/Localities");

  if (postcode) url.searchParams.set("postalCode", postcode);
  if (city) url.searchParams.set("name", `^${escapeOpenPlzRegex(city)}`);
  url.searchParams.set("pageSize", "50");

  return url.toString();
}

function openPlzGroupKey(locality: OpenPlzLocality) {
  return [locality.name, locality.municipality?.key || locality.municipality?.name || "", locality.federalState?.name || ""].join("\u0000");
}

export function openPlzToSearchResults(localities: OpenPlzLocality[], query: string): LocationSearchResult[] {
  const { city: requestedCity, postcode } = splitLocationQuery(query);
  const groups = new Map<string, { locality: OpenPlzLocality; postcodes: string[] }>();

  for (const locality of localities) {
    if (!locality.name || !locality.postalCode || !locality.federalState?.name) continue;

    const key = openPlzGroupKey(locality);
    const existing = groups.get(key);

    if (existing) {
      existing.postcodes.push(locality.postalCode);
    } else {
      groups.set(key, { locality, postcodes: [locality.postalCode] });
    }
  }

  return Array.from(groups.values())
    .map(({ locality, postcodes }) => {
      const uniquePostcodes = Array.from(new Set(postcodes)).sort();
      const hasSpecificPostcode = Boolean(postcode);
      const primaryPostcode = (hasSpecificPostcode || uniquePostcodes.length === 1) ? uniquePostcodes[0] : "";
      const state = locality.federalState?.name || "";

      return {
        lat: "0",
        lon: "0",
        display_name: [primaryPostcode, locality.name, state, "Deutschland"].filter(Boolean).join(", "),
        address: {
          city: locality.name,
          municipality: locality.municipality?.name?.replace(/,\s*Stadt$/i, "") || locality.name,
          postcode: primaryPostcode,
          state,
          country: "Deutschland",
        },
      };
    })
    .sort((a, b) => {
      const aCity = getResultCity(a).toLocaleLowerCase("de-DE");
      const bCity = getResultCity(b).toLocaleLowerCase("de-DE");
      const requested = requestedCity.toLocaleLowerCase("de-DE");
      const exactRank = Number(aCity !== requested) - Number(bCity !== requested);

      return exactRank || aCity.length - bCity.length || aCity.localeCompare(bCity, "de-DE");
    });
}
