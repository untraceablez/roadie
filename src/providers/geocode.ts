import { getJson } from "./http.js";

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

interface GeoResponse {
  results?: {
    name: string;
    admin1?: string;
    country_code?: string;
    latitude: number;
    longitude: number;
  }[];
}

/** Resolve a free-text place via Open-Meteo's keyless geocoding API. */
export async function geocode(query: string): Promise<Place | undefined> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`;
  const r = (await getJson<GeoResponse>(url)).results?.[0];
  if (!r) return undefined;
  const name = [r.name, r.admin1, r.country_code].filter(Boolean).join(", ");
  return { name, lat: r.latitude, lng: r.longitude };
}
