"use client";

import { useState, useEffect } from "react";
import * as xlsx from "xlsx";
import {
  Loader2,
  Plus,
  Trash2,
  Route,
  Send,
  FileText,
  UploadCloud,
  Settings,
} from "lucide-react";
import React from "react";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";
import ConfirmModal from "@/components/common/confirm_modal";
import PaymentConfirmModal from "@/components/common/payment_confirm_modal";
import {
  useOrderTransaction,
  IOrderPayload,
} from "@/hooks/use_order_transaction";
import {
  ANALYSIS_CATEGORY,
  MILEAGE_ACTION,
  type MileageAction,
} from "@/constants/analysis";
import { parseMultipleRoutesFromText } from "@/services/route.smart.service";
import { ORDER_TYPE, ORDER_STATUS } from "@/constants/status";
import { ANALYSIS_BASE_COSTS } from "@/constants/price";

export interface IMileageItem {
  id: string;
  origin: string;
  dest: string;
  waypoints?: string;
  distanceKm?: number;
  landDistanceKm?: number;
  seaDistanceKm?: number;
  airDistanceKm?: number;
  routeGeometry?: string;
  originLat?: number | string;
  originLng?: number | string;
  destLat?: number | string;
  destLng?: number | string;
  weightKg?: number | string;
  loading?: boolean;
  error?: string;
  success?: boolean;
}

interface IMileageCalculatorProps {
  onNavigateToHistory?: () => void;
}

export function MileageCalculator({
  onNavigateToHistory = () => {},
}: IMileageCalculatorProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<IMileageItem[]>([]);
  const [aiText, setAiText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [newRouteDesc, setNewRouteDesc] = useState("");
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [newWaypoints, setNewWaypoints] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentOrderPayload, setCurrentOrderPayload] =
    useState<IOrderPayload | null>(null);
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);
  const [pollingAction, setPollingAction] = useState<MileageAction | null>(
    null,
  );
  const {
    workflowStatus,
    errorMessage,
    txHash,
    resetTransaction,
    executeOrderTransaction,
  } = useOrderTransaction();

  // Info: (20260510 - Luphia) Polling logic
  useEffect(() => {
    if (!pollingOrderId) return;

    let timeoutId: NodeJS.Timeout;

    const pollResult = async () => {
      try {
        const res = await request<{ payload: Array<Record<string, unknown>> }>(
          `/api/v1/user/analysis?category=${ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT}`,
        );
        if (res?.payload) {
          const orderHistory = res.payload.find(
            (item) =>
              item.reportId === pollingOrderId || item.id === pollingOrderId,
          );
          if (orderHistory && orderHistory.status === ORDER_STATUS.COMPLETED) {
            // Info: (20260510 - Luphia) Processing completed
            setPollingOrderId(null);

            // Info: (20260510 - Luphia) Retrieve data
            const resultData = orderHistory.result || orderHistory.data;

            if (pollingAction === MILEAGE_ACTION.CALCULATE_BATCH) {
              if (Array.isArray(resultData)) {
                setItems((prev) =>
                  prev.map((item) => {
                    if (item.success) return item;
                    const updated = resultData.find(
                      (r: Record<string, unknown>) =>
                        r.origin === item.origin && r.dest === item.dest,
                    ) as Partial<IMileageItem>;
                    return updated
                      ? { ...item, ...updated, success: true, loading: false }
                      : { ...item, loading: false };
                  }),
                );
              }
              setIsCalculating(false);
              if (onNavigateToHistory) {
                onNavigateToHistory();
              }
            }
            return;
          } else if (
            orderHistory &&
            (orderHistory.status === ORDER_STATUS.FAILED ||
              orderHistory.status === ORDER_STATUS.CANCEL)
          ) {
            setPollingOrderId(null);
            if (pollingAction === MILEAGE_ACTION.CALCULATE_BATCH) {
              setIsCalculating(false);
              setItems((prev) =>
                prev.map((item) =>
                  item.loading
                    ? {
                        ...item,
                        loading: false,
                        error: t(
                          "transportation_carbon_footprint_calculator.mileage_calculator.err_calc_failed",
                        ),
                      }
                    : item,
                ),
              );
              setAlertModal({
                isOpen: true,
                title: t(
                  "transportation_carbon_footprint_calculator.analysis_failed",
                ),
                message:
                  t(
                    "transportation_carbon_footprint_calculator.mileage_calculator.err_calc_failed",
                  ) + "，請稍後再試。",
              });
            }
            return;
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }

      timeoutId = setTimeout(pollResult, 3000); // Info: (20260510 - Luphia) Poll every 3 seconds
    };

    pollResult();

    return () => clearTimeout(timeoutId);
  }, [pollingOrderId, pollingAction, t, onNavigateToHistory]);

  const baseCost =
    ANALYSIS_BASE_COSTS[ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT] || 1;
  const itemLength =
    currentOrderPayload?.data &&
    "items" in currentOrderPayload.data &&
    Array.isArray(currentOrderPayload.data.items)
      ? currentOrderPayload.data.items.length
      : 1;
  const totalCost = baseCost * itemLength;

  const handleOrderPaymentConfirm = async () => {
    if (!currentOrderPayload) return;

    await executeOrderTransaction(
      currentOrderPayload,
      totalCost,
      async ({ orderId }) => {
        setPollingOrderId(orderId);
        setIsPaymentModalOpen(false);
        resetTransaction();
        if (onNavigateToHistory) {
          onNavigateToHistory();
        }
      },
    );
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      if (prev.has(id)) return new Set();
      return new Set([id]);
    });
  };

  const handleManualAdd = async () => {
    if (!newRouteDesc.trim()) return;
    setIsAddingManual(true);
    try {
      const parsed = await parseMultipleRoutesFromText(newRouteDesc);
      const newItems: IMileageItem[] = parsed.map((item) => ({
        id: crypto.randomUUID(),
        origin: item.origin,
        dest: item.dest,
        waypoints: newWaypoints || item.waypoints,
        originLat: item.originLat,
        originLng: item.originLng,
        destLat: item.destLat,
        destLng: item.destLng,
        weightKg: item.weightKg,
      }));
      setItems((prev) => [...prev, ...newItems]);
      setNewRouteDesc("");
      setNewWaypoints("");
    } catch (err) {
      console.error(err);
      setAlertModal({
        isOpen: true,
        title: t("transportation_carbon_footprint_calculator.analysis_failed"),
        message: t(
          "transportation_carbon_footprint_calculator.mileage_calculator.err_parse_failed",
        ),
      });
    } finally {
      setIsAddingManual(false);
    }
  };

  const handleParseText = async () => {
    if (!aiText.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await parseMultipleRoutesFromText(aiText);
      const newItems: IMileageItem[] = parsed.map((item) => ({
        id: crypto.randomUUID(),
        origin: item.origin,
        dest: item.dest,
        waypoints: item.waypoints,
        originLat: item.originLat,
        originLng: item.originLng,
        destLat: item.destLat,
        destLng: item.destLng,
        weightKg: item.weightKg,
      }));
      setItems((prev) => [...prev, ...newItems]);
      setAiText("");
    } catch (err) {
      console.error(err);
      setAlertModal({
        isOpen: true,
        title: t("transportation_carbon_footprint_calculator.analysis_failed"),
        message: t(
          "transportation_carbon_footprint_calculator.mileage_calculator.err_parse_failed",
        ),
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleCalculateBatch = async () => {
    if (items.length === 0) return;
    const uncalculatedItems = items.filter((item) => !item.success);
    if (uncalculatedItems.length === 0) return;

    setIsCalculating(true);
    setItems((prev) =>
      prev.map((item) =>
        item.success ? item : { ...item, loading: true, error: undefined },
      ),
    );

    setPollingAction(MILEAGE_ACTION.CALCULATE_BATCH);
    setCurrentOrderPayload({
      type: ORDER_TYPE.ANALYSIS,
      data: {
        category: ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT,
        action: MILEAGE_ACTION.CALCULATE_BATCH,
        items: uncalculatedItems.map((item) => ({
          origin: item.originLat
            ? {
                name: item.origin,
                lat: Number(item.originLat),
                lng: Number(item.originLng),
              }
            : item.origin,
          dest: item.destLat
            ? {
                name: item.dest,
                lat: Number(item.destLat),
                lng: Number(item.destLng),
              }
            : item.dest,
          waypoints: item.waypoints,
          weightKg: item.weightKg ? Number(item.weightKg) : undefined,
        })),
      },
    });
    setIsPaymentModalOpen(true);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];

        const h = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0];
        if (h && Array.isArray(h)) {
          const objects = xlsx.utils.sheet_to_json(sheet) as Record<
            string,
            unknown
          >[];

          let originKey = "";
          let destKey = "";
          let modeKey = "";

          h.forEach((header) => {
            const lower = header.toLowerCase();
            if (
              lower.includes("起") ||
              lower.includes("origin") ||
              lower.includes("出發")
            )
              originKey = header;
            else if (
              lower.includes("迄") ||
              lower.includes("dest") ||
              lower.includes("目的")
            )
              destKey = header;
            else if (lower.includes("模式") || lower.includes("mode"))
              modeKey = header;
          });

          // Info: (20260618 - Tzuhan) Fallback if auto-detect fails
          if (!originKey) originKey = h[0];
          if (!destKey) destKey = h[1];

          const newItems: IMileageItem[] = [];
          objects.forEach((row) => {
            const origin = String(row[originKey] || "").trim();
            const dest = String(row[destKey] || "").trim();
            const modeRaw = String(row[modeKey] || "")
              .trim()
              .toUpperCase();

            let waypoints: string | undefined = undefined;
            if (modeRaw) waypoints = modeRaw;

            if (
              origin &&
              dest &&
              origin !== "undefined" &&
              dest !== "undefined"
            ) {
              newItems.push({
                id: crypto.randomUUID(),
                origin,
                dest,
                waypoints,
              });
            }
          });

          if (newItems.length > 0) {
            try {
              const aiPrompt = newItems
                .map(
                  (item) =>
                    `From ${item.origin} to ${item.dest} ${item.waypoints ? `(Waypoints: ${item.waypoints})` : ""}`,
                )
                .join("\n");
              const parsed = await parseMultipleRoutesFromText(aiPrompt);

              const enhancedItems: IMileageItem[] = parsed.map((item) => ({
                id: crypto.randomUUID(),
                origin: item.origin,
                dest: item.dest,
                waypoints: item.waypoints,
                originLat: item.originLat,
                originLng: item.originLng,
                destLat: item.destLat,
                destLng: item.destLng,
                weightKg: item.weightKg,
              }));

              setItems((prev) => [...prev, ...enhancedItems]);
            } catch (aiErr) {
              console.error(
                "AI enhancement failed, falling back to basic extraction",
                aiErr,
              );
              setItems((prev) => [...prev, ...newItems]);
            }
          } else {
            setAlertModal({
              isOpen: true,
              title: t("logistics.page.error_title"),
              message: "無法從檔案中解析出有效的起訖點。",
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse file", err);
        setAlertModal({
          isOpen: true,
          title: t("logistics.page.error_title"),
          message: t("logistics.page.error_load_file"),
        });
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(f);

    // Info: (20260618 - Tzuhan) reset input
    e.target.value = "";
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-800">
          <FileText className="h-5 w-5 text-orange-500" />
          {t(
            "transportation_carbon_footprint_calculator.mileage_calculator.title_paste",
          )}
        </h2>
        <div className="flex flex-col gap-4">
          <textarea
            aria-label={t(
              "transportation_carbon_footprint_calculator.mileage_calculator.title_paste",
            )}
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder={t(
              "transportation_carbon_footprint_calculator.mileage_calculator.placeholder",
            )}
            disabled={isParsing || isCalculating}
            className="h-32 w-full resize-none rounded-lg border border-gray-200 p-4 text-sm text-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-50"
          />
          <div className="flex justify-end">
            <button
              onClick={handleParseText}
              disabled={!aiText.trim() || isParsing || isCalculating}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:opacity-50"
            >
              {isParsing && <Loader2 className="h-4 w-4 animate-spin" />}
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.btn_ai_parse",
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-800">
          <Route className="h-5 w-5 text-orange-500" />
          {t(
            "transportation_carbon_footprint_calculator.mileage_calculator.title_manual",
          )}
        </h2>

        <div className="mb-6 flex flex-col items-end gap-4 md:flex-row">
          <label
            htmlFor="mileage_route_desc"
            className="flex w-full flex-1 flex-col gap-2 md:w-auto"
          >
            <span className="text-sm font-medium text-gray-700">
              {t(
                "transportation_carbon_footprint_calculator.ui.route_description",
              )}
            </span>
            <input
              id="mileage_route_desc"
              type="text"
              aria-label={t(
                "transportation_carbon_footprint_calculator.ui.route_description",
              )}
              value={newRouteDesc}
              onChange={(e) => setNewRouteDesc(e.target.value)}
              placeholder={t(
                "transportation_carbon_footprint_calculator.ui.route_placeholder",
              )}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
              disabled={isAddingManual || isCalculating}
            />
          </label>
          <label className="flex w-full shrink-0 flex-col gap-2 md:w-48">
            <span className="text-sm font-medium text-gray-700">
              中繼站 (選填) / Waypoints
            </span>
            <input
              type="text"
              value={newWaypoints}
              onChange={(e) => setNewWaypoints(e.target.value)}
              placeholder="e.g. Singapore, Rotterdam"
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </label>
          <button
            onClick={handleManualAdd}
            disabled={!newRouteDesc.trim() || isAddingManual || isCalculating}
            className="flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 text-sm font-semibold whitespace-nowrap text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isAddingManual ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}{" "}
            {t(
              "transportation_carbon_footprint_calculator.mileage_calculator.btn_add",
            )}
          </button>

          <label className="flex h-[42px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-orange-50 px-6 text-sm font-semibold whitespace-nowrap text-orange-600 transition-colors hover:bg-orange-100">
            <UploadCloud className="h-4 w-4" />
            {t("logistics.page.batch_import")}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {items.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">
                    {t(
                      "transportation_carbon_footprint_calculator.mileage_calculator.col_origin",
                    )}
                  </th>
                  <th className="px-6 py-3 font-medium">
                    {t(
                      "transportation_carbon_footprint_calculator.mileage_calculator.col_dest",
                    )}
                  </th>
                  <th className="px-6 py-3 font-medium">
                    中繼站設定 / Waypoints
                  </th>
                  <th className="px-6 py-3 font-medium">
                    {t(
                      "transportation_carbon_footprint_calculator.mileage_calculator.col_mileage",
                    )}
                  </th>
                  <th className="px-6 py-3 text-right font-medium">
                    {t(
                      "transportation_carbon_footprint_calculator.mileage_calculator.col_action",
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {item.origin}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {item.dest}
                      </td>
                      <td className="px-6 py-4">
                        {!item.loading && !item.success ? (
                          <input
                            type="text"
                            value={item.waypoints || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id
                                    ? {
                                        ...i,
                                        waypoints: val || undefined,
                                      }
                                    : i,
                                ),
                              );
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g. Singapore, Rotterdam"
                          />
                        ) : item.waypoints ? (
                          <span className="text-sm text-gray-600">
                            {item.waypoints}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.loading ? (
                          <span className="flex items-center gap-2 text-gray-400">
                            <Loader2 className="h-4 w-4 animate-spin" />{" "}
                            {t(
                              "transportation_carbon_footprint_calculator.ui.calculating",
                            )}
                          </span>
                        ) : item.success && item.distanceKm !== undefined ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-orange-600">
                              {item.distanceKm.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}{" "}
                              km
                              {/* Info: (20260511 - Luphia) Do not show item.mode string here anymore since we show it in the new column */}
                            </span>
                            <div className="flex gap-2 text-xs text-gray-500">
                              {item.landDistanceKm !== undefined && (
                                <span>
                                  陸:{" "}
                                  {item.landDistanceKm.toLocaleString(
                                    undefined,
                                    {
                                      maximumFractionDigits: 1,
                                    },
                                  )}
                                  km
                                </span>
                              )}
                              {item.seaDistanceKm !== undefined && (
                                <span>
                                  海:{" "}
                                  {item.seaDistanceKm.toLocaleString(
                                    undefined,
                                    {
                                      maximumFractionDigits: 1,
                                    },
                                  )}
                                  km
                                </span>
                              )}
                              {item.airDistanceKm !== undefined && (
                                <span>
                                  空:{" "}
                                  {item.airDistanceKm.toLocaleString(
                                    undefined,
                                    {
                                      maximumFractionDigits: 1,
                                    },
                                  )}
                                  km
                                </span>
                              )}
                            </div>
                          </div>
                        ) : item.error ? (
                          <span className="text-red-500">{item.error}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleRow(item.id)}
                            className={`rounded-full p-2 transition-colors hover:bg-gray-100 hover:text-gray-700 ${expandedRows.has(item.id) ? "bg-gray-100 text-gray-700" : "text-gray-400"}`}
                            title={t(
                              "transportation_carbon_footprint_calculator.ui.advanced_config",
                            )}
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemove(item.id)}
                            aria-label={t(
                              "transportation_carbon_footprint_calculator.mileage_calculator.btn_delete",
                            )}
                            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title={t(
                              "transportation_carbon_footprint_calculator.mileage_calculator.btn_delete",
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(item.id) && (
                      <tr>
                        <td
                          colSpan={5}
                          className="border-b border-gray-100 bg-gray-50/50 p-6"
                        >
                          <div className="grid grid-cols-1 gap-5 text-left md:grid-cols-2 lg:grid-cols-5">
                            {[
                              {
                                label: "origin_lat",
                                value: item.originLat,
                                setter: (val: number | "") =>
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.id === item.id
                                        ? { ...i, originLat: val }
                                        : i,
                                    ),
                                  ),
                              },
                              {
                                label: "origin_lng",
                                value: item.originLng,
                                setter: (val: number | "") =>
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.id === item.id
                                        ? { ...i, originLng: val }
                                        : i,
                                    ),
                                  ),
                              },
                              {
                                label: "dest_lat",
                                value: item.destLat,
                                setter: (val: number | "") =>
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.id === item.id
                                        ? { ...i, destLat: val }
                                        : i,
                                    ),
                                  ),
                              },
                              {
                                label: "dest_lng",
                                value: item.destLng,
                                setter: (val: number | "") =>
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.id === item.id
                                        ? { ...i, destLng: val }
                                        : i,
                                    ),
                                  ),
                              },
                              {
                                label: "total_weight",
                                value: item.weightKg,
                                setter: (val: number | "") =>
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.id === item.id
                                        ? { ...i, weightKg: val }
                                        : i,
                                    ),
                                  ),
                              },
                            ].map((field) => (
                              <label
                                key={field.label}
                                className="flex flex-col gap-1.5"
                              >
                                <span className="text-sm font-medium text-gray-700">
                                  {t(
                                    `transportation_carbon_footprint_calculator.ui.${field.label}`,
                                  )}
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.setter(
                                      e.target.value
                                        ? Number(e.target.value)
                                        : "",
                                    )
                                  }
                                  disabled={item.loading || item.success}
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:bg-gray-50 disabled:opacity-50"
                                  placeholder={t(
                                    "transportation_carbon_footprint_calculator.ui.auto",
                                  )}
                                />
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-gray-400">
            <Route className="mb-2 h-8 w-8" />
            <p>
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.empty_list",
              )}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-6 flex justify-end border-t border-gray-100 pt-6">
            <button
              onClick={handleCalculateBatch}
              disabled={isCalculating || items.every((item) => item.success)}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-8 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-orange-500 active:scale-95 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCalculating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isCalculating
                ? t("transportation_carbon_footprint_calculator.ui.calculating")
                : t(
                    "transportation_carbon_footprint_calculator.mileage_calculator.btn_calculate",
                  )}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
      />

      <PaymentConfirmModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          if (pollingAction === MILEAGE_ACTION.CALCULATE_BATCH) {
            setIsCalculating(false);
            setItems((prev) =>
              prev.map((item) =>
                item.loading ? { ...item, loading: false } : item,
              ),
            );
          }
          resetTransaction();
        }}
        onConfirm={handleOrderPaymentConfirm}
        cost={totalCost}
        title={t("analysis.confirm_title")}
        description={t("analysis.confirm_desc")}
        isLoading={
          workflowStatus !== "idle" &&
          workflowStatus !== "payment_success" &&
          workflowStatus !== "error"
        }
        status={workflowStatus}
        errorMessage={errorMessage}
        txHash={txHash}
      />
    </div>
  );
}
