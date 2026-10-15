import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

import { GET as getLedger } from "@/app/api/v1/user/team/[team_id]/wallet/ledger/route";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { listTeamWalletLedger } from "@/services/team_wallet.service";
import { listTeamWalletLedgerByFilter } from "@/services/team_wallet_ledger.service";
import { assertWalletManager } from "@/services/team_wallet_access.guard";
import { teamWalletLedgerQueryRepo } from "@/repositories/team_wallet_ledger_query.repo";
import {
  ALLOCATE_OFFCHAIN_EXIT_FEATURE_CODE,
  BILLABLE_FEATURE_CODE,
  CONSERVATION_REPAIR_FEATURE_CODE,
  TEAM_WALLET_ENTRY_TYPE,
} from "@/constants/subscription_quota";
import {
  TEAM_WALLET_LEDGER_FILTER,
  isSystemAdjustmentEntry,
} from "@/constants/team_wallet_ledger";

/**
 * Info: (20261015 - Luphia) 團隊點數移轉紀錄頁的**接線**（checklist §1.7）。
 *
 * 守四件事：頁面真的打流水帳端點並帶上篩選、團隊頁的入口只對管理職出現、
 * route 把 type 交給 service（壞值擋在 Validator）、有篩選時的 service
 * 仍經過管理職權限閘。功能各自正確而沒接上，是這個 repo 付過學費的形狀。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0xabc",
  })),
}));

/**
 * Info: (20261015 - Luphia) team_wallet.service 與 access guard 都會碰資料庫，
 * 逐項列舉而不是 `...actual`：requireActual 會把真連線帶進來。
 */
jest.mock("@/services/team_wallet.service", () => ({
  listTeamWalletLedger: jest.fn(async () => ({ items: [], total: 0 })),
  // Info: (20261015 - Luphia) 篩選查詢共用 team_wallet.service 的 toLedgerView
  toLedgerView: jest.fn((ledger: { id: string }) => ({ id: ledger.id })),
}));

jest.mock("@/services/team_wallet_access.guard", () => ({
  assertWalletManager: jest.fn(async () => ({ role: "OWNER" })),
}));

jest.mock("@/repositories/team_wallet_ledger_query.repo", () => ({
  teamWalletLedgerQueryRepo: {
    listLedgerByEntryTypes: jest.fn(async () => ({ items: [], total: 0 })),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function read(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

// Info: (20261015 - Luphia) 去掉註解行再掃，避免說明文字本身命中（同 subscription_plan_display_wiring）
function codeOf(...segments: string[]): string {
  return read(...segments)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !line.startsWith("*") && !line.startsWith("//"))
    .join("\n");
}

const TEAM_PARAMS = { params: Promise.resolve({ team_id: "team-1" }) };

function req(query: string): NextRequest {
  return new NextRequest(
    `https://isunfa.com/api/v1/user/team/team-1/wallet/ledger${query}`,
    { headers: { authorization: "Bearer dewt" } },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getIdentityFromDeWT).mockResolvedValue({
    id: "user-1",
    address: "0xabc",
  });
  asMock(assertWalletManager).mockResolvedValue({ role: "OWNER" });
});

describe("頁面接線", () => {
  const page = codeOf(
    "src",
    "app",
    "user",
    "team",
    "[team_id]",
    "ledger",
    "page.tsx",
  );

  it("點數移轉紀錄頁打流水帳端點並帶上類型篩選", () => {
    expect(page).toMatch(/\/api\/v1\/user\/team\/\$\{teamId\}\/wallet\/ledger/);
    expect(page).toMatch(/type:\s*filter/);
  });

  it("成員名稱以團隊成員 API 解析", () => {
    expect(page).toMatch(/\/api\/v1\/user\/team\/\$\{teamId\}\/members/);
  });

  /**
   * Info: (20261015 - Luphia) 入口必須包在 `isOwnerOrAdmin &&` 之內：流水帳 API 限管理職，
   * 一般成員看到入口只會點進一個載入失敗的頁面。
   */
  it("團隊頁的入口只對管理職出現", () => {
    const teamPage = codeOf("src", "app", "user", "team", "page.tsx");
    const linkAt = teamPage.indexOf("/ledger`");
    expect(linkAt).toBeGreaterThan(-1);
    const gateAt = teamPage.lastIndexOf("{isOwnerOrAdmin && (", linkAt);
    expect(gateAt).toBeGreaterThan(-1);
    // Info: (20261015 - Luphia) 閘與連結之間不得有閘的收尾，否則連結已在閘外
    expect(teamPage.slice(gateAt, linkAt)).not.toMatch(/\)\}/);
  });
});

describe("route 接線", () => {
  it("未帶 type 時以 ALL 委派", async () => {
    const response = await getLedger(req("?page=2&pageSize=10"), TEAM_PARAMS);
    expect(response.status).toBe(200);
    expect(asMock(listTeamWalletLedger)).toHaveBeenCalledWith({
      userId: "user-1",
      teamId: "team-1",
      page: 2,
      pageSize: 10,
    });
    expect(
      asMock(teamWalletLedgerQueryRepo.listLedgerByEntryTypes),
    ).not.toHaveBeenCalled();
  });

  it("type=ALLOCATE 走篩選查詢，涵蓋分配與收回", async () => {
    const response = await getLedger(req("?type=ALLOCATE"), TEAM_PARAMS);
    expect(response.status).toBe(200);
    expect(asMock(assertWalletManager)).toHaveBeenCalledWith(
      "user-1",
      "team-1",
    );
    expect(
      asMock(teamWalletLedgerQueryRepo.listLedgerByEntryTypes),
    ).toHaveBeenCalledWith(
      "team-1",
      [TEAM_WALLET_ENTRY_TYPE.ALLOCATE, TEAM_WALLET_ENTRY_TYPE.REVOKE],
      1,
      20,
    );
    expect(asMock(listTeamWalletLedger)).not.toHaveBeenCalled();
  });

  it("未知的 type 擋在 Validator", async () => {
    const response = await getLedger(req("?type=ADJUST"), TEAM_PARAMS);
    const body = (await response.json()) as { errorCode: string };
    expect(body.errorCode).toBe(API_ERRORS.VL_SCHEMA_ERROR.code);
    expect(asMock(listTeamWalletLedger)).not.toHaveBeenCalled();
    expect(
      asMock(teamWalletLedgerQueryRepo.listLedgerByEntryTypes),
    ).not.toHaveBeenCalled();
  });
});

describe("篩選查詢的權限閘", () => {
  it("非管理職被擋下且不查帳本", async () => {
    const forbidden = API_ERRORS.TW_WALLET_FORBIDDEN;
    asMock(assertWalletManager).mockRejectedValue(
      new ApiError(forbidden.code, forbidden.message, forbidden.status),
    );
    await expect(
      listTeamWalletLedgerByFilter({
        userId: "user-2",
        teamId: "team-1",
        filter: TEAM_WALLET_LEDGER_FILTER.CONSUME,
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toMatchObject({ code: forbidden.code });
    expect(
      asMock(teamWalletLedgerQueryRepo.listLedgerByEntryTypes),
    ).not.toHaveBeenCalled();
  });

  it("底層錯誤包成 TW_OPERATION_FAILED，不外洩原始訊息", async () => {
    asMock(teamWalletLedgerQueryRepo.listLedgerByEntryTypes).mockRejectedValue(
      new Error("P2002 unique constraint"),
    );
    await expect(
      listTeamWalletLedgerByFilter({
        userId: "user-1",
        teamId: "team-1",
        filter: TEAM_WALLET_LEDGER_FILTER.PURCHASE,
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toMatchObject({ code: API_ERRORS.TW_OPERATION_FAILED.code });
  });
});

describe("系統調整分錄的判定", () => {
  it("兩種內部記帳 featureCode 的 ADJUST 標為系統調整", () => {
    expect(
      isSystemAdjustmentEntry({
        entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
        featureCode: ALLOCATE_OFFCHAIN_EXIT_FEATURE_CODE,
      }),
    ).toBe(true);
    expect(
      isSystemAdjustmentEntry({
        entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
        featureCode: CONSERVATION_REPAIR_FEATURE_CODE,
      }),
    ).toBe(true);
  });

  it("團隊解散與其他類型不是系統調整", () => {
    expect(
      isSystemAdjustmentEntry({
        entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
        featureCode: BILLABLE_FEATURE_CODE.TEAM_DISSOLVED,
      }),
    ).toBe(false);
    expect(
      isSystemAdjustmentEntry({
        entryType: TEAM_WALLET_ENTRY_TYPE.ADJUST,
        featureCode: null,
      }),
    ).toBe(false);
    expect(
      isSystemAdjustmentEntry({
        entryType: TEAM_WALLET_ENTRY_TYPE.CONSUME,
        featureCode: ALLOCATE_OFFCHAIN_EXIT_FEATURE_CODE,
      }),
    ).toBe(false);
  });
});
