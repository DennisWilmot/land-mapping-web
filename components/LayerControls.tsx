"use client";

import { useState, useEffect, useRef } from "react";
import type { MapStyle } from "./MapView";
import type { DivisionName } from "@/lib/geo/electoral-divisions";
import { ELECTORAL_DIVISION_COLORS } from "@/lib/geo/electoral-divisions";
import type { SavedProject } from "@/lib/types/project";

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
    starlink: boolean;
    roads: boolean;
    water: boolean;
  };
  onToggleLayer: (layer: "boundary" | "divisions" | "parcels" | "addresses" | "starlink" | "roads" | "water") => void;
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
  // Projects
  savedProjects: SavedProject[];
  activeProjectId: string | null;
  onLoadProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
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

function SatelliteIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ opacity }}>
      {/* Satellite body */}
      <rect x="5" y="5" width="6" height="6" rx="1" fill={color} />
      {/* Solar panels */}
      <rect x="1" y="6.5" width="3" height="3" fill={color} fillOpacity={0.7} />
      <rect x="12" y="6.5" width="3" height="3" fill={color} fillOpacity={0.7} />
      {/* Signal waves */}
      <path d="M11 2 Q14 5 11 8" fill="none" stroke={color} strokeWidth="1" strokeOpacity={0.5} />
      <path d="M12.5 1 Q16 5 12.5 9" fill="none" stroke={color} strokeWidth="1" strokeOpacity={0.3} />
    </svg>
  );
}

function RoadIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" style={{ opacity }}>
      {/* Road surface */}
      <path d="M0,12 L4,2 L12,2 L16,12 Z" fill={color} fillOpacity={0.3} />
      {/* Center dashed line */}
      <path d="M8,3 L8,5 M8,7 L8,9 M8,11 L8,12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Road edges */}
      <path d="M4,2 L2,12" stroke={color} strokeWidth="1.5" />
      <path d="M12,2 L14,12" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function WaterIcon({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" style={{ opacity }}>
      {/* Water waves */}
      <path d="M1,5 Q4,2 7,5 T13,5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M1,9 Q4,6 7,9 T13,9" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity={0.6} />
    </svg>
  );
}

type IconType = "parcel" | "boundary" | "point" | "dot" | "satellite" | "road" | "water";

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
      case "satellite":
        return <SatelliteIcon color={color} opacity={opacity} />;
      case "road":
        return <RoadIcon color={color} opacity={opacity} />;
      case "water":
        return <WaterIcon color={color} opacity={opacity} />;
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

// Format date for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Project Item Component
function ProjectItem({
  project,
  isActive,
  onLoad,
  onRename,
  onDelete,
}: {
  project: SavedProject;
  isActive: boolean;
  onLoad: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveRename = () => {
    if (editName.trim() && editName.trim() !== project.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`group rounded-lg p-2.5 transition-all cursor-pointer ${
        isActive
          ? "bg-purple-600/20 border border-purple-500/50"
          : "bg-slate-800/50 border border-transparent hover:bg-slate-700/50 hover:border-slate-600"
      }`}
      onClick={() => !isEditing && onLoad()}
    >
      {isEditing ? (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename();
              if (e.key === "Escape") {
                setEditName(project.name);
                setIsEditing(false);
              }
            }}
            onBlur={handleSaveRename}
            className="flex-1 px-2 py-1 text-sm bg-slate-900 border border-purple-500 rounded text-white focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
              )}
              <span className="text-sm text-white font-medium truncate">
                {project.name}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {project.parcelIds.length} parcels · {formatDate(project.updatedAt)}
            </div>
          </div>
          
          {/* Action buttons - show on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 hover:bg-slate-600 rounded transition-colors"
              title="Rename"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete project "${project.name}"?`)) {
                  onDelete();
                }
              }}
              className="p-1 hover:bg-red-600/20 rounded transition-colors"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Folder/Bookmark icon for saved selections
function BookmarkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
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
  savedProjects,
  activeProjectId,
  onLoadProject,
  onRenameProject,
  onDeleteProject,
}: LayerControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

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
            <Toggle
              active={visibleLayers.starlink}
              onClick={() => onToggleLayer("starlink")}
              label="Starlink Sites"
              color="#00BCD4"
              icon="satellite"
            />
            <Toggle
              active={visibleLayers.roads}
              onClick={() => onToggleLayer("roads")}
              label="Roads"
              color="#757575"
              icon="road"
            />
            <Toggle
              active={visibleLayers.water}
              onClick={() => onToggleLayer("water")}
              label="Water"
              color="#2196F3"
              icon="water"
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
          
          <div className="flex gap-2 border-b border-slate-700 pb-4 mb-3">
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

          {/* Projects Section */}
          <div>
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center justify-between w-full mb-3 group"
            >
              <div className="flex items-center gap-2">
                <BookmarkIcon />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-300">
                  Projects
                </h3>
                {savedProjects.length > 0 && (
                  <span className="text-xs text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded">
                    {savedProjects.length}
                  </span>
                )}
              </div>
              <ChevronIcon expanded={projectsExpanded} />
            </button>

            {projectsExpanded && (
              <div className="space-y-2">
                {savedProjects.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4 px-2 bg-slate-800/30 rounded-lg">
                    <p>No projects yet</p>
                    <p className="mt-1 text-slate-600">
                      Select parcels and click "Save Project" to create one
                    </p>
                  </div>
                ) : (
                  savedProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={activeProjectId === project.id}
                      onLoad={() => onLoadProject(project.id)}
                      onRename={(name) => onRenameProject(project.id, name)}
                      onDelete={() => onDeleteProject(project.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
