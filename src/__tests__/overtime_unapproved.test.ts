import { describe, it, expect } from "@jest/globals";
import { IMinuteInterval } from "@/interfaces/overtime";
import {
  mergeIntervals,
  subtractIntervals,
  sumWindowOverlapMinutes,
  totalIntervalMinutes,
} from "@/lib/overtime_rules";

/**
 * Info: (20260818 - Julian) L29 的區間運算（ADR 024 §2.1）。
 *
 * ## 為什麼這一支值得存在
 *
 * 「有打卡但無核准加班單的時段」= `在場區間 − 班別窗 − 已核准的加班區間`。
 * 這個減法算錯的兩個方向都很難發現：多算會讓主管收到一堆不存在的異常
 * 而開始忽略整份清單；少算則讓一段真實發生過、沒有人核准過的加班消失 ——
 * 而它仍然存在於 `AttendancePunch` 裡，勞動檢查看得見。
 *
 * ## 分鐘數的表示法
 *
 * 一律是「當日 00:00 起算」，>= 1440 表次日（同 `ShiftPattern`）。
 * 因此夜班的減法與日班走完全相同的程式碼路徑，不需要特例。
 */

const iv = (startMinute: number, endMinute: number): IMinuteInterval => ({
  startMinute,
  endMinute,
});

describe("mergeIntervals", () => {
  it("重疊的合併成一段", () => {
    expect(mergeIntervals([iv(540, 700), iv(650, 800)])).toEqual([
      iv(540, 800),
    ]);
  });

  /**
   * Info: (20260818 - Julian) 相鄰也合併：18:00–19:00 與 19:00–20:00 是連續在場的
   * 兩小時，拆成兩段會讓下游讀成「中間離開過」。
   */
  it("相鄰的也合併", () => {
    expect(mergeIntervals([iv(1080, 1140), iv(1140, 1200)])).toEqual([
      iv(1080, 1200),
    ]);
  });

  it("零長度與反向的區間直接丟掉", () => {
    expect(mergeIntervals([iv(600, 600), iv(700, 650)])).toEqual([]);
  });

  it("未排序的輸入也回排好序的結果", () => {
    expect(mergeIntervals([iv(900, 960), iv(540, 600)])).toEqual([
      iv(540, 600),
      iv(900, 960),
    ]);
  });
});

describe("subtractIntervals：未核准時段", () => {
  /**
   * Info: (20260818 - Julian) 最典型的一天：9:00 上班、21:00 離開，
   * 班別窗到 18:00，核准了 18:00–19:00 的加班。
   * 剩下 19:00–21:00 的兩小時沒有任何一張單涵蓋它。
   */
  it("班別窗與已核准區間都扣掉之後，剩下的就是未涵蓋的時段", () => {
    const remaining = subtractIntervals(
      [iv(540, 1260)],
      [iv(540, 1080), iv(1080, 1140)],
    );

    expect(remaining).toEqual([iv(1140, 1260)]);
    expect(totalIntervalMinutes(remaining)).toBe(120);
  });

  it("完全被涵蓋時沒有任何剩餘", () => {
    expect(subtractIntervals([iv(540, 1080)], [iv(500, 1200)])).toEqual([]);
  });

  it("中途離開會讓在場切成兩段，兩段各自扣", () => {
    const remaining = subtractIntervals(
      [iv(540, 720), iv(780, 1260)],
      [iv(780, 1080)],
    );

    expect(remaining).toEqual([iv(540, 720), iv(1080, 1260)]);
    expect(totalIntervalMinutes(remaining)).toBe(360);
  });

  /**
   * Info: (20260818 - Julian) 非上班日沒有班別窗，因此沒有東西可扣 ——
   * 那一天的在場時間整段都是未涵蓋的。這正是要看到的東西：
   * 有人在休息日到工，而沒有任何一張加班單。
   */
  it("沒有可扣的區間時，在場時間原樣回來", () => {
    expect(subtractIntervals([iv(540, 600)], [])).toEqual([iv(540, 600)]);
  });

  it("夜班（>= 1440 表次日）走同一條路徑", () => {
    expect(subtractIntervals([iv(1200, 1740)], [iv(1200, 1620)])).toEqual([
      iv(1620, 1740),
    ]);
  });

  it("沒有在場紀錄就沒有未涵蓋時段", () => {
    expect(subtractIntervals([], [iv(540, 1080)])).toEqual([]);
  });
});

describe("sumWindowOverlapMinutes：認列公式的另一半", () => {
  it("整段落在加班區間內", () => {
    expect(sumWindowOverlapMinutes([iv(540, 1200)], 1080, 1200)).toBe(120);
  });

  it("只待了一半就只算一半 —— 系統不發明沒有發生過的加班", () => {
    expect(sumWindowOverlapMinutes([iv(540, 1140)], 1080, 1200)).toBe(60);
  });

  it("下班就走，與加班區間沒有交集", () => {
    expect(sumWindowOverlapMinutes([iv(540, 1020)], 1080, 1200)).toBe(0);
  });

  /**
   * Info: (20260818 - Julian) 重疊的在場區間不得重複計算。
   * 多算出來的分鐘會被當成加班事實，而那正是「零捏造」要擋的方向。
   */
  it("重疊的在場區間只算一次", () => {
    expect(
      sumWindowOverlapMinutes([iv(1080, 1140), iv(1130, 1200)], 1080, 1200),
    ).toBe(120);
  });

  it("中途離開的那 30 分鐘不算", () => {
    expect(
      sumWindowOverlapMinutes([iv(1080, 1110), iv(1140, 1200)], 1080, 1200),
    ).toBe(90);
  });

  it("沒有打卡就是 0，由 service 轉成自陳而不是認列 0", () => {
    expect(sumWindowOverlapMinutes([], 1080, 1200)).toBe(0);
  });

  it("零長度或反向的加班區間直接丟", () => {
    expect(() => sumWindowOverlapMinutes([iv(540, 600)], 1080, 1080)).toThrow();
    expect(() => sumWindowOverlapMinutes([iv(540, 600)], 1200, 1080)).toThrow();
  });
});
