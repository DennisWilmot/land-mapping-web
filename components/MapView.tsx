"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  MapRef,
  MapLayerMouseEvent,
} from "react-map-gl";
import type { FeatureCollection, Polygon, Point, Feature } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import centroid from "@turf/centroid";

import { manchesterNorthEasternBoundary, boundaryCenter, boundaryZoom } from "@/lib/geo/boundary";
import type { ParcelProperties } from "@/lib/data/parcels";
import { formatParcelSize } from "@/lib/data/parcels";
import LayerControls from "./LayerControls";
import DetailsPanel from "./DetailsPanel";
import type { Address } from "@/lib/data/addresses";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export type MapStyle = "satellite" | "streets";

interface MapViewProps {
  parcelsData: FeatureCollection<Polygon, ParcelProperties> | null;
  addressesData: FeatureCollection<Point> | null;
  addressLookup: Map<string, Address>;
}

interface HoveredFeature {
  id: string | number;
  properties: ParcelProperties;
  lngLat: { lng: number; lat: number };
}

export default function MapView({
  parcelsData,
  addressesData,
  addressLookup,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");
  const [visibleLayers, setVisibleLayers] = useState({
    boundary: true,
    parcels: true,
    addresses: false,
  });
  
  const [hoveredFeature, setHoveredFeature] = useState<HoveredFeature | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<ParcelProperties | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [nemOnly, setNemOnly] = useState(true);

  const mapStyleUrl = useMemo(() => {
    return mapStyle === "satellite"
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : "mapbox://styles/mapbox/dark-v11";
  }, [mapStyle]);

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    setCursorPosition({ x: e.point.x, y: e.point.y });
    
    if (!mapRef.current) return;
    
    const features = mapRef.current.queryRenderedFeatures(e.point, {
      layers: ["parcels-fill"],
    });

    if (features.length > 0) {
      const feature = features[0];
      const properties = feature.properties as ParcelProperties;
      
      if (hoveredFeature?.id !== feature.id) {
        // Reset previous hover state
        if (hoveredFeature?.id !== undefined) {
          mapRef.current.setFeatureState(
            { source: "parcels", id: hoveredFeature.id },
            { hover: false }
          );
        }
        
        // Set new hover state
        if (feature.id !== undefined) {
          mapRef.current.setFeatureState(
            { source: "parcels", id: feature.id },
            { hover: true }
          );
        }
        
        setHoveredFeature({
          id: feature.id as string | number,
          properties,
          lngLat: e.lngLat,
        });
      }
    } else {
      if (hoveredFeature?.id !== undefined) {
        mapRef.current.setFeatureState(
          { source: "parcels", id: hoveredFeature.id },
          { hover: false }
        );
      }
      setHoveredFeature(null);
    }
  }, [hoveredFeature?.id]);

  const handleMouseLeave = useCallback(() => {
    if (hoveredFeature?.id !== undefined && mapRef.current) {
      mapRef.current.setFeatureState(
        { source: "parcels", id: hoveredFeature.id },
        { hover: false }
      );
    }
    setHoveredFeature(null);
    setCursorPosition(null);
  }, [hoveredFeature?.id]);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    if (!mapRef.current) return;
    
    const features = mapRef.current.queryRenderedFeatures(e.point, {
      layers: ["parcels-fill"],
    });

    if (features.length > 0) {
      const properties = features[0].properties as ParcelProperties;
      setSelectedParcel(properties);
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedParcel(null);
  }, []);

  const toggleLayer = useCallback((layer: keyof typeof visibleLayers) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  // Get the boundary polygon for filtering
  const boundaryPolygon = useMemo(() => {
    const feature = manchesterNorthEasternBoundary.features[0];
    return feature as Feature<Polygon>;
  }, []);

  // Filter parcels to NEM only and add feature IDs
  const { parcelsWithIds, parcelCounts } = useMemo(() => {
    if (!parcelsData) return { parcelsWithIds: null, parcelCounts: { total: 0, nem: 0 } };
    
    // First, calculate which parcels are in NEM (do this once)
    const parcelsWithNemFlag = parcelsData.features.map((feature, index) => {
      const center = centroid(feature);
      const isInNem = booleanPointInPolygon(center, boundaryPolygon);
      return {
        ...feature,
        id: feature.properties?.OBJECTID || index,
        properties: {
          ...feature.properties,
          _isInNem: isInNem,
        },
      };
    });

    const nemCount = parcelsWithNemFlag.filter(f => f.properties._isInNem).length;
    
    // Filter based on nemOnly toggle
    const filteredFeatures = nemOnly 
      ? parcelsWithNemFlag.filter(f => f.properties._isInNem)
      : parcelsWithNemFlag;

    return {
      parcelsWithIds: {
        ...parcelsData,
        features: filteredFeatures,
      },
      parcelCounts: {
        total: parcelsData.features.length,
        nem: nemCount,
      },
    };
  }, [parcelsData, nemOnly, boundaryPolygon]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center p-8 glass-panel max-w-md">
          <h2 className="text-xl font-semibold mb-4">Mapbox Token Required</h2>
          <p className="text-slate-300 mb-4">
            Please add your Mapbox access token to <code className="bg-slate-800 px-2 py-1 rounded">.env.local</code>:
          </p>
          <pre className="bg-slate-800 p-4 rounded text-left text-sm overflow-x-auto">
            NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: boundaryCenter[0],
          latitude: boundaryCenter[1],
          zoom: boundaryZoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyleUrl}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        interactiveLayerIds={["parcels-fill"]}
        cursor={hoveredFeature ? "pointer" : "grab"}
      >
        {/* Boundary Layer */}
        <Source id="boundary" type="geojson" data={manchesterNorthEasternBoundary}>
          <Layer
            id="boundary-outline"
            type="line"
            paint={{
              "line-color": "#3B82F6",
              "line-width": 3,
              "line-opacity": visibleLayers.boundary ? 1 : 0,
            }}
          />
        </Source>

        {/* Parcels Layer */}
        {parcelsWithIds && (
          <Source id="parcels" type="geojson" data={parcelsWithIds}>
            <Layer
              id="parcels-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  "rgba(45, 212, 191, 0.6)",
                  "rgba(20, 184, 166, 0.4)",
                ],
                "fill-opacity": visibleLayers.parcels ? 1 : 0,
              }}
            />
            <Layer
              id="parcels-outline"
              type="line"
              paint={{
                "line-color": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  "#ffffff",
                  "rgba(255, 255, 255, 0.6)",
                ],
                "line-width": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  2,
                  1,
                ],
                "line-opacity": visibleLayers.parcels ? 1 : 0,
              }}
            />
          </Source>
        )}

        {/* Addresses Layer */}
        {addressesData && (
          <Source id="addresses" type="geojson" data={addressesData}>
            <Layer
              id="addresses-points"
              type="circle"
              paint={{
                "circle-radius": 5,
                "circle-color": "#F59E0B",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
                "circle-opacity": visibleLayers.addresses ? 0.8 : 0,
                "circle-stroke-opacity": visibleLayers.addresses ? 1 : 0,
              }}
            />
          </Source>
        )}
      </Map>

      {/* Hover Tooltip */}
      {hoveredFeature && cursorPosition && visibleLayers.parcels && (
        <div
          className="absolute pointer-events-none z-10 glass-panel px-3 py-2 text-sm max-w-xs"
          style={{
            left: cursorPosition.x + 15,
            top: cursorPosition.y + 15,
          }}
        >
          <div className="font-semibold text-teal-400 mb-1">
            {hoveredFeature.properties.SCHEME_ADD || hoveredFeature.properties.PID}
          </div>
          <div className="text-slate-300 text-xs space-y-0.5">
            <div>PID: {hoveredFeature.properties.PID}</div>
            <div>LV: {hoveredFeature.properties.LV_NUMBER || "N/A"}</div>
            <div>Size: {formatParcelSize(hoveredFeature.properties.SIZE_SQMT)}</div>
          </div>
        </div>
      )}

      {/* Layer Controls */}
      <LayerControls
        visibleLayers={visibleLayers}
        onToggleLayer={toggleLayer}
        mapStyle={mapStyle}
        onToggleMapStyle={() => setMapStyle(mapStyle === "satellite" ? "streets" : "satellite")}
        nemOnly={nemOnly}
        onToggleNemOnly={() => setNemOnly(!nemOnly)}
        parcelCounts={parcelCounts}
      />

      {/* Details Panel */}
      <DetailsPanel
        parcel={selectedParcel}
        linkedAddress={selectedParcel?.LV_NUMBER ? addressLookup.get(selectedParcel.LV_NUMBER) || null : null}
        onClose={handleClosePanel}
      />
    </div>
  );
}
