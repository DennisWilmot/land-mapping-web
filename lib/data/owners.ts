import Papa from "papaparse";

export interface Owner {
  valuationNumber: string;
  ownerName: string;
  landValue: string;
}

export interface OwnerCSVRow {
  "Valuation Number": string;
  "Owner Name": string;
  "Land Value": string;
}

export async function loadOwners(): Promise<Owner[]> {
  const response = await fetch("/data/pts_owners.csv");
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<OwnerCSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const owners: Owner[] = results.data
          .filter((row) => row["Valuation Number"])
          .map((row) => ({
            valuationNumber: row["Valuation Number"] || "",
            ownerName: row["Owner Name"] || "",
            landValue: row["Land Value"] || "",
          }));
        resolve(owners);
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

export function createOwnerLookup(owners: Owner[]): Map<string, Owner> {
  const lookup = new Map<string, Owner>();
  for (const owner of owners) {
    if (owner.valuationNumber) {
      lookup.set(owner.valuationNumber, owner);
    }
  }
  return lookup;
}
