import { describe, it, expect } from "@jest/globals";
import {
  OvertimeRequestInvariantError,
  assertOvertimeFilingType,
  IStorableOvertimeRequest,
} from "@/repositories/overtime_request_invariant";
import {
  OvertimeFilingType,
  OvertimeRequestStatus,
} from "@/constants/overtime";

/**
 * Info: (20260817 - Julian) 加班單的不變式。
 *
 * 時點一律以 epoch 毫秒傳入 —— 政策時區的換算是 service 的職責
 * （`attendance_time.ts`）。一個會自己做時區換算的不變式，
 * 在夏令時間邊界上會有自己的一套錯誤，而那與它要守的規則無關。
 */

// Info: (20260817 - Julian) 2026-08-17 07:30（政策時區）的班別窗起
const WINDOW_START_MS = Date.UTC(2026, 7, 16, 23, 30);
const HOUR_MS = 3_600_000;

const advance: IStorableOvertimeRequest = {
  filingType: OvertimeFilingType.ADVANCE,
  status: OvertimeRequestStatus.PENDING,
  submittedAtMs: WINDOW_START_MS - 12 * HOUR_MS,
  shiftWindowStartMs: WINDOW_START_MS,
  requestedStartMinute: 17 * 60,
  requestedEndMinute: 20 * 60,
  approvedMinutes: null,
  recognizedMinutes: null,
};

const postHoc: IStorableOvertimeRequest = {
  ...advance,
  filingType: OvertimeFilingType.POST_HOC,
  submittedAtMs: WINDOW_START_MS + 14 * HOUR_MS,
};

describe("assertOvertimeFilingType — 時序", () => {
  it("事前申請於窗起之前送出、事後補單於窗起之後送出，兩者都通過", () => {
    expect(() => assertOvertimeFilingType(advance)).not.toThrow();
    expect(() => assertOvertimeFilingType(postHoc)).not.toThrow();
  });

  /**
   * Info: (20260817 - Julian) 這是一個**有動機的**謊：事後補單在勞動檢查時的
   * 證據力低於事前申請，因此把事後補的單標成事前申請對填單的人是有利的。
   */
  it("標為事前申請卻在窗起之後送出：擋下", () => {
    expect(() =>
      assertOvertimeFilingType({
        ...advance,
        submittedAtMs: WINDOW_START_MS + 1,
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });

  it("恰好等於窗起的瞬間算事後（窗已開，不再是事前）", () => {
    expect(() =>
      assertOvertimeFilingType({
        ...advance,
        submittedAtMs: WINDOW_START_MS,
      }),
    ).toThrow(OvertimeRequestInvariantError);
    expect(() =>
      assertOvertimeFilingType({
        ...postHoc,
        submittedAtMs: WINDOW_START_MS,
      }),
    ).not.toThrow();
  });

  /**
   * Info: (20260817 - Julian) 反方向沒有「對填單者有利」的動機，擋它的理由不同：
   * 事後補單會被單獨計數（勞檢會問這個比例），標錯會讓比例失真，
   * 而失真的方向是把公司說得比實際更糟 —— 沒有人會去更正它。
   */
  it("標為事後補單卻在窗起之前送出：擋下", () => {
    expect(() =>
      assertOvertimeFilingType({
        ...postHoc,
        submittedAtMs: WINDOW_START_MS - 1,
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });
});

describe("assertOvertimeFilingType — 申請區間", () => {
  it("跨夜加班（>= 1440 分鐘）通過", () => {
    expect(() =>
      assertOvertimeFilingType({
        ...advance,
        requestedStartMinute: 23 * 60,
        requestedEndMinute: 1440 + 2 * 60,
      }),
    ).not.toThrow();
  });

  it.each([
    ["反向", 20 * 60, 17 * 60],
    ["零長度", 18 * 60, 18 * 60],
  ])("%s 的申請區間擋下", (_label, start, end) => {
    expect(() =>
      assertOvertimeFilingType({
        ...advance,
        requestedStartMinute: start,
        requestedEndMinute: end,
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });
});

describe("assertOvertimeFilingType — 狀態與分鐘數", () => {
  const approved: IStorableOvertimeRequest = {
    ...postHoc,
    status: OvertimeRequestStatus.APPROVED,
    approvedMinutes: 180,
    recognizedMinutes: 120,
  };

  it("已核准且說得出核准與認列分鐘，通過", () => {
    expect(() => assertOvertimeFilingType(approved)).not.toThrow();
  });

  /**
   * Info: (20260817 - Julian) 一張標著 APPROVED 卻沒有 approvedMinutes 的單子，
   * 在「本月加班時數」的加總裡會被當成 0 —— 它出現在清單上、看起來已核准，
   * 但一分鐘都不算。畫面與數字各自都沒有異常，是最難查的一種錯。
   */
  it.each([
    ["缺核准分鐘", null, 120],
    ["缺認列分鐘", 180, null],
    ["兩者都缺", null, null],
  ])("已核准但 %s：擋下", (_label, approvedMinutes, recognizedMinutes) => {
    expect(() =>
      assertOvertimeFilingType({
        ...approved,
        approvedMinutes,
        recognizedMinutes,
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });

  it.each([
    OvertimeRequestStatus.PENDING,
    OvertimeRequestStatus.REJECTED,
    OvertimeRequestStatus.WITHDRAWN,
  ])("%s 的單子帶著核准分鐘：擋下（駁回後留著會像曾經核准過）", (status) => {
    expect(() =>
      assertOvertimeFilingType({
        ...approved,
        status,
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });

  /**
   * Info: (20260817 - Julian) 認列 = min(核准, 事實)。這條擋的是
   * 「主管核准 1 小時、系統卻認列 3 小時」—— 那 2 小時會一路變成
   * 補休或加班費，而沒有任何人核准過它。
   */
  it("認列超過核准：擋下", () => {
    expect(() =>
      assertOvertimeFilingType({
        ...approved,
        approvedMinutes: 60,
        recognizedMinutes: 180,
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });

  it("認列等於核准：通過", () => {
    expect(() =>
      assertOvertimeFilingType({
        ...approved,
        approvedMinutes: 120,
        recognizedMinutes: 120,
      }),
    ).not.toThrow();
  });

  it("認列為零（核准了但當天沒待）：通過", () => {
    expect(() =>
      assertOvertimeFilingType({ ...approved, recognizedMinutes: 0 }),
    ).not.toThrow();
  });

  it.each([
    ["核准為負", -1, 0],
    ["認列為負", 60, -1],
  ])("%s：擋下", (_label, approvedMinutes, recognizedMinutes) => {
    expect(() =>
      assertOvertimeFilingType({
        ...approved,
        approvedMinutes,
        recognizedMinutes,
      }),
    ).toThrow(OvertimeRequestInvariantError);
  });
});
