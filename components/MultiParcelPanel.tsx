"use client";

import { useState, useCallback } from "react";
import type { ParcelProperties } from "@/lib/data/parcels";
import type { Owner } from "@/lib/data/owners";
import type { SelectedParcel } from "./MapView";

interface MultiParcelPanelProps {
  selectedParcels: SelectedParcel[];
  ownerLookup: Map<string, Owner>;
  onRemoveParcel: (objectId: number) => void;
  onClearAll: () => void;
}

// Clipboard icon component
function ClipboardIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  );
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
  const [copied, setCopied] = useState(false);

  // Calculate totals
  const totalAcres = selectedParcels.reduce((sum, p) => {
    const sqmt = p.properties.SIZE_SQMT;
    return sum + (sqmt && !isNaN(sqmt) ? sqmt / 4046.86 : 0);
  }, 0);

  // Format acres for copy
  const formatAcresValue = (sqmt: number | undefined): string => {
    if (!sqmt || isNaN(sqmt)) return "N/A";
    const acres = sqmt / 4046.86;
    return acres.toFixed(2);
  };

  // Generate copy formats
  const generateCopyData = useCallback(() => {
    const parcels = selectedParcels.map((selected) => {
      const parcel = selected.properties;
      const owner = parcel.LV_NUMBER ? ownerLookup.get(parcel.LV_NUMBER) : null;
      return {
        order: selected.selectionOrder,
        pid: parcel.PID || "—",
        owner: owner?.ownerName || "Unknown",
        lvNumber: parcel.LV_NUMBER || "—",
        volFolio: parcel.VOL_FOL || "—",
        sizeAcres: formatAcresValue(parcel.SIZE_SQMT),
      };
    });

    // Plain text format
    const plainText = `Multi-Parcel Selection (${selectedParcels.length} parcels, ${totalAcres.toFixed(1)} acres total)\n\n` +
      parcels.map(p => 
        `${p.order}. PID: ${p.pid}\n   Owner: ${p.owner}\n   LV #: ${p.lvNumber}\n   Vol/Folio: ${p.volFolio}\n   Size: ${p.sizeAcres} ac`
      ).join('\n\n');

    // TSV format (for spreadsheets)
    const tsvHeader = "#\tPID\tOwner\tLV #\tVol/Folio\tSize (ac)";
    const tsvRows = parcels.map(p => 
      `${p.order}\t${p.pid}\t${p.owner}\t${p.lvNumber}\t${p.volFolio}\t${p.sizeAcres}`
    ).join('\n');
    const tsvText = `${tsvHeader}\n${tsvRows}`;

    // HTML table format
    const htmlTable = `
      <table style="border-collapse: collapse; font-family: Arial, sans-serif;">
        <caption style="font-weight: bold; margin-bottom: 8px; text-align: left;">
          Multi-Parcel Selection (${selectedParcels.length} parcels, ${totalAcres.toFixed(1)} acres total)
        </caption>
        <thead>
          <tr style="background-color: #1e293b; color: white;">
            <th style="border: 1px solid #334155; padding: 8px;">#</th>
            <th style="border: 1px solid #334155; padding: 8px;">PID</th>
            <th style="border: 1px solid #334155; padding: 8px;">Owner</th>
            <th style="border: 1px solid #334155; padding: 8px;">LV #</th>
            <th style="border: 1px solid #334155; padding: 8px;">Vol/Folio</th>
            <th style="border: 1px solid #334155; padding: 8px;">Size (ac)</th>
          </tr>
        </thead>
        <tbody>
          ${parcels.map((p, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#f8fafc' : '#e2e8f0'};">
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${p.order}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">${p.pid}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">${p.owner}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">${p.lvNumber}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">${p.volFolio}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">${p.sizeAcres}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background-color: #0d9488; color: white; font-weight: bold;">
            <td colspan="5" style="border: 1px solid #334155; padding: 8px;">Total</td>
            <td style="border: 1px solid #334155; padding: 8px; text-align: right;">${totalAcres.toFixed(2)} ac</td>
          </tr>
        </tfoot>
      </table>
    `;

    return { plainText, tsvText, htmlTable };
  }, [selectedParcels, ownerLookup, totalAcres]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const { plainText, htmlTable } = generateCopyData();

    try {
      // Try to write with multiple formats (rich text support)
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([htmlTable], { type: 'text/html' }),
          })
        ]);
      } else {
        // Fallback to plain text only
        await navigator.clipboard.writeText(plainText);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Final fallback
      try {
        await navigator.clipboard.writeText(plainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  }, [generateCopyData]);

  if (selectedParcels.length < 2) return null;

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
                copied 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
              title="Copy all parcel data to clipboard"
            >
              <ClipboardIcon copied={copied} />
              {copied ? 'Copied!' : 'Copy All'}
            </button>
            <button
              onClick={onClearAll}
              className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
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
