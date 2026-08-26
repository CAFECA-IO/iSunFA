import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
import { listPendingInvitationsForUser } from "@/services/team_invitation.service";
import { teamRepo } from "@/repositories/team.repo";
import { userIdentityRepo } from "@/repositories/user_identity.repo";

declare const jest: typeof JestType;

/**
 * Info: (20260825 - Julian) 「我有哪些待處理的邀請」——小鈴鐺與團隊頁共用的那一支。
 *
 * 這支要答對三件事，而每一件答錯都有具體的後果：
 *
 * 1. **email 邀請也要算**。原本只查 `inviteeAddress`，而 email 邀請那一欄是
 *    NULL —— 已註冊的人被 email 邀請時，鈴鐺與團隊頁都完全看不到。
 * 2. **只採信已驗證的信箱**。未驗證的 email 是使用者宣稱的字串，採信它等於
 *    宣稱一個信箱就能讀到寄給該信箱的邀請內容（團隊名稱、邀請人姓名）。
 * 3. **正規化要與 `pendingKey` 同一套**。唯一鍵認定 `alice+x@` 與 `alice@`
 *    是同一個人，這裡若用字面比對就會認定不是。
 */

jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getPendingInvitationsForRecipient: jest.fn(async () => []) },
}));

jest.mock("@/repositories/user_identity.repo", () => ({
  userIdentityRepo: { findByUserId: jest.fn(async () => []) },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const NOW_MS = 1_760_000_000_000;
const USER = "user-1";
const ADDRESS = "0xabc";

function identity(overrides: Record<string, unknown> = {}) {
  return {
    id: "id-1",
    userId: USER,
    provider: "google",
    email: "alice@gmail.com",
    emailVerified: true,
    ...overrides,
  };
}

/**
 * Info: (20260826 - Julian) 替身要長得像**真的那一列**（review：既有護欄）。
 *
 * 先前這裡沒有 `inviteeAddress` / `inviteeEmail` —— 那時 service 只濾期限，
 * 所以省略沒有後果。現在它還會以 `isIntendedRecipient` 收斂（canonical 撈出來
 * 的是超集），少了收件欄位的替身會被整批濾掉，而那個紅燈指向的是替身而不是程式。
 *
 * 預設用位址邀請：這個檔案的多數案例在意的是期限與跨租戶，不是信箱比對。
 */
function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    teamId: "team-1",
    inviteeAddress: ADDRESS,
    inviteeEmail: null,
    expiresAt: null,
    createdAt: new Date(NOW_MS - 1000),
    team: { name: "T" },
    inviter: { name: "Amy" },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(userIdentityRepo.findByUserId).mockResolvedValue([]);
  asMock(teamRepo.getPendingInvitationsForRecipient).mockResolvedValue([]);
});

describe("listPendingInvitationsForUser", () => {
  /**
   * Info: (20260825 - Julian) 已驗證的信箱要以 **canonical 形式**傳進查詢。
   *
   * 斷言的是傳進 repo 的參數而不是回傳值：回傳值是替身給的，
   * 驗它只證明我會把替身的輸出原樣傳出去。真正會出錯的是「傳了什麼進去」。
   */
  it("已驗證的信箱以 canonical 形式傳進查詢", async () => {
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      identity({ email: "Alice+iSunFA@Gmail.com" }),
    ]);

    await listPendingInvitationsForUser({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(
      asMock(teamRepo.getPendingInvitationsForRecipient),
    ).toHaveBeenCalledWith({
      address: ADDRESS,
      // Info: (20260825 - Julian) 去子地址、去點號、轉小寫——與 pendingKey 同一套
      emailKeys: ["alice@gmail.com"],
    });
  });

  /**
   * Info: (20260825 - Julian) 未驗證的信箱一律不採信。
   *
   * 斷言成對：未驗證的**不在**清單裡，**且**同一次呼叫裡已驗證的那個在 ——
   * 只驗前者的話，「一律傳空陣列」也會通過，而那會讓功能整個失效卻沒有測試變紅。
   */
  it("未驗證的信箱不採信，已驗證的照樣採信", async () => {
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      identity({ id: "id-1", email: "unverified@x.com", emailVerified: false }),
      identity({ id: "id-2", email: "verified@x.com", emailVerified: true }),
    ]);

    await listPendingInvitationsForUser({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(
      asMock(teamRepo.getPendingInvitationsForRecipient),
    ).toHaveBeenCalledWith({
      address: ADDRESS,
      emailKeys: ["verified@x.com"],
    });
  });

  // Info: (20260825 - Julian) 綁定沒有 email 時不能產生一個空字串的鍵
  it("綁定沒有 email 時不列入", async () => {
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      identity({ email: null, emailVerified: true }),
    ]);

    await listPendingInvitationsForUser({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(
      asMock(teamRepo.getPendingInvitationsForRecipient),
    ).toHaveBeenCalledWith({ address: ADDRESS, emailKeys: [] });
  });

  /**
   * Info: (20260821 - Luphia) 過期的邀請點進去也接受不了，
   * 掛在鈴鐺上只會製造一個按了沒反應的待辦。
   *
   * Info: (20260825 - Julian) 過期不是一種 status ——「時間到了」不會有任何
   * 程式碼執行，所以這個判斷只能在讀取時做。
   */
  it("過期的邀請不算數，未過期的算", async () => {
    asMock(teamRepo.getPendingInvitationsForRecipient).mockResolvedValue([
      invitation({ id: "expired", expiresAt: new Date(NOW_MS - 1) }),
      invitation({ id: "alive", expiresAt: new Date(NOW_MS + 1000) }),
      invitation({ id: "no-expiry", expiresAt: null }),
    ]);

    const result = await listPendingInvitationsForUser({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(result.map((item) => item.id)).toEqual(["alive", "no-expiry"]);
  });

  /**
   * Info: (20260826 - Julian) canonical 撈出來的是超集，service 要收斂（review：既有護欄）。
   *
   * 查詢以 `inviteeEmailKey`（canonical）走索引，而 canonical 會把
   * `alice+x@gmail.com` 與 `alice@gmail.com` 合併成同一把鍵 —— 那個取捨是為
   * **唯一鍵**評估的。若不收斂，有已驗證 `alice@gmail.com` 的人會看到寄給
   * `alice+x@` 的邀請，而邀請內容帶著團隊名稱與邀請人姓名。
   *
   * 斷言成對：子地址那則**不在**，而精確相符的那則**在** ——
   * 只驗前者的話，「一律回空」也會通過。
   */
  it("canonical 相符但信箱不精確相符的邀請會被濾掉", async () => {
    asMock(userIdentityRepo.findByUserId).mockResolvedValue([
      identity({ email: "alice@gmail.com" }),
    ]);
    asMock(teamRepo.getPendingInvitationsForRecipient).mockResolvedValue([
      invitation({
        id: "subaddress",
        inviteeAddress: null,
        inviteeEmail: "alice+x@gmail.com",
      }),
      invitation({
        id: "exact",
        inviteeAddress: null,
        inviteeEmail: "alice@gmail.com",
      }),
    ]);

    const result = await listPendingInvitationsForUser({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(result.map((item) => item.id)).toEqual(["exact"]);
  });

  /**
   * Info: (20260825 - Julian) 空位址不得退化成「列出全站邀請」（計畫書 D5）。
   *
   * 斷言成對：回空 **且**根本沒有去查。只驗前者的話，
   * 「查了全站、剛好測試環境沒有資料」也會通過。
   */
  it("空位址回空集合，且不查邀請表", async () => {
    const result = await listPendingInvitationsForUser({
      userId: USER,
      address: "",
      nowMs: NOW_MS,
    });

    expect(result).toEqual([]);
    expect(
      asMock(teamRepo.getPendingInvitationsForRecipient),
    ).not.toHaveBeenCalled();
    // Info: (20260825 - Julian) 連信箱都不必查——沒有位址就不會有答案
    expect(asMock(userIdentityRepo.findByUserId)).not.toHaveBeenCalled();
  });

  // Info: (20260825 - Julian) 信箱以 userId 查，不是以 address 查（跨租戶取錯人）
  it("信箱以 userId 查", async () => {
    await listPendingInvitationsForUser({
      userId: USER,
      address: ADDRESS,
      nowMs: NOW_MS,
    });

    expect(asMock(userIdentityRepo.findByUserId)).toHaveBeenCalledWith(USER);
  });
});
