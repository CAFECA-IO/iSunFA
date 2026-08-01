"use server";

import { INearestPortResult } from "@/interfaces/logistics";
import seaportsData from "@/lib/data/seaports.json";
import airportsData from "@/lib/data/airports.json";
import { calculateDistanceKm } from "@/lib/utils/geo";
import { AIRPORT_SELECTION_REQUIRES_IATA } from "@/constants/logistics";

/**
 * Info: (20260801 - Luphia) 距離改用 @/lib/utils/geo 的共用實作。
 * 本檔原有一份逐行相同的 haversine 複本(全庫共三份),
 * 三份各自演化就會讓「最近機場」與「航段距離」用不同的地球半徑算出不同答案。
 */

/**
 * Info: (20260801 - Luphia) 可作為接駁點的機場。於模組載入時篩選一次而非每次呼叫都篩:
 * 每條路線會呼叫兩次(起點與迄點),而這份清單是靜態資料,不會在執行期改變。
 *
 * 篩選條件與其解決／未解決的問題見 AIRPORT_SELECTION_REQUIRES_IATA 的註解。
 */
const SELECTABLE_AIRPORTS = (
  airportsData as unknown as (INearestPortResult & { iataCode?: string })[]
).filter((airport) =>
  AIRPORT_SELECTION_REQUIRES_IATA ? Boolean(airport.iataCode) : true,
);

export async function getNearestPort(
  lat: number,
  lng: number,
): Promise<INearestPortResult | null> {
  try {
    if (isNaN(lat) || isNaN(lng))
      throw new Error("Invalid coordinates provided.");

    const ports = seaportsData as unknown as INearestPortResult[];

    if (ports.length === 0) return null;

    let nearest = ports[0];
    let minDistance = calculateDistanceKm(lat, lng, nearest.lat, nearest.lng);

    for (const port of ports) {
      const dist = calculateDistanceKm(lat, lng, port.lat, port.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = port;
      }
    }

    return {
      ...nearest,
      distance_km: minDistance,
    };
  } catch (error) {
    console.error("[Action Error] getNearestPort:", error);
    throw new Error("無法尋找最近的港口，請稍後再試。");
  }
}

export async function getNearestAirport(
  lat: number,
  lng: number,
): Promise<INearestPortResult | null> {
  try {
    if (isNaN(lat) || isNaN(lng))
      throw new Error("Invalid coordinates provided.");

    const airports = SELECTABLE_AIRPORTS;

    /**
     * Info: (20260801 - Luphia) 篩選後清單為空即 throw,不退回未篩選的全量。
     * 靜默退回會讓資料換版導致篩選失效時,系統又開始把軍用基地當接駁機場 ——
     * 而且不會有任何跡象。寧可明確失敗。
     */
    if (airports.length === 0) {
      throw new Error(
        "No selectable airport in dataset (IATA filter removed every entry).",
      );
    }

    let nearest = airports[0];
    let minDistance = calculateDistanceKm(lat, lng, nearest.lat, nearest.lng);

    for (const airport of airports) {
      const dist = calculateDistanceKm(lat, lng, airport.lat, airport.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = airport;
      }
    }

    return {
      ...nearest,
      distance_km: minDistance,
    };
  } catch (error) {
    console.error("[Action Error] getNearestAirport:", error);
    throw new Error("無法尋找最近的機場，請稍後再試。");
  }
}
