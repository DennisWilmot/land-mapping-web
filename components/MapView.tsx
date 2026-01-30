"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  MapRef,
  MapLayerMouseEvent,
  Marker,
} from "react-map-gl";
import type { FeatureCollection, Polygon, MultiPolygon, Point, Feature, GeoJsonProperties } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import centroid from "@turf/centroid";

import { manchesterNorthEasternBoundary, boundaryCenter, boundaryZoom } from "@/lib/geo/boundary";
import { 
  loadElectoralDivisions, 
  groupByDivision,
  ELECTORAL_DIVISION_COLORS,
  type DivisionProperties,
  type DivisionName 
} from "@/lib/geo/electoral-divisions";
import type { ParcelProperties } from "@/lib/data/parcels";
import { formatParcelSize } from "@/lib/data/parcels";
import LayerControls from "./LayerControls";
import DetailsPanel from "./DetailsPanel";
import type { Address } from "@/lib/data/addresses";
import type { Owner } from "@/lib/data/owners";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export type MapStyle = "satellite" | "streets";

interface MapViewProps {
  parcelsData: FeatureCollection<Polygon, ParcelProperties> | null;
  addressesData: FeatureCollection<Point> | null;
  addressLookup: Map<string, Address>;
  ownerLookup: Map<string, Owner>;
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
  ownerLookup,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");
  const [visibleLayers, setVisibleLayers] = useState({
    boundary: true,
    divisions: true,
    parcels: true,
    addresses: false,
  });
  
  const [hoveredFeature, setHoveredFeature] = useState<HoveredFeature | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<ParcelProperties | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [nemOnly, setNemOnly] = useState(true);
  const [ownersOnly, setOwnersOnly] = useState(false);
  const [visibleDivisions, setVisibleDivisions] = useState<Record<DivisionName, boolean>>({
    CRAIGHEAD: true,
    CHRISTIANA: true,
    WALDERSTON: true,
  });
  const [divisionsData, setDivisionsData] = useState<Record<DivisionName, FeatureCollection<Polygon | MultiPolygon, DivisionProperties>> | null>(null);
  const [sizeRange, setSizeRange] = useState<{ min: number; max: number }>({ min: 0, max: Infinity });

  // Compute size bounds from parcel data (capped at 2,500 acres max for usable slider)
  const MAX_ACRES = 2500;
  const MAX_SQMT = MAX_ACRES * 4046.86; // ~10.1 million m²
  
  const sizeBounds = useMemo(() => {
    if (!parcelsData) return { min: 0, max: MAX_SQMT };
    
    let min = Infinity;
    let max = 0;
    
    for (const feature of parcelsData.features) {
      const size = feature.properties?.SIZE_SQMT;
      if (size && !isNaN(size) && size > 0) {
        if (size < min) min = size;
        if (size > max) max = size;
      }
    }
    
    return { 
      min: min === Infinity ? 0 : Math.floor(min), 
      max: Math.min(max === 0 ? MAX_SQMT : Math.ceil(max), MAX_SQMT)
    };
  }, [parcelsData]);

  // Initialize size range when bounds are computed
  useEffect(() => {
    if (sizeBounds.min !== 0 || sizeBounds.max !== 100000) {
      setSizeRange({ min: sizeBounds.min, max: sizeBounds.max });
    }
  }, [sizeBounds]);

  // Load electoral divisions data
  useEffect(() => {
    loadElectoralDivisions()
      .then(data => {
        setDivisionsData(groupByDivision(data));
      })
      .catch(err => console.error('Failed to load electoral divisions:', err));
  }, []);

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

  // Helper to find which division a point is in by checking all community polygons
  const findDivisionForPoint = useCallback((point: Feature<Point>): DivisionName | null => {
    if (!divisionsData) return null;
    
    // Check against all community polygons in each division
    for (const division of ['CRAIGHEAD', 'CHRISTIANA', 'WALDERSTON'] as DivisionName[]) {
      const divisionPolygons = divisionsData[division];
      if (!divisionPolygons) continue;
      
      for (const feature of divisionPolygons.features) {
        try {
          if (booleanPointInPolygon(point, feature as Feature<Polygon>)) {
            return division;
          }
        } catch {
          // Skip invalid polygons
          continue;
        }
      }
    }
    return null;
  }, [divisionsData]);

  // STEP 1: Pre-process parcels ONCE when data loads (expensive geometric operations)
  const { preprocessedParcels, nemCount, withOwnersCount } = useMemo(() => {
    if (!parcelsData || !divisionsData) return { 
      preprocessedParcels: null, 
      nemCount: 0, 
      withOwnersCount: 0 
    };
    
    console.time('Parcel preprocessing');
    
    let nemCount = 0;
    let withOwnersCount = 0;
    
    const preprocessedParcels = parcelsData.features.map((feature, index) => {
      const center = centroid(feature);
      const isInNem = booleanPointInPolygon(center, boundaryPolygon);
      const lvNumber = feature.properties?.LV_NUMBER;
      const hasOwner = lvNumber ? ownerLookup.has(lvNumber) : false;
      const division = findDivisionForPoint(center);
      
      if (isInNem) nemCount++;
      if (hasOwner) withOwnersCount++;
      
      return {
        ...feature,
        id: feature.properties?.OBJECTID || index,
        properties: {
          ...feature.properties,
          _isInNem: isInNem,
          _hasOwner: hasOwner,
          _division: division,
        },
      };
    });
    
    console.timeEnd('Parcel preprocessing');
    
    return { preprocessedParcels, nemCount, withOwnersCount };
  }, [parcelsData, divisionsData, boundaryPolygon, ownerLookup, findDivisionForPoint]);

  // STEP 2: Apply filters (cheap operations - just property checks)
  const { parcelsWithIds, parcelCounts } = useMemo(() => {
    if (!preprocessedParcels) return { 
      parcelsWithIds: null, 
      parcelCounts: { total: 0, nem: 0, withOwners: 0, displayed: 0 } 
    };
    
    let filteredFeatures = preprocessedParcels;
    
    if (nemOnly) {
      filteredFeatures = filteredFeatures.filter(f => f.properties._isInNem);
    }
    
    if (ownersOnly) {
      filteredFeatures = filteredFeatures.filter(f => f.properties._hasOwner);
    }

    // Filter by size range
    filteredFeatures = filteredFeatures.filter(f => {
      const size = f.properties.SIZE_SQMT;
      if (!size || isNaN(size)) return true; // Keep parcels with no size data
      return size >= sizeRange.min && size <= sizeRange.max;
    });

    // Filter by visible divisions
    filteredFeatures = filteredFeatures.filter(f => {
      const division = f.properties._division as DivisionName | null;
      if (!division) return true; // Show parcels with no division
      return visibleDivisions[division];
    });

    return {
      parcelsWithIds: {
        type: 'FeatureCollection' as const,
        features: filteredFeatures,
      },
      parcelCounts: {
        total: preprocessedParcels.length,
        nem: nemCount,
        withOwners: withOwnersCount,
        displayed: filteredFeatures.length,
      },
    };
  }, [preprocessedParcels, nemCount, withOwnersCount, nemOnly, ownersOnly, visibleDivisions, sizeRange]);

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

        {/* Parcels Layer - Colored by division */}
        {parcelsWithIds && (
          <Source id="parcels" type="geojson" data={parcelsWithIds}>
            <Layer
              id="parcels-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  "rgba(255, 255, 255, 0.4)",
                  [
                    "match",
                    ["get", "_division"],
                    "CRAIGHEAD", ELECTORAL_DIVISION_COLORS.CRAIGHEAD,
                    "CHRISTIANA", ELECTORAL_DIVISION_COLORS.CHRISTIANA,
                    "WALDERSTON", ELECTORAL_DIVISION_COLORS.WALDERSTON,
                    "rgba(255, 255, 255, 0.2)" // fallback
                  ],
                ],
                "fill-opacity": visibleLayers.parcels ? 0.5 : 0,
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
                  [
                    "match",
                    ["get", "_division"],
                    "CRAIGHEAD", ELECTORAL_DIVISION_COLORS.CRAIGHEAD,
                    "CHRISTIANA", ELECTORAL_DIVISION_COLORS.CHRISTIANA,
                    "WALDERSTON", ELECTORAL_DIVISION_COLORS.WALDERSTON,
                    "#888888" // fallback
                  ],
                ],
                "line-width": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  3,
                  1,
                ],
                "line-opacity": visibleLayers.parcels ? 1 : 0,
              }}
            />
          </Source>
        )}

        {/* Electoral Divisions Outlines Only - Show division boundaries */}
        {divisionsData && visibleLayers.divisions && (
          <>
            {(Object.keys(divisionsData) as DivisionName[]).map((division) => (
              <Source
                key={`division-${division}`}
                id={`division-${division}`}
                type="geojson"
                data={divisionsData[division]}
              >
                <Layer
                  id={`division-outline-${division}`}
                  type="line"
                  paint={{
                    "line-color": ELECTORAL_DIVISION_COLORS[division],
                    "line-width": 2.5,
                    "line-opacity": 0.8,
                  }}
                />
              </Source>
            ))}
          </>
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

        {/* Division Labels - Rendered as HTML Markers to appear on top of everything */}
        {visibleLayers.divisions && (
          <>
            <Marker longitude={-77.52} latitude={18.22} anchor="center">
              <div className="division-label">CRAIGHEAD</div>
            </Marker>
            <Marker longitude={-77.48} latitude={18.19} anchor="center">
              <div className="division-label">CHRISTIANA</div>
            </Marker>
            <Marker longitude={-77.50} latitude={18.14} anchor="center">
              <div className="division-label">WALDERSTON</div>
            </Marker>
          </>
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
        ownersOnly={ownersOnly}
        onToggleOwnersOnly={() => setOwnersOnly(!ownersOnly)}
        visibleDivisions={visibleDivisions}
        onToggleDivision={(division: DivisionName) => setVisibleDivisions(prev => ({ ...prev, [division]: !prev[division] }))}
        parcelCounts={parcelCounts}
        sizeRange={sizeRange}
        sizeBounds={sizeBounds}
        onSizeRangeChange={setSizeRange}
      />

      {/* Stats Card - Top Right */}
      {parcelCounts && (
        <div className="absolute top-4 right-4 z-10 glass-panel px-4 py-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-400">
              {parcelCounts.displayed.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">parcels shown</div>
          </div>
        </div>
      )}

      {/* Details Panel */}
      <DetailsPanel
        parcel={selectedParcel}
        linkedAddress={selectedParcel?.LV_NUMBER ? addressLookup.get(selectedParcel.LV_NUMBER) || null : null}
        owner={selectedParcel?.LV_NUMBER ? ownerLookup.get(selectedParcel.LV_NUMBER) || null : null}
        onClose={handleClosePanel}
      />
    </div>
  );
}
