import { describe, it, expect } from "@jest/globals";
import { PresenceStatus } from "@/constants/attendance";
import { calculateDistanceKm, circlePolygon } from "@/lib/utils/geo";
import {
  buildGeofenceFeatures,
  defaultSelectedLocation,
  locationBounds,
  markerHeadcount,
  sortRosterEntries,
} from "@/lib/utils/attendance_presence_view";
import { parseContentDispositionFilename } from "@/lib/utils/request";
import {
  IPresenceEntry,
  IPresenceLocationSummary,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 現場頁的顯示邏輯與圍欄圓圈。
 *
 * 圓圈那幾條是**自洽性測試**：畫在地圖上的圓與伺服器判定圍欄用的
 * `calculateDistanceKm` 必須算出同一個半徑。兩邊各用一套地球半徑，
 * 畫面上的圓就會與實際打得到卡的範圍對不起來 —— 而那正是觀眾
 * 唯一能拿來判斷「我站在這裡打不打得到卡」的東西。
 */

const location = (
  overrides: Partial<IPresenceLocationSummary>,
): IPresenceLocationSummary => ({
  workLocationId: "loc-a",
  code: "LOC-A",
  name: "大漢溪橋梁工區",
  latitude: 25.0,
  longitude: 121.45,
  radiusMeters: 500,
  onSiteCount: 0,
  staleCount: 0,
  ...overrides,
});

const entry = (overrides: Partial<IPresenceEntry>): IPresenceEntry => ({
  employeeId: "emp-2",
  employeeNo: "EMP002",
  name: "王小明",
  departmentName: "工程處本部",
  jobTitle: "工務行政",
  status: PresenceStatus.ON_SITE,
  workDate: "2026-08-13",
  sinceMinute: 545,
  workLocationId: "loc-a",
  workLocationName: "大漢溪橋梁工區",
  ...overrides,
});

describe("attendance_presence_view", () => {
  describe("圍欄圓圈", () => {
    it("每一個頂點都真的離圓心 500 公尺", () => {
      const polygon = circlePolygon(25.0, 121.45, 500);

      for (const [longitude, latitude] of polygon.coordinates[0]) {
        const metres =
          calculateDistanceKm(25.0, 121.45, latitude, longitude) * 1000;
        expect(Math.abs(metres - 500)).toBeLessThan(1);
      }
    });

    it("半徑放大時圓也跟著放大 —— 800 公尺的工區不能畫成 500", () => {
      const [longitude, latitude] = circlePolygon(25.0, 121.45, 800)
        .coordinates[0][0];
      const metres =
        calculateDistanceKm(25.0, 121.45, latitude, longitude) * 1000;
      expect(Math.abs(metres - 800)).toBeLessThan(1);
    });

    it("環的首尾相同，否則多數渲染器會靜默不畫", () => {
      const ring = circlePolygon(25.0, 121.45, 500, 32).coordinates[0];
      expect(ring).toHaveLength(33);
      expect(ring[0]).toEqual(ring[32]);
    });

    it("選取狀態帶在 properties 裡供圖層上色", () => {
      const features = buildGeofenceFeatures(
        [location({}), location({ workLocationId: "loc-b" })],
        "loc-b",
      );

      expect(
        features.features.map((item) => item.properties?.selected),
      ).toEqual([false, true]);
    });
  });

  describe("地圖標記上的數字", () => {
    it("含未打下班卡的人 —— 把「不確定」顯示成「不在」是最危險的失真", () => {
      /**
       * Info: (20260813 - Julian) 母文件 §D5 原本寫「標記上的數字＝在班人數」。
       * 但疏散時要問的是「這個工區裡最多可能有幾個人」，
       * 而 `STALE` 的語意是「系統不知道他在不在」，不是「他不在」。
       */
      expect(markerHeadcount(location({ onSiteCount: 3, staleCount: 1 }))).toBe(
        4,
      );
    });
  });

  describe("地圖範圍", () => {
    it("只有一個地點時給一個最小跨距，否則地圖會縮到最大", () => {
      const bounds = locationBounds([location({})]);
      expect(bounds).not.toBeNull();
      const [[minLng, minLat], [maxLng, maxLat]] = bounds ?? [
        [0, 0],
        [0, 0],
      ];
      expect(maxLng - minLng).toBeCloseTo(0.01, 6);
      expect(maxLat - minLat).toBeCloseTo(0.01, 6);
    });

    it("多個地點時涵蓋全部", () => {
      const bounds = locationBounds([
        location({ latitude: 25.0, longitude: 121.4 }),
        location({ workLocationId: "loc-b", latitude: 25.1, longitude: 121.6 }),
      ]);
      expect(bounds).toEqual([
        [121.4, 25.0],
        [121.6, 25.1],
      ]);
    });

    it("沒有地點時回 null，讓呼叫端決定要顯示什麼", () => {
      expect(locationBounds([])).toBeNull();
    });
  });

  describe("名單排序", () => {
    it("未打下班卡的排最前面 —— 他們是要優先打電話確認的人", () => {
      const sorted = sortRosterEntries([
        entry({ employeeId: "a", sinceMinute: 400 }),
        entry({
          employeeId: "b",
          status: PresenceStatus.STALE,
          sinceMinute: 900,
        }),
        entry({ employeeId: "c", sinceMinute: 500 }),
      ]);

      expect(sorted.map((item) => item.employeeId)).toEqual(["b", "a", "c"]);
    });

    it("同狀態時依進場時間排，先到的在前", () => {
      const sorted = sortRosterEntries([
        entry({ employeeId: "late", sinceMinute: 700 }),
        entry({ employeeId: "early", sinceMinute: 400 }),
      ]);
      expect(sorted.map((item) => item.employeeId)).toEqual(["early", "late"]);
    });

    it("不改動傳入的陣列", () => {
      const input = [
        entry({ employeeId: "a" }),
        entry({ employeeId: "b", status: PresenceStatus.STALE }),
      ];
      sortRosterEntries(input);
      expect(input.map((item) => item.employeeId)).toEqual(["a", "b"]);
    });
  });

  describe("預設選取的工區", () => {
    it("取人數最多的那一個，不是清單第一個", () => {
      expect(
        defaultSelectedLocation([
          location({ workLocationId: "loc-a", onSiteCount: 1 }),
          location({ workLocationId: "loc-b", onSiteCount: 5 }),
        ]),
      ).toBe("loc-b");
    });

    it("計入未打下班卡的人", () => {
      expect(
        defaultSelectedLocation([
          location({ workLocationId: "loc-a", onSiteCount: 2 }),
          location({ workLocationId: "loc-b", staleCount: 3 }),
        ]),
      ).toBe("loc-b");
    });

    it("全部都沒有人時回 null —— 那是一個結論，不是一個空畫面", () => {
      expect(
        defaultSelectedLocation([
          location({ workLocationId: "loc-a" }),
          location({ workLocationId: "loc-b" }),
        ]),
      ).toBeNull();
    });
  });

  describe("下載檔名以伺服器為準", () => {
    it("解析 Content-Disposition", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="attendance-roster-2026-08-13T06-00-00.csv"',
        ),
      ).toBe("attendance-roster-2026-08-13T06-00-00.csv");
    });

    it("沒有標頭時回 null，讓呼叫端用自己的預設", () => {
      expect(parseContentDispositionFilename(null)).toBeNull();
      expect(parseContentDispositionFilename("attachment")).toBeNull();
    });
  });
});
