"use client";

import type { ParcelProperties } from "@/lib/data/parcels";
import type { Address } from "@/lib/data/addresses";
import type { Owner } from "@/lib/data/owners";
import { formatParcelSize } from "@/lib/data/parcels";

interface DetailsPanelProps {
  parcel: ParcelProperties | null;
  linkedAddress: Address | null;
  owner: Owner | null;
  onClose: () => void;
}

function PropertyRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="py-2 border-b border-slate-700/50 last:border-0">
      <dt className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm text-white">{value}</dd>
    </div>
  );
}

export default function DetailsPanel({
  parcel,
  linkedAddress,
  owner,
  onClose,
}: DetailsPanelProps) {
  if (!parcel) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 z-20 md:hidden"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm z-30 glass-panel rounded-none md:rounded-l-xl overflow-hidden flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Parcel Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Primary Info */}
          <div className="mb-6">
            <h3 className="text-teal-400 font-semibold text-lg mb-2">
              {parcel.SCHEME_ADD || parcel.STREET_ADD || `Parcel ${parcel.PID}`}
            </h3>
            {parcel.LOCATION && (
              <p className="text-slate-300 text-sm">{parcel.LOCATION}</p>
            )}
          </div>

          {/* Parcel Properties */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Parcel Information
            </h4>
            <dl className="glass-panel p-3 rounded-lg">
              <PropertyRow label="Parcel ID" value={parcel.PID} />
              <PropertyRow label="LV Number" value={parcel.LV_NUMBER} />
              <PropertyRow label="Volume/Folio" value={parcel.VOL_FOL} />
              <PropertyRow label="Size" value={formatParcelSize(parcel.SIZE_SQMT)} />
              <PropertyRow label="Street Address" value={parcel.STREET_ADD} />
              <PropertyRow label="Scheme Address" value={parcel.SCHEME_ADD} />
              <PropertyRow label="Full Address" value={parcel.FULLADDRES} />
              <PropertyRow label="Parish" value={parcel.PARISH} />
            </dl>
          </div>

          {/* Owner Information - At Top */}
          {owner ? (
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Owner Information
              </h4>
              <dl className="glass-panel p-3 rounded-lg border border-emerald-500/30">
                <PropertyRow label="Owner Name" value={owner.ownerName} />
                <PropertyRow label="Land Value" value={owner.landValue} />
                <PropertyRow label="Valuation Number" value={owner.valuationNumber} />
              </dl>
            </div>
          ) : parcel.LV_NUMBER ? (
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Owner Information
              </h4>
              <div className="glass-panel p-3 rounded-lg text-sm text-slate-400 italic">
                No owner record found for LV: {parcel.LV_NUMBER}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Owner Information
              </h4>
              <div className="glass-panel p-4 rounded-lg border border-dashed border-slate-600 text-center">
                <div className="text-slate-500 text-sm">
                  <svg
                    className="w-8 h-8 mx-auto mb-2 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  No LV number available
                </div>
              </div>
            </div>
          )}

          {/* Linked Address Data - Below Owner */}
          {linkedAddress ? (
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Linked Address Record
              </h4>
              <dl className="glass-panel p-3 rounded-lg border border-teal-500/30">
                <PropertyRow label="Land Valuation" value={linkedAddress.landValuation} />
                <PropertyRow label="Title Reference" value={linkedAddress.titleReference} />
                <PropertyRow label="Street Address" value={linkedAddress.streetAddress} />
                <PropertyRow label="Scheme Address" value={linkedAddress.schemeAddress} />
                <PropertyRow label="Full Address" value={linkedAddress.fullAddress} />
                <PropertyRow label="Location" value={linkedAddress.location} />
              </dl>
            </div>
          ) : parcel.LV_NUMBER ? (
            <div className="mb-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Linked Address Record
              </h4>
              <div className="glass-panel p-3 rounded-lg text-sm text-slate-400 italic">
                No matching address record found for LV: {parcel.LV_NUMBER}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
          Object ID: {parcel.OBJECTID}
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
