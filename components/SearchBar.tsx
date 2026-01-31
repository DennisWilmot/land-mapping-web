"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { FeatureCollection, Point, Polygon } from "geojson";
import type { ParcelProperties } from "@/lib/data/parcels";
import type { DivisionName } from "@/lib/geo/electoral-divisions";
import { ELECTORAL_DIVISION_COLORS } from "@/lib/geo/electoral-divisions";

// Search result types
export type SearchResultType = "parcel" | "address" | "division" | "starlink";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  matchedField: string;
  coordinates: [number, number]; // [lng, lat]
  data: unknown;
}

interface SearchBarProps {
  parcelsData: FeatureCollection<Polygon, ParcelProperties> | null;
  addressesData: FeatureCollection<Point> | null;
  starlinkData: FeatureCollection<Point> | null;
  onResultSelect: (result: SearchResult) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Search icon component
function SearchIcon() {
  return (
    <svg
      className="w-5 h-5 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

// Category icons
function ParcelIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 16 14" className="text-teal-400">
      <polygon
        points="2,12 1,5 4,1 12,2 15,7 13,12 6,13"
        fill="currentColor"
        fillOpacity={0.6}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AddressIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="text-amber-400">
      <circle cx="7" cy="7" r="5" fill="currentColor" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

function DivisionIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="12" viewBox="0 0 16 14">
      <polygon
        points="2,12 1,5 4,1 12,2 15,7 13,12 6,13"
        fill={color}
        fillOpacity={0.6}
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function StarlinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className="text-cyan-400">
      <rect x="5" y="5" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="1" y="6.5" width="3" height="3" fill="currentColor" fillOpacity={0.7} />
      <rect x="12" y="6.5" width="3" height="3" fill="currentColor" fillOpacity={0.7} />
    </svg>
  );
}

export default function SearchBar({
  parcelsData,
  addressesData,
  starlinkData,
  onResultSelect,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Search function
  const performSearch = useCallback((searchQuery: string): SearchResult[] => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const q = searchQuery.toLowerCase().trim();
    const searchResults: SearchResult[] = [];
    const MAX_PER_CATEGORY = 5;

    // Search divisions first (quick)
    const divisions: DivisionName[] = ["CRAIGHEAD", "CHRISTIANA", "WALDERSTON"];
    const divisionCenters: Record<DivisionName, [number, number]> = {
      CRAIGHEAD: [-77.505, 18.19],
      CHRISTIANA: [-77.535, 18.17],
      WALDERSTON: [-77.48, 18.16],
    };

    divisions.forEach((division) => {
      if (division.toLowerCase().includes(q)) {
        searchResults.push({
          id: `division-${division}`,
          type: "division",
          title: division.charAt(0) + division.slice(1).toLowerCase(),
          subtitle: "Electoral Division",
          matchedField: "Division name",
          coordinates: divisionCenters[division],
          data: division,
        });
      }
    });

    // Search Starlink sites
    if (starlinkData) {
      let starlinkCount = 0;
      for (const feature of starlinkData.features) {
        if (starlinkCount >= MAX_PER_CATEGORY) break;
        const name = (feature.properties as { name?: string })?.name || "";
        if (name.toLowerCase().includes(q)) {
          const coords = feature.geometry.coordinates as [number, number];
          searchResults.push({
            id: `starlink-${name}`,
            type: "starlink",
            title: name,
            subtitle: "Starlink Site",
            matchedField: "Site name",
            coordinates: coords,
            data: feature,
          });
          starlinkCount++;
        }
      }
    }

    // Search parcels
    if (parcelsData) {
      let parcelCount = 0;
      for (const feature of parcelsData.features) {
        if (parcelCount >= MAX_PER_CATEGORY) break;
        const props = feature.properties;
        
        const searchableFields = [
          { field: "LV Number", value: props.LV_NUMBER },
          { field: "PID", value: props.PID },
          { field: "Street Address", value: props.STREET_ADD },
          { field: "Scheme Address", value: props.SCHEME_ADD },
          { field: "Full Address", value: props.FULLADDRES },
          { field: "Location", value: props.LOCATION },
        ];

        for (const { field, value } of searchableFields) {
          if (value && value.toLowerCase().includes(q)) {
            // Calculate centroid for parcel
            const coords = feature.geometry.coordinates[0];
            const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
            const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

            searchResults.push({
              id: `parcel-${props.OBJECTID}`,
              type: "parcel",
              title: props.SCHEME_ADD || props.STREET_ADD || `Parcel ${props.PID}`,
              subtitle: props.LV_NUMBER ? `LV: ${props.LV_NUMBER}` : props.LOCATION,
              matchedField: field,
              coordinates: [centerLng, centerLat],
              data: feature,
            });
            parcelCount++;
            break; // Only add each parcel once
          }
        }
      }
    }

    // Search addresses
    if (addressesData) {
      let addressCount = 0;
      for (const feature of addressesData.features) {
        if (addressCount >= MAX_PER_CATEGORY) break;
        const props = feature.properties as {
          streetAddress?: string;
          schemeAddress?: string;
          fullAddress?: string;
          landValuation?: string;
          location?: string;
        };

        const searchableFields = [
          { field: "Land Valuation", value: props.landValuation },
          { field: "Street Address", value: props.streetAddress },
          { field: "Scheme Address", value: props.schemeAddress },
          { field: "Full Address", value: props.fullAddress },
        ];

        for (const { field, value } of searchableFields) {
          if (value && value.toLowerCase().includes(q)) {
            const coords = feature.geometry.coordinates as [number, number];
            searchResults.push({
              id: `address-${props.landValuation || addressCount}`,
              type: "address",
              title: props.schemeAddress || props.streetAddress || props.fullAddress || "Address",
              subtitle: props.landValuation ? `LV: ${props.landValuation}` : undefined,
              matchedField: field,
              coordinates: coords,
              data: feature,
            });
            addressCount++;
            break;
          }
        }
      }
    }

    return searchResults;
  }, [parcelsData, addressesData, starlinkData]);

  // Run search when debounced query changes
  useEffect(() => {
    const searchResults = performSearch(debouncedQuery);
    setResults(searchResults);
    setSelectedIndex(-1);
    setIsOpen(searchResults.length > 0 || debouncedQuery.length >= 2);
  }, [debouncedQuery, performSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, results, selectedIndex]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<SearchResultType, SearchResult[]>);

  const categoryOrder: SearchResultType[] = ["division", "parcel", "address", "starlink"];
  const categoryLabels: Record<SearchResultType, string> = {
    division: "Divisions",
    parcel: "Parcels",
    address: "Addresses",
    starlink: "Starlink Sites",
  };

  const renderIcon = (result: SearchResult) => {
    switch (result.type) {
      case "parcel":
        return <ParcelIcon />;
      case "address":
        return <AddressIcon />;
      case "division":
        return <DivisionIcon color={ELECTORAL_DIVISION_COLORS[result.data as DivisionName]} />;
      case "starlink":
        return <StarlinkIcon />;
    }
  };

  // Calculate flat index for keyboard navigation
  let flatIndex = -1;

  return (
    <div ref={containerRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
      <div className="glass-panel rounded-xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder="Search parcels, addresses, divisions..."
            className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 border border-slate-600 rounded px-1.5 py-0.5">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>

        {/* Results Dropdown */}
        {isOpen && (
          <div className="border-t border-slate-700 max-h-80 overflow-y-auto">
            {results.length === 0 && debouncedQuery.length >= 2 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                No results found for "{debouncedQuery}"
              </div>
            ) : (
              categoryOrder.map((category) => {
                const categoryResults = groupedResults[category];
                if (!categoryResults || categoryResults.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-800/50">
                      {categoryLabels[category]}
                    </div>
                    {categoryResults.map((result) => {
                      flatIndex++;
                      const isSelected = flatIndex === selectedIndex;

                      return (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isSelected ? "bg-teal-600/30" : "hover:bg-slate-700/50"
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {renderIcon(result)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-xs text-slate-400 truncate">{result.subtitle}</div>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex-shrink-0">
                            {result.matchedField}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
