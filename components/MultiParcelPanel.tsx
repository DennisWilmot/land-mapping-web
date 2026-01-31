"use client";

import type { ParcelProperties } from "@/lib/data/parcels";
import type { Owner } from "@/lib/data/owners";
import type { SelectedParcel } from "./MapView";

interface MultiParcelPanelProps {
  selectedParcels: SelectedParcel[];
  ownerLookup: Map<string, Owner>;
  onRemoveParcel: (objectId: number) => void;
  onClearAll: () => void;
}

function formatAcres(sqmt: number | undefined): string {
  if (!sqmt || isNaN(sqmt)) return "N/A";
  const acres = sqmt / 4046.86;
  if (acres >= 10) return `${acres.toFixed(0)} ac`;
  if (acres >= 1) return `${acres.toFixed(1)} ac`;
  return `${acres.toFixed(2)} ac`;
}

function ParcelCard({
  selected,
  owner,
  onRemove,
}: {
  selected: SelectedParcel;
  owner: Owner | null;
  onRemove: () => void;
}) {
  const { properties: parcel, selectionOrder } = selected;

  return (
    <div className="glass-panel rounded-lg p-3 border border-slate-700/50 hover:border-cyan-500/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Selection Number Badge */}
        <div className="flex-shrink-0 w-7 h-7 bg-cyan-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
          {selectionOrder}
        </div>

        {/* Parcel Info */}
        <div className="flex-1 min-w-0">
          {/* PID */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">PID</span>
            <span className="text-sm text-white font-medium">{parcel.PID || "—"}</span>
          </div>

          {/* Owner */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Owner</span>
            <span className="text-sm text-white truncate max-w-[140px]">
              {owner?.ownerName || "Unknown"}
            </span>
          </div>

          {/* LV Number */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">LV #</span>
            <span className="text-sm text-slate-300">{parcel.LV_NUMBER || "—"}</span>
          </div>

          {/* Volume/Folio */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Vol/Folio</span>
            <span className="text-sm text-slate-300">{parcel.VOL_FOL || "—"}</span>
          </div>

          {/* Size */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Size</span>
            <span className="text-sm text-teal-400 font-medium">
              {formatAcres(parcel.SIZE_SQMT)}
            </span>
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1 hover:bg-slate-700 rounded transition-colors group"
          title="Remove from selection"
        >
          <svg
            className="w-4 h-4 text-slate-500 group-hover:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function MultiParcelPanel({
  selectedParcels,
  ownerLookup,
  onRemoveParcel,
  onClearAll,
}: MultiParcelPanelProps) {
  if (selectedParcels.length < 2) return null;

  // Calculate totals
  const totalAcres = selectedParcels.reduce((sum, p) => {
    const sqmt = p.properties.SIZE_SQMT;
    return sum + (sqmt && !isNaN(sqmt) ? sqmt / 4046.86 : 0);
  }, 0);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="absolute inset-0 bg-black/30 z-20 md:hidden"
        onClick={onClearAll}
      />

      {/* Panel */}
      <div className="absolute right-4 top-4 w-full max-w-sm z-30 glass-panel rounded-xl overflow-hidden flex flex-col animate-slide-in max-h-[calc(100vh-100px)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Multi-Parcel Selection</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedParcels.length} parcels · {totalAcres.toFixed(1)} acres total
            </p>
          </div>
          <button
            onClick={onClearAll}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Scrollable Parcel List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {selectedParcels.map((selected) => (
            <ParcelCard
              key={selected.properties.OBJECTID}
              selected={selected}
              owner={
                selected.properties.LV_NUMBER
                  ? ownerLookup.get(selected.properties.LV_NUMBER) || null
                  : null
              }
              onRemove={() => onRemoveParcel(selected.properties.OBJECTID)}
            />
          ))}
        </div>

        {/* Footer Hint */}
        <div className="p-3 border-t border-slate-700 text-center">
          <p className="text-xs text-slate-500">
            Hold <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">⌘/Ctrl</kbd> + Click to add more
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
