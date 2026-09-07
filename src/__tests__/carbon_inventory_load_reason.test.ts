import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
import fs from "fs";
import path from "path";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import {
  InventoryLoadReasonEnum,
  buildInventoryUnreadableFact,
  describeInventoryLoadReason,
  describeUnreadableInventoryStep,
  loadInventoryState,
} from "@/lib/carbon_inventory_storage";

declare const jest: typeof JestType;

/**
 * Info: (20260907 - Emily) 盤查狀態載入失敗要說得出原因(#6779)。
 *
 * owner 實測:舊房問「類別三排放量」,模型答「帳本中沒有資料 … 請問貴公司全名和年度」——
 * 它同時說「沒資料」和「請重新設定」,代表它拿到的是**整份空狀態**,不是空帳本。
 * 讀碼:`loadInventoryState` 的三種失敗(金鑰沒解鎖 / 解不開 / 格式被拒)原本回同一個 null,
 * hook 只 `console.error` 一行,對話照常,persona 走 onboarding;而 versionRef 記了真實版本,
 * 使用者一回答,下一次 autosave 就把那筆真實紀錄蓋掉。
 *
 * 這一組守三件事:原因分得開(loader)、說的話對(純函式)、hook 真的接了(源碼掃描 ——
 * 本專案 jest 是 node 環境沒有 jsdom,hook 只能這樣守)。
 */
const requestMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const decryptMock = jest.fn<(...args: unknown[]) => Promise<string>>();
jest.mock("@/lib/utils/request", () => ({
  request: (...args: unknown[]) => requestMock(...args),
  ApiError: class ApiError extends Error {},
}));
jest.mock("@/lib/chatroom_ecies", () => ({
  eciesDecrypt: (...args: unknown[]) => decryptMock(...args),
  eciesEncrypt: jest.fn(),
}));

const validState = {
  step: CarbonInventoryStep.ORG_PROFILE,
  company: "高興昌鋼鐵股份有限公司",
  year: 2023,
  activities: [],
  updatedAt: "2026-09-07T00:00:00.000Z",
  version: 4,
};
const masterKey = {
  extendedPrivateKey: "xprv",
  extendedPublicKey: "xpub",
} as never;
const envelope = { ciphertext: "c" } as never;

const respond = (
  state: {
    envelope: unknown;
    plainContent: string | null;
    version: number;
  } | null,
) => {
  requestMock.mockResolvedValue({
    payload: { state, access: { canEdit: true, accountBookId: null } },
  });
};

let consoleError: ReturnType<typeof jest.spyOn>;
beforeEach(() => {
  requestMock.mockReset();
  decryptMock.mockReset();
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
});

describe("loadInventoryState:三種失敗回三種原因,不再是同一個 null", () => {
  it("沒有紀錄 → null(這才是「真的空」,可以 onboarding 的唯一情形)", async () => {
    respond(null);
    expect(await loadInventoryState("ch", null)).toBeNull();
  });

  it("明文可讀 → OK 帶 state", async () => {
    respond({
      envelope: null,
      plainContent: JSON.stringify(validState),
      version: 4,
    });
    const loaded = await loadInventoryState("ch", null);
    expect(loaded?.reason).toBe(InventoryLoadReasonEnum.OK);
    expect(loaded?.state?.company).toBe("高興昌鋼鐵股份有限公司");
    expect(loaded?.version).toBe(4);
  });

  it("加密紀錄 + 沒有金鑰 → LOCKED(解鎖後會好,不是壞掉)", async () => {
    respond({ envelope, plainContent: null, version: 4 });
    const loaded = await loadInventoryState("ch", null);
    expect(loaded?.state).toBeNull();
    expect(loaded?.reason).toBe(InventoryLoadReasonEnum.LOCKED);
    expect(loaded?.version).toBe(4);
    expect(decryptMock).not.toHaveBeenCalled();
  });

  it("加密紀錄 + 金鑰解不開 → DECRYPT_FAILED", async () => {
    respond({ envelope, plainContent: null, version: 4 });
    decryptMock.mockRejectedValue(new Error("bad key"));
    const loaded = await loadInventoryState("ch", masterKey);
    expect(loaded?.reason).toBe(InventoryLoadReasonEnum.DECRYPT_FAILED);
    expect(loaded?.version).toBe(4);
  });

  it("解開了但格式被拒 → SCHEMA_REJECTED,console 只記欄位路徑不記值", async () => {
    respond({
      envelope: null,
      plainContent: JSON.stringify({ ...validState, year: 1024 }),
      version: 4,
    });
    const loaded = await loadInventoryState("ch", null);
    expect(loaded?.reason).toBe(InventoryLoadReasonEnum.SCHEMA_REJECTED);
    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).toContain("year");
    expect(logged).not.toContain("1024");
    expect(logged).not.toContain("高興昌");
  });

  it("解開了但不是 JSON → SCHEMA_REJECTED(資料在,這一版讀不懂)", async () => {
    respond({ envelope: null, plainContent: "not json", version: 4 });
    const loaded = await loadInventoryState("ch", null);
    expect(loaded?.reason).toBe(InventoryLoadReasonEnum.SCHEMA_REJECTED);
  });

  it("每一種失敗都保留真實版本(將來讀得出來時要接著存,不是從 0 開始)", async () => {
    respond({ envelope, plainContent: null, version: 9 });
    const locked = await loadInventoryState("ch", null);
    decryptMock.mockRejectedValue(new Error("bad key"));
    const failed = await loadInventoryState("ch", masterKey);
    expect(locked?.version).toBe(9);
    expect(failed?.version).toBe(9);
  });
});

describe("讀不出來時該說什麼(純函式,hook 只接線)", () => {
  const reasons = [
    InventoryLoadReasonEnum.LOCKED,
    InventoryLoadReasonEnum.DECRYPT_FAILED,
    InventoryLoadReasonEnum.SCHEMA_REJECTED,
  ];

  it("四種原因各有說法,而且說法互不相同(分不開就等於沒分)", () => {
    const all = [...reasons, InventoryLoadReasonEnum.LOAD_FAILED];
    const texts = all.map(describeInventoryLoadReason);
    expect(texts.every((text) => text.length > 0)).toBe(true);
    expect(new Set(texts).size).toBe(4);
    expect(describeInventoryLoadReason(InventoryLoadReasonEnum.OK)).toBe("");
  });

  it("LOAD_FAILED 不得宣稱「存在」—— 連有沒有紀錄都還不知道(review 低-3 的原則)", () => {
    const fact = buildInventoryUnreadableFact(
      InventoryLoadReasonEnum.LOAD_FAILED,
    );
    expect(fact.label).not.toContain("存在");
    expect(
      describeUnreadableInventoryStep(InventoryLoadReasonEnum.LOAD_FAILED),
    ).toContain("尚未確認");
    // 其他三種真的讀到紀錄,才可以說存在
    reasons.forEach((reason) => {
      expect(buildInventoryUnreadableFact(reason).label).toContain("存在");
    });
  });

  it("事實包那一筆:不帶排放數字、來源明說不是帳本內容", () => {
    reasons.forEach((reason) => {
      const fact = buildInventoryUnreadableFact(reason);
      expect(fact.label).toContain("讀不出來");
      expect(fact.source).toContain("不是帳本內容");
      expect("emissionsKg" in fact).toBe(false);
    });
  });

  it("currentStep 那一句同時做到三件事:說資料在、禁止說沒資料、禁止引導重設", () => {
    reasons.forEach((reason) => {
      const step = describeUnreadableInventoryStep(reason);
      expect(step).toContain("存在但目前讀不出來");
      expect(step).toContain("不要宣稱帳本沒有資料");
      expect(step).toContain("不要引導重新設定");
      expect(step).toContain(describeInventoryLoadReason(reason));
    });
  });
});

describe("hook 接線(源碼掃描;node 環境無法渲染 hook)", () => {
  const hook = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
    "utf-8",
  );

  it("載入結果不可讀時記下原因,而不是只 console.error", () => {
    expect(hook).toMatch(
      /if \(loaded && !loaded\.state\) \{[\s\S]{0,900}?markInventoryUnreadable\(\s*chatChannel,\s*loaded\.reason,?\s*\)/,
    );
  });

  it("autosave 在讀不出來的房拒絕存檔,而且擋在 saveInventoryState 之前", () => {
    const guard = hook.indexOf(
      "if (inventoryUnreadableRef.current.has(chatChannel))",
    );
    const save = hook.indexOf("saveInventoryState(\n        chatChannel,");
    expect(guard).toBeGreaterThan(0);
    expect(save).toBeGreaterThan(guard);
  });

  it("對話請求的 currentStep 與事實包都改口(兩個入口缺一都會退回 onboarding)", () => {
    expect(hook).toMatch(
      /currentStep: inventoryUnreadable\[chatChannel\]\s*\?\s*describeUnreadableInventoryStep\(/,
    );
    expect(hook).toMatch(
      /if \(unreadable\) return \[buildInventoryUnreadableFact\(unreadable\)\];/,
    );
  });

  it("讀出來之後清掉標記(否則解鎖後仍被當成讀不出來)", () => {
    expect(hook).toMatch(/markInventoryUnreadable\(chatChannel, null\);/);
  });

  it("請求失敗(第四種)標 LOAD_FAILED,而不是沿用上一個標記(review 低-2)", () => {
    expect(hook).toMatch(
      /failed to load inventory state[\s\S]{0,600}?markInventoryUnreadable\(\s*chatChannel,\s*InventoryLoadReasonEnum\.LOAD_FAILED,?\s*\)/,
    );
  });

  it("解鎖前不標 LOCKED:那時連有沒有紀錄都不知道(review 低-3)", () => {
    const earlyReturn = hook.indexOf(
      "if (!isBookBound && (!isUnlocked || !master)) return;",
    );
    expect(earlyReturn).toBeGreaterThan(0);
    const before = hook.slice(Math.max(0, earlyReturn - 1200), earlyReturn);
    expect(before).not.toMatch(/markInventoryUnreadable\([^)]*LOCKED/);
  });
});
