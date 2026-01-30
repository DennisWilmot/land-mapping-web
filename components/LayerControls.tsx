"use client";

import { useState, useEffect } from "react";
import type { MapStyle } from "./MapView";
import type { DivisionName } from "@/lib/geo/electoral-divisions";
import { ELECTORAL_DIVISION_COLORS } from "@/lib/geo/electoral-divisions";

// Chevron icon for collapse/expand
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface SizeRange {
  min: number;
  max: number;
}

interface LayerControlsProps {
  visibleLayers: {
    boundary: boolean;
    divisions: boolean;
    parcels: boolean;
    addresses: boolean;
  };
  onToggleLayer: (layer: "boundary" | "divisions" | "parcels" | "addresses") => void;
  mapStyle: MapStyle;
  onToggleMapStyle: () => void;
  nemOnly: boolean;
  onToggleNemOnly: () => void;
  ownersOnly: boolean;
  onToggleOwnersOnly: () => void;
  visibleDivisions: Record<DivisionName, boolean>;
  onToggleDivision: (division: DivisionName) => void;
  parcelCounts?: { total: number; nem: number; withOwners: number; displayed: number };
  sizeRange: SizeRange;
  sizeBounds: SizeRange;
  onSizeRangeChange: (range: SizeRange) => void;
}

// Icon components for legend
function ParcelIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" style={{ opacity }}>
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

function BoundaryIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" style={{ opacity }}>
      <path
        d="M2,10 Q4,2 8,6 T14,4"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PointIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ opacity }}>
      <circle cx="7" cy="7" r="5" fill={color} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

function DotIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <div
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: color, opacity }}
    />
  );
}

type IconType = "parcel" | "boundary" | "point" | "dot";

function Toggle({
  active,
  onClick,
  label,
  color,
  icon = "dot",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
  icon?: IconType;
}) {
  const opacity = active ? 1 : 0.3;
  
  const renderIcon = () => {
    switch (icon) {
      case "parcel":
        return <ParcelIcon color={color} opacity={opacity} />;
      case "boundary":
        return <BoundaryIcon color={color} opacity={opacity} />;
      case "point":
        return <PointIcon color={color} opacity={opacity} />;
      default:
        return <DotIcon color={color} opacity={opacity} />;
    }
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full py-2 group"
    >
      <div className="flex items-center gap-2">
        {renderIcon()}
        <span className={`text-sm ${active ? "text-white" : "text-slate-400"}`}>
          {label}
        </span>
      </div>
      <div
        className={`toggle-switch ${active ? "active" : ""}`}
        style={{ transform: "scale(0.8)" }}
      />
    </button>
  );
}

function formatSizeDisplay(sqmt: number): string {
  const acres = sqmt / 4046.86;
  if (acres >= 10) {
    return `${acres.toFixed(0)} ac`;
  } else if (acres >= 1) {
    return `${acres.toFixed(1)} ac`;
  } else if (acres >= 0.01) {
    return `${acres.toFixed(2)} ac`;
  }
  return `${acres.toFixed(3)} ac`;
}

const SQMT_PER_ACRE = 4046.86;

function sqmtToAcres(sqmt: number): number {
  return sqmt / SQMT_PER_ACRE;
}

function acresToSqmt(acres: number): number {
  return acres * SQMT_PER_ACRE;
}

function SizeRangeSlider({
  value,
  bounds,
  onChange,
}: {
  value: SizeRange;
  bounds: SizeRange;
  onChange: (range: SizeRange) => void;
}) {
  // Work in acres (whole numbers for the slider)
  const minAcres = Math.round(sqmtToAcres(value.min));
  const maxAcres = Math.round(sqmtToAcres(value.max));
  const boundsMinAcres = 0;
  const boundsMaxAcres = Math.round(sqmtToAcres(bounds.max));

  // Local state for text inputs to allow typing
  const [minInput, setMinInput] = useState(minAcres.toString());
  const [maxInput, setMaxInput] = useState(maxAcres.toString());

  // Sync local state when external values change (e.g., from slider)
  useEffect(() => {
    setMinInput(minAcres.toString());
  }, [minAcres]);

  useEffect(() => {
    setMaxInput(maxAcres.toString());
  }, [maxAcres]);

  const handleMinAcresChange = (newMinAcres: number) => {
    const clamped = Math.max(boundsMinAcres, Math.min(newMinAcres, maxAcres));
    onChange({ min: acresToSqmt(clamped), max: value.max });
  };

  const handleMaxAcresChange = (newMaxAcres: number) => {
    const clamped = Math.min(boundsMaxAcres, Math.max(newMaxAcres, minAcres));
    onChange({ min: value.min, max: acresToSqmt(clamped) });
  };

  const applyMinInput = () => {
    const num = parseInt(minInput, 10);
    if (!isNaN(num)) {
      handleMinAcresChange(num);
    } else {
      setMinInput(minAcres.toString());
    }
  };

  const applyMaxInput = () => {
    const num = parseInt(maxInput, 10);
    if (!isNaN(num)) {
      handleMaxAcresChange(num);
    } else {
      setMaxInput(maxAcres.toString());
    }
  };

  const minPercent = (minAcres / boundsMaxAcres) * 100;
  const maxPercent = (maxAcres / boundsMaxAcres) * 100;

  return (
    <div className="space-y-4">
      {/* Display current range */}
      <div className="flex justify-between text-xs text-slate-300">
        <span>{minAcres.toLocaleString()} acres</span>
        <span>{maxAcres.toLocaleString()} acres</span>
      </div>

      {/* Dual range slider */}
      <div className="relative h-8 my-2">
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-slate-700 rounded-full" />
        
        {/* Active track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 bg-teal-500 rounded-full pointer-events-none"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />

        {/* Min slider */}
        <input
          type="range"
          min={boundsMinAcres}
          max={boundsMaxAcres}
          value={minAcres}
          onChange={(e) => handleMinAcresChange(Number(e.target.value))}
          className="range-slider"
        />

        {/* Max slider */}
        <input
          type="range"
          min={boundsMinAcres}
          max={boundsMaxAcres}
          value={maxAcres}
          onChange={(e) => handleMaxAcresChange(Number(e.target.value))}
          className="range-slider"
        />

        {/* Min thumb visual */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-teal-500 pointer-events-none"
          style={{ left: `calc(${minPercent}% - 10px)`, zIndex: 10 }}
        />

        {/* Max thumb visual */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-teal-500 pointer-events-none"
          style={{ left: `calc(${maxPercent}% - 10px)`, zIndex: 10 }}
        />
      </div>

      {/* Manual inputs in acres - whole numbers only */}
      <div className="flex gap-2 items-center mt-4">
        <div className="flex-1">
          <label className="text-xs text-slate-500 block mb-1">Min (acres)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={applyMinInput}
            onKeyDown={(e) => e.key === 'Enter' && applyMinInput()}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-teal-500"
          />
        </div>
        <span className="text-slate-500 mt-4">–</span>
        <div className="flex-1">
          <label className="text-xs text-slate-500 block mb-1">Max (acres)</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={applyMaxInput}
            onKeyDown={(e) => e.key === 'Enter' && applyMaxInput()}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Reset button */}
      {(minAcres !== boundsMinAcres || maxAcres !== boundsMaxAcres) && (
        <button
          onClick={() => onChange({ min: bounds.min, max: bounds.max })}
          className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
        >
          Reset to full range
        </button>
      )}
    </div>
  );
}

export default function LayerControls({
  visibleLayers,
  onToggleLayer,
  mapStyle,
  onToggleMapStyle,
  nemOnly,
  onToggleNemOnly,
  ownersOnly,
  onToggleOwnersOnly,
  visibleDivisions,
  onToggleDivision,
  parcelCounts,
  sizeRange,
  sizeBounds,
  onSizeRangeChange,
}: LayerControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="absolute top-4 left-4 z-10 glass-panel min-w-[220px] max-w-[280px] flex flex-col max-h-[calc(100vh-120px)]">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-4 pb-2 hover:bg-white/5 transition-colors rounded-t-xl"
      >
        <h2 className="text-sm font-semibold text-white">Controls</h2>
        <ChevronIcon expanded={isExpanded} />
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Layers
          </h3>
          
          <div className="space-y-1 border-b border-slate-700 pb-3 mb-3">
            <Toggle
              active={visibleLayers.boundary}
              onClick={() => onToggleLayer("boundary")}
              label="Boundary"
              color="#3B82F6"
              icon="boundary"
            />
            <Toggle
              active={visibleLayers.divisions}
              onClick={() => onToggleLayer("divisions")}
              label="Division Borders"
              color="#A5DAF3"
              icon="boundary"
            />
            <div className="pl-5 space-y-1">
              <Toggle
                active={visibleDivisions.CRAIGHEAD}
                onClick={() => onToggleDivision("CRAIGHEAD")}
                label="Craighead"
                color={ELECTORAL_DIVISION_COLORS.CRAIGHEAD}
                icon="parcel"
              />
              <Toggle
                active={visibleDivisions.CHRISTIANA}
                onClick={() => onToggleDivision("CHRISTIANA")}
                label="Christiana"
                color={ELECTORAL_DIVISION_COLORS.CHRISTIANA}
                icon="parcel"
              />
              <Toggle
                active={visibleDivisions.WALDERSTON}
                onClick={() => onToggleDivision("WALDERSTON")}
                label="Walderston"
                color={ELECTORAL_DIVISION_COLORS.WALDERSTON}
                icon="parcel"
              />
            </div>
            <Toggle
              active={visibleLayers.parcels}
              onClick={() => onToggleLayer("parcels")}
              label="Parcels"
              color="#14B8A6"
              icon="parcel"
            />
            <Toggle
              active={visibleLayers.addresses}
              onClick={() => onToggleLayer("addresses")}
              label="Addresses"
              color="#F59E0B"
              icon="point"
            />
          </div>

          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Filters
          </h3>
          
          <div className="space-y-2 border-b border-slate-700 pb-3 mb-3">
            <Toggle
              active={nemOnly}
              onClick={onToggleNemOnly}
              label="NEM Only"
              color="#8B5CF6"
            />
            <Toggle
              active={ownersOnly}
              onClick={onToggleOwnersOnly}
              label="Known Owners"
              color="#10B981"
            />
            {parcelCounts && ownersOnly && (
              <div className="text-xs text-emerald-400/70 pl-5">
                {parcelCounts.withOwners.toLocaleString()} with owner data
              </div>
            )}
          </div>

          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 mt-1">
            Parcel Size
          </h3>
          
          <div className="border-b border-slate-700 pb-4 mb-3 pt-1">
            <SizeRangeSlider
              value={sizeRange}
              bounds={sizeBounds}
              onChange={onSizeRangeChange}
            />
          </div>

          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Map Style
          </h3>
          
          <div className="flex gap-2">
            <button
              onClick={onToggleMapStyle}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                mapStyle === "satellite"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Satellite
            </button>
            <button
              onClick={onToggleMapStyle}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                mapStyle === "streets"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Streets
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
