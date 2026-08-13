import { describe, it, expect } from "@jest/globals";
import {
  MINUTES_PER_DAY,
  PresenceStatus,
  PunchType,
} from "@/constants/attendance";
import {
  findOpenSession,
  IPresencePunch,
  isExpectedAbsent,
  isPresenceStale,
  resolvePresence,
} from "@/lib/attendance_presence";
import { buildRosterCsv } from "@/lib/utils/attendance_roster_csv";
import { isoDateTimeLabel } from "@/lib/utils/attendance_format";
import { IPresenceRoster, IShiftWindow } from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 現場在班狀態的推導與點名匯出。
 *
 * 推導層是純函數（不碰資料庫、不取現在時間），因此每一條都能挑一個
 * 讓邊界剛好落在有意義位置的時刻 —— 而這個模組的每一條規則都是邊界規則。
 */

// Info: (20260813 - Julian) 工地日班 07:30–17:00
const SITE_DAY: IShiftWindow = {
  windowStartMinute: 450,
  windowEndMinute: 1020,
  coreStartMinute: 450,
  coreEndMinute: 1020,
  requiredWorkMinutes: 480,
  breakMinutes: 60,
};

// Info: (20260813 - Julian) 夜間施工班 20:00 → 次日 05:00（窗迄 1740 已跨日曆日）
const SITE_NIGHT: IShiftWindow = {
  windowStartMinute: 1200,
  windowEndMinute: 1740,
  coreStartMinute: 1200,
  coreEndMinute: 1740,
  requiredWorkMinutes: 420,
  breakMinutes: 60,
};

// Info: (20260813 - Julian) 工程師彈性班：窗 07:00–20:00，核心 10:00–16:00
const FLEXIBLE: IShiftWindow = {
  windowStartMinute: 420,
  windowEndMinute: 1200,
  coreStartMinute: 600,
  coreEndMinute: 960,
  requiredWorkMinutes: 420,
  breakMinutes: 60,
};

const POLICY = { staleGraceMinutes: 3, minutesPerDay: MINUTES_PER_DAY };

const punch = (
  punchType: PunchType,
  minuteOfDay: number,
  workLocationId = "loc-a",
): IPresencePunch => ({ punchType, minuteOfDay, workLocationId });

describe("attendance_presence", () => {
  describe("找出還開著的那一段上班", () => {
    it("一天多次進出時取最後一次進場，而不是第一次", () => {
      /**
       * Info: (20260813 - Julian) 工地人員中途離場再回來是常態。
       * 名單上該顯示的是「他現在這一趟從幾點開始」。
       */
      const open = findOpenSession([
        punch(PunchType.CLOCK_IN, 450),
        punch(PunchType.CLOCK_OUT, 720),
        punch(PunchType.CLOCK_IN, 780, "loc-b"),
      ]);

      expect(open).toEqual({ sinceMinute: 780, workLocationId: "loc-b" });
    });

    it("順序不影響結果 —— 排序在函式內做", () => {
      const open = findOpenSession([
        punch(PunchType.CLOCK_OUT, 1020),
        punch(PunchType.CLOCK_IN, 450),
      ]);
      expect(open).toBeNull();
    });

    it("完整的一進一出代表人已經走了", () => {
      expect(
        findOpenSession([
          punch(PunchType.CLOCK_IN, 450),
          punch(PunchType.CLOCK_OUT, 1020),
        ]),
      ).toBeNull();
    });
  });

  describe("ON_SITE 與 STALE 的分界", () => {
    it("窗迄剛過但還在寬限內仍是在班 —— 否則每個正常下班的人都會先閃一下黃燈", () => {
      expect(
        isPresenceStale({
          nowMinuteOfDay: 1022,
          shift: SITE_DAY,
          ...POLICY,
        }),
      ).toBe(false);
    });

    it("寬限用完仍無下班卡即轉 STALE", () => {
      expect(
        isPresenceStale({ nowMinuteOfDay: 1024, shift: SITE_DAY, ...POLICY }),
      ).toBe(true);
    });

    it("邊界那一分鐘算在班（大於才成立）", () => {
      expect(
        isPresenceStale({ nowMinuteOfDay: 1023, shift: SITE_DAY, ...POLICY }),
      ).toBe(false);
    });

    it("無排班時退回以整個日曆日為窗", () => {
      expect(
        isPresenceStale({ nowMinuteOfDay: 1400, shift: null, ...POLICY }),
      ).toBe(false);
      expect(
        isPresenceStale({ nowMinuteOfDay: 1444, shift: null, ...POLICY }),
      ).toBe(true);
    });
  });

  describe("跨夜班：只看今天的話，凌晨的看板會顯示零人", () => {
    it("昨天 20:05 進場、今天凌晨兩點仍在班", () => {
      const session = resolvePresence(
        [
          // Info: (20260813 - Julian) 今天（8/13）還沒有任何打卡
          {
            workDate: "2026-08-13",
            punches: [],
            shift: null,
            nowMinuteOfDay: 120,
          },
          // Info: (20260813 - Julian) 昨天（8/12）的夜班，現在相當於昨日的 1560 分
          {
            workDate: "2026-08-12",
            punches: [punch(PunchType.CLOCK_IN, 1205)],
            shift: SITE_NIGHT,
            nowMinuteOfDay: 1560,
          },
        ],
        POLICY,
      );

      expect(session).toEqual({
        workDate: "2026-08-12",
        sinceMinute: 1205,
        workLocationId: "loc-a",
        status: PresenceStatus.ON_SITE,
      });
    });

    it("夜班窗迄加寬限過了仍無下班卡 → STALE（示範資料的主角）", () => {
      const session = resolvePresence(
        [
          {
            workDate: "2026-08-13",
            punches: [],
            shift: null,
            nowMinuteOfDay: 840,
          },
          {
            // Info: (20260813 - Julian) 今天 14:00 相當於昨日的 2280 分，遠超窗迄 1740 + 3
            workDate: "2026-08-12",
            punches: [punch(PunchType.CLOCK_IN, 1205)],
            shift: SITE_NIGHT,
            nowMinuteOfDay: 2280,
          },
        ],
        POLICY,
      );

      expect(session?.status).toBe(PresenceStatus.STALE);
      expect(session?.workDate).toBe("2026-08-12");
    });

    it("昨天忘了打下班卡、今天已正常上下班的人不算在現場", () => {
      /**
       * Info: (20260813 - Julian) 「最近一個有打卡的工作日說了算」。
       * 若改成「找第一個未關閉的段落」，昨天那一段永遠開著，
       * 這個人會被永久釘在現場名單上。
       */
      const session = resolvePresence(
        [
          {
            workDate: "2026-08-13",
            punches: [
              punch(PunchType.CLOCK_IN, 450),
              punch(PunchType.CLOCK_OUT, 1020),
            ],
            shift: SITE_DAY,
            nowMinuteOfDay: 1100,
          },
          {
            workDate: "2026-08-12",
            punches: [punch(PunchType.CLOCK_IN, 1205)],
            shift: SITE_NIGHT,
            nowMinuteOfDay: 2540,
          },
        ],
        POLICY,
      );

      expect(session).toBeNull();
    });

    it("完全沒有打卡紀錄就不在名單上", () => {
      expect(
        resolvePresence(
          [
            {
              workDate: "2026-08-13",
              punches: [],
              shift: SITE_DAY,
              nowMinuteOfDay: 600,
            },
          ],
          POLICY,
        ),
      ).toBeNull();
    });
  });

  describe("未到工：門檻取核心起而不是窗起", () => {
    it("彈性班在窗起之後、核心起之前不算未到工", () => {
      /**
       * Info: (20260813 - Julian) 窗起 07:00、核心起 10:00。以窗起為門檻，
       * 每天七點過後所有彈性班同仁都會被列成未到工 —— 而那是他們正當的彈性。
       * 一個每天早上都在報警的數字，不會有人看第二次。
       */
      expect(
        isExpectedAbsent({
          nowMinuteOfDay: 540,
          shift: FLEXIBLE,
          lateGraceMinutes: 5,
          hasAnyPunch: false,
        }),
      ).toBe(false);
    });

    it("過了核心起加寬限仍無打卡才算未到工", () => {
      expect(
        isExpectedAbsent({
          nowMinuteOfDay: 606,
          shift: FLEXIBLE,
          lateGraceMinutes: 5,
          hasAnyPunch: false,
        }),
      ).toBe(true);
    });

    it("有任何打卡就不算未到工，即使遲到", () => {
      expect(
        isExpectedAbsent({
          nowMinuteOfDay: 900,
          shift: FLEXIBLE,
          lateGraceMinutes: 5,
          hasAnyPunch: true,
        }),
      ).toBe(false);
    });
  });

  describe("點名 CSV", () => {
    const roster = (
      name: string,
      entries: IPresenceRoster["entries"],
    ): IPresenceRoster => ({
      workLocationId: "loc-a",
      code: "LOC-A",
      name,
      observedAt: "2026-08-13T06:00:00.000Z",
      timeZone: "Asia/Taipei",
      entries,
    });

    const labels = {
      generatedAt: "產出時間",
      generatedBy: "產出者",
      timeZone: "時區",
      location: "地點",
      employeeNo: "工號",
      name: "姓名",
      department: "部門",
      jobTitle: "職稱",
      since: "上班打卡時間",
      status: "狀態",
      statusOnSite: "在班",
      statusStale: "未打下班卡",
      none: "—",
    };

    const entry = (overrides: Partial<IPresenceRoster["entries"][number]>) => ({
      employeeId: "emp-5",
      employeeNo: "EMP005",
      name: "張文彬",
      departmentName: "第一工務所",
      jobTitle: "工地主任",
      status: PresenceStatus.ON_SITE,
      workDate: "2026-08-13",
      sinceMinute: 452,
      workLocationId: "loc-a",
      workLocationName: "大漢溪橋梁工區",
      ...overrides,
    });

    it("表頭帶產出時間與產出者 —— 事故調查時與名單本身同等重要", () => {
      const csv = buildRosterCsv({
        rosters: [roster("大漢溪橋梁工區", [entry({})])],
        labels,
        generatedAt: "2026/08/13 14:00:00",
        generatedBy: "王小明（EMP002）",
        timeZone: "Asia/Taipei",
      });

      expect(csv).toContain("產出時間,2026/08/13 14:00:00");
      expect(csv).toContain("產出者,王小明（EMP002）");
      expect(csv).toContain("時區,Asia/Taipei");
    });

    it("以 BOM 開頭並用 CRLF 換行，否則 Excel 開出來是亂碼", () => {
      const csv = buildRosterCsv({
        rosters: [roster("大漢溪橋梁工區", [entry({})])],
        labels,
        generatedAt: "2026/08/13 14:00:00",
        generatedBy: "王小明（EMP002）",
        timeZone: "Asia/Taipei",
      });

      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain("\r\n");
    });

    it("含逗號的工區名稱要跳脫，否則整份名單的欄位會往後錯一格", () => {
      const csv = buildRosterCsv({
        rosters: [roster("第二工區（南側）, 臨時便道", [entry({})])],
        labels,
        generatedAt: "2026/08/13 14:00:00",
        generatedBy: "王小明（EMP002）",
        timeZone: "Asia/Taipei",
      });

      expect(csv).toContain('"第二工區（南側）, 臨時便道"');
    });

    it("STALE 的人一定在名單上並標示出來 —— 他們是最需要優先確認的對象", () => {
      const csv = buildRosterCsv({
        rosters: [
          roster("大漢溪橋梁工區", [
            entry({ status: PresenceStatus.STALE, employeeNo: "EMP010" }),
          ]),
        ],
        labels,
        generatedAt: "2026/08/13 14:00:00",
        generatedBy: "王小明（EMP002）",
        timeZone: "Asia/Taipei",
      });

      expect(csv).toContain("EMP010");
      expect(csv).toContain("未打下班卡");
    });

    it("跨夜班的進場時間帶出正確的日期，不只印時分", () => {
      // Info: (20260813 - Julian) 8/12 的 1205 分即 20:05；2745 分則落到 8/13 21:45
      expect(isoDateTimeLabel("2026-08-12", 1205)).toBe("2026-08-12 20:05");
      expect(isoDateTimeLabel("2026-08-12", 1740)).toBe("2026-08-13 05:00");

      const csv = buildRosterCsv({
        rosters: [
          roster("夜間工區", [
            entry({ workDate: "2026-08-12", sinceMinute: 1205 }),
          ]),
        ],
        labels,
        generatedAt: "2026/08/13 02:00:00",
        generatedBy: "王小明（EMP002）",
        timeZone: "Asia/Taipei",
      });

      expect(csv).toContain("2026-08-12 20:05");
    });

    it("沒有人的地點不產生任何資料列，但表頭仍在", () => {
      const csv = buildRosterCsv({
        rosters: [roster("空工區", [])],
        labels,
        generatedAt: "2026/08/13 14:00:00",
        generatedBy: "王小明（EMP002）",
        timeZone: "Asia/Taipei",
      });

      const lines = csv.split("\r\n").filter((line) => line.length > 0);
      // Info: (20260813 - Julian) 產出時間、產出者、時區、欄位標題，共四行
      expect(lines).toHaveLength(4);
    });
  });
});
