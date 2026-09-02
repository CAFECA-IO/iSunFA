import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { listPendingInvitationsForUser } from "@/services/team_invitation.service";
import { teamRepo } from "@/repositories/team.repo";
import { TEAM_INVITATION_STATUS } from "@/constants/status";
import { TeamRole } from "@/constants/team";

/**
 * Info: (20260825 - Julian) 「以已驗證的信箱反查待接受邀請」對**真資料庫**的驗證。
 *
 * 單元測試驗的是「傳了什麼進查詢」，這一支驗的是那個查詢**在真 Prisma 下真的
 * 撈得到東西**。三件事只有真資料庫答得出來：
 *
 * 1. `inviteeEmailKey` 真的在寫入時被算出來（`createTeamInvitation` 的職責）
 * 2. `OR: [{ inviteeAddress }, { inviteeEmailKey: { in } }]` 真的兩邊都命中
 * 3. `emailKeys: []` 時 `in: []` 真的是「永不匹配」而不是「沒有這個條件」——
 *    後者會讓查詢退化成「列出全站待接受邀請」，那是跨租戶外洩
 *
 * 第 3 點特別重要：它是我在 repo 註解裡宣稱的 Prisma 語意，而宣稱不是證據。
 */

// Info: (20260825 - Julian) 🛑 正式機實體隔離（與同層 e2e 一致）
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免建立真實邀請！",
  );
}

const STAMP = Date.now();
const NOW_MS = 1_760_000_000_000;

let teamId = "";
let inviterId = "";
/** Info: (20260826 - Julian) 有已驗證信箱的受邀者（精確比對；子地址另有一條反面測試） */
let mainUserId = "";
let mainAddress = "";
/** Info: (20260825 - Julian) 另一位受邀者，用來證明查詢不會撈到別人的 */
let otherUserId = "";
let otherAddress = "";

const mainEmail = `alice_${STAMP}@gmail.com`;

/**
 * Info: (20260826 - Julian) 每一個建出來的使用者都登記，由 `afterAll` 統一收（review T10）。
 *
 * 先前有一則測試在**斷言之後**才 `deleteMany` 自己臨時建的使用者 ——
 * 斷言一失敗那一行就不會執行，於是資料庫留下一列孤兒，而下一次重跑
 * 可能因為位址撞鍵而以另一種方式失敗。清理寫在斷言後面，等於
 * 「只有測試通過時才會清理」，而那正好是最不需要清理的那一次。
 *
 * 這與同層 `notification_repo.e2e.test.ts` 改用 `beforeEach` 前置清空是同一條教訓。
 */
const createdUserIds: string[] = [];

async function createUser(
  suffix: string,
  email?: string,
): Promise<{ id: string; address: string }> {
  const address = `e2e_invite_${suffix}_${STAMP}`;
  const user = await prisma.user.create({
    data: { address, name: `E2E ${suffix}` },
  });
  createdUserIds.push(user.id);
  if (email) {
    await prisma.userIdentity.create({
      data: {
        userId: user.id,
        provider: "google",
        providerUserId: `${suffix}-${STAMP}`,
        email,
        emailVerified: true,
      },
    });
  }
  return { id: user.id, address };
}

/**
 * Info: (20260825 - Julian) 一律經過 `teamRepo.createTeamInvitation`，不直接 `prisma.create`。
 *
 * `inviteeEmailKey` 是在那支方法裡算的 —— 繞過它就等於測試自己填了正確答案，
 * 而「寫入時忘了算」正是這個功能最可能的失效方式。
 */
async function invite(params: {
  inviteeAddress?: string;
  inviteeEmail?: string;
  expiresAt?: Date | null;
  status?: string;
}) {
  return teamRepo.createTeamInvitation({
    teamId,
    inviterId,
    inviteeAddress: params.inviteeAddress ?? null,
    inviteeEmail: params.inviteeEmail ?? null,
    role: TeamRole.VIEWER,
    status: params.status ?? TEAM_INVITATION_STATUS.PENDING,
    expiresAt: params.expiresAt ?? null,
  });
}

beforeAll(async () => {
  const team = await prisma.team.create({
    data: { name: `e2e-invite-list-${STAMP}` },
  });
  teamId = team.id;

  const inviter = await createUser("inviter");
  inviterId = inviter.id;

  const main = await createUser("main", mainEmail);
  mainUserId = main.id;
  mainAddress = main.address;

  const other = await createUser("other", `bob_${STAMP}@example.com`);
  otherUserId = other.id;
  otherAddress = other.address;

  await prisma.teamMember.create({
    data: { teamId, userId: inviterId, role: TeamRole.OWNER },
  });
});

beforeEach(async () => {
  await prisma.teamInvitation.deleteMany({ where: { teamId } });
});

afterAll(async () => {
  await prisma.teamInvitation.deleteMany({ where: { teamId } });
  await prisma.teamMember.deleteMany({ where: { teamId } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  /**
   * Info: (20260826 - Julian) 以**登記表**收，不是以三個具名變數收。
   *
   * 具名清單會隨著測試新增而落後 —— 而落後的症狀是資料庫裡慢慢累積孤兒列，
   * 沒有任何人會發現。`createdUserIds` 由 `createUser` 自己維護，加不加測試都對。
   */
  await prisma.userIdentity.deleteMany({
    where: { userId: { in: createdUserIds } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: createdUserIds } },
  });
  await prisma.$disconnect();
});

describe("待接受邀請的查詢（真資料庫）", () => {
  /**
   * Info: (20260825 - Julian) 寫入時就把 canonical 算出來。
   *
   * 這一條釘住的是 `createTeamInvitation` 的職責。忘了算的話下面每一條
   * email 的測試都會紅，但紅的地方會指向查詢而不是寫入 —— 先在這裡指明。
   */
  it("createTeamInvitation 寫入時算出 inviteeEmailKey", async () => {
    const created = await invite({
      inviteeEmail: `Alice_${STAMP}+isunfa@Gmail.com`,
    });

    const row = await prisma.teamInvitation.findUnique({
      where: { id: created.id },
      select: { inviteeEmail: true, inviteeEmailKey: true },
    });

    // Info: (20260825 - Julian) 原字串照原樣留著（那是投遞地址），鍵是正規化後的
    expect(row?.inviteeEmail).toBe(`Alice_${STAMP}+isunfa@Gmail.com`);
    expect(row?.inviteeEmailKey).toBe(mainEmail);
  });

  // Info: (20260825 - Julian) 位址邀請沒有信箱，鍵必須是 null（不是空字串）
  it("位址邀請的 inviteeEmailKey 是 null", async () => {
    const created = await invite({ inviteeAddress: mainAddress });

    const row = await prisma.teamInvitation.findUnique({
      where: { id: created.id },
      select: { inviteeEmailKey: true },
    });

    expect(row?.inviteeEmailKey).toBeNull();
  });

  /**
   * Info: (20260825 - Julian) 這個功能的核心：寄到子地址的邀請，本人查得到。
   *
   * 斷言成對：**位址邀請與 email 邀請兩則都在**。只驗 email 那一則的話，
   * 「把 OR 寫成只剩 email 條件」也會通過 —— 而那會讓所有位址邀請消失。
   */
  it("位址邀請與 email 邀請都撈得到", async () => {
    const byAddress = await invite({ inviteeAddress: mainAddress });
    // Info: (20260826 - Julian) 精確相符的信箱（子地址的情形見下一條）
    const byEmail = await invite({ inviteeEmail: mainEmail });

    const result = await listPendingInvitationsForUser({
      userId: mainUserId,
      address: mainAddress,
      nowMs: NOW_MS,
    });

    expect(result.map((item) => item.id).sort()).toEqual(
      [byAddress.id, byEmail.id].sort(),
    );
  });

  /**
   * Info: (20260826 - Julian) 子地址**不**視為同一個人（review：既有護欄）。
   *
   * 這一條先前是反過來寫的 —— 它斷言 `alice+isunfa@gmail.com` 的邀請
   * 會出現在 `alice@gmail.com` 的清單裡，因為查詢用的是 canonical 的
   * `inviteeEmailKey`。那個正規化的取捨是為**唯一鍵**評估的（寧可多合併，
   * 擋得住重複扣款）；拿來決定「這封邀請要不要顯示給你」方向相反：
   * 自建網域上 `bob+x@corp.com` 與 `bob@corp.com` 可以是兩個人，
   * 而邀請內容帶著團隊名稱與邀請人姓名，B1 之後還能被接受。
   *
   * **索引仍然用 canonical**（canonical 相等是精確相等的必要條件，撈出來
   * 是超集不會漏），收斂在 service 的 `isIntendedRecipient`。
   * 這一條同時證明那個收斂真的發生在真資料庫上，而不只是純函式測試裡。
   */
  it("子地址的 email 邀請撈不到（canonical 撈得到，判定不放行）", async () => {
    const created = await invite({
      inviteeEmail: `alice_${STAMP}+isunfa@gmail.com`,
    });

    // Info: (20260826 - Julian) 前提：它的 canonical 鍵確實等於本人的鍵（否則這條沒驗到收斂）
    const row = await prisma.teamInvitation.findUnique({
      where: { id: created.id },
      select: { inviteeEmailKey: true },
    });
    expect(row?.inviteeEmailKey).toBe(mainEmail);

    const result = await listPendingInvitationsForUser({
      userId: mainUserId,
      address: mainAddress,
      nowMs: NOW_MS,
    });

    expect(result.map((item) => item.id)).not.toContain(created.id);
  });

  /**
   * Info: (20260825 - Julian) 別人的 email 邀請撈不到（跨租戶）。
   *
   * 檢查清單 §三.1 把「`where` 條件失效 → 列出全站資料」列為標準形狀，
   * 而這支查詢的輸入之一是使用者自己的信箱，正是最容易寫漏條件的地方。
   */
  it("別人的 email 邀請撈不到", async () => {
    await invite({ inviteeEmail: `bob_${STAMP}@example.com` });

    const result = await listPendingInvitationsForUser({
      userId: mainUserId,
      address: mainAddress,
      nowMs: NOW_MS,
    });

    expect(result).toHaveLength(0);

    // Info: (20260825 - Julian) 反面：那封邀請真的存在，只是不屬於他
    const theirs = await listPendingInvitationsForUser({
      userId: otherUserId,
      address: otherAddress,
      nowMs: NOW_MS,
    });
    expect(theirs).toHaveLength(1);
  });

  /**
   * Info: (20260825 - Julian) 沒有已驗證信箱的人，`emailKeys` 是空陣列。
   *
   * 這一條驗的是 Prisma 的 `in: []` 真的是「永不匹配」。若它被當成
   * 「沒有這個條件」，這裡會撈到上面那封寄給別人的邀請 —— 而那是全站外洩。
   */
  it("沒有已驗證信箱時不會撈到任何 email 邀請", async () => {
    await invite({ inviteeEmail: `someone_${STAMP}@example.com` });
    const noEmail = await createUser("noemail");

    const result = await listPendingInvitationsForUser({
      userId: noEmail.id,
      address: noEmail.address,
      nowMs: NOW_MS,
    });

    // Info: (20260826 - Julian) 不在這裡收拾：`createUser` 已登記，由 afterAll 統一刪
    expect(result).toHaveLength(0);
  });

  // Info: (20260825 - Julian) 非 PENDING 的不算（接受過的邀請不該回到待辦區）
  it("已接受的邀請不算數", async () => {
    await invite({
      inviteeEmail: `alice_${STAMP}@gmail.com`,
      status: TEAM_INVITATION_STATUS.ACCEPTED,
    });

    const result = await listPendingInvitationsForUser({
      userId: mainUserId,
      address: mainAddress,
      nowMs: NOW_MS,
    });

    expect(result).toHaveLength(0);
  });

  // Info: (20260825 - Julian) 過期的不算（過期不是一種 status，只能在讀取時判斷）
  it("過期的 email 邀請不算數", async () => {
    await invite({
      inviteeEmail: `alice_${STAMP}@gmail.com`,
      expiresAt: new Date(NOW_MS - 1),
    });

    const result = await listPendingInvitationsForUser({
      userId: mainUserId,
      address: mainAddress,
      nowMs: NOW_MS,
    });

    expect(result).toHaveLength(0);
  });
});
