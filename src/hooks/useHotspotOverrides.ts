import { useState, useEffect, useCallback } from "react";
import { Hotspot } from "@/engine";
import { isSafeIdentifierKey, safeJsonParse } from "@/engine/security";

const STORAGE_KEY = "hotspot_debug_overrides";

export interface HotspotOverride {
  x: number;
  y: number;
  width: number;
  height: number;
}

type HotspotOverrides = Record<string, Record<string, HotspotOverride>>;

function sanitizeOverrides(raw: unknown): HotspotOverrides {
  if (!raw || typeof raw !== "object") return {};
  const out: HotspotOverrides = {};
  for (const [loc, map] of Object.entries(raw as HotspotOverrides)) {
    if (!isSafeIdentifierKey(loc) || !map || typeof map !== "object") continue;
    const room: Record<string, HotspotOverride> = {};
    for (const [hid, o] of Object.entries(map)) {
      if (!isSafeIdentifierKey(hid) || !o || typeof o !== "object") continue;
      const x = Number(o.x);
      const y = Number(o.y);
      const width = Number(o.width);
      const height = Number(o.height);
      if (![x, y, width, height].every(Number.isFinite)) continue;
      room[hid] = {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        width: Math.max(0.5, Math.min(100, width)),
        height: Math.max(0.5, Math.min(100, height)),
      };
    }
    out[loc] = room;
  }
  return out;
}

export const useHotspotOverrides = (locationId: string) => {
  const [overrides, setOverrides] = useState<HotspotOverrides>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? sanitizeOverrides(safeJsonParse(stored)) : {};
    } catch {
      return {};
    }
  });

  // Save to localStorage whenever overrides change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides]);

  const getOverride = useCallback((hotspotId: string): HotspotOverride | undefined => {
    return overrides[locationId]?.[hotspotId];
  }, [overrides, locationId]);

  const setOverride = useCallback((hotspotId: string, override: Partial<HotspotOverride>) => {
    setOverrides(prev => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        [hotspotId]: {
          ...prev[locationId]?.[hotspotId],
          ...override,
        } as HotspotOverride,
      },
    }));
  }, [locationId]);

  const clearOverride = useCallback((hotspotId: string) => {
    setOverrides(prev => {
      const newLocationOverrides = { ...prev[locationId] };
      delete newLocationOverrides[hotspotId];
      return {
        ...prev,
        [locationId]: newLocationOverrides,
      };
    });
  }, [locationId]);

  const clearAllOverrides = useCallback(() => {
    setOverrides({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearLocationOverrides = useCallback(() => {
    setOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[locationId];
      return newOverrides;
    });
  }, [locationId]);

  const applyOverrides = useCallback((hotspots: Hotspot[]): Hotspot[] => {
    return hotspots.map(hotspot => {
      const override = getOverride(hotspot.id);
      if (override) {
        return {
          ...hotspot,
          x: override.x,
          y: override.y,
          width: override.width,
          height: override.height,
        };
      }
      return hotspot;
    });
  }, [getOverride]);

  const getModifiedCount = useCallback((): number => {
    return Object.keys(overrides[locationId] || {}).length;
  }, [overrides, locationId]);

  const getTotalModifiedCount = useCallback((): number => {
    return Object.values(overrides).reduce((sum, loc) => sum + Object.keys(loc).length, 0);
  }, [overrides]);

  return {
    overrides,
    getOverride,
    setOverride,
    clearOverride,
    clearAllOverrides,
    clearLocationOverrides,
    applyOverrides,
    getModifiedCount,
    getTotalModifiedCount,
  };
};
