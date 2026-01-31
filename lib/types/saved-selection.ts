/**
 * Represents a saved multi-parcel selection
 * Stores only parcel OBJECTID references, not data snapshots
 */
export interface SavedSelection {
  id: string;              // UUID
  name: string;            // User-defined name
  parcelIds: number[];     // OBJECTID references in selection order
  createdAt: number;       // timestamp (Date.now())
  updatedAt: number;       // timestamp (Date.now())
}
