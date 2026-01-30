"use client";

import type { MapStyle } from "./MapView";
import type { DivisionName } from "@/lib/geo/electoral-divisions";
import { ELECTORAL_DIVISION_COLORS } from "@/lib/geo/electoral-divisions";

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

function Toggle({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full py-2 group"
    >
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
        />
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
  if (acres >= 1) {
    return `${acres.toFixed(1)} ac`;
  } else if (sqmt >= 1000) {
    return `${(sqmt / 1000).toFixed(1)}k m²`;
  }
  return `${Math.round(sqmt)} m²`;
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
  const handleMinChange = (newMin: number) => {
    onChange({ min: Math.min(newMin, value.max), max: value.max });
  };

  const handleMaxChange = (newMax: number) => {
    onChange({ min: value.min, max: Math.max(newMax, value.min) });
  };

  const minPercent = ((value.min - bounds.min) / (bounds.max - bounds.min)) * 100;
  const maxPercent = ((value.max - bounds.min) / (bounds.max - bounds.min)) * 100;

  return (
    <div className="space-y-3">
      {/* Display current range */}
      <div className="flex justify-between text-xs text-slate-300">
        <span>{formatSizeDisplay(value.min)}</span>
        <span>{formatSizeDisplay(value.max)}</span>
      </div>

      {/* Dual range slider */}
      <div className="relative h-6">
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-slate-700 rounded-full" />
        
        {/* Active track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-teal-500 rounded-full"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />

        {/* Min slider */}
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          value={value.min}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          style={{ pointerEvents: "auto" }}
        />

        {/* Max slider */}
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          value={value.max}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          style={{ pointerEvents: "auto" }}
        />

        {/* Min thumb visual */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-teal-500 pointer-events-none z-10"
          style={{ left: `calc(${minPercent}% - 8px)` }}
        />

        {/* Max thumb visual */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-teal-500 pointer-events-none z-10"
          style={{ left: `calc(${maxPercent}% - 8px)` }}
        />
      </div>

      {/* Manual inputs */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="text-xs text-slate-500 block mb-1">Min (m²)</label>
          <input
            type="number"
            value={value.min}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            min={bounds.min}
            max={bounds.max}
            className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-teal-500"
          />
        </div>
        <span className="text-slate-500 mt-4">–</span>
        <div className="flex-1">
          <label className="text-xs text-slate-500 block mb-1">Max (m²)</label>
          <input
            type="number"
            value={value.max === Infinity ? bounds.max : value.max}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            min={bounds.min}
            max={bounds.max}
            className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Reset button */}
      {(value.min !== bounds.min || value.max !== bounds.max) && (
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
  return (
    <div className="absolute top-4 left-4 z-10 glass-panel p-4 min-w-[200px]">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Layers
      </h3>
      
      <div className="space-y-1 border-b border-slate-700 pb-3 mb-3">
        <Toggle
          active={visibleLayers.boundary}
          onClick={() => onToggleLayer("boundary")}
          label="Boundary"
          color="#3B82F6"
        />
        <Toggle
          active={visibleLayers.divisions}
          onClick={() => onToggleLayer("divisions")}
          label="Division Borders"
          color="#A5DAF3"
        />
        <div className="pl-5 space-y-1">
          <Toggle
            active={visibleDivisions.CRAIGHEAD}
            onClick={() => onToggleDivision("CRAIGHEAD")}
            label="Craighead"
            color={ELECTORAL_DIVISION_COLORS.CRAIGHEAD}
          />
          <Toggle
            active={visibleDivisions.CHRISTIANA}
            onClick={() => onToggleDivision("CHRISTIANA")}
            label="Christiana"
            color={ELECTORAL_DIVISION_COLORS.CHRISTIANA}
          />
          <Toggle
            active={visibleDivisions.WALDERSTON}
            onClick={() => onToggleDivision("WALDERSTON")}
            label="Walderston"
            color={ELECTORAL_DIVISION_COLORS.WALDERSTON}
          />
        </div>
        <Toggle
          active={visibleLayers.parcels}
          onClick={() => onToggleLayer("parcels")}
          label="Parcels"
          color="#14B8A6"
        />
        <Toggle
          active={visibleLayers.addresses}
          onClick={() => onToggleLayer("addresses")}
          label="Addresses"
          color="#F59E0B"
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
        {parcelCounts && (
          <div className="text-xs text-slate-500 pl-5">
            <span>{parcelCounts.displayed.toLocaleString()} parcels shown</span>
            {ownersOnly && (
              <span className="block text-emerald-400/70">
                {parcelCounts.withOwners.toLocaleString()} with owner data
              </span>
            )}
          </div>
        )}
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Parcel Size
      </h3>
      
      <div className="border-b border-slate-700 pb-3 mb-3">
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
  );
}
