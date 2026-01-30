import type { FeatureCollection, Polygon } from "geojson";
import type { Address } from "./addresses";

export interface ParcelProperties {
  OBJECTID: number;
  PID: string;
  LV_NUMBER: string;
  VOL_FOL: string;
  SIZE_SQMT: number;
  STREET_ADD: string;
  SCHEME_ADD: string;
  FULLADDRES: string;
  LOCATION: string;
  PARISH: string;
}

export type ParcelFeatureCollection = FeatureCollection<Polygon, ParcelProperties>;

export async function loadParcels(): Promise<ParcelFeatureCollection> {
  const response = await fetch("/data/manchester_parcels.geojson");
  const data = await response.json();
  return data as ParcelFeatureCollection;
}

export interface LinkedParcelData {
  parcel: ParcelProperties;
  linkedAddress: Address | null;
}

export function linkParcelToAddress(
  parcel: ParcelProperties,
  addressLookup: Map<string, Address>
): LinkedParcelData {
  const linkedAddress = parcel.LV_NUMBER
    ? addressLookup.get(parcel.LV_NUMBER) || null
    : null;

  return {
    parcel,
    linkedAddress,
  };
}

export function formatParcelSize(sqmt: number): string {
  if (!sqmt || isNaN(sqmt)) return "N/A";
  
  if (sqmt >= 10000) {
    const hectares = sqmt / 10000;
    return `${hectares.toFixed(2)} ha`;
  }
  
  return `${sqmt.toLocaleString()} m²`;
}

export function getParcelDisplayName(parcel: ParcelProperties): string {
  return parcel.SCHEME_ADD || parcel.STREET_ADD || parcel.LOCATION || `Parcel ${parcel.PID}`;
}
