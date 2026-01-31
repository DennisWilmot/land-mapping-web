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
import { useProjects } from "@/lib/hooks/useProjects";
import { generateProjectReport, downloadReport } from "@/lib/pdf/generateProjectReport";
import type { SavedProject } from "@/lib/types/project";
import LayerControls from "./LayerControls";
import DetailsPanel from "./DetailsPanel";
import MultiParcelPanel from "./MultiParcelPanel";
import SearchBar, { type SearchResult } from "./SearchBar";
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

export interface SelectedParcel {
  properties: ParcelProperties;
  center: [number, number]; // [lng, lat] for marker placement
  selectionOrder: number;   // 1, 2, 3...
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
    starlink: true,
    roads: false,
    water: true,
  });
  const [starlinkData, setStarlinkData] = useState<FeatureCollection<Point> | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const [hoveredFeature, setHoveredFeature] = useState<HoveredFeature | null>(null);
  const [selectedParcels, setSelectedParcels] = useState<SelectedParcel[]>([]);
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

  // Projects
  const {
    projects: savedProjects,
    saveProject,
    updateProject,
    renameProject,
    deleteProject,
    getProject,
  } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);

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

  // Load Starlink data
  useEffect(() => {
    fetch('/data/starlink.json')
      .then(res => res.json())
      .then(data => setStarlinkData(data))
      .catch(err => console.error('Failed to load Starlink data:', err));
  }, []);

  // Toggle Mapbox built-in road and water layer visibility
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;

    const layers = map.getStyle()?.layers || [];
    
    // Toggle road layers
    layers.forEach(layer => {
      if (layer.id.includes('road') || layer.id.includes('bridge') || layer.id.includes('tunnel')) {
        try {
          map.setLayoutProperty(layer.id, 'visibility', visibleLayers.roads ? 'visible' : 'none');
        } catch (e) {
          // Some layers may not support visibility toggle
        }
      }
    });

    // Toggle water layers
    layers.forEach(layer => {
      if (layer.id.includes('water')) {
        try {
          map.setLayoutProperty(layer.id, 'visibility', visibleLayers.water ? 'visible' : 'none');
        } catch (e) {
          // Some layers may not support visibility toggle
        }
      }
    });
  }, [visibleLayers.roads, visibleLayers.water, mapStyle, mapLoaded]);

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

    if (features.length === 0) {
      // Clicked outside any parcel - clear selection
      setSelectedParcels([]);
      return;
    }

    const feature = features[0];
    const properties = feature.properties as ParcelProperties;
    const origEvt = e.originalEvent as PointerEvent;
    // Support Cmd (Mac) and Ctrl (Windows/Linux) for multi-select
    // Note: Shift+Click is intercepted by Mapbox for box-zoom
    const isMultiSelectKey = origEvt?.metaKey || origEvt?.ctrlKey || false;
    
    // Calculate parcel center from geometry
    let center: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    if (feature.geometry.type === 'Polygon') {
      const coords = (feature.geometry as Polygon).coordinates[0];
      const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      center = [centerLng, centerLat];
    }

    setSelectedParcels(prev => {
      const existingIndex = prev.findIndex(p => p.properties.OBJECTID === properties.OBJECTID);
      
      if (isMultiSelectKey) {
        // Multi-select mode
        if (existingIndex >= 0) {
          // Already selected - remove it and reorder remaining
          const newSelection = prev.filter((_, i) => i !== existingIndex);
          return newSelection.map((p, i) => ({ ...p, selectionOrder: i + 1 }));
        } else {
          // Add to selection
          return [...prev, { properties, center, selectionOrder: prev.length + 1 }];
        }
      } else {
        // Single select mode - replace selection
        if (existingIndex >= 0 && prev.length === 1) {
          // Clicking the only selected parcel - deselect
          return [];
        }
        return [{ properties, center, selectionOrder: 1 }];
      }
    });
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedParcels([]);
  }, []);

  const handleRemoveParcel = useCallback((objectId: number) => {
    setSelectedParcels(prev => {
      const newSelection = prev.filter(p => p.properties.OBJECTID !== objectId);
      return newSelection.map((p, i) => ({ ...p, selectionOrder: i + 1 }));
    });
  }, []);

  // Handle parcel reordering from drag-and-drop
  const handleReorderParcels = useCallback((reorderedParcels: SelectedParcel[]) => {
    setSelectedParcels(reorderedParcels);
  }, []);

  // Save a new project
  const handleSaveProject = useCallback((name: string) => {
    const parcelIds = selectedParcels.map(p => p.properties.OBJECTID);
    const newProject = saveProject(name, parcelIds);
    setActiveProjectId(newProject.id);
    setActiveProjectName(newProject.name);
  }, [selectedParcels, saveProject]);

  // Update the active project with current parcels
  const handleUpdateProject = useCallback(() => {
    if (!activeProjectId) return;
    const parcelIds = selectedParcels.map(p => p.properties.OBJECTID);
    updateProject(activeProjectId, parcelIds);
  }, [activeProjectId, selectedParcels, updateProject]);

  // Load a saved project - restore parcels on map
  const handleLoadProject = useCallback((projectId: string) => {
    const project = getProject(projectId);
    if (!project || !parcelsData) return;

    // Build a lookup of all parcels by OBJECTID
    const parcelLookup: Record<number, Feature<Polygon, ParcelProperties>> = {};
    for (const feature of parcelsData.features) {
      if (feature.properties?.OBJECTID) {
        parcelLookup[feature.properties.OBJECTID] = feature;
      }
    }

    // Restore the selected parcels in order
    const restoredParcels: SelectedParcel[] = [];
    for (let i = 0; i < project.parcelIds.length; i++) {
      const objectId = project.parcelIds[i];
      const feature = parcelLookup[objectId];
      if (feature && feature.properties) {
        const center = centroid(feature);
        const coords = center.geometry.coordinates as [number, number];
        restoredParcels.push({
          properties: feature.properties,
          center: coords,
          selectionOrder: i + 1,
        });
      }
    }

    setSelectedParcels(restoredParcels);
    setActiveProjectId(projectId);
    setActiveProjectName(project.name);

    // Optionally fly to the first parcel
    if (restoredParcels.length > 0 && mapRef.current) {
      const [lng, lat] = restoredParcels[0].center;
      mapRef.current.getMap().flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1500,
      });
    }
  }, [getProject, parcelsData]);

  // Handle renaming a project
  const handleRenameProject = useCallback((id: string, name: string) => {
    renameProject(id, name);
    // Update active name if this is the active project
    if (id === activeProjectId) {
      setActiveProjectName(name);
    }
  }, [renameProject, activeProjectId]);

  // Handle deleting a project
  const handleDeleteProject = useCallback((id: string) => {
    deleteProject(id);
    // Clear active project if this was it
    if (id === activeProjectId) {
      setActiveProjectId(null);
      setActiveProjectName(null);
    }
  }, [deleteProject, activeProjectId]);

  // Clear active project when parcels are manually cleared
  const handleCloseAndClearActive = useCallback(() => {
    setSelectedParcels([]);
    setActiveProjectId(null);
    setActiveProjectName(null);
  }, []);

  // Export report state and handler
  const [isExporting, setIsExporting] = useState(false);

  const handleExportReport = useCallback(async () => {
    if (selectedParcels.length === 0 || !parcelsData) return;
    
    setIsExporting(true);
    
    try {
      // Build a lookup of parcel features by OBJECTID
      const parcelLookup: Record<number, Feature<Polygon, ParcelProperties>> = {};
      for (const feature of parcelsData.features) {
        if (feature.properties?.OBJECTID) {
          parcelLookup[feature.properties.OBJECTID] = feature;
        }
      }

      // Build parcel data for the report
      const parcelsForReport = selectedParcels.map((selected) => {
        const feature = parcelLookup[selected.properties.OBJECTID];
        const owner = selected.properties.LV_NUMBER 
          ? ownerLookup.get(selected.properties.LV_NUMBER) || null 
          : null;
        
        return {
          parcel: feature || { 
            type: "Feature" as const, 
            properties: selected.properties, 
            geometry: { type: "Polygon" as const, coordinates: [] } 
          },
          owner,
          selectionOrder: selected.selectionOrder,
        };
      });

      // Create a temporary project object if not already saved
      const project: SavedProject = activeProjectId && activeProjectName
        ? { 
            id: activeProjectId, 
            name: activeProjectName, 
            parcelIds: selectedParcels.map(p => p.properties.OBJECTID),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        : {
            id: "temp",
            name: "Multi-Parcel Project",
            parcelIds: selectedParcels.map(p => p.properties.OBJECTID),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

      // Generate and download the report
      const blob = await generateProjectReport(project, parcelsForReport);
      downloadReport(blob, project.name);
    } catch (error) {
      console.error("Failed to export report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [selectedParcels, parcelsData, ownerLookup, activeProjectId, activeProjectName]);

  const toggleLayer = useCallback((layer: keyof typeof visibleLayers) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  // Handle search result selection - fly to location and select feature
  const handleSearchResult = useCallback((result: SearchResult) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Fly to the result location
    map.flyTo({
      center: result.coordinates,
      zoom: result.type === "division" ? 12 : 16,
      duration: 1500,
    });

    // Handle different result types
    switch (result.type) {
      case "parcel":
        // Select the parcel and open details panel
        const parcelFeature = result.data as Feature<Polygon, ParcelProperties>;
        if (parcelFeature.properties) {
          setSelectedParcels([{
            properties: parcelFeature.properties,
            center: result.coordinates,
            selectionOrder: 1,
          }]);
        }
        break;
      case "division":
        // Make sure the division is visible
        const divisionName = result.data as DivisionName;
        setVisibleDivisions((prev) => ({ ...prev, [divisionName]: true }));
        break;
      case "starlink":
        // Make sure starlink layer is visible
        setVisibleLayers((prev) => ({ ...prev, starlink: true }));
        break;
      case "address":
        // Make sure addresses layer is visible
        setVisibleLayers((prev) => ({ ...prev, addresses: true }));
        break;
    }
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

  // Filter addresses by visible divisions (only show addresses INSIDE a visible division)
  const filteredAddresses = useMemo(() => {
    if (!addressesData || !divisionsData) return null;
    
    const filteredFeatures = addressesData.features.filter(feature => {
      const point: Feature<Point> = {
        type: 'Feature',
        geometry: feature.geometry,
        properties: {}
      };
      const division = findDivisionForPoint(point);
      
      // Only show addresses that are inside a division AND that division is visible
      if (!division) return false;
      
      return visibleDivisions[division];
    });
    
    return {
      type: 'FeatureCollection' as const,
      features: filteredFeatures,
    };
  }, [addressesData, divisionsData, visibleDivisions, findDivisionForPoint]);

  // Create GeoJSON for selected parcels (for highlight layer)
  const selectedParcelsGeoJSON = useMemo(() => {
    if (selectedParcels.length === 0 || !parcelsData) return null;
    
    const selectedObjectIds = new Set(selectedParcels.map(p => p.properties.OBJECTID));
    const features = parcelsData.features.filter(f => selectedObjectIds.has(f.properties.OBJECTID));
    
    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [selectedParcels, parcelsData]);

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
        onLoad={() => setMapLoaded(true)}
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

        {/* Selected Parcels Highlight Layer */}
        {selectedParcelsGeoJSON && selectedParcelsGeoJSON.features.length > 0 && (
          <Source id="selected-parcels" type="geojson" data={selectedParcelsGeoJSON}>
            <Layer
              id="selected-parcels-fill"
              type="fill"
              paint={{
                "fill-color": "#00D4FF",
                "fill-opacity": 0.3,
              }}
            />
            <Layer
              id="selected-parcels-outline"
              type="line"
              paint={{
                "line-color": "#00D4FF",
                "line-width": 3,
                "line-opacity": 1,
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

        {/* Addresses Layer - filtered by visible divisions */}
        {filteredAddresses && (
          <Source id="addresses" type="geojson" data={filteredAddresses}>
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

        {/* Starlink Sites Layer */}
        {starlinkData && (
          <Source id="starlink" type="geojson" data={starlinkData}>
            <Layer
              id="starlink-points"
              type="circle"
              paint={{
                "circle-radius": 8,
                "circle-color": "#00BCD4",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
                "circle-opacity": visibleLayers.starlink ? 0.9 : 0,
                "circle-stroke-opacity": visibleLayers.starlink ? 1 : 0,
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

        {/* Selection Number Markers */}
        {selectedParcels.map((selected) => (
          <Marker
            key={`selection-${selected.properties.OBJECTID}`}
            longitude={selected.center[0]}
            latitude={selected.center[1]}
            anchor="center"
          >
            <div className="flex items-center justify-center w-7 h-7 bg-cyan-500 text-white text-sm font-bold rounded-full border-2 border-white shadow-lg">
              {selected.selectionOrder}
            </div>
          </Marker>
        ))}
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

      {/* Search Bar */}
      <SearchBar
        parcelsData={parcelsData}
        addressesData={addressesData}
        starlinkData={starlinkData}
        onResultSelect={handleSearchResult}
      />

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
        savedProjects={savedProjects}
        activeProjectId={activeProjectId}
        onLoadProject={handleLoadProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
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

      {/* Details Panel - for single selection */}
      {selectedParcels.length === 1 && (
        <DetailsPanel
          parcel={selectedParcels[0].properties}
          linkedAddress={selectedParcels[0].properties.LV_NUMBER ? addressLookup.get(selectedParcels[0].properties.LV_NUMBER) || null : null}
          owner={selectedParcels[0].properties.LV_NUMBER ? ownerLookup.get(selectedParcels[0].properties.LV_NUMBER) || null : null}
          onClose={handleClosePanel}
        />
      )}

      {/* Multi-Parcel Panel - for multi-selection */}
      {selectedParcels.length >= 2 && (
        <MultiParcelPanel
          selectedParcels={selectedParcels}
          ownerLookup={ownerLookup}
          onRemoveParcel={handleRemoveParcel}
          onClearAll={handleCloseAndClearActive}
          onReorderParcels={handleReorderParcels}
          onSaveProject={handleSaveProject}
          onUpdateProject={handleUpdateProject}
          activeProjectId={activeProjectId}
          activeProjectName={activeProjectName}
          onExportReport={handleExportReport}
          isExporting={isExporting}
        />
      )}
    </div>
  );
}
