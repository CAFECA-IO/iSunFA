import { randomUUID } from "crypto";
import type {
  Department,
  Employee,
  JobTitle,
  ShiftPattern,
  WorkLocation,
} from "@/generated";
/**
 * Info: (20260813 - Julian) enum 一律取 `@/constants/*` 的鏡像，不取 `@/generated`。
 *
 * Prisma 產生的是**字面量聯集**，`@/constants` 的是 **TS string enum**（名義型別）——
 * 前者不能指派給後者。而本腳本產出的 `IAttendancePunchInput` 用的是後者，
 * 混用會在 `punchType` 上編譯失敗。TS enum 寫進 Prisma 是合法的（反向才不行），
 * 因此統一取鏡像即可，兩邊的同步由 `hr_enum_mirror.test.ts` 保證。
 */
import {
  DEMO_ACCOUNT_BOOK_ID,
  DEMO_MAX_ACCURACY_METERS,
  PunchType,
  PunchVerification,
  WorkDayType,
} from "@/constants/attendance";
import { EmployeeStatus, Gender } from "@/constants/hr_management";
import { LeaveRequestStatus, LeaveType } from "@/constants/leave";
import { prisma } from "@/lib/prisma";
import { dbRepo } from "@/repositories/db.repo";
import { activeKeyOf } from "@/repositories/leave.repo";
import { encryptPii } from "@/lib/hr_pii_crypto";
import { HrPiiTable } from "@/constants/hr_pii";
import { calculateDistanceKm } from "@/lib/utils/geo";
import { evaluateAttendanceDay } from "@/lib/attendance_rules";
import { IShiftWindow } from "@/interfaces/attendance";
import { attendancePunchRepo } from "@/repositories/attendance_punch.repo";
import { assertSchedulableDay } from "@/repositories/attendance_schedule_invariant";

/**
 * Info: (20260813 - Julian) 工程機關版簽到系統展示資料。
 *
 * 資料規格見 `documents/architecture/attendance_demo_mock_data.md`；
 * 演示流程與檢查清單見 `attendance_demo_runbook.md`。
 *
 * ## 執行
 *
 * ```
 * DEMO_SITE_A_LAT=25.0xxxxx DEMO_SITE_A_LNG=121.4xxxxx \
 *   npx tsx scripts/seed/seed_attendance_demo.ts
 * ```
 *
 * ## 三個會讓腳本直接中止的前提
 *
 * 1. **`HR_PII_KEY_V1` 未設定** —— 員工的 `phoneCipher` 與打卡座標都要加密，
 *    沒有金鑰 `encryptPii()` 會拋 `HrPiiKeyError`。
 * 2. **`DEMO_SITE_A_LAT` / `_LNG` 未設定** —— 演示現場的座標必須實地校準
 *    （執行手冊 §3）。刻意不給預設值：預設值會被沿用，而沿用的後果是
 *    演示當天主角站在現場卻打不了卡。
 * 3. **圍欄互相重疊** —— 打卡命中多個圍欄時取距離最小者，重疊區的歸屬
 *    會讓現場人數安靜地算錯。不會報錯的失敗最危險，所以在這裡先斷言。
 *
 * ## 可重複執行
 *
 * 清空範圍**限定在這個 demo 帳本內**（`accountBookId` 條件）。
 * 一支會清掉整張表的 seed 腳本，遲早會有人在錯的環境跑它。
 */

// Info: (20260813 - Julian) 演示日期。改期必須改這裡並重跑 —— 所有相對日期都由它推算
const DEMO_DATE = "2026-08-13";
const HISTORY_FROM = "2026-08-03";
const HISTORY_TO = "2026-08-12";
const SCHEDULE_FROM = "2026-08-01";
const SCHEDULE_TO = "2026-08-21";

// Info: (20260813 - Julian) 因雨停工日（機關公告）。暫借 HOLIDAY，見 WorkDayType 的 ToDo
const SUSPENDED_DATE = "2026-08-07";
// Info: (20260813 - Julian) 颱風後搶修：排班仍是休息日，但有打卡 → 判定為 OFF_DAY 且無異常
const TYPHOON_REPAIR_DATE = "2026-08-08";

/**
 * Info: (20260813 - Julian) 與打卡頁共用同一份帳本 ID。
 *
 * 種子腳本與前端各自 hardcode 一份的話，改錯一邊的症狀是
 * 「打卡頁一片空白但資料庫裡明明有資料」—— 那極難查，因此只留一個來源。
 */
const ACCOUNT_BOOK_ID = DEMO_ACCOUNT_BOOK_ID;
const TEAM_ID = "demo-team-public-works";

/**
 * Info: (20260813 - Julian) 台北固定 UTC+8，全年無日光節約。
 *
 * 這是**種子資料**才容許的簡化：正式路徑一律走
 * `@/lib/utils/attendance_time` 的 `Intl` 換算，那裡不能假設任何固定偏移。
 * 這裡寫死是為了讓「這一筆是當地幾點」在讀腳本時一眼看得出來。
 */
const TAIPEI_OFFSET_HOURS = 8;

const at = (isoDate: string, hour: number, minute: number): Date => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hour - TAIPEI_OFFSET_HOURS, minute),
  );
};

const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
};

const weekdayOf = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const datesBetween = (from: string, to: string): string[] => {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
};

/**
 * Info: (20260813 - Julian) 決定性偽亂數（FNV-1a）。
 *
 * 打卡時間與座標擾動都靠它，因此**同一份 seed 重跑得到完全相同的資料** ——
 * 彩排會跑很多次，而每次資料都不一樣的話，前一次核對過的畫面就白核對了。
 */
const pseudoRandom = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0xffffffff;
};

const spread = (seed: string, min: number, max: number): number =>
  min + Math.floor(pseudoRandom(seed) * (max - min + 1));

// Info: (20260813 - Julian) ===== 主檔資料（規格見展示資料文件 §2–§6）=====

const DEPARTMENTS = [
  { code: "DEP-000", name: "工程處本部", parent: null, location: "LOC-HQ" },
  {
    code: "DEP-004",
    name: "品管與職安室",
    parent: "DEP-000",
    location: "LOC-HQ",
  },
  {
    code: "DEP-001",
    name: "第一工務所（大漢溪橋梁改建工程）",
    parent: "DEP-000",
    location: "LOC-A",
  },
  {
    code: "DEP-002",
    name: "第二工務所（台北港聯外道路拓寬工程）",
    parent: "DEP-000",
    location: "LOC-B",
  },
  {
    code: "DEP-003",
    name: "第三工務所（林口污水管線工程）",
    parent: "DEP-000",
    location: "LOC-C",
  },
];

const JOB_TITLES = [
  { code: "JT-DIRECTOR", title: "工程處長", level: 9 },
  { code: "JT-SITE-CHIEF", title: "工地主任", level: 7 },
  { code: "JT-SUPERVISOR", title: "監造工程師", level: 6 },
  { code: "JT-SITE-ENG", title: "工地工程師", level: 5 },
  { code: "JT-QC-ENG", title: "品管工程師", level: 5 },
  { code: "JT-SAFETY", title: "職業安全衛生管理員", level: 5 },
  { code: "JT-SURVEY", title: "測量工程師", level: 4 },
  { code: "JT-MATERIAL", title: "材料試驗員", level: 3 },
  { code: "JT-ADMIN", title: "工務行政", level: 3 },
];

/**
 * Info: (20260813 - Julian) 四種班別。分鐘值以當地 00:00 起算，>= 1440 表次日。
 *
 * 三種固定班（窗＝核心）都留 30 分鐘餘裕（窗長 − 休息 − 應工作）：
 * 沒有餘裕的話，任何一分鐘的遲到都會連帶觸發工時不足，
 * 而 P4 的對照就會變成「一個兩筆異常、一個一筆異常」而失效。
 */
const SHIFT_PATTERNS = [
  {
    code: "SITE-DAY",
    name: "工地日班",
    windowStartMinute: 450,
    windowEndMinute: 1020,
    coreStartMinute: 450,
    coreEndMinute: 1020,
    requiredWorkMinutes: 480,
    breakMinutes: 60,
  },
  {
    code: "SITE-NIGHT",
    name: "夜間施工班",
    windowStartMinute: 1200,
    windowEndMinute: 1740,
    coreStartMinute: 1200,
    coreEndMinute: 1740,
    requiredWorkMinutes: 450,
    breakMinutes: 60,
  },
  {
    code: "ENG-FLEX",
    name: "工程師彈性班",
    windowStartMinute: 420,
    windowEndMinute: 1200,
    coreStartMinute: 600,
    coreEndMinute: 960,
    requiredWorkMinutes: 480,
    breakMinutes: 60,
  },
  {
    code: "OFFICE-98",
    name: "本部行政班",
    windowStartMinute: 540,
    windowEndMinute: 1110,
    coreStartMinute: 540,
    coreEndMinute: 1110,
    requiredWorkMinutes: 480,
    breakMinutes: 60,
  },
];

/**
 * Info: (20260813 - Julian) 員工名冊。
 *
 * `email` 全部虛構，**除了 EMP005 / EMP006** —— 那兩位是上台演示者，
 * 必須改成他們真實的公司 Google 帳號（首登才綁得上員工檔）。
 * 由 env 覆寫，避免把真人信箱 commit 進 repo。
 *
 * 不建立身分證字號、生日、住址、銀行帳戶：demo 不需要，
 * 而編造的身分證字號無論通不通過檢查碼驗證都是問題。
 */
interface ISeedEmployee {
  no: string;
  name: string;
  gender: Gender;
  dept: string;
  title: string;
  shift: string;
  manager: string | null;
  status?: EmployeeStatus;
}

const EMPLOYEES: ISeedEmployee[] = [
  {
    no: "EMP001",
    name: "陳志明",
    gender: Gender.MALE,
    dept: "DEP-000",
    title: "JT-DIRECTOR",
    shift: "OFFICE-98",
    manager: null,
  },
  {
    no: "EMP002",
    name: "林淑芬",
    gender: Gender.FEMALE,
    dept: "DEP-000",
    title: "JT-ADMIN",
    shift: "OFFICE-98",
    manager: "EMP001",
  },
  {
    no: "EMP003",
    name: "黃建豪",
    gender: Gender.MALE,
    dept: "DEP-004",
    title: "JT-SAFETY",
    shift: "ENG-FLEX",
    manager: "EMP001",
  },
  {
    no: "EMP004",
    name: "吳佩君",
    gender: Gender.FEMALE,
    dept: "DEP-004",
    title: "JT-QC-ENG",
    shift: "ENG-FLEX",
    manager: "EMP003",
  },
  {
    no: "EMP005",
    name: "張文彬",
    gender: Gender.MALE,
    dept: "DEP-001",
    title: "JT-SITE-CHIEF",
    shift: "SITE-DAY",
    manager: "EMP001",
  },
  {
    no: "EMP006",
    name: "李冠廷",
    gender: Gender.MALE,
    dept: "DEP-001",
    title: "JT-SITE-ENG",
    shift: "SITE-DAY",
    manager: "EMP005",
  },
  {
    no: "EMP007",
    name: "王雅琪",
    gender: Gender.FEMALE,
    dept: "DEP-001",
    title: "JT-SURVEY",
    shift: "SITE-DAY",
    manager: "EMP005",
  },
  {
    no: "EMP008",
    name: "鄭俊翔",
    gender: Gender.MALE,
    dept: "DEP-001",
    title: "JT-MATERIAL",
    shift: "SITE-DAY",
    manager: "EMP005",
    status: EmployeeStatus.PROBATION,
  },
  {
    no: "EMP009",
    name: "蔡明修",
    gender: Gender.MALE,
    dept: "DEP-002",
    title: "JT-SITE-CHIEF",
    shift: "SITE-DAY",
    manager: "EMP001",
  },
  {
    no: "EMP010",
    name: "許家豪",
    gender: Gender.MALE,
    dept: "DEP-002",
    title: "JT-SITE-ENG",
    shift: "SITE-NIGHT",
    manager: "EMP009",
  },
  {
    no: "EMP011",
    name: "周欣怡",
    gender: Gender.FEMALE,
    dept: "DEP-002",
    title: "JT-SUPERVISOR",
    shift: "ENG-FLEX",
    manager: "EMP009",
  },
  {
    no: "EMP012",
    name: "賴世昌",
    gender: Gender.MALE,
    dept: "DEP-003",
    title: "JT-SITE-CHIEF",
    shift: "SITE-DAY",
    manager: "EMP001",
  },
];

const DEPARTMENT_MANAGERS: Record<string, string> = {
  "DEP-000": "EMP001",
  "DEP-004": "EMP003",
  "DEP-001": "EMP005",
  "DEP-002": "EMP009",
  "DEP-003": "EMP012",
};

/**
 * Info: (20260813 - Julian) 刻意佈置的異常。
 *
 * 沒有這些，出勤總覽會是一片綠色 —— **而一片綠色什麼也證明不了**。
 * `in` / `out` 為當地時刻；`outNextDay` 表示下班落在次日（夜班）。
 * 每一筆的預期判定結果見展示資料 §8，並由
 * `src/__tests__/attendance_rules.test.ts` 驗算。
 */
interface IScriptedPunch {
  date: string;
  employeeNo: string;
  in?: [number, number];
  out?: [number, number];
  outNextDay?: boolean;
  note: string;
}

const SCRIPTED_PUNCHES: IScriptedPunch[] = [
  {
    date: "2026-08-05",
    employeeNo: "EMP006",
    in: [8, 15],
    out: [17, 5],
    note: "遲到 45 分 ＋ 工時不足 15 分（一天多個異常）",
  },
  {
    date: "2026-08-06",
    employeeNo: "EMP008",
    in: [7, 25],
    out: [16, 40],
    note: "早退 20 分（單一異常，與上一筆對照）",
  },
  {
    date: "2026-08-11",
    employeeNo: "EMP007",
    note: "曠職 —— 排了班完全沒到工，出工查核的核心",
  },
  {
    date: "2026-08-12",
    employeeNo: "EMP012",
    out: [17, 2],
    note: "漏打上班卡",
  },
  {
    date: "2026-08-12",
    employeeNo: "EMP010",
    in: [20, 5],
    note: "夜班漏打下班卡；同時是演示當日 STALE 的來源",
  },
  {
    date: "2026-08-06",
    employeeNo: "EMP011",
    in: [9, 30],
    out: [17, 0],
    note: "彈性班工時不足 90 分（不遲到、不早退）",
  },
  {
    date: "2026-08-12",
    employeeNo: "EMP002",
    in: [9, 47],
    out: [18, 30],
    note: "P4 對照 A：固定班 09:47 → 遲到 47 分 ＋ 工時不足 17 分",
  },
  {
    date: "2026-08-12",
    employeeNo: "EMP011",
    in: [9, 47],
    out: [18, 50],
    note: "P4 對照 B：彈性班同一分鐘 → 正常",
  },
  {
    date: TYPHOON_REPAIR_DATE,
    employeeNo: "EMP005",
    in: [8, 0],
    out: [17, 0],
    note: "颱風後搶修：假日出勤不是異常",
  },
  {
    date: TYPHOON_REPAIR_DATE,
    employeeNo: "EMP006",
    in: [8, 0],
    out: [17, 0],
    note: "同上",
  },
  {
    date: "2026-08-05",
    employeeNo: "EMP010",
    in: [20, 2],
    out: [5, 3],
    outNextDay: true,
    note: "跨日夜班：兩筆 workDate 皆為 08-05",
  },
];

/**
 * Info: (20260813 - Julian) 演示當日的打卡。
 *
 * **EMP005 / EMP006 刻意留空** —— 那兩位在台上現場打。
 * 其餘十位由 seed 產生：若全部留空，現場頁在演示開始時是空的，
 * 而「工地上有幾個人」這個主張需要一個有內容的畫面當背景。
 * 說服力來自「歷史是 seed 的，但剛剛那兩筆是真的」，不是「全部都是現場打的」。
 *
 * EMP007 無打卡 → 現場頁的「未到工 1」。
 * EMP010 是夜班，今晚 20:00 才開始，因此今日無打卡。
 */
/**
 * Info: (20260814 - Julian) 今日請假（P6 靠這兩位）。
 *
 * 兩位都在 DEP-001，而 EMP005 是該部門主管 —— 他徵詢的是自己段的人，敘事才順。
 * 這兩位的今日排班會被覆寫成 LEAVE，且**不得有今日打卡**：
 * 現場人數是打卡驅動的，一個「在請假」卻有打卡的人會同時出現在兩份名單上。
 */
const TODAY_LEAVE: {
  no: string;
  leaveType: LeaveType;
  reason: string;
}[] = [
  { no: "EMP007", leaveType: LeaveType.PERSONAL, reason: "家中臨時有事" },
  { no: "EMP008", leaveType: LeaveType.ANNUAL, reason: "家庭旅遊" },
];
const TODAY_LEAVE_NOS = TODAY_LEAVE.map((leave) => leave.no);

const TODAY_PUNCHES: Record<string, [number, number] | null> = {
  EMP001: [8, 52],
  EMP002: [8, 55],
  EMP003: [9, 10],
  EMP004: [9, 35],
  EMP005: null,
  EMP006: null,
  EMP007: null,
  // Info: (20260814 - Julian) 今日請假，不得有打卡（見 TODAY_LEAVE）
  EMP008: null,
  EMP009: [7, 22],
  EMP010: null,
  EMP011: [9, 5],
  EMP012: [7, 31],
};

// Info: (20260813 - Julian) 正常打卡的時刻區間（當地時分），依班別
const NORMAL_WINDOWS: Record<
  string,
  { in: [number, number]; out: [number, number]; outNextDay?: boolean }
> = {
  "SITE-DAY": { in: [440, 449], out: [1022, 1035] },
  "SITE-NIGHT": { in: [1200, 1205], out: [300, 305], outNextDay: true },
  "ENG-FLEX": { in: [510, 540], out: [1110, 1140] },
  "OFFICE-98": { in: [530, 538], out: [1112, 1120] },
};

/**
 * Info: (20260813 - Julian) 種完之後自己用判定引擎驗算一遍。
 *
 * ## 為什麼 seed 要做這件事
 *
 * 出勤總覽頁上會出現什麼，由「班別的六個數值」與「打卡時刻」共同決定 ——
 * 兩者任一被調整，畫面就會變，而**變了不會有任何東西報錯**。
 * 執行手冊 §5.3 因此要求「上台前自己把方格圖看一遍」，
 * 但那是人工檢查，而人工檢查會在第七次彩排時被跳過。
 *
 * 這一段把它機械化：
 *
 * 1. **正常打卡區間的兩端必須判成 NORMAL** —— 否則整片方格圖會混進
 *    莫名其妙的異常，而演示時無法解釋「這個紅點是哪來的」。違反即中止。
 * 2. **刻意佈置的異常印出實際判定結果** —— 與展示資料 §8 對照，
 *    數字對不上時在 seed 階段就看得見，不必等到演示當天。
 */
const POLICY_SNAPSHOT = {
  lateGraceMinutes: 5,
  earlyLeaveGraceMinutes: 5,
  missingClockOutGraceMinutes: 3,
};

const shiftWindowOf = (code: string): IShiftWindow => {
  const pattern = SHIFT_PATTERNS.find((item) => item.code === code)!;
  return {
    windowStartMinute: pattern.windowStartMinute,
    windowEndMinute: pattern.windowEndMinute,
    coreStartMinute: pattern.coreStartMinute,
    coreEndMinute: pattern.coreEndMinute,
    requiredWorkMinutes: pattern.requiredWorkMinutes,
    breakMinutes: pattern.breakMinutes,
  };
};

const evaluate = (
  shiftCode: string,
  inMinute: number | null,
  outMinute: number | null,
) =>
  evaluateAttendanceDay({
    workDate: "seed-check",
    schedule: { dayType: WorkDayType.WORK, shift: shiftWindowOf(shiftCode) },
    punches: [
      ...(inMinute === null
        ? []
        : [{ punchType: PunchType.CLOCK_IN, minuteOfDay: inMinute }]),
      ...(outMinute === null
        ? []
        : [{ punchType: PunchType.CLOCK_OUT, minuteOfDay: outMinute }]),
    ],
    policy: POLICY_SNAPSHOT,
    // Info: (20260813 - Julian) 三天後：代表這一天早已過完，判定不會停在「暫定正常」
    nowMinuteOfDay: 4320,
  });

function verifyGeneratedData(): void {
  console.log("\n🔍 判定引擎驗算");

  /**
   * Info: (20260813 - Julian) 零、每個班別必須有餘裕（窗長 − 休息 − 應工作 > 0）。
   *
   * 這條是展示資料 v1.2 那個修正的教訓：`OFFICE-98` 原本是 09:00–18:00，
   * 窗長 540 扣休息 60 = 480，與應工作分鐘**完全相等 → 餘裕為零**，
   * 於是任何一分鐘的遲到都會同時觸發 `INSUFFICIENT_HOURS`。
   *
   * 那讓 P4 的對照（一個遲到、一個正常）變成「一個兩筆異常、一個一筆異常」。
   * 下面的「正常區間四角落」檢查抓不到它 —— 餘裕為零只在**遲到時**才顯現，
   * 而正常打卡永遠剛好踩線通過。所以必須單獨算一次。
   */
  for (const pattern of SHIFT_PATTERNS) {
    const slack =
      pattern.windowEndMinute -
      pattern.windowStartMinute -
      pattern.breakMinutes -
      pattern.requiredWorkMinutes;
    if (slack <= 0) {
      throw new Error(
        `班別 ${pattern.code} 的餘裕為 ${slack} 分（窗長 − 休息 − 應工作）。` +
          `餘裕 <= 0 時，任何一分鐘的遲到都會連帶觸發工時不足，` +
          `P4 的「一個遲到、一個正常」對照會失效。見展示資料 §5.2 第 0 條。`,
      );
    }
  }
  console.log(
    `   班別餘裕：${SHIFT_PATTERNS.map((p) => `${p.code}=${p.windowEndMinute - p.windowStartMinute - p.breakMinutes - p.requiredWorkMinutes}`).join("、")} 分 ✓`,
  );

  // Info: (20260813 - Julian) 一、正常區間的兩端不得產生任何異常
  for (const [shiftCode, window] of Object.entries(NORMAL_WINDOWS)) {
    /**
     * Info: (20260813 - Julian) 四個角落全測，而不是只測「最早配最早、最晚配最晚」。
     *
     * 真正會踩線的是**最晚進場配最早離場** —— 那是工時最短的組合，
     * 只測對角線會漏掉它，而漏掉的後果是方格圖上冒出幾個解釋不了的黃點。
     */
    for (const [inMinute, outMinute] of [
      [window.in[0], window.out[0]],
      [window.in[0], window.out[1]],
      [window.in[1], window.out[0]],
      [window.in[1], window.out[1]],
    ]) {
      const normalisedOut = window.outNextDay ? outMinute + 1440 : outMinute;
      const result = evaluate(shiftCode, inMinute, normalisedOut);
      if (result.exceptions.length > 0) {
        throw new Error(
          `${shiftCode} 的正常打卡區間會產生異常` +
            `（${inMinute} → ${normalisedOut}）：` +
            `${result.exceptions.map((e) => `${e.type}:${e.minutes}`).join(", ")}。` +
            `班別數值或打卡區間有一邊被改動了 —— 整片方格圖會混進解釋不了的紅點。`,
        );
      }
    }
  }
  console.log("   正常打卡區間：四種班別的四個角落皆判為 NORMAL ✓");

  // Info: (20260813 - Julian) 二、刻意佈置的異常：印出實際結果供對照展示資料 §8
  console.log("   刻意佈置的異常，判定引擎實際算出：");
  for (const scripted of SCRIPTED_PUNCHES) {
    const person = EMPLOYEES.find((item) => item.no === scripted.employeeNo)!;
    const toMinute = (
      time?: [number, number],
      nextDay = false,
    ): number | null =>
      time ? time[0] * 60 + time[1] + (nextDay ? 1440 : 0) : null;

    const result = evaluate(
      person.shift,
      toMinute(scripted.in),
      toMinute(scripted.out, scripted.outNextDay),
    );
    const detail =
      result.exceptions.map((e) => `${e.type} ${e.minutes} 分`).join("、") ||
      "無異常";
    console.log(
      `     ${scripted.date} ${scripted.employeeNo} ${person.shift.padEnd(11)} ${result.status.padEnd(10)} ${detail}`,
    );
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. 演示現場的座標必須實地校準（執行手冊 §3）——` +
        `刻意不給預設值，因為預設值會被沿用，而沿用的後果是演示當天打不了卡。`,
    );
  }
  return value;
}

/**
 * Info: (20260813 - Julian) 座標必須是一個數字，而且要落在合理範圍。
 *
 * 因此檢查三件事：解析得出數字、落在台灣的經緯度範圍、而且經緯度沒有互換。
 * 台灣的緯度約 21.9–25.3、經度約 119.3–122.0，兩個區間不重疊，
 * **所以「把經度填進緯度欄」這種錯是抓得出來的**。
 */
function requireCoordinate(
  name: string,
  range: { min: number; max: number },
): number {
  const raw = requireEnv(name);
  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(
      `${name}="${raw}" 不是一個數字。` +
        `從地圖複製出來的常是「緯度/經度」或「緯度, 經度」的成對字串 ——` +
        `請把兩個數字分別填進 DEMO_SITE_A_LAT 與 DEMO_SITE_A_LNG。`,
    );
  }

  if (value < range.min || value > range.max) {
    throw new Error(
      `${name}=${value} 不在合理範圍 [${range.min}, ${range.max}]。` +
        `台灣的緯度約 21.9–25.3、經度約 119.3–122.0 —— ` +
        `若這個值看起來像另一個欄位的值，就是經緯度填反了。`,
    );
  }

  return value;
}

function buildWorkLocations() {
  return [
    {
      code: "LOC-HQ",
      name: "工程處本部（板橋）",
      latitude: 25.0128,
      longitude: 121.465,
      radiusMeters: 300,
    },
    {
      code: "LOC-A",
      name: "大漢溪橋梁改建工程 工區",
      latitude: requireCoordinate("DEMO_SITE_A_LAT", { min: 21.9, max: 25.3 }),
      longitude: requireCoordinate("DEMO_SITE_A_LNG", {
        min: 119.3,
        max: 122.0,
      }),
      radiusMeters: Number(process.env.DEMO_SITE_A_RADIUS ?? 500),
    },
    {
      code: "LOC-B",
      name: "台北港聯外道路拓寬工程 工區（八里）",
      latitude: 25.155,
      longitude: 121.375,
      radiusMeters: 800,
    },
    {
      code: "LOC-C",
      name: "林口污水管線工程 工區（林口）",
      latitude: 25.0776,
      longitude: 121.38,
      radiusMeters: 800,
    },
  ];
}

/**
 * Info: (20260813 - Julian) 圍欄不可重疊。
 *
 * 打卡命中多個圍欄時取距離最小者，重疊區的歸屬會讓現場人數失真 ——
 * 而那不會報錯，只會安靜地算錯。三個固定地點彼此相距 8–16 公里，
 * 但 `LOC-A` 是實測值，可能落在任何地方（最可能撞到板橋的本部）。
 */
function assertFencesDoNotOverlap(
  locations: ReturnType<typeof buildWorkLocations>,
): void {
  const MARGIN_METRES = 500;

  for (let i = 0; i < locations.length; i += 1) {
    for (let j = i + 1; j < locations.length; j += 1) {
      const a = locations[i];
      const b = locations[j];
      const metres =
        calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude) *
        1000;
      const required = a.radiusMeters + b.radiusMeters + MARGIN_METRES;

      if (metres < required) {
        throw new Error(
          `圍欄重疊：${a.code} 與 ${b.code} 相距 ${Math.round(metres)} m，` +
            `需 > ${required} m。若演示地點就在板橋一帶，請把 LOC-HQ 改到汐止` +
            `（25.0630, 121.6420）—— 見展示資料 §4.2。`,
        );
      }
    }
  }
}

// Info: (20260813 - Julian) 只清這個 demo 帳本的資料。順序依外鍵相依性由子而父
async function clearDemoData(): Promise<void> {
  /**
   * Info: (20260814 - Julian) 假勤先清。`LeaveDay`／`LeaveRecall` 都靠 cascade，
   * 但 `LeaveRequest` 掛在帳本上，不刪的話重跑會累積成好幾份「生效中」的假單 ——
   * 而 `activeKey` 的唯一鍵會在第二次執行時直接撞上。
   */
  await prisma.leaveRequest.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });

  await prisma.attendancePunch.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  await prisma.employeeShiftDay.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  // Info: (20260813 - Julian) 先解開部門主管，否則刪員工會撞上 Department.managerId
  await prisma.department.updateMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
    data: { managerId: null },
  });
  await prisma.employee.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  await prisma.department.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  await prisma.jobTitle.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  await prisma.shiftPattern.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  await prisma.workLocation.deleteMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
}

async function seedAccountBook(): Promise<void> {
  await prisma.team.upsert({
    where: { id: TEAM_ID },
    update: {},
    create: { id: TEAM_ID, name: "示範工程處" },
  });

  await prisma.accountBook.upsert({
    where: { id: ACCOUNT_BOOK_ID },
    update: { name: "示範工程處" },
    create: {
      id: ACCOUNT_BOOK_ID,
      name: "示範工程處",
      country: "TW",
      currency: "TWD",
      rule: "IFRS",
      teamId: TEAM_ID,
    },
  });
}

/**
 * Info: (20260814 - Julian) 半徑與精度門檻必須一起調。
 *
 * `DEMO_MAX_ACCURACY_METERS` 是「精度差到這個程度就拒收」的上限，預設 200。
 * 演示要示範「走出圍欄被拒」時半徑會縮到 60–80 公尺，此時被放行的最差精度
 * 仍是 200 —— 一個站在圈內、精度 150 的人，量到的距離可以落在半徑之外，
 * **人在現場卻打不了卡**（§2.3 明文要避免的那件事）。
 *
 * 文件三處都寫了「半徑縮小要同步調降門檻」，但沒有任何東西擋得住忘記。
 * 這裡擋：門檻不得超過半徑的一半。它與 `assertFencesDoNotOverlap` 同一類 ——
 * 都是「不擋就會安靜地錯，而且錯在演示當下」。
 */
function assertAccuracyThresholdFitsRadius(
  locations: ReturnType<typeof buildWorkLocations>,
): void {
  const demoSite = locations[1];
  const allowed = Math.floor(demoSite.radiusMeters / 2);

  if (DEMO_MAX_ACCURACY_METERS > allowed) {
    throw new Error(
      `精度門檻與圍欄半徑不相稱：DEMO_MAX_ACCURACY_METERS = ${DEMO_MAX_ACCURACY_METERS} m，` +
        `但 ${demoSite.code} 半徑只有 ${demoSite.radiusMeters} m（門檻需 ≤ ${allowed} m）。` +
        `站在圈內但精度不佳的人會被判在圈外。請改 src/constants/attendance.ts 的 ` +
        `DEMO_MAX_ACCURACY_METERS 並重新 build（它是常數不是環境變數），` +
        `或放大 DEMO_SITE_A_RADIUS —— 見執行手冊 §6。`,
    );
  }
}

async function main(): Promise<void> {
  console.log("🏗️  簽到系統展示資料（工程機關版）");

  const locations = buildWorkLocations();
  assertFencesDoNotOverlap(locations);
  assertAccuracyThresholdFitsRadius(locations);
  console.log(
    `   圍欄檢查通過：LOC-A = ${locations[1].latitude}, ${locations[1].longitude}（半徑 ${locations[1].radiusMeters} m）`,
  );

  await seedAccountBook();
  await clearDemoData();

  // Info: (20260813 - Julian) --- 地點 / 職稱 / 班別 ---
  await prisma.workLocation.createMany({
    data: locations.map((location) => ({
      ...location,
      accountBookId: ACCOUNT_BOOK_ID,
    })),
  });
  await prisma.jobTitle.createMany({
    data: JOB_TITLES.map((title) => ({
      ...title,
      accountBookId: ACCOUNT_BOOK_ID,
    })),
  });
  await prisma.shiftPattern.createMany({
    data: SHIFT_PATTERNS.map((shift) => ({
      ...shift,
      accountBookId: ACCOUNT_BOOK_ID,
    })),
  });

  // Info: (20260813 - Julian) --- 部門：先建再回填 parentId（自關聯樹）---
  for (const department of DEPARTMENTS) {
    await prisma.department.create({
      data: {
        code: department.code,
        name: department.name,
        accountBookId: ACCOUNT_BOOK_ID,
      },
    });
  }
  const departments: Department[] = await prisma.department.findMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  const departmentByCode = new Map(
    departments.map((item: Department) => [item.code, item]),
  );
  for (const department of DEPARTMENTS) {
    if (!department.parent) continue;
    await prisma.department.update({
      where: { id: departmentByCode.get(department.code)!.id },
      data: { parentId: departmentByCode.get(department.parent)!.id },
    });
  }

  const jobTitles: JobTitle[] = await prisma.jobTitle.findMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  const jobTitleByCode = new Map(
    jobTitles.map((item: JobTitle) => [item.code, item]),
  );
  const shifts: ShiftPattern[] = await prisma.shiftPattern.findMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  const shiftByCode = new Map(
    shifts.map((item: ShiftPattern) => [item.code, item]),
  );
  const workLocations: WorkLocation[] = await prisma.workLocation.findMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  const locationByCode = new Map(
    workLocations.map((item: WorkLocation) => [item.code, item]),
  );

  /**
   * Info: (20260813 - Julian) --- 員工 ---
   *
   * id 由應用層產生：`phoneCipher` 的 AAD 綁定 `表名:列id:欄位名:代次`，
   * 而加密發生在 insert 之前（ADR 018 §3）。
   */
  for (const person of EMPLOYEES) {
    const id = randomUUID();
    const phone = encryptPii(`0912-000-${person.no.slice(-3)}`, {
      table: HrPiiTable.EMPLOYEE,
      field: "phoneCipher",
      recordId: id,
    });

    await prisma.employee.create({
      data: {
        id,
        employeeNo: person.no,
        name: person.name,
        gender: person.gender,
        email:
          process.env[`DEMO_EMAIL_${person.no}`] ??
          `${person.no.toLowerCase()}@demo.example`,
        status: person.status ?? EmployeeStatus.ACTIVE,
        hireDate: at("2024-04-01", 9, 0),
        phoneCipher: phone.cipher,
        piiAlgorithm: phone.algorithm,
        piiKeyVersion: phone.keyVersion,
        accountBookId: ACCOUNT_BOOK_ID,
        departmentId: departmentByCode.get(person.dept)!.id,
        jobTitleId: jobTitleByCode.get(person.title)!.id,
      },
    });
  }

  const employees: Employee[] = await prisma.employee.findMany({
    where: { accountBookId: ACCOUNT_BOOK_ID },
  });
  const employeeByNo = new Map(
    employees.map((item: Employee) => [item.employeeNo, item]),
  );

  // Info: (20260813 - Julian) 回填直屬主管與部門主管（兩者都指向 Employee，必須第二輪）
  for (const person of EMPLOYEES) {
    if (!person.manager) continue;
    await prisma.employee.update({
      where: { id: employeeByNo.get(person.no)!.id },
      data: { managerId: employeeByNo.get(person.manager)!.id },
    });
  }
  for (const [departmentCode, employeeNo] of Object.entries(
    DEPARTMENT_MANAGERS,
  )) {
    await prisma.department.update({
      where: { id: departmentByCode.get(departmentCode)!.id },
      data: { managerId: employeeByNo.get(employeeNo)!.id },
    });
  }

  /**
   * Info: (20260813 - Julian) --- 排班：先產生週期規則，再套用兩處例外 ---
   *
   * 例外硬寫在規則之後覆寫，比在迴圈裡塞 if 好讀，也好改期。
   * Demo 沒有 `ShiftAssignmentRule` 表，所以「週一到五掛某班」在這裡直接展開成逐日
   * —— 正式版必須補上規則表，否則 HR 要為每人逐日建檔（22 天 × 50 人 = 1,100 筆）。
   */
  const onSiteEmployeeNos = EMPLOYEES.filter((person) =>
    ["DEP-001", "DEP-002", "DEP-003"].includes(person.dept),
  ).map((person) => person.no);

  const shiftDays: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
    dayType: WorkDayType;
    shiftPatternId: string | null;
  }[] = [];

  for (const person of EMPLOYEES) {
    for (const workDate of datesBetween(SCHEDULE_FROM, SCHEDULE_TO)) {
      const weekday = weekdayOf(workDate);
      let dayType: WorkDayType = WorkDayType.WORK;

      if (weekday === 6) dayType = WorkDayType.REST_DAY;
      else if (weekday === 0) dayType = WorkDayType.REGULAR_OFF;

      // Info: (20260813 - Julian) 例外一：因雨停工，只影響三個工務所的現場人員
      if (
        workDate === SUSPENDED_DATE &&
        onSiteEmployeeNos.includes(person.no)
      ) {
        dayType = WorkDayType.HOLIDAY;
      }

      // Info: (20260814 - Julian) 例外三：今日請假。假單是來源，這一格是它的投影
      if (workDate === DEMO_DATE && TODAY_LEAVE_NOS.includes(person.no)) {
        dayType = WorkDayType.LEAVE;
      }

      const shiftPatternId =
        dayType === WorkDayType.WORK ? shiftByCode.get(person.shift)!.id : null;

      /**
       * Info: (20260813 - Julian) 種子腳本也走不變式。
       *
       * `assertSchedulableDay` 的檔頭點名的威脅正是「繞過 service 的寫入 ——
       * 種子腳本、資料遷移、批次匯入」。這裡用 `createMany` 直接進 Prisma，
       * 因此自己補上這一句，否則規則產生器寫錯時會安靜地種出
       * 「上班日沒有班別」的資料，而那要到演示當天看到方格圖才會發現。
       */
      assertSchedulableDay({
        dayType,
        shiftPatternId,
      });

      shiftDays.push({
        accountBookId: ACCOUNT_BOOK_ID,
        employeeId: employeeByNo.get(person.no)!.id,
        workDate,
        dayType,
        shiftPatternId,
      });
    }
  }
  await prisma.employeeShiftDay.createMany({ data: shiftDays });

  /**
   * Info: (20260814 - Julian) --- 今日請假的假單 ---
   *
   * 只建已核准的假單，**不建任何銷假徵詢** —— 那一筆要在演示現場當場產生，
   * 否則畫面一進去就是「徵詢中」，P6 最關鍵的那一步沒有東西可按。
   *
   * `activeKey` 是「同一人同一天只能有一張生效假單」的唯一保證，
   * 組法（`employeeId:workDate`）與 `leave.repo` 必須一致。
   */
  for (const leave of TODAY_LEAVE) {
    const employee = employeeByNo.get(leave.no)!;
    await prisma.leaveRequest.create({
      data: {
        accountBookId: ACCOUNT_BOOK_ID,
        employeeId: employee.id,
        leaveType: leave.leaveType,
        reason: leave.reason,
        status: LeaveRequestStatus.APPROVED,
        decidedByEmployeeId: employeeByNo.get("EMP005")!.id,
        decidedAt: at(DEMO_DATE, 8, 0),
        days: {
          create: {
            workDate: DEMO_DATE,
            activeKey: activeKeyOf(employee.id, DEMO_DATE),
          },
        },
      },
    });
  }

  /**
   * Info: (20260813 - Julian) --- 打卡 ---
   *
   * 先依班別產生正常打卡，再以 `SCRIPTED_PUNCHES` 整日覆寫。
   * 例外一律以「員工 × 日期」為單位整組取代，不做欄位級合併 ——
   * 半筆正常半筆異常的資料沒有人看得懂它想演什麼。
   */
  const scriptedKeys = new Set(
    SCRIPTED_PUNCHES.map((punch) => `${punch.employeeNo}:${punch.date}`),
  );

  interface IPlannedPunch {
    employeeNo: string;
    workDate: string;
    punchType: PunchType;
    at: Date;
  }
  const planned: IPlannedPunch[] = [];

  const pushPunch = (
    employeeNo: string,
    workDate: string,
    punchType: PunchType,
    hour: number,
    minute: number,
    nextDay = false,
  ): void => {
    planned.push({
      employeeNo,
      workDate,
      punchType,
      at: at(nextDay ? addDays(workDate, 1) : workDate, hour, minute),
    });
  };

  for (const person of EMPLOYEES) {
    for (const workDate of datesBetween(HISTORY_FROM, HISTORY_TO)) {
      if (scriptedKeys.has(`${person.no}:${workDate}`)) continue;

      const weekday = weekdayOf(workDate);
      if (weekday === 0 || weekday === 6) continue;
      if (workDate === SUSPENDED_DATE && onSiteEmployeeNos.includes(person.no))
        continue;

      const window = NORMAL_WINDOWS[person.shift];
      const inMinute = spread(
        `${person.no}${workDate}in`,
        window.in[0],
        window.in[1],
      );
      const outMinute = spread(
        `${person.no}${workDate}out`,
        window.out[0],
        window.out[1],
      );

      pushPunch(
        person.no,
        workDate,
        PunchType.CLOCK_IN,
        Math.floor(inMinute / 60),
        inMinute % 60,
      );
      pushPunch(
        person.no,
        workDate,
        PunchType.CLOCK_OUT,
        Math.floor(outMinute / 60),
        outMinute % 60,
        window.outNextDay,
      );
    }
  }

  for (const scripted of SCRIPTED_PUNCHES) {
    if (scripted.in) {
      pushPunch(
        scripted.employeeNo,
        scripted.date,
        PunchType.CLOCK_IN,
        scripted.in[0],
        scripted.in[1],
      );
    }
    if (scripted.out) {
      pushPunch(
        scripted.employeeNo,
        scripted.date,
        PunchType.CLOCK_OUT,
        scripted.out[0],
        scripted.out[1],
        scripted.outNextDay,
      );
    }
  }

  for (const [employeeNo, time] of Object.entries(TODAY_PUNCHES)) {
    if (!time) continue;
    pushPunch(employeeNo, DEMO_DATE, PunchType.CLOCK_IN, time[0], time[1]);
  }

  /**
   * Info: (20260813 - Julian) 落地打卡：座標加密、距離實算。
   *
   * 座標在工地中心加上 ±0.0003 度（約 ±33 公尺）的決定性擾動 ——
   * 讓解密後的座標看起來像真實定位而不是同一個點。
   * 擾動遠小於最小的 300 公尺半徑，因此每一筆都仍在圍欄內。
   */
  const locationCodeOf = (employeeNo: string): string => {
    const person = EMPLOYEES.find((item) => item.no === employeeNo)!;
    return DEPARTMENTS.find((item) => item.code === person.dept)!.location;
  };

  for (const punch of planned) {
    const employee = employeeByNo.get(punch.employeeNo)!;
    const location = locationByCode.get(locationCodeOf(punch.employeeNo))!;

    const jitter = (axis: string): number =>
      (pseudoRandom(`${punch.employeeNo}${punch.workDate}${axis}`) - 0.5) *
      0.0006;
    const latitude = location.latitude + jitter("lat");
    const longitude = location.longitude + jitter("lng");

    const id = randomUUID();
    const context = { table: HrPiiTable.ATTENDANCE_PUNCH, recordId: id };
    const encryptedLat = encryptPii(String(latitude), {
      ...context,
      field: "latitudeCipher",
    });
    const encryptedLng = encryptPii(String(longitude), {
      ...context,
      field: "longitudeCipher",
    });

    /**
     * Info: (20260813 - Julian) 走 repository 而不是直接 `prisma.create`：
     * 那裡會呼叫 `assertStorablePii`，而種子腳本正是那條不變式點名要防的路徑之一。
     */
    await attendancePunchRepo.create({
      id,
      accountBookId: ACCOUNT_BOOK_ID,
      employeeId: employee.id,
      punchType: punch.punchType,
      verification: PunchVerification.GPS,
      punchedAt: punch.at,
      workDate: punch.workDate,
      workLocationId: location.id,
      latitudeCipher: encryptedLat.cipher,
      longitudeCipher: encryptedLng.cipher,
      accuracyMeters: spread(`${id}acc`, 8, 45),
      distanceMeters: Math.round(
        calculateDistanceKm(
          latitude,
          longitude,
          location.latitude,
          location.longitude,
        ) * 1000,
      ),
      piiAlgorithm: encryptedLat.algorithm,
      piiKeyVersion: encryptedLat.keyVersion,
    });
  }

  console.log(
    `   部門 ${DEPARTMENTS.length}、職稱 ${JOB_TITLES.length}、班別 ${SHIFT_PATTERNS.length}、地點 ${locations.length}`,
  );
  console.log(
    `   員工 ${EMPLOYEES.length}、排班 ${shiftDays.length} 筆、打卡 ${planned.length} 筆`,
  );
  console.log(`   刻意佈置的異常 ${SCRIPTED_PUNCHES.length} 組：`);
  for (const scripted of SCRIPTED_PUNCHES) {
    console.log(
      `     ${scripted.date} ${scripted.employeeNo} — ${scripted.note}`,
    );
  }
  verifyGeneratedData();

  /**
   * Info: (20260813 - Julian) 本腳本會重建員工檔，`Employee.userId` 一併歸零。
   *
   * 走 Google 登入時這不是問題 —— 下一次首登會以已驗證的信箱重新綁上。
   * 真正會出事的是信箱對不上，而那件事在 seed 當下就決定了，
   * 所以這句話印在最後：那時候沒有人會再回頭看文件。
   */
  console.log(
    `\n⚠️  員工檔已重建，所有 Employee.userId 已歸零（Google 首登會自動重新綁定）。` +
      `\n   請確認 DEMO_EMAIL_EMP005 / DEMO_EMAIL_EMP006 與上台者實際登入的 Google 帳號完全相同，` +
      `\n   且今日打卡不含這兩位。對不上時的救援見執行手冊 §3.1。`,
  );
  console.log("✅ 完成");
}

main()
  .catch((error) => {
    console.error(
      "❌ seed 失敗：",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => dbRepo.disconnect());
