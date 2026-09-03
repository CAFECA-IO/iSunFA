import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  CarbonInventoryStateSchema,
  CarbonParagraphDraftRequestSchema,
} from "@/validators";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import { CarbonDisclosureFrameworkEnum } from "@/constants/carbon_report_framework";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";

/**
 * Info: (20260903 - Emily) 揭露框架的選擇入口(#6688-A)。
 *
 * 這張票要接的是一條**已經做好但沒有入口**的鏈:`carbonFrameworkView`、
 * 33 節揭露版大綱、合規宣告守門都在,而 `disclosureFramework` 這個欄位
 * 在此之前**零個非測試呼叫端** —— 使用者沒有辦法選,所以那條鏈整段不觸發。
 *
 * ## 判準分兩種,不混用
 *
 * - **行為**:schema 與 validator 都是純函式,直接餵值驗證(下面第一、二組)。
 *   完成判準「選 IFRS 後重載仍是 IFRS」落在第一組 —— 它是往返,不是欄位清單比對
 *   (那個檔案已經被漏宣告咬過兩次,兩次都在巢狀)。
 * - **接線**:沒有 jsdom,所以 hook 與元件那半只宣稱「條文在不在」,不宣稱行為。
 *
 * ## 為什麼不是寫進 carbon_inventory_state_persistence.test.ts
 *
 * 那支住在 `feat/carbon_import_trust`(#6725)上、還沒合入 develop。同名檔案
 * 兩邊各有一份會在合併時衝突,所以本票另立一支、只管自己的兩個欄位。
 * **#6725 合入之後這兩支應該併成一支** —— 併的時候把 fixture 合起來即可,
 * 兩邊的判準是同一個(序列化往返後等價)。
 */

const roundTrip = (state: unknown): unknown => {
  const wire = JSON.parse(JSON.stringify(state));
  const parsed = CarbonInventoryStateSchema.safeParse(wire);
  if (!parsed.success) {
    throw new Error(
      "schema 拒絕了這份狀態:" +
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}:${issue.code}`)
          .join(", "),
    );
  }
  return parsed.data;
};

const baseState = {
  step: CarbonInventoryStep.ORG_PROFILE,
  activities: [],
  updatedAt: "2026-09-03T00:00:00.000Z",
  version: 1,
};

describe("完成判準:選了 IFRS,重載之後仍然是 IFRS", () => {
  it("揭露框架撐過序列化與 schema", () => {
    /**
     * Info: (20260903 - Emily) 「重載」在這條路上就是
     * `JSON.stringify` → 存 → 取回 → `CarbonInventoryStateSchema.safeParse`
     *(見 carbon_inventory_storage.ts)。型別加了而 schema 沒加的話,
     * 這一條會紅 —— 而在此之前那種情況是**靜默**的。
     */
    const state = {
      ...baseState,
      disclosureFramework: CarbonDisclosureFrameworkEnum.IFRS_S1_S2,
    };
    expect(roundTrip(state)).toEqual(JSON.parse(JSON.stringify(state)));
  });

  it("沒選過的狀態往返後仍然沒有這個鍵(不自作主張填預設值)", () => {
    /**
     * Info: (20260903 - Emily) 「沒選」與「選了只出盤查報告書」在儲存層要分得開:
     * 前者是 undefined,後者是 INVENTORY_ONLY。schema 若給預設值,
     * 舊帳本會在下一次存檔時被寫入一個使用者從未做過的選擇。
     */
    const back = roundTrip(baseState) as Record<string, unknown>;
    expect("disclosureFramework" in back).toBe(false);
  });

  it("非法值被擋下(而不是原樣存進去)", () => {
    const parsed = CarbonInventoryStateSchema.safeParse({
      ...baseState,
      disclosureFramework: "IFRS_S3",
    });
    expect(parsed.success).toBe(false);
  });

  it("勾稽阻擋紀錄一併撐過重載(#6707 的欄位,型別有、schema 一直沒有)", () => {
    const state = {
      ...baseState,
      ledgerImportBlocks: [
        {
          paragraphId: "3.8",
          reason: "表3.8 有 6 列解析失敗,整張不入帳",
          blockedAt: "2026-09-03T00:00:00.000Z",
        },
      ],
    };
    expect(roundTrip(state)).toEqual(JSON.parse(JSON.stringify(state)));
  });
});

describe("完成判準:draft 收到的 framework 不再是預設值", () => {
  const payload = {
    paragraphId: CARBON_REPORT_OUTLINE[0].id,
    conversationContext: [],
    framework: CarbonDisclosureFrameworkEnum.IFRS_S1_S2,
  };

  it("請求 schema 收下 framework(沒有這一行,前端傳了也會被剝掉)", () => {
    const parsed = CarbonParagraphDraftRequestSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.framework).toBe(
        CarbonDisclosureFrameworkEnum.IFRS_S1_S2,
      );
    }
  });

  it("省略仍然合法(API 邊界向後相容,既有呼叫端不帶這個欄位)", () => {
    /**
     * Info: (20260903 - Emily) 明確組一份不帶 framework 的 payload,
     * 而不是用 rest 解構把它拆掉 —— 後者會留下一個永遠沒被用到的變數
     *(eslint no-unused-vars 會擋),而且「少了哪一個欄位」看不出來。
     */
    const parsed = CarbonParagraphDraftRequestSchema.safeParse({
      paragraphId: payload.paragraphId,
      conversationContext: payload.conversationContext,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.framework).toBeUndefined();
  });

  it("非法值被擋(不讓任意字串走到 carbonFrameworkView)", () => {
    const parsed = CarbonParagraphDraftRequestSchema.safeParse({
      ...payload,
      framework: "TIFRS",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("接線(沒有 jsdom,只宣稱條文在不在)", () => {
  const hook = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
    "utf-8",
  );
  const fields = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/carbon_chatbot/report_identity_fields.tsx",
    ),
    "utf-8",
  );
  const page = fs.readFileSync(
    path.join(process.cwd(), "src/app/user/carbon_chatbot/page.tsx"),
    "utf-8",
  );
  const route = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/v1/chat/carbon/draft/route.ts"),
    "utf-8",
  );

  it("寫入口存在,且寫的是盤查狀態(不是另存一份)", () => {
    expect(hook).toContain("const setDisclosureFramework = useCallback(");
    expect(hook).toContain("disclosureFramework: framework");
    expect(hook).toContain("setDisclosureFramework,");
  });

  it("**兩個** /draft 呼叫端都帶 framework", () => {
    /**
     * Info: (20260903 - Emily) 只帶一個的後果是「生成是 IFRS 版、修訂又回到盤查版」——
     * 兩條路走同一個服務,而 `carbonFrameworkView` 同時決定角色句與 guidance。
     * 所以這裡數的是**次數**,不是存在性。
     */
    const occurrences =
      hook.split("framework: activeInventoryState?.disclosureFramework")
        .length - 1;
    expect(occurrences).toBe(2);
  });

  it("route 不需要改:它把整包 parsed.data 交給服務", () => {
    /**
     * Info: (20260903 - Emily) 釘住這個前提本身。若有人把它改成逐欄位挑,
     * framework 會安靜地不見 —— 而那正是 IImportChunkPayload 出過兩次的事
     *(#6750)。
     */
    expect(route).toContain("service.generateParagraphDraft(parsed.data)");
  });

  it("面板有選單,且沒有 callback 時不顯示(既有呼叫端零改動)", () => {
    expect(fields).toContain("onChangeFramework &&");
    expect(fields).toContain("framework_label");
    expect(fields).toContain(
      "Object.values(CarbonDisclosureFrameworkEnum).map",
    );
  });

  it("選了 IFRS 的界線提示有印出來(不是說明文字,是紅線)", () => {
    /**
     * Info: (20260903 - Emily) 產品可以宣稱對齊 IFRS S1/S2 的架構,
     * 但使用報告的企業**不得**宣告合規(金管會適用時程分階段)。
     * 使用者要能在選之前就知道這個差別,所以那句提示與選單同生共死。
     */
    expect(fields).toContain("framework_hint");
  });

  it("五個語系都有這四個鍵(少一個會在畫面上印出鍵名)", () => {
    const keys = [
      "framework_label",
      "framework_inventory_only",
      "framework_ifrs",
      "framework_hint",
    ];
    ["zh_tw", "zh_cn", "en", "ja", "ko"].forEach((locale) => {
      const src = fs.readFileSync(
        path.join(
          process.cwd(),
          `src/i18n/locales/${locale}/admin_mission_board.ts`,
        ),
        "utf-8",
      );
      keys.forEach((key) => expect(src).toContain(`${key}:`));
    });
  });

  it("page 把值從盤查狀態取、把寫入交回 hook", () => {
    expect(page).toContain(
      "disclosureFramework={inventoryState.disclosureFramework}",
    );
    expect(page).toContain(
      "onChangeDisclosureFramework={setDisclosureFramework}",
    );
  });
});
