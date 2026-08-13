import { calculateDistanceKm } from "@/lib/utils/geo";

/**
 * Info: (20260813 - Julian) 地理圍欄判定。純函數，不碰資料庫。
 *
 * ## 為什麼在伺服器算（護欄 G2）
 *
 * 瀏覽器回報的座標可以被竄改 —— DevTools 的 Sensors 面板可以直接覆寫
 * `geolocation`，那是官方功能，不需要任何攻擊技巧。因此 client 只負責回報座標，
 * 「在不在圍欄內」一律由這裡判斷。這與 CLAUDE.md §7 對 LLM 的立場同構：
 * 永遠不直接採信客戶端數值。
 *
 * ## 取距離最小者而不是第一個命中
 *
 * 圍欄可能重疊（同一棟樓的兩間辦公室、相鄰的兩個工區）。取最近的才是正確歸屬，
 * 而正確歸屬決定了「這個人算在哪個工地的現場人數裡」。
 * Demo 的 seed 會斷言圍欄不重疊，但這一行不依賴那個前提。
 *
 * ## 已知限制：圓形圍欄對線形工程不合用
 *
 * ToDo: (20260813 - Julian) 道路、管線這類沿線分布的工程，用一個圓涵蓋
 * 3 公里的路段需要 1.5 公里以上的半徑，而那個圓會把沿線兩側大片與工程無關的
 * 區域都算成工地。正解是沿中心線的帶狀範圍（PostGIS `ST_DWithin`），
 * 那是母計畫 §13.2 的升級路徑之一。
 */

export interface IGeofenceCandidate {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface IGeofenceMatch {
  location: IGeofenceCandidate;
  distanceMeters: number;
  /** Info: (20260813 - Julian) 是否落在半徑內。false 代表這只是「最近的一個」 */
  inside: boolean;
}

// Info: (20260813 - Julian) 公尺是整數就夠了：GPS 誤差以十公尺計，小數位沒有意義
const toMeters = (kilometres: number): number => Math.round(kilometres * 1000);

/**
 * Info: (20260813 - Julian) 找出距離最近的地點，並標明是否落在它的半徑內。
 *
 * **即使沒有任何圍欄命中也回傳最近的那一個**（`inside: false`）——
 * 呼叫端需要它來組出「距台北港工區 3.2 公里」這種訊息。
 * 一個只回 null 的介面會逼呼叫端自己再算一次距離，而那份重算會走樣。
 *
 * 候選清單為空時回 null：那代表帳本還沒設定任何打卡地點，是設定問題不是位置問題。
 */
export function findNearestGeofence(
  latitude: number,
  longitude: number,
  candidates: IGeofenceCandidate[],
): IGeofenceMatch | null {
  if (candidates.length === 0) return null;

  const measured = candidates.map((location) => ({
    location,
    distanceMeters: toMeters(
      calculateDistanceKm(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
      ),
    ),
  }));

  const nearest = measured.reduce((best, current) =>
    current.distanceMeters < best.distanceMeters ? current : best,
  );

  return {
    ...nearest,
    // Info: (20260813 - Julian) 邊界含在內：剛好站在半徑上的人算到了，不算沒到
    inside: nearest.distanceMeters <= nearest.location.radiusMeters,
  };
}
