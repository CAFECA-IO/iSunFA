import { Route, Loader2, Download } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

export interface IMileageBatchResult {
  origin: string;
  dest: string;
  distanceKm?: number;
  landDistanceKm?: number;
  seaDistanceKm?: number;
  airDistanceKm?: number;
  mode?: string;
  error?: string;
  routeGeometry?: string;
  landGeometry?: string;
  seaGeometry?: string;
  airGeometry?: string;
}

export interface IMileageBatchResultsProps {
  batchResults: IMileageBatchResult[];
  onRecalculate: () => void;
  onDownload: () => void;
  isExporting: boolean;
}

export function MileageBatchResults({
  batchResults,
  onRecalculate,
  onDownload,
  isExporting,
}: IMileageBatchResultsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Route className="h-5 w-5 text-orange-500" />
            {t(
              "transportation_carbon_footprint_calculator.mileage_calculator.title_manual",
            )}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onRecalculate}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.recalculate",
              )}
            </button>
            <button
              onClick={onDownload}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-500 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("transportation_carbon_footprint_calculator.ui.export_report")}
            </button>
          </div>
        </div>
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
                    "transportation_carbon_footprint_calculator.mileage_calculator.col_mileage",
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {batchResults.map((item, index) => (
                <tr key={index} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {item.origin}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {item.dest}
                  </td>
                  <td className="px-6 py-4">
                    {item.error ? (
                      <span className="text-red-500">{item.error}</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-orange-600">
                          {Number(item.distanceKm || 0).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 2 },
                          )}{" "}
                          km
                          {item.mode && (
                            <span className="ml-1 text-xs font-normal text-gray-500">
                              (
                              {t(
                                `transportation_carbon_footprint_calculator.mileage_calculator.mode_${item.seaDistanceKm && item.airDistanceKm && item.seaDistanceKm > 0 && item.airDistanceKm > 0 ? "SEA_LAND_AIR" : item.mode}`,
                              )}
                              )
                            </span>
                          )}
                        </span>
                        <div className="flex gap-2 text-xs text-gray-500">
                          {item.landDistanceKm !== undefined && (
                            <span>
                              {t(
                                "transportation_carbon_footprint_calculator.mileage_calculator.short_land",
                              )}
                              :{" "}
                              {Number(item.landDistanceKm).toLocaleString(
                                undefined,
                                { maximumFractionDigits: 1 },
                              )}
                              km
                            </span>
                          )}
                          {item.seaDistanceKm !== undefined && (
                            <span>
                              {t(
                                "transportation_carbon_footprint_calculator.mileage_calculator.short_sea",
                              )}
                              :{" "}
                              {Number(item.seaDistanceKm).toLocaleString(
                                undefined,
                                { maximumFractionDigits: 1 },
                              )}
                              km
                            </span>
                          )}
                          {item.airDistanceKm !== undefined && (
                            <span>
                              {t(
                                "transportation_carbon_footprint_calculator.mileage_calculator.short_air",
                              )}
                              :{" "}
                              {Number(item.airDistanceKm).toLocaleString(
                                undefined,
                                { maximumFractionDigits: 1 },
                              )}
                              km
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
