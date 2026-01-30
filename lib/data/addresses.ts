import Papa from "papaparse";

export interface Address {
  landValuation: string;
  titleReference: string;
  streetAddress: string;
  schemeAddress: string;
  fullAddress: string;
  location: string;
  parish: string;
  latitude: number;
  longitude: number;
}

export interface AddressCSVRow {
  "Land Valuation": string;
  "Title Reference": string;
  "Street Address": string;
  "Scheme Address": string;
  "Full Address": string;
  Location: string;
  Parish: string;
  Latitude: string;
  Longitude: string;
}

export async function loadAddresses(): Promise<Address[]> {
  const response = await fetch("/data/jamaica_processed_addresses.csv");
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<AddressCSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const addresses: Address[] = results.data
          .filter((row) => row.Latitude && row.Longitude)
          .map((row) => ({
            landValuation: row["Land Valuation"] || "",
            titleReference: row["Title Reference"] || "",
            streetAddress: row["Street Address"] || "",
            schemeAddress: row["Scheme Address"] || "",
            fullAddress: row["Full Address"] || "",
            location: row.Location || "",
            parish: row.Parish || "",
            latitude: parseFloat(row.Latitude),
            longitude: parseFloat(row.Longitude),
          }));
        resolve(addresses);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

export function createAddressLookup(
  addresses: Address[]
): Map<string, Address> {
  const lookup = new Map<string, Address>();
  for (const address of addresses) {
    if (address.landValuation) {
      lookup.set(address.landValuation, address);
    }
  }
  return lookup;
}

import type { FeatureCollection, Point, GeoJsonProperties } from "geojson";

export function addressesToGeoJSON(addresses: Address[]): FeatureCollection<Point, GeoJsonProperties> {
  return {
    type: "FeatureCollection",
    features: addresses
      .filter((a) => !isNaN(a.latitude) && !isNaN(a.longitude))
      .map((address, index) => ({
        type: "Feature" as const,
        id: index,
        geometry: {
          type: "Point" as const,
          coordinates: [address.longitude, address.latitude] as [number, number],
        },
        properties: {
          landValuation: address.landValuation,
          titleReference: address.titleReference,
          streetAddress: address.streetAddress,
          schemeAddress: address.schemeAddress,
          fullAddress: address.fullAddress,
          location: address.location,
          parish: address.parish,
        },
      })),
  };
}
