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
} from "lucide-react";
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
  type RouteMode,
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
  mode?: RouteMode;
  distanceKm?: number;
  landDistanceKm?: number;
  seaDistanceKm?: number;
  airDistanceKm?: number;
  routeGeometry?: string;
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
  const [newOrigin, setNewOrigin] = useState("");
  const [newDest, setNewDest] = useState("");
  const [newMode, setNewMode] = useState<RouteMode | "">("");
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

  const handleManualAdd = () => {
    if (!newOrigin.trim() || !newDest.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        origin: newOrigin.trim(),
        dest: newDest.trim(),
        mode: (newMode as RouteMode) || undefined,
      },
    ]);
    setNewOrigin("");
    setNewDest("");
    setNewMode("");
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
        mode: item.mode as RouteMode,
      }));
      setItems((prev) => [...prev, ...newItems]);
      setAiText("");
    } catch (err) {
      console.error(err);
      setAlertModal({
        isOpen: true,
        title: t("transportation_carbon_footprint_calculator.analysis_failed"),
        message:
          t(
            "transportation_carbon_footprint_calculator.mileage_calculator.err_parse_failed",
          ) + "，請稍後再試。",
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
          origin: item.origin,
          dest: item.dest,
          mode: item.mode,
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

    const reader = new FileReader();
    reader.onload = (evt) => {
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

          // Fallback if auto-detect fails
          if (!originKey) originKey = h[0];
          if (!destKey) destKey = h[1];

          const newItems: IMileageItem[] = [];
          objects.forEach((row) => {
            const origin = String(row[originKey] || "").trim();
            const dest = String(row[destKey] || "").trim();
            const modeRaw = String(row[modeKey] || "")
              .trim()
              .toUpperCase();

            let mode: RouteMode | undefined = undefined;
            if (
              modeRaw.includes("LAND") ||
              modeRaw.includes("陸運") ||
              modeRaw.includes("卡車")
            )
              mode = "LAND";
            else if (
              modeRaw.includes("SEA") ||
              modeRaw.includes("海運") ||
              modeRaw.includes("船")
            )
              mode = "SEA_LAND";
            else if (
              modeRaw.includes("AIR") ||
              modeRaw.includes("空運") ||
              modeRaw.includes("飛機")
            )
              mode = "AIR_LAND";

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
                mode,
              });
            }
          });

          if (newItems.length > 0) {
            setItems((prev) => [...prev, ...newItems]);
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
      }
    };
    reader.readAsBinaryString(f);

    // reset input
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
            htmlFor="mileage_origin"
            className="flex w-full flex-1 flex-col gap-2 md:w-auto"
          >
            <span className="text-sm font-medium text-gray-700">
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.origin_desc",
              )}
            </span>
            <input
              id="mileage_origin"
              type="text"
              aria-label={t(
                "transportation_carbon_footprint_calculator.mileage_calculator.origin_desc",
              )}
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value)}
              placeholder={`${t("transportation_carbon_footprint_calculator.mileage_calculator.origin_desc")}例如：台北市信義區`}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </label>
          <label
            htmlFor="mileage_dest"
            className="flex w-full flex-1 flex-col gap-2 md:w-auto"
          >
            <span className="text-sm font-medium text-gray-700">
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.dest_desc",
              )}
            </span>
            <input
              id="mileage_dest"
              type="text"
              aria-label={t(
                "transportation_carbon_footprint_calculator.mileage_calculator.dest_desc",
              )}
              value={newDest}
              onChange={(e) => setNewDest(e.target.value)}
              placeholder={`${t("transportation_carbon_footprint_calculator.mileage_calculator.dest_desc")}例如：高雄市左營區`}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </label>
          <label className="flex w-full shrink-0 flex-col gap-2 md:w-48">
            <span className="text-sm font-medium text-gray-700">
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.col_mode",
              )}
            </span>
            <select
              value={newMode}
              onChange={(e) => setNewMode(e.target.value as RouteMode | "")}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              <option value="">
                {t(
                  "transportation_carbon_footprint_calculator.mileage_calculator.mode_auto",
                )}
              </option>
              <option value="LAND">
                {t(
                  "transportation_carbon_footprint_calculator.mileage_calculator.mode_LAND",
                )}
              </option>
              <option value="SEA_LAND">
                {t(
                  "transportation_carbon_footprint_calculator.mileage_calculator.mode_SEA_LAND",
                )}
              </option>
              <option value="AIR_LAND">
                {t(
                  "transportation_carbon_footprint_calculator.mileage_calculator.mode_AIR_LAND",
                )}
              </option>
              <option value="SEA_LAND_AIR">
                {t(
                  "transportation_carbon_footprint_calculator.mileage_calculator.mode_SEA_LAND_AIR",
                )}
              </option>
            </select>
          </label>
          <button
            onClick={handleManualAdd}
            disabled={!newOrigin.trim() || !newDest.trim()}
            className="flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 text-sm font-semibold whitespace-nowrap text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />{" "}
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
                    {t(
                      "transportation_carbon_footprint_calculator.mileage_calculator.col_mode",
                    )}
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
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.origin}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.dest}
                    </td>
                    <td className="px-6 py-4">
                      {!item.loading && !item.success ? (
                        <select
                          value={item.mode || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id
                                  ? {
                                      ...i,
                                      mode: val
                                        ? (val as RouteMode)
                                        : undefined,
                                    }
                                  : i,
                              ),
                            );
                          }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">
                            {t(
                              "transportation_carbon_footprint_calculator.mileage_calculator.mode_auto",
                            )}
                          </option>
                          <option value="LAND">
                            {t(
                              "transportation_carbon_footprint_calculator.mileage_calculator.mode_LAND",
                            )}
                          </option>
                          <option value="SEA_LAND">
                            {t(
                              "transportation_carbon_footprint_calculator.mileage_calculator.mode_SEA_LAND",
                            )}
                          </option>
                          <option value="AIR_LAND">
                            {t(
                              "transportation_carbon_footprint_calculator.mileage_calculator.mode_AIR_LAND",
                            )}
                          </option>
                          <option value="SEA_LAND_AIR">
                            {t(
                              "transportation_carbon_footprint_calculator.mileage_calculator.mode_SEA_LAND_AIR",
                            )}
                          </option>
                        </select>
                      ) : item.mode ? (
                        <span className="text-sm text-gray-600">
                          {t(
                            `transportation_carbon_footprint_calculator.mileage_calculator.mode_${item.seaDistanceKm && item.airDistanceKm && item.seaDistanceKm > 0 && item.airDistanceKm > 0 ? "SEA_LAND_AIR" : item.mode}`,
                          )}
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
                                {item.landDistanceKm.toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}
                                km
                              </span>
                            )}
                            {item.seaDistanceKm !== undefined && (
                              <span>
                                海:{" "}
                                {item.seaDistanceKm.toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}
                                km
                              </span>
                            )}
                            {item.airDistanceKm !== undefined && (
                              <span>
                                空:{" "}
                                {item.airDistanceKm.toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}
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
                    </td>
                  </tr>
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
