import { describe, it, expect } from "@jest/globals";
import {
  buildCardFingerprint,
  buildCardMetadata,
  buildCardTokenUri,
  decideCardAction,
  type ISubscriptionCardFacts,
} from "@/lib/subscription/subscription_card";
import {
  SUBSCRIPTION_CARD_ACTION,
  SUBSCRIPTION_CARD_URI_PREFIX,
} from "@/constants/subscription_nft";
import { TEAM_PLAN } from "@/constants/subscription_quota";

/**
 * Info: (20260819 - Luphia) 訂閱會員卡的決策與 metadata（純函式）。
 *
 * 這一層值得測到這種密度，因為它守的是**冪等**：判斷錯的後果不是少一張卡，
 * 而是同一個訂閱在鏈上留下兩張都看起來有效的卡（每輪 worker 重鑄一張），
 * 而那是無法回收的——`DynamicKYCMembership` 沒有 burn。
 */

const facts: ISubscriptionCardFacts = {
  teamId: "team-1",
  teamName: "費思會計師事務所",
  effectivePlanId: TEAM_PLAN.TEAM,
  periodStartSec: 1_760_000_000,
  periodEndSec: 1_762_592_000,
  seats: 4,
};

describe("內容指紋", () => {
  it("同樣的訂閱得到同樣的指紋", () => {
    expect(buildCardFingerprint(facts)).toBe(
      buildCardFingerprint({ ...facts }),
    );
  });

  it("方案、期末、席次任一改變就換指紋", () => {
    const base = buildCardFingerprint(facts);

    expect(
      buildCardFingerprint({ ...facts, effectivePlanId: TEAM_PLAN.BUSINESS }),
    ).not.toBe(base);
    expect(
      buildCardFingerprint({ ...facts, periodEndSec: facts.periodEndSec + 1 }),
    ).not.toBe(base);
    expect(buildCardFingerprint({ ...facts, seats: 5 })).not.toBe(base);
  });

  /**
   * Info: (20260819 - Luphia) 指紋只認那三個欄位——**持有人與團隊名不算**。
   *
   * 持有地址刻意不在輸入型別裡：團隊換 OWNER 時卡片不會、也不該重鑄，
   * 因為卡片鑄出去之後只有持有人自己能轉，平台再鑄一張等於憑空多一份有效憑證。
   * 團隊改名同理——那不改變訂閱的任何權益，卻會讓每個改過名的團隊多送一筆交易。
   */
  it("指紋只是那三個欄位的函式（團隊名與持有人都不算）", () => {
    expect(
      buildCardFingerprint({
        effectivePlanId: facts.effectivePlanId,
        periodEndSec: facts.periodEndSec,
        seats: facts.seats,
      }),
    ).toBe(buildCardFingerprint(facts));
  });
});

describe("tokenURI", () => {
  it("是自帶內容的 data URI，解開後就是 metadata", () => {
    const metadata = buildCardMetadata(facts);
    const uri = buildCardTokenUri(metadata);

    expect(uri.startsWith(SUBSCRIPTION_CARD_URI_PREFIX)).toBe(true);
    const json = Buffer.from(
      uri.slice(SUBSCRIPTION_CARD_URI_PREFIX.length),
      "base64",
    ).toString("utf8");

    expect(JSON.parse(json)).toEqual(metadata);
  });

  // Info: (20260819 - Luphia) 重跑要得到一樣的 URI，否則補償重試不是冪等的
  it("同樣的輸入產生同樣的 URI", () => {
    expect(buildCardTokenUri(buildCardMetadata(facts))).toBe(
      buildCardTokenUri(buildCardMetadata({ ...facts })),
    );
  });

  it("metadata 帶方案、團隊、席次與期間", () => {
    const metadata = buildCardMetadata(facts);

    expect(metadata.name).toContain(TEAM_PLAN.TEAM);
    expect(metadata.attributes).toEqual(
      expect.arrayContaining([
        { trait_type: "plan", value: TEAM_PLAN.TEAM },
        { trait_type: "team_id", value: "team-1" },
        { trait_type: "seats", value: 4 },
        { trait_type: "period_end", value: facts.periodEndSec },
      ]),
    );
  });

  // Info: (20260819 - Luphia) 期間寫 epoch 秒，不寫格式化日期（時區是顯示端的事）
  it("期間以 epoch 秒表示", () => {
    const metadata = buildCardMetadata(facts);
    const periodEnd = metadata.attributes.find(
      (attribute) => attribute.trait_type === "period_end",
    );

    expect(typeof periodEnd?.value).toBe("number");
  });
});

describe("同步決策", () => {
  const fresh = { tokenId: null, syncedFingerprint: null, attempts: 0 };

  it("付費方案且尚未發卡 → 鑄卡", () => {
    const decision = decideCardAction(facts, fresh);

    expect(decision.action).toBe(SUBSCRIPTION_CARD_ACTION.MINT);
    expect(decision.fingerprint).toBe(buildCardFingerprint(facts));
  });

  /**
   * Info: (20260819 - Luphia) 這一條是冪等本身：指紋一致就不再動鏈。
   *
   * 少了它，worker 每分鐘都會為同一個訂閱鑄一張新卡。
   */
  it("已同步且內容一致 → 不動作", () => {
    const decision = decideCardAction(facts, {
      tokenId: "7",
      syncedFingerprint: buildCardFingerprint(facts),
      attempts: 0,
    });

    expect(decision.action).toBe(SUBSCRIPTION_CARD_ACTION.NONE);
  });

  it("已有卡但內容變了 → 換 URI（不重鑄）", () => {
    const decision = decideCardAction(
      { ...facts, seats: 9 },
      {
        tokenId: "7",
        syncedFingerprint: buildCardFingerprint(facts),
        attempts: 0,
      },
    );

    expect(decision.action).toBe(SUBSCRIPTION_CARD_ACTION.UPDATE_URI);
  });

  it("有卡但從未成功同步過 → 換 URI", () => {
    const decision = decideCardAction(facts, {
      tokenId: "7",
      syncedFingerprint: null,
      attempts: 0,
    });

    expect(decision.action).toBe(SUBSCRIPTION_CARD_ACTION.UPDATE_URI);
  });

  // Info: (20260819 - Luphia) 卡片代表付費訂閱：免費方案沒有卡，而「沒有卡」不是待辦
  it("免費方案且沒有卡 → 不鑄", () => {
    const decision = decideCardAction(
      { ...facts, effectivePlanId: TEAM_PLAN.FREE },
      fresh,
    );

    expect(decision.action).toBe(SUBSCRIPTION_CARD_ACTION.NONE);
    expect(decision.reason).toContain("免費方案");
  });

  /**
   * Info: (20260819 - Luphia) 降級之後那張既存的卡必須改寫。
   *
   * 不改的話，它會繼續對外聲稱一個已經結束的訂閱——而卡片是給第三方看的東西，
   * 「沒人看」不是理由。
   */
  it("降級為免費但已有卡 → 換 URI 說明不再有效", () => {
    const downgraded = { ...facts, effectivePlanId: TEAM_PLAN.FREE };
    const decision = decideCardAction(downgraded, {
      tokenId: "7",
      syncedFingerprint: buildCardFingerprint(facts),
      attempts: 0,
    });

    expect(decision.action).toBe(SUBSCRIPTION_CARD_ACTION.UPDATE_URI);
    expect(buildCardMetadata(downgraded).description).toContain("not active");
  });

  /**
   * Info: (20260819 - Luphia) 重試上限先判，而且比「內容有變」優先。
   *
   * 永久性失敗（地址被列入黑名單、管理員錢包缺角色）重試一百次也一樣，
   * 而每次重試都要付一次模擬與 gas 估算。CLAUDE.md §6：達上限就停手等人介入。
   */
  it("達重試上限 → 停手，即使內容有變", () => {
    const decision = decideCardAction(
      { ...facts, seats: 9 },
      { tokenId: null, syncedFingerprint: null, attempts: 5 },
      5,
    );

    expect(decision.action).toBe(SUBSCRIPTION_CARD_ACTION.GIVE_UP);
  });

  it("還沒達上限就照常判斷", () => {
    const decision = decideCardAction(
      facts,
      { tokenId: null, syncedFingerprint: null, attempts: 4 },
      5,
    );

    expect(decision.action).toBe(SUBSCRIPTION_CARD_ACTION.MINT);
  });
});
