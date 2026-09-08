import fs from "fs";
import path from "path";
import { describe, it, expect } from "@jest/globals";

/**
 * Info: (20260904 - Emily) #6745 的**接線**掃描:三個入口是不是真的都走同一道門。
 *
 * 服務層的行為由 `paragraph_draft.service.test.ts` 那一組守;本檔守的是
 * 「機制做好了但真實路徑上不觸發」這個本週最貴的形狀:
 * 守門的上崗條件是「呼叫端有帶事實包」,所以每一個入口都要帶 ——
 * 少一個,那個入口就永遠走跳過分支,而測試照綠(PR #6716 round-3 的教訓:
 * 接線沒測試,突變全綠)。
 */
const read = (relative: string): string =>
  fs.readFileSync(path.join(process.cwd(), relative), "utf-8");

describe("守門住在服務本體,route 不再自己接一段", () => {
  const service = read("src/services/paragraph_draft.service.ts");
  const chatRoute = read("src/app/api/v1/chat/carbon/route.ts");

  it("generateParagraphDraft 在回傳之前呼叫守門", () => {
    const gate = service.indexOf(
      "this.gateQuantities(section.id, content, input);",
    );
    const ret = service.indexOf("citedFacts: parsed.data.citedFacts,");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(ret);
  });

  it("守門重用回覆守門那把尺,不另寫判準", () => {
    /*
     * Info: (20260904 - Emily) 用對空白寬容的 regex:prettier 會把這串參數折成多行,
     * 字面比對會在下一次格式化時無故變紅。
     */
    expect(service).toMatch(
      /auditReplyQuantities\(\s*content,\s*input\.contextFacts,\s*allowedTexts,?\s*\)/,
    );
    expect(service).toContain("shouldRunReplyGate(input.contextFacts)");
  });

  it("/chat/carbon route 不再自己呼叫 auditReplyQuantities(單一咽喉)", () => {
    expect(chatRoute).not.toContain("auditReplyQuantities(");
    // Info: (20260904 - Emily) 而是認服務拋出來的那個錯誤 —— 語意(warn + degraded)不變
    expect(chatRoute).toContain("isDraftQuantityGateError(draftError)");
  });
});

describe("三個入口都帶事實包(帶了門才會開)", () => {
  const hook = read("src/hooks/use_carbon_chat.ts");
  const chatRoute = read("src/app/api/v1/chat/carbon/route.ts");
  const attachment = read("src/services/attachment_extraction.service.ts");

  it("入口 1:對話 readyParagraphId 路徑帶帳本事實包", () => {
    expect(chatRoute).toContain("contextFacts: ledgerFacts,");
  });

  it("入口 2:/draft 的兩個呼叫端都帶帳本事實包,而且用同一支組包", () => {
    /**
     * Info: (20260904 - Emily) 兩個 body:生成(原本什麼都不帶)與修訂(原本只帶那則訊息的事實)。
     *
     * Info: (20260908 - Emily) 判準從「全檔數 buildChannelLedgerFacts 幾次 = 3」改成
     * **逐個呼叫端看它自己的 body**(#6786)。
     *
     * 原本那個數字是個代理指標,而它會在**正確的**改動上壞掉:#6786 讓段落指紋與
     * 過期盤點也走同一支組包點(那正是這條測試想鼓勵的事 —— 事實只有一個來源),
     * 於是次數變成 5、測試變紅。代理指標壞在正確改動上的代價不是紅一次,
     * 是下一個人學會「把數字改大就好」—— 那時它連真的漏接也擋不住了。
     * 現在問的是這條測試真正在意的事:每一個 /draft 呼叫端的 body 裡有沒有那份事實包。
     */
    const draftCalls = hook.split('"/api/v1/chat/carbon/draft"').length - 1;
    expect(draftCalls).toBe(2);
    hook
      .split('"/api/v1/chat/carbon/draft"')
      .slice(1)
      .forEach((tail) => {
        // Info: (20260908 - Emily) body 緊接在 URL 之後;取足夠長的窗以涵蓋整個 body
        const body = tail.slice(0, 1500);
        expect(body).toContain("contextFacts:");
        expect(body).toContain("buildChannelLedgerFacts(chatChannel)");
      });
  });

  it("入口 3:附件管線把帳本事實包併進萃取事實", () => {
    expect(attachment).toContain(
      "contextFacts: [...allFacts, ...(input.ledgerFacts ?? [])]",
    );
    expect(chatRoute).toMatch(
      /runAttachmentToParagraphPipeline\(\{[\s\S]*?ledgerFacts,/,
    );
  });

  it("組包只有一個定義點", () => {
    expect(
      hook.split("const buildChannelLedgerFacts = useCallback(").length - 1,
    ).toBe(1);
    // Info: (20260904 - Emily) 原本 inline 的那段 buildLedgerFactBundle(...) 已收進去,hook 裡只剩一次呼叫
    expect(hook.split("buildLedgerFactBundle(").length - 1).toBe(1);
  });
});

describe("被攔下的處置:降級而不是失敗", () => {
  it("附件管線把守門攔下與生成失敗分開記,而且跳過該段繼續", () => {
    const attachment = read("src/services/attachment_extraction.service.ts");
    expect(attachment).toContain("isDraftQuantityGateError(error)");
    expect(attachment).toContain("draft gate blocked");
  });
});
