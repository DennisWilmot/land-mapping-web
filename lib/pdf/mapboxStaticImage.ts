import type { Polygon, Feature, FeatureCollection } from "geojson";
import type { ParcelProperties } from "../data/parcels";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_STYLE = "mapbox/satellite-v9";

interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/**
 * Calculate bounding box for a set of parcels
 */
export function calculateBoundingBox(parcels: Feature<Polygon, ParcelProperties>[]): BoundingBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const parcel of parcels) {
    const coords = parcel.geometry.coordinates[0]; // Outer ring
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Add padding to a bounding box
 */
function padBoundingBox(bbox: BoundingBox, paddingPercent: number = 0.15): BoundingBox {
  const lngRange = bbox.maxLng - bbox.minLng;
  const latRange = bbox.maxLat - bbox.minLat;
  const lngPad = lngRange * paddingPercent;
  const latPad = latRange * paddingPercent;

  return {
    minLng: bbox.minLng - lngPad,
    minLat: bbox.minLat - latPad,
    maxLng: bbox.maxLng + lngPad,
    maxLat: bbox.maxLat + latPad,
  };
}

/**
 * Create GeoJSON overlay for Mapbox Static API
 * Encodes parcels with outline styling
 */
function createGeoJSONOverlay(
  parcels: Feature<Polygon, ParcelProperties>[],
  strokeColor: string = "#00ffff",
  strokeWidth: number = 3,
  fillColor: string = "#00ffff",
  fillOpacity: number = 0.2
): string {
  const features = parcels.map((parcel) => ({
    type: "Feature" as const,
    properties: {
      stroke: strokeColor,
      "stroke-width": strokeWidth,
      "stroke-opacity": 1,
      fill: fillColor,
      "fill-opacity": fillOpacity,
    },
    geometry: parcel.geometry,
  }));

  const geojson: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  return encodeURIComponent(JSON.stringify(geojson));
}

/**
 * Generate Mapbox Static Image URL for overview (all parcels)
 */
export function getOverviewImageUrl(
  parcels: Feature<Polygon, ParcelProperties>[],
  width: number = 800,
  height: number = 600
): string {
  if (!MAPBOX_TOKEN || parcels.length === 0) return "";

  const bbox = padBoundingBox(calculateBoundingBox(parcels), 0.1);
  const overlay = createGeoJSONOverlay(parcels, "#00ffff", 2, "#00ffff", 0.15);

  // Use bbox mode for overview
  const bboxStr = `[${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}]`;
  
  return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/static/geojson(${overlay})/auto/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}&padding=20`;
}

/**
 * Generate Mapbox Static Image URL for a single parcel
 */
export function getParcelImageUrl(
  parcel: Feature<Polygon, ParcelProperties>,
  width: number = 700,
  height: number = 400
): string {
  if (!MAPBOX_TOKEN) return "";

  const overlay = createGeoJSONOverlay([parcel], "#ff6b35", 3, "#ff6b35", 0.25);
  
  return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/static/geojson(${overlay})/auto/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}&padding=50`;
}

/**
 * Fetch an image as base64 data URL
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}
