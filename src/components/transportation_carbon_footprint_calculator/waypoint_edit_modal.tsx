"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Loader2, Wand2 } from "lucide-react";
import type { IWaypoint } from "@/interfaces/logistics";
import { parseWaypointsToCoordinates } from "@/services/route.waypoints.service";
import { useTranslation } from "@/i18n/i18n_context";

export interface IWaypointEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  waypoints: IWaypoint[];
  onConfirm: (waypoints: IWaypoint[]) => void;
  disabled?: boolean;
}

export function WaypointEditModal({
  isOpen,
  onClose,
  waypoints: initialWaypoints,
  onConfirm,
  disabled = false,
}: IWaypointEditModalProps) {
  const [waypoints, setWaypoints] = useState<IWaypoint[]>(
    initialWaypoints || [],
  );
  const [isParsingId, setIsParsingId] = useState<string | null>(null);
  const { t } = useTranslation();

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setWaypoints(initialWaypoints || []);
    }
  }, [isOpen, initialWaypoints]);

  // Debounced auto-parse for multiple waypoints
  React.useEffect(() => {
    if (!isOpen || disabled) return;

    const unparsed = waypoints.filter(
      (w) =>
        w.name.trim() !== "" && (w.lat === undefined || w.lng === undefined),
    );

    if (unparsed.length === 0) return;

    const timer = setTimeout(async () => {
      setIsParsingId("batch");
      try {
        const pendingIds = unparsed.map((w) => w.id);
        const query = unparsed.map((w) => w.name.trim()).join(" | ");
        const results = await parseWaypointsToCoordinates(query);

        if (results && results.length > 0) {
          setWaypoints((prev) => {
            return prev.map((wp) => {
              const pendingIdx = pendingIds.indexOf(wp.id);
              if (pendingIdx !== -1 && pendingIdx < results.length) {
                const match = results[pendingIdx];
                if (wp.lat === undefined || wp.lng === undefined) {
                  return { ...wp, lat: match.lat, lng: match.lng };
                }
              }
              return wp;
            });
          });
        }
      } catch (err) {
        console.error("Batch parse failed", err);
      } finally {
        setIsParsingId(null);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [waypoints, isOpen, disabled]);

  if (!isOpen) return null;

  const handleAdd = () => {
    setWaypoints([
      ...waypoints,
      { id: crypto.randomUUID(), name: "", lat: undefined, lng: undefined },
    ]);
  };

  const handleRemove = (id: string) => {
    setWaypoints(waypoints.filter((w) => w.id !== id));
  };

  const handleUpdate = (
    id: string,
    field: keyof IWaypoint,
    value: string | number | undefined,
  ) => {
    setWaypoints(
      waypoints.map((w) => {
        if (w.id === id) {
          return { ...w, [field]: value };
        }
        return w;
      }),
    );
  };

  const handleAutoParse = async (id: string, name: string) => {
    if (!name.trim()) return;
    setIsParsingId(id);
    try {
      const parsed = await parseWaypointsToCoordinates(name);
      if (parsed && parsed.length > 0) {
        const firstMatch = parsed[0];
        setWaypoints(
          waypoints.map((w) =>
            w.id === id
              ? { ...w, lat: firstMatch.lat, lng: firstMatch.lng }
              : w,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to parse waypoint", err);
    } finally {
      setIsParsingId(null);
    }
  };

  const handleConfirm = () => {
    // Filter out completely empty waypoints
    const cleaned = waypoints.filter((w) => w.name.trim());
    onConfirm(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="text-lg font-bold text-gray-900">
            {t(
              "transportation_carbon_footprint_calculator.mileage_calculator.waypoint_modal_title",
            )}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto p-4">
          {waypoints.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.waypoint_modal_empty",
              )}
            </div>
          ) : (
            waypoints.map((wp, idx) => (
              <div
                key={wp.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">
                    #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemove(wp.id)}
                    disabled={disabled}
                    className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wp.name}
                    onChange={(e) =>
                      handleUpdate(wp.id, "name", e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleAutoParse(wp.id, wp.name);
                      }
                    }}
                    placeholder={t(
                      "transportation_carbon_footprint_calculator.mileage_calculator.waypoint_modal_placeholder",
                    )}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                    disabled={disabled}
                  />
                  <button
                    onClick={() => handleAutoParse(wp.id, wp.name)}
                    disabled={
                      !wp.name.trim() ||
                      isParsingId === wp.id ||
                      isParsingId === "batch" ||
                      disabled
                    }
                    className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                    title={t(
                      "transportation_carbon_footprint_calculator.mileage_calculator.waypoint_modal_auto_parse",
                    )}
                  >
                    {isParsingId === wp.id ||
                    (isParsingId === "batch" &&
                      (wp.lat === undefined || wp.lng === undefined)) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline">
                      {t(
                        "transportation_carbon_footprint_calculator.mileage_calculator.waypoint_modal_auto_parse_short",
                      )}
                    </span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">
                      {t(
                        "transportation_carbon_footprint_calculator.mileage_calculator.waypoint_modal_lat",
                      )}
                      <input
                        type="number"
                        value={wp.lat ?? ""}
                        onChange={(e) =>
                          handleUpdate(
                            wp.id,
                            "lat",
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        placeholder="e.g. 1.290"
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                        disabled={disabled}
                      />
                    </label>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">
                      {t(
                        "transportation_carbon_footprint_calculator.mileage_calculator.waypoint_modal_lng",
                      )}
                      <input
                        type="number"
                        value={wp.lng ?? ""}
                        onChange={(e) =>
                          handleUpdate(
                            wp.id,
                            "lng",
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        placeholder="e.g. 103.850"
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                        disabled={disabled}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))
          )}

          <button
            onClick={handleAdd}
            disabled={disabled}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t(
              "transportation_carbon_footprint_calculator.mileage_calculator.waypoint_modal_add",
            )}
          </button>
        </div>

        <div className="border-t border-gray-100 p-4">
          <button
            onClick={handleConfirm}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {t(
              "transportation_carbon_footprint_calculator.mileage_calculator.waypoint_modal_confirm",
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
