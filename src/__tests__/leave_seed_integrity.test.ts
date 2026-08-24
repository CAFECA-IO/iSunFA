import { describe, it, expect } from "@jest/globals";
import {
  DEFAULT_LEAVE_POLICY_SEED,
  ILeavePolicySeed,
  LEAVE_POLICY_CODE,
  LEAVE_POLICY_I18N_KEY,
  LeaveAccrualMethod,
  LeaveQuotaMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";
import { assertLeavePolicyUnit } from "@/repositories/leave_policy_invariant";

/**
 * Info: (20260819 - Julian) T23：內建假別的 seed 完整性（ADR 021 §5）。
 *
 * ## 這支守的是什麼
 *
 * ADR 021 把假別做成資料，於是「這個帳本有沒有特休」變成一個**資料問題**
 * 而不是型別問題 —— 少一列不會有編譯錯誤，只會有一個請不了產假的員工。
 * `leave_policy.service.ts:149` 的註解已經把這件事寫下來：內建假別不可停用，
 * 否則「`leave_seed_integrity` 對『每個帳本都有完整的內建假別』的保證
 * 也會變成一句空話」。
 *
 * ## 它先前不存在（review B8）
 *
 * 上面那句註解引用的正是這支測試，而它沒有被寫過 —— 計畫書 §16 列的
 * T1–T29 裡有 12 支同樣如此。這支補上其中一條，其餘的狀態改記在 §16 的
 * 「狀態／里程碑」欄，不再靠讀者去猜（checklist §6：系統宣稱的東西必須真的存在）。
 *
 * ## 它不做什麼
 *
 * 它檢查的是 `DEFAULT_LEAVE_POLICY_SEED` 這份**規格**，不是資料庫裡的資料 ——
 * 「這個帳本真的種進去了嗎」要連得上 DB 才答得出來（見 §16 T23 的狀態欄）。
 * 兩者的分工是：規格錯了這裡紅，種漏了要靠每日勾稽。
 */

const SEED_BY_CODE = new Map<string, ILeavePolicySeed>(
  DEFAULT_LEAVE_POLICY_SEED.map((seed) => [seed.code, seed]),
);

describe("T23：內建假別齊備", () => {
  /**
   * Info: (20260819 - Julian) 「齊備」是雙向的。
   *
   * 少一列 → 那個假別在每一個帳本都請不到；多一列（`LEAVE_POLICY_CODE`
   * 沒有的 code）→ 它沒有 i18n 對照，畫面會直接顯示代號。
   */
  it("十三個代號與 seed 逐一對應，沒有多也沒有少", () => {
    const codes = Object.values(LEAVE_POLICY_CODE).sort();
    const seeded = DEFAULT_LEAVE_POLICY_SEED.map((seed) => seed.code).sort();
    expect(seeded).toEqual(codes);
    expect(seeded).toHaveLength(13);
  });

  it("沒有重複的代號", () => {
    expect(SEED_BY_CODE.size).toBe(DEFAULT_LEAVE_POLICY_SEED.length);
  });

  it("每一個代號都有五語系會用到的 i18n key", () => {
    for (const seed of DEFAULT_LEAVE_POLICY_SEED) {
      expect(LEAVE_POLICY_I18N_KEY[seed.code]).toMatch(
        /^hr_management\.leave\.policy_/,
      );
    }
  });

  /**
   * Info: (20260819 - Julian) 併入目標必須是同一份 seed 裡的代號。
   *
   * 指向一個不存在的代號，seed 當下不會失敗（那時還沒有那一列），
   * 而是在合併統計時靜默算不到 —— 那個假別的天數會憑空消失。
   */
  it("mergesIntoCode 都指得到同一份 seed 裡的代號", () => {
    for (const seed of DEFAULT_LEAVE_POLICY_SEED) {
      if (seed.mergesIntoCode === null) continue;
      expect(SEED_BY_CODE.has(seed.mergesIntoCode)).toBe(true);
      // Info: (20260819 - Julian) 不得自我併計（`assertLeavePolicyUnit` 也擋，這裡是規格側）
      expect(seed.mergesIntoCode).not.toBe(seed.code);
    }
  });
});

describe("T23：內建假別必須通過寫入不變式", () => {
  /**
   * Info: (20260819 - Julian) seed 走的是 repository，因此它必須自己過得了
   * 那道門。這一條紅了代表「內建規格」與「允許寫入的形狀」對不起來 ——
   * 而那會在跑 seed 的當下才炸，且是在建帳本的流程中間。
   */
  it.each(DEFAULT_LEAVE_POLICY_SEED.map((seed) => [seed.code, seed] as const))(
    "%s",
    (_code, seed) => {
      /**
       * Info: (20260819 - Julian) 欄位逐一列出，與 `seed_attendance_demo.ts`
       * 的呼叫**完全一致**（含 `mergesIntoPolicyId: null` —— 併計關係在
       * 第二趟才回填，種第一趟時還沒有 id）。
       *
       * 不用 `...seed` 整包丟：`ILeavePolicySeed` 帶著 `code`、`mergesIntoCode`、
       * `tiers` 這些 `IStorableLeavePolicy` 沒有的欄位，整包丟會過不了型別，
       * 而挑幾個丟又會與正式 seed 的呼叫形狀分岔 —— 那一分岔，這支測試
       * 驗的就不再是 seed 真正會走的那條路。
       */
      expect(() =>
        assertLeavePolicyUnit({
          accrualMethod: seed.accrualMethod,
          cycleBasis: seed.cycleBasis,
          quotaMode: seed.quotaMode,
          unitBasis: seed.unitBasis,
          minimumUnitMinutes: seed.minimumUnitMinutes,
          annualDays: seed.annualDays,
          cashOutOnExpiry: seed.cashOutOnExpiry,
          mergesIntoPolicyId: null,
          proofRequirement: seed.proofRequirement,
          proofThresholdDays: seed.proofThresholdDays,
        }),
      ).not.toThrow();
    },
  );
});

describe("T23：只落地已查證的數字（ADR 021 §5）", () => {
  /**
   * Info: (20260819 - Julian) 每一列都要說得出它的來源。
   *
   * 「不猜一個數字填進去」這條規矩，在 seed 裡的具體形式就是 `legalBasis`
   * 非空且指得出條號。一列沒有法源的內建假別，日後沒有人判斷得出
   * 那個天數是查來的還是憑印象打的。
   */
  it("每一列都有指得出條號的 legalBasis", () => {
    for (const seed of DEFAULT_LEAVE_POLICY_SEED) {
      expect(seed.legalBasis.trim().length).toBeGreaterThan(0);
      expect(seed.legalBasis).toMatch(/§/);
    }
  });

  /**
   * Info: (20260819 - Julian) `proofThresholdDays` **一律為 null**。
   *
   * 勞工請假規則 §10 只說「雇主得要求勞工提出有關證明文件」，沒有訂日數門檻。
   * 那是公司政策，不是法定數字 —— 內建 seed 填一個看起來合理的 3 天，
   * 會讓每一個租戶以為那是法定的。
   */
  it("proofThresholdDays 一律為 null（法無明文）", () => {
    for (const seed of DEFAULT_LEAVE_POLICY_SEED) {
      expect(seed.proofThresholdDays).toBeNull();
    }
  });

  /**
   * Info: (20260819 - Julian) 現行模型表達不了的部分**必須留白**，
   * 而表達得了的部分照填。
   *
   * 這四種假別的某一個維度取決於**事件屬性**，而 `LeavePolicy` 只有單一
   * `annualDays` 與單一 `paidRatio`（計畫書 §17 缺口 8）。但「表達不了」
   * 是分欄位的，不是整列的：
   *
   * - 喪假：日數依親等 8/6/3 → `annualDays` 留白（填 8 會讓祖父母喪假多給兩日）
   * - 產假：日數是法定的 8 星期 → `annualDays = 56`；
   *   **工資**依年資滿六個月與否而異 → `paidRatio` 留白
   * - 普通傷病假：未住院一年內 30 日是法定的 → `annualDays = 30`；
   *   住院與二年內合計的上限表達不了 → 留在 ToDo，不塞進這一欄
   *
   * 這一條寫得這麼細，是因為第一版把它寫成「三種都 `PER_EVENT` 且
   * `annualDays` 留白」—— 那句話讀起來很整齊，但與 seed 不符，
   * 而且會把兩個查證過的法定數字說成猜測。
   */
  it("喪假的日數留白（依親等 8/6/3，模型表達不了）", () => {
    const seed = SEED_BY_CODE.get(LEAVE_POLICY_CODE.BEREAVEMENT);
    expect(seed?.accrualMethod).toBe(LeaveAccrualMethod.PER_EVENT);
    expect(seed?.annualDays).toBeNull();
  });

  it("產假日數照填 56 日，工資留白（依年資而異）", () => {
    const seed = SEED_BY_CODE.get(LEAVE_POLICY_CODE.MATERNITY);
    expect(seed?.annualDays).toBe(56);
    expect(seed?.paidRatio).toBeNull();
    expect(seed?.legalBasis).toContain("§15");
  });

  it("普通傷病假填未住院的 30 日與折半工資，住院上限留在 ToDo", () => {
    const seed = SEED_BY_CODE.get(LEAVE_POLICY_CODE.SICK);
    expect(seed?.annualDays).toBe(30);
    expect(seed?.paidRatio).toBe(0.5);
    expect(seed?.legalBasis).toContain("§4");
  });

  /**
   * Info: (20260819 - Julian) 反過來也要成立：`paidRatio` 只有 1 / 0.5 / 0 / null
   * 四種。出現 0.7 這種值代表有人在法規欄位上寫了一個猜的數字。
   */
  it("paidRatio 只能是 1、0.5、0 或 null", () => {
    for (const seed of DEFAULT_LEAVE_POLICY_SEED) {
      expect([1, 0.5, 0, null]).toContain(seed.paidRatio);
    }
  });

  /**
   * Info: (20260819 - Julian) 特休的級距就是 §38 那張表，不得為空。
   *
   * 它是唯一一個 `SENIORITY_TIER`，而級距空掉的話 `deriveGrantSchedule`
   * 會丟「SENIORITY_TIER policy has no tiers」—— 在建帳本之後、
   * 第一次授予之前都看不出來。
   */
  it("特休帶著 §38 的年資級距，且封頂 30 日", () => {
    const annual = SEED_BY_CODE.get(LEAVE_POLICY_CODE.ANNUAL);
    expect(annual?.accrualMethod).toBe(LeaveAccrualMethod.SENIORITY_TIER);
    expect(annual?.tiers?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(annual?.legalBasis).toContain("§38");

    const capped = (annual?.tiers ?? []).filter(
      (tier) => tier.maxDays !== null,
    );
    expect(capped.length).toBeGreaterThan(0);
    for (const tier of capped) expect(tier.maxDays).toBe(30);
  });

  /**
   * Info: (20260819 - Julian) 不限額度的假別不得標折現。
   *
   * `UNLIMITED`（公傷病假、產假）沒有額度可扣，也就沒有「屆期未休」
   * 這回事 —— 標了 `cashOutOnExpiry` 會讓折現的 Worker 對著一個
   * 永遠算不出金額的批次跑。`assertLeavePolicyUnit` 也擋，這裡是規格側。
   */
  it("UNLIMITED 的假別不標 cashOutOnExpiry", () => {
    for (const seed of DEFAULT_LEAVE_POLICY_SEED) {
      if (seed.quotaMode !== LeaveQuotaMode.UNLIMITED) continue;
      expect(seed.cashOutOnExpiry).toBe(false);
    }
  });

  /**
   * Info: (20260819 - Julian) 以分鐘為單位的假別必須說得出最小單位。
   *
   * 反方向也是：不以分鐘為單位的假別填了 `minimumUnitMinutes`，
   * 那個數字永遠不會被用到，而讀的人會以為它有效。
   */
  it("FIXED_MINUTES 必有 minimumUnitMinutes，其餘必為 null", () => {
    for (const seed of DEFAULT_LEAVE_POLICY_SEED) {
      if (seed.unitBasis === LeaveUnitBasis.FIXED_MINUTES) {
        expect(seed.minimumUnitMinutes).not.toBeNull();
        expect(seed.minimumUnitMinutes ?? 0).toBeGreaterThan(0);
      } else {
        expect(seed.minimumUnitMinutes).toBeNull();
      }
    }
  });
});
