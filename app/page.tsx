"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection, Polygon, Point, GeoJsonProperties } from "geojson";

import {
  loadAddresses,
  createAddressLookup,
  addressesToGeoJSON,
  type Address,
} from "@/lib/data/addresses";
import { loadParcels, type ParcelProperties } from "@/lib/data/parcels";

// Dynamically import MapView to avoid SSR issues with Mapbox
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const [parcelsData, setParcelsData] = useState<FeatureCollection<Polygon, ParcelProperties> | null>(null);
  const [addressesData, setAddressesData] = useState<FeatureCollection<Point, GeoJsonProperties> | null>(null);
  const [addressLookup, setAddressLookup] = useState<Map<string, Address>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load parcels and addresses in parallel
        const [parcels, addresses] = await Promise.all([
          loadParcels(),
          loadAddresses(),
        ]);

        setParcelsData(parcels);
        setAddressesData(addressesToGeoJSON(addresses));
        setAddressLookup(createAddressLookup(addresses));
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err instanceof Error ? err.message : "Failed to load map data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (error) {
    return (
      <main className="w-screen h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center p-8 glass-panel max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Data</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-screen h-screen overflow-hidden">
      <MapView
        parcelsData={parcelsData}
        addressesData={addressesData}
        addressLookup={addressLookup}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-300 font-medium">Loading parcel data...</p>
            <p className="text-slate-500 text-sm mt-1">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      {!loading && parcelsData && (
        <div className="absolute bottom-4 left-4 z-10 glass-panel px-4 py-2 text-xs text-slate-400">
          <span className="text-teal-400 font-medium">{parcelsData.features.length.toLocaleString()}</span> parcels
          {addressesData && (
            <>
              <span className="mx-2">•</span>
              <span className="text-amber-400 font-medium">{addressesData.features.length.toLocaleString()}</span> addresses
            </>
          )}
        </div>
      )}
    </main>
  );
}
