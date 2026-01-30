"use client";

import type { MapStyle } from "./MapView";

interface LayerControlsProps {
  visibleLayers: {
    boundary: boolean;
    parcels: boolean;
    addresses: boolean;
  };
  onToggleLayer: (layer: "boundary" | "parcels" | "addresses") => void;
  mapStyle: MapStyle;
  onToggleMapStyle: () => void;
  nemOnly: boolean;
  onToggleNemOnly: () => void;
  parcelCounts?: { total: number; nem: number };
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

export default function LayerControls({
  visibleLayers,
  onToggleLayer,
  mapStyle,
  onToggleMapStyle,
  nemOnly,
  onToggleNemOnly,
  parcelCounts,
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
        Constituencies
      </h3>
      
      <div className="space-y-2 border-b border-slate-700 pb-3 mb-3">
        <Toggle
          active={nemOnly}
          onClick={onToggleNemOnly}
          label="NEM"
          color="#8B5CF6"
        />
        {parcelCounts && (
          <div className="text-xs text-slate-500 pl-5">
            {nemOnly ? (
              <span>{parcelCounts.nem.toLocaleString()} parcels in NEM</span>
            ) : (
              <span>{parcelCounts.total.toLocaleString()} total parcels</span>
            )}
          </div>
        )}
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
