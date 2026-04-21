"use client";

import { useState, useCallback } from "react";
import { ComposableMap, Geographies, Geography, type Geography as GeoFeature } from "react-simple-maps";

// 2-digit state FIPS → state name
const STATE_FIPS: Record<string, string> = {
  "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas",
  "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware",
  "11": "District of Columbia", "12": "Florida", "13": "Georgia", "15": "Hawaii",
  "16": "Idaho", "17": "Illinois", "18": "Indiana", "19": "Iowa",
  "20": "Kansas", "21": "Kentucky", "22": "Louisiana", "23": "Maine",
  "24": "Maryland", "25": "Massachusetts", "26": "Michigan", "27": "Minnesota",
  "28": "Mississippi", "29": "Missouri", "30": "Montana", "31": "Nebraska",
  "32": "Nevada", "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico",
  "36": "New York", "37": "North Carolina", "38": "North Dakota", "39": "Ohio",
  "40": "Oklahoma", "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island",
  "45": "South Carolina", "46": "South Dakota", "47": "Tennessee", "48": "Texas",
  "49": "Utah", "50": "Vermont", "51": "Virginia", "53": "Washington",
  "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming",
};

const STATE_ABBR: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
  "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME",
  "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
  "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE",
  "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
  "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
  "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
  "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
};

const COUNTIES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";
const STATES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export interface CountyInfo {
  name: string;
  stateName: string;
  stateAbbr: string;
  fips: string;
}

interface Props {
  onCountySelect: (county: CountyInfo) => void;
  selectedFips?: string;
  loading?: boolean;
}

interface TooltipState {
  name: string;
  state: string;
  x: number;
  y: number;
}

export function USCountyMap({ onCountySelect, selectedFips, loading }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleClick = useCallback(
    (geo: GeoFeature) => {
      if (loading) return;
      const fips = String(geo.id).padStart(5, "0");
      const stateFips = fips.slice(0, 2);
      const stateName = STATE_FIPS[stateFips] ?? "Unknown State";
      const stateAbbr = STATE_ABBR[stateName] ?? stateFips;
      onCountySelect({ name: String(geo.properties.name ?? ""), stateName, stateAbbr, fips });
    },
    [loading, onCountySelect]
  );

  const handleMouseEnter = useCallback(
    (geo: GeoFeature, evt: React.MouseEvent) => {
      const fips = String(geo.id).padStart(5, "0");
      const stateFips = fips.slice(0, 2);
      const stateName = STATE_FIPS[stateFips] ?? "";
      setTooltip({ name: String(geo.properties.name ?? ""), state: stateName, x: evt.clientX, y: evt.clientY });
    },
    []
  );

  return (
    <div className="relative w-full bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden select-none">
      {/* Map */}
      <ComposableMap
        projection="geoAlbersUsa"
        width={975}
        height={610}
        style={{ width: "100%", height: "auto" }}
      >
        {/* County fills */}
        <Geographies geography={COUNTIES_URL}>
          {({ geographies }) =>
            geographies.map((geo: GeoFeature) => {
              const fips = String(geo.id).padStart(5, "0");
              const isSelected = fips === selectedFips;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => handleClick(geo)}
                  onMouseEnter={(evt) => handleMouseEnter(geo, evt)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: {
                      fill: isSelected ? "#2563eb" : "#1e293b",
                      stroke: "#0f172a",
                      strokeWidth: 0.3,
                      outline: "none",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "fill 0.1s",
                    },
                    hover: {
                      fill: isSelected ? "#1d4ed8" : "#334155",
                      stroke: "#475569",
                      strokeWidth: 0.5,
                      outline: "none",
                      cursor: loading ? "not-allowed" : "pointer",
                    },
                    pressed: {
                      fill: "#1e40af",
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>

        {/* State boundary overlay */}
        <Geographies geography={STATES_URL}>
          {({ geographies }) =>
            geographies.map((geo: GeoFeature) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: { fill: "none", stroke: "#475569", strokeWidth: 0.8, outline: "none", pointerEvents: "none" },
                  hover:   { fill: "none", stroke: "#475569", strokeWidth: 0.8, outline: "none" },
                  pressed: { fill: "none", outline: "none" },
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-700 border border-slate-600 inline-block" />
          Click a county to analyze
        </span>
        {selectedFips && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
            Selected
          </span>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-5 py-3">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-slate-300 text-sm">Investigating data systems...</span>
          </div>
        </div>
      )}

      {/* Tooltip (fixed, follows cursor) */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl"
          style={{ left: tooltip.x + 14, top: tooltip.y - 48 }}
        >
          <p className="font-semibold text-white text-sm leading-tight">
            {tooltip.name} County
          </p>
          <p className="text-slate-400 text-xs mt-0.5">{tooltip.state}</p>
        </div>
      )}
    </div>
  );
}
