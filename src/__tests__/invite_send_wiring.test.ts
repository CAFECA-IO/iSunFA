import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { NextRequest } from "next/server";
import { POST as addressInvite } from "@/app/api/v1/user/team/[team_id]/invitations/route";
import { POST as emailInvite } from "@/app/api/v1/user/team/[team_id]/invitations/email/route";
import { teamRepo } from "@/repositories/team.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { inviteMemberByEmail } from "@/services/team_invitation.service";
import { chargeSeatAddition } from "@/services/team_seat.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnService } from "@/services/webauthn.service";
import { RATE_LIMIT_RULES, RateLimitBucketEnum } from "@/constants/rate_limit";

/**
 * Info: (20260819 - Luphia) 邀請**寄送端**的量控真的擋在路徑上（產品決定 20260819）。
 *
 * 免費版人數上限移除之後，寄信量沒有任何界線。新增的兩層（依操作者的限流、
 * 團隊層的兩道上限）如果只有函式而沒有接線，等於什麼都沒做——而那正是本 repo
 * 犯過的形狀（checklist §1.7：測到函式不等於測到接線）。
 *
 * 因此這一檔**直接匯入兩支 route handler 並呼叫它們**，限流器用真的，
 * mock 的邊界落在外部世界（DB、寄信、扣款）。
 */

jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0xowner",
  })),
}));

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: {
    getTeamMember: jest.fn(async () => ({ role: "OWNER" })),
    getTeamInvitation: jest.fn(async () => null),
    getTeamInvitationByAddress: jest.fn(async () => null),
    createTeamInvitation: jest.fn(async () => ({ id: "inv-1" })),
    countPendingInvitations: jest.fn(async () => 0),
    countInvitationsCreatedSince: jest.fn(async () => 0),
    /**
     * Info: (20260819 - Luphia) 冷卻讀最近一封邀請的時間（產品決定 20260819）。
     * 預設 null＝沒有冷卻；替身少了這一支，閘門會以「不是函式」讓整條路徑回 500，
     * 而那與被測的行為無關（checklist §1.8）。
     */
    findLastInvitationSentAt: jest.fn(async () => null),
    getUserByAddress: jest.fn(async () => null),
    // Info: (20260819 - Luphia) 位址邀請會取團隊名稱寫進鏈上通知
    getTeamById: jest.fn(async () => ({ id: "team-1", name: "E2E Team" })),
  },
}));

jest.mock("@/repositories/webauthn.repo", () => ({
  webAuthnRepo: {
    findUserById: jest.fn(async () => ({
      id: "user-1",
      currentChallenge: "challenge",
    })),
    // Info: (20260819 - Luphia) 位址邀請會查受邀者是否已有帳號（回 null＝還沒有）
    findUserByAddress: jest.fn(async () => null),
    // Info: (20260826 - Julian) 位址來自使用者輸入時走這一支（review 1.2）
    findUserByAnyAddressForm: jest.fn(async () => null),
    clearChallenge: jest.fn(),
  },
}));

jest.mock("@/services/webauthn.service", () => ({
  // Info: (20260819 - Luphia) 兩支端點都要求當下的 FIDO 簽章（會扣錢的動作）
  webAuthnService: { verifySignature: jest.fn(async () => true) },
}));

jest.mock("@/services/team_seat.service", () => ({
  chargeSeatAddition: jest.fn(async () => ({
    charged: false,
    amount: 0,
    seats: 0,
  })),
}));

/**
 * Info: (20260819 - Luphia) `assertInviteVolumeWithinLimits` 用**真的**（review #6684 高）。
 *
 * 前一版把它 mock 成 no-op，而全檔沒有一條斷言它被呼叫過——於是刪掉任一呼叫端
 * （位址路由或 email service），第 2、3 層完全失效而測試全綠。三層裡唯一被接線
 * 測試釘住的是最弱的那一層（per-operator 限流），而 commit 訊息宣稱「缺一就有繞法」
 * 的那兩道整團總量上限，在 CI 上是不設防的。
 *
 * 因此只 stub `inviteMemberByEmail`（它會碰 DB 與寄信），閘門本身走真的實作，
 * 由下面的 repo 替身餵它數字。
 */
jest.mock("@/services/team_invitation.service", () => {
  const actual = jest.requireActual<
    typeof import("@/services/team_invitation.service")
  >("@/services/team_invitation.service");
  return {
    inviteMemberByEmail: jest.fn(async () => ({ invitationId: "inv-1" })),
    assertInviteVolumeWithinLimits: actual.assertInviteVolumeWithinLimits,
    /**
     * Info: (20260819 - Luphia) 錯誤類別也要是**真的那一個**。
     * 少了它，route 的 `error instanceof InviteCooldownError` 會對 undefined 做
     * instanceof 而整條路徑丟 TypeError——而那與被測的行為無關（checklist §1.8）。
     */
    InviteCooldownError: actual.InviteCooldownError,
  };
});

/**
 * Info: (20260819 - Luphia) 兩道上限的值來自系統設定（ADR 017）。不 mock 會打到真資料庫，
 * 而「本機剛好查無設定列 → 退回保底值 → 測試碰巧通過」正是 checklist §1.3 的形狀。
 */
jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: { get: jest.fn(async () => undefined) },
}));

/**
 * Info: (20260820 - Julian) 閘門會讀訂閱來判斷是不是免費方案（三道量控只對免費方案，
 * commit c0c04014a），因此**訂閱 repository 也是這一檔的邊界之一**。
 *
 * 少了這個替身，`assertInviteVolumeWithinLimits` 會呼叫到真的
 * `teamSubscriptionRepo.getByTeamId`，於是這支「接線測試」靜默地依賴一台活的資料庫：
 * 在有 DB 的機器上它連得上、查無訂閱、退回免費方案而通過；在沒有 DB 的機器（或 CI）
 * 上它丟出一個不是 `ApiError` 的連線錯誤，被 route 最後那個 catch 收成 `IS000099`／500
 * ——三條走位址邀請的案例因此全紅，而紅的原因與被測的行為無關（checklist §1.3、§1.8）。
 *
 * 同一支閘門的單元測試（`invite_volume_limits.test.ts`）一直有這個替身；
 * c0c04014a 補了那一邊、漏了這一邊。預設查無訂閱＝免費方案，三道量控才會生效
 * ——付費方案會直接 return，下面兩條上限的斷言就永遠是綠的。
 */
jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: { getByTeamId: jest.fn(async () => null) },
}));

/**
 * Info: (20260820 - Julian) 方法名是 `sendUserOp`（見 `bundler.service.ts`）。
 * 原本替身給的是 `sendUserOperation`，於是 route 呼叫的那一支是 `undefined`，
 * 真正發生的是一個被內層 try/catch 吞掉的 TypeError——替身等於沒有裝上去。
 */
jest.mock("@/services/bundler.service", () => ({
  bundlerService: { sendUserOp: jest.fn(async () => "0xhash") },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const PER_MINUTE =
  RATE_LIMIT_RULES[RateLimitBucketEnum.TEAM_INVITE_SEND][0].max;

function emailRequest(): {
  request: NextRequest;
  params: Promise<{ team_id: string }>;
} {
  return {
    request: new NextRequest(
      "https://isunfa.com/api/v1/user/team/team-1/invitations/email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer dewt",
        },
        body: JSON.stringify({
          email: "invitee@example.com",
          role: "VIEWER",
          authentication: { id: "cred" },
          /**
           * Info: (20260819 - Luphia) 席次費用的事前揭露（#6682）之後，兩支端點都
           * 要求送出畫面顯示過的金額。這裡的情境是免費方案／有空席（不收費），
           * 因此 0 是正確的期望值。
           */
          expectedAmount: 0,
        }),
      },
    ),
    params: Promise.resolve({ team_id: "team-1" }),
  };
}

/**
 * Info: (20260819 - Luphia) 每條測試用**獨立的操作者位址**：限流器是模組單例，
 * 共用位址會讓前面測試打滿的桶滲進後面的案例（那種耦合正是這一檔要避免的東西）。
 */
function useOperator(address: string): void {
  asMock(getIdentityFromDeWT).mockResolvedValue({ id: "user-1", address });
}

function addressRequest(address = `0x${"1".repeat(40)}`): NextRequest {
  return new NextRequest(
    "https://isunfa.com/api/v1/user/team/team-1/invitations",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer dewt",
      },
      body: JSON.stringify({
        address,
        role: "VIEWER",
        authentication: { id: "cred" },
        // Info: (20260819 - Luphia) 見上方說明（#6682 之後為必填）
        expectedAmount: 0,
      }),
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(getIdentityFromDeWT).mockResolvedValue({
    id: "user-1",
    address: "0xowner",
  });
  asMock(teamRepo.getTeamMember).mockResolvedValue({ role: "OWNER" });
  asMock(webAuthnService.verifySignature).mockResolvedValue(true);
  asMock(teamRepo.countPendingInvitations).mockResolvedValue(0);
  asMock(teamRepo.countInvitationsCreatedSince).mockResolvedValue(0);
  asMock(teamRepo.findLastInvitationSentAt).mockResolvedValue(null);
});

describe("邀請寄送端的量控接線", () => {
  /**
   * Info: (20260819 - Luphia) 限流真的擋在路徑上：超限之後不得進入 service。
   *
   * 兩個斷言缺一不可——回應是 429，**且** service 沒有被多呼叫一次。
   * 只驗前者，改成「擋了但還是寄了」也會通過。
   */
  it("email 邀請：超過每分鐘上限後回 429 且不進入 service", async () => {
    for (let i = 0; i < PER_MINUTE; i += 1) {
      const { request, params } = emailRequest();
      const ok = await emailInvite(request, { params });
      expect(ok.status).toBe(200);
    }
    expect(asMock(inviteMemberByEmail)).toHaveBeenCalledTimes(PER_MINUTE);

    const { request, params } = emailRequest();
    const blocked = await emailInvite(request, { params });

    expect(blocked.status).toBe(429);
    expect(asMock(inviteMemberByEmail)).toHaveBeenCalledTimes(PER_MINUTE);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  /**
   * Info: (20260819 - Luphia) 位址邀請走的是同一個桶：兩支端點不能各有一份額度，
   * 否則「兩邊各寄 10 封」就是 20 封。
   */
  it("位址邀請與 email 邀請共用同一個限流桶", async () => {
    const address = "0xdifferent-operator";
    asMock(getIdentityFromDeWT).mockResolvedValue({ id: "user-2", address });

    for (let i = 0; i < PER_MINUTE; i += 1) {
      const { request, params } = emailRequest();
      await emailInvite(request, { params });
    }

    // Info: (20260819 - Luphia) 同一個操作者改打位址邀請，額度已經用完
    const request = new NextRequest(
      "https://isunfa.com/api/v1/user/team/team-1/invitations",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer dewt",
        },
        body: JSON.stringify({
          address: `0x${"1".repeat(40)}`,
          role: "VIEWER",
          authentication: { id: "cred" },
        }),
      },
    );
    const blocked = await addressInvite(request, {
      params: Promise.resolve({ team_id: "team-1" }),
    });

    expect(blocked.status).toBe(429);
    expect(asMock(chargeSeatAddition)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260819 - Luphia) 第 2、3 層真的擋在**位址邀請**的路徑上（review #6684 高）。
   *
   * 這兩條是前一版缺的：閘門被 mock 成 no-op，於是刪掉 route 裡那一行呼叫，
   * 位址邀請就完全失去整團總量的上限，而測試全綠。
   *
   * 斷言成對：回應不是 200 **且** `chargeSeatAddition` 沒有被呼叫——後者才證明
   * 「擋在扣款之前」，不是「擋了但錢已經刷了」。
   */
  it.each([
    [
      "同時未接受數達上限",
      () => asMock(teamRepo.countPendingInvitations).mockResolvedValue(20),
      "TW000023",
    ],
    [
      "今日寄送數達上限",
      () => asMock(teamRepo.countInvitationsCreatedSince).mockResolvedValue(50),
      "TW000024",
    ],
  ])("位址邀請：%s 時擋下，且不進入扣款", async (_label, arrange, code) => {
    useOperator(`0xvolume-${code}`);
    arrange();

    const response = await addressInvite(addressRequest(), {
      params: Promise.resolve({ team_id: "team-1" }),
    });
    const json = (await response.json()) as { errorCode?: string };

    expect(response.status).not.toBe(200);
    // Info: (20260819 - Luphia) 前端讀的是 errorCode（`code` 是 HTTP 層的分類）
    expect(json.errorCode).toBe(code);
    expect(asMock(chargeSeatAddition)).not.toHaveBeenCalled();
    expect(asMock(teamRepo.createTeamInvitation)).not.toHaveBeenCalled();
  });

  // Info: (20260819 - Luphia) 另一半：量都在上限內時照常走到扣款（否則「一律擋」也會通過）
  it("位址邀請：量在上限內時照常進入扣款", async () => {
    useOperator("0xvolume-ok");
    const response = await addressInvite(addressRequest(), {
      params: Promise.resolve({ team_id: "team-1" }),
    });

    expect(response.status).toBe(200);
    expect(asMock(chargeSeatAddition)).toHaveBeenCalledTimes(1);
  });

  // Info: (20260819 - Luphia) 未登入時連限流都不該記帳（記了就是替匿名流量佔用某個維度）
  it("未登入時不進入 service", async () => {
    asMock(getIdentityFromDeWT).mockResolvedValue(null);

    const { request, params } = emailRequest();
    const response = await emailInvite(request, { params });

    expect(response.status).not.toBe(200);
    expect(asMock(inviteMemberByEmail)).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260826 - Julian) 受邀位址在**進門處**就正規化（review 1.2）。
 *
 * 這一組住在這裡而不是自成一檔，是因為它要的東西這一檔已經架好了：
 * 真的 route handler、teamRepo 與 webAuthnRepo 的替身。複製一份 120 行的
 * mock 邊界只會多一份要同步維護的東西。
 *
 * 缺陷的形狀：`isAddress` 的 strict 預設放行全小寫、只擋亂大小寫，
 * 而下游三處都是精確比對（已是成員、重複邀請、`isIntendedRecipient`）。
 * 管理員貼小寫位址 → 三道全部落空 → **扣了席次費**，發出一封受邀者
 * 看不到也接不了的邀請；改貼 checksum 再邀一次 → 重複檢查仍查不到舊列
 * → **再扣一次** → 撞 `pendingKey` 的 P2002 → 500。錢扣了，邀請沒建成。
 */
describe("受邀位址的正規化", () => {
  // Info: (20260826 - Julian) 有大小寫差異的真實位址（全數字的測不出這件事）
  const CHECKSUM = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const LOWER = CHECKSUM.toLowerCase();

  beforeEach(() => {
    jest.clearAllMocks();
    asMock(teamRepo.getTeamMember).mockResolvedValue({ role: "OWNER" });
    asMock(teamRepo.getTeamInvitation).mockResolvedValue(null);
    asMock(teamRepo.createTeamInvitation).mockResolvedValue({ id: "inv-1" });
    asMock(teamRepo.countPendingInvitations).mockResolvedValue(0);
    asMock(teamRepo.countInvitationsCreatedSince).mockResolvedValue(0);
    asMock(teamRepo.findLastInvitationSentAt).mockResolvedValue(null);
    asMock(teamRepo.getTeamById).mockResolvedValue({
      id: "team-1",
      name: "E2E Team",
    });
  });

  /**
   * Info: (20260826 - Julian) 貼小寫與貼 checksum 必須產生**同一個** pendingKey。
   *
   * 這是全站唯一能擋住重複扣款的東西（唯一鍵），而它原本是正規化做對的
   * 那一處 —— 只是查詢那三處沒跟上。這條把「兩種寫法是同一個對象」
   * 從唯一鍵那一側也釘住。
   */
  it("貼小寫與貼 checksum 建出同一把 pendingKey", async () => {
    useOperator("0xaddr-norm-1");
    await addressInvite(addressRequest(LOWER), {
      params: Promise.resolve({ team_id: "team-1" }),
    });
    const first = asMock(teamRepo.createTeamInvitation).mock
      .calls[0][0] as Record<string, unknown>;

    asMock(teamRepo.createTeamInvitation).mockClear();

    useOperator("0xaddr-norm-2");
    await addressInvite(addressRequest(CHECKSUM), {
      params: Promise.resolve({ team_id: "team-1" }),
    });
    const second = asMock(teamRepo.createTeamInvitation).mock
      .calls[0][0] as Record<string, unknown>;

    expect(first.pendingKey).toBe(second.pendingKey);
    // Info: (20260826 - Julian) 鍵是小寫的（既有資料的形狀，不能改）
    expect(first.pendingKey).toBe(`team-1:addr:${LOWER}`);
  });

  /**
   * Info: (20260826 - Julian) 入庫的 `inviteeAddress` 也要是正規化過的。
   *
   * 只修唯一鍵不夠：`isIntendedRecipient` 與鈴鐺的查詢讀的是這一欄。
   * 存管理員貼進來的字面值的話，受邀者的鈴鐺查不到、accept 一律 403 ——
   * 而席次費已經扣了。
   */
  it("入庫的受邀位址不是使用者貼進來的字面值", async () => {
    useOperator("0xaddr-norm-3");
    await addressInvite(addressRequest(LOWER), {
      params: Promise.resolve({ team_id: "team-1" }),
    });

    const created = asMock(teamRepo.createTeamInvitation).mock
      .calls[0][0] as Record<string, unknown>;
    expect(created.inviteeAddress).toBe(CHECKSUM);
  });

  /**
   * Info: (20260826 - Julian) 下游的兩道檢查都要拿到正規化後的值。
   *
   * 「已是團隊成員」那道走 `findUserByAnyAddressForm`（`findUserByAddress`
   * 是 `findUnique`，精確比對）—— 它靜默失效的後果是對已經在團隊裡的人
   * 重複發邀請並重複扣費，那是會計後果，不只是體驗。
   */
  it("成員檢查與重複檢查都拿到正規化後的位址", async () => {
    useOperator("0xaddr-norm-4");
    await addressInvite(addressRequest(LOWER), {
      params: Promise.resolve({ team_id: "team-1" }),
    });

    expect(asMock(webAuthnRepo.findUserByAnyAddressForm)).toHaveBeenCalledWith(
      CHECKSUM,
    );
    expect(asMock(teamRepo.getTeamInvitation)).toHaveBeenCalledWith(
      "team-1",
      CHECKSUM,
      "PENDING",
    );
  });
});
