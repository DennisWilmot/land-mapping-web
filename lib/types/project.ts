/**
 * Represents a saved multi-parcel project
 * Stores only parcel OBJECTID references, not data snapshots
 */
export interface SavedProject {
  id: string;              // UUID
  name: string;            // User-defined name
  parcelIds: number[];     // OBJECTID references in project order
  createdAt: number;       // timestamp (Date.now())
  updatedAt: number;       // timestamp (Date.now())
}
