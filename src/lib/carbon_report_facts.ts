// Info: (20260908 - Emily) 報告本體的數值主張 → 可引用的事實(#6778 後半)
//
// Info: (20260908 - Emily) 職責邊界:本模組只讀**報告草稿**,不讀帳本。
// Info: (20260908 - Emily) 帳本那半是 carbon_ledger_query;這裡回答的是另一個問題 ——
// Info: (20260908 - Emily) 「報告上那個數字是多少、寫在第幾節、跟帳本一不一樣」。

import {
  splitReportMarkdownSections,
  alignReportSections,
} from "@/hooks/use_carbon_chat.helpers";
import {
  extractQuantityClaims,
  collectAllowedNumbers,
  adjudicateQuantityClaims,
} from "@/lib/carbon_reply_gate";
import type { IReportParagraph } from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260908 - Emily) 一節的可引用文字。
 *
 * `code` / `title` 供標示來源(使用者問的是「第 3.2 節」),`content` 是那一節的現行原文。
 */
export interface IReportSectionText {
  code: string;
  title: string;
  content: string;
}

/**
 * Info: (20260908 - Emily) 每節的現行原文取自**哪裡** —— 這是本模組唯一的判斷。
 *
 * `reportData.rawMarkdown` 的型別註解寫得很清楚:它存在時是「報告全文的權威來源
 * (使用者所見即所存)」,而 `paragraphs` 降為 derived view。也就是使用者直接編輯全文之後,
 * `paragraphs[].content` 可能已經不是紙上那一句。
 *
 * 事實包若讀了 derived view,就會出現這個專案這幾週追最多的那種分歧:
 * **報告上印的是一個數字,而 AI 引用的是另一個** —— 而兩者都自稱來自報告。
 * 所以有 rawMarkdown 時一律以它為準,用既有的 `splitReportMarkdownSections` +
 * `alignReportSections`(組稿端 patch 用的同一對函式)把全文對回段落順序。
 *
 * 沒有 rawMarkdown 時(舊草稿、或還沒有全文的新報告)才退回 `paragraphs[].content`。
 */
export const resolveReportSectionTexts = (
  paragraphs: ReadonlyArray<IReportParagraph> | undefined,
  rawMarkdown: string | undefined,
): IReportSectionText[] => {
  const sections = paragraphs ?? [];
  if (sections.length === 0) return [];
  if (!rawMarkdown) {
    return sections
      .filter((paragraph) => paragraph.content.trim().length > 0)
      .map((paragraph) => ({
        code: paragraph.code,
        title: paragraph.title,
        content: paragraph.content,
      }));
  }
  const aligned = alignReportSections(
    sections.map((paragraph) => paragraph.title),
    splitReportMarkdownSections(rawMarkdown),
  );
  return sections
    .map((paragraph, index) => ({
      code: paragraph.code,
      title: paragraph.title,
      content: aligned.get(index) ?? "",
    }))
    .filter((section) => section.content.trim().length > 0);
};

/** Info: (20260908 - Emily) 事實 label 的前綴,供接線端與測試共用一個字面值 */
export const REPORT_FACT_LABEL_PREFIX = "報告原文";

/** Info: (20260908 - Emily) 逾上限那一筆的 label(與帳本事實包的同名慣例一致) */
export const REPORT_FACT_OVERFLOW_LABEL = "報告原文數值逾上限";

/**
 * Info: (20260908 - Emily) 報告上的數值主張抽成事實(#6778 後半)。
 *
 * ## 要修的失敗
 *
 * 對話請求送出去的是 `history + currentStep + ledgerFacts` —— **報告本體不在裡面**。
 * 於是「報告第 3.2 節寫的類別三是多少」這種問題,模型手上沒有那個數字:
 * 守規矩就拒答,不守規矩就從帳本挑一個看起來像的。而使用者問的正是紙上那一句,
 * 尤其在匯入的報告裡 —— 那些數字是原文照錄的,帳本可能根本沒有對應的格。
 *
 * ## 用既有的萃取器,不自己寫第二支
 *
 * `extractQuantityClaims`(出口守門的 Y 地板)已經解掉這件事的難處:全形數字摺半形、
 * 遮單位再掃數字、雙向窗口、最近數字配對、非排放單位豁免。再寫一支必然與它分岔,
 * 而分岔的後果是「守門收的數字」與「事實包給的數字」不是同一個集合。
 *
 * ## 為什麼**不**宣告 emissionsKg
 *
 * `emissionsKg` 是「這個數字是可信的排放量」的宣告,出口守門憑它允許 kg↔公噸換算。
 * 報告上的數字有兩種來歷:原文照錄(可信)與 AI 撰寫(未經帳本裁決)。後者若進了
 * `emissionsKg`,守門就會拿報告自己的產出替報告的下一句背書 ——
 * **守門被自己要守的東西餵養**。所以只進 `equality`(字串精確等值可引用),
 * 讓模型能原樣轉述紙上那一句,但不能對它做任何換算。
 *
 * ## 一致 / 不一致要當面說,而且用**出口守門的同一支裁決**
 *
 * 「與帳本一致」的定義直接借 `adjudicateQuantityClaims`:**守門會放行的就是一致**。
 * 第一版我自己拿 `collectAllowedNumbers(...).equality` 做字串比對,結果全部判成不一致 ——
 * 因為帳本事實宣告了 `emissionsKg`(kg 級)時,`collectAllowedNumbers` 走那一支就
 * **不把 value 放進 equality**,而報告紙上印的是公噸。少了 kg↔公噸 的換算,
 * 「報告寫 227.8986 公噸、帳本存 227898.6 kg」這個最常見的一致情形會被說成不一致 ——
 * 一個假警報,而且假警報比沒有標示更糟(查核者會去追一個不存在的差異)。
 *
 * 借同一支裁決還有一個好處:兩邊的定義不可能分岔。守門日後放寬或收緊,這裡跟著動。
 *
 * 不一致的**排在前面**、逾上限時最後才裁 —— 「報告寫 237.0968 而帳本是 227.8986」
 * 正是查核者要看的那一筆,而一致的那些只是重複帳本已經有的資訊。
 */
export const buildReportSectionFacts = (
  sections: ReadonlyArray<IReportSectionText>,
  ledgerFacts: ReadonlyArray<IContextFact>,
  budget: number,
): IContextFact[] => {
  if (budget <= 0) return [];
  const allowed = collectAllowedNumbers([...ledgerFacts], []);
  const matched: IContextFact[] = [];
  const unmatched: IContextFact[] = [];

  sections.forEach((section) => {
    const seen = new Set<string>();
    extractQuantityClaims(section.content).forEach((claim) => {
      /*
       * Info: (20260908 - Emily) 同一節內同值去重:一節裡「3470.34 公噸」寫三次
       * (敘述、表格、小結)是同一個主張,三筆事實只會擠掉別節的訊號。
       * 跨節不去重 —— 同一個數字出現在兩節是兩個主張,而「哪一節」正是使用者問的。
       */
      if (seen.has(claim.value)) return;
      seen.add(claim.value);
      /*
       * Info: (20260908 - Emily) 一筆一筆問裁決(而不是先攤平再問一次):
       * 裁決回的是「違規值」的去重清單,攤平之後對不回是哪一節的哪一筆。
       */
      const isMatched = adjudicateQuantityClaims([claim], allowed).length === 0;
      const fact: IContextFact = {
        label: `${REPORT_FACT_LABEL_PREFIX} ${section.code} ${section.title}`,
        value: `${claim.value} ${claim.unit}`.trim(),
        source: isMatched
          ? `報告草稿第 ${section.code} 節原文(與帳本事實的數值一致)`
          : `報告草稿第 ${section.code} 節原文(帳本事實裡沒有這個數值;可能是原文照錄的既有報告數字,也可能是尚未勾稽的敘述)`,
      };
      (isMatched ? matched : unmatched).push(fact);
    });
  });

  const ordered = [...unmatched, ...matched];
  if (ordered.length <= budget) return ordered;
  /*
   * Info: (20260908 - Emily) 逾上限時**明說**裁掉幾筆(同帳本事實包的慣例):
   * 靜默截斷會讓模型說「報告上只有這些數字」,那是說謊。
   * 佔用一格給這筆說明,所以留 budget - 1 筆內容。
   */
  const kept = ordered.slice(0, Math.max(budget - 1, 0));
  return [
    ...kept,
    {
      label: REPORT_FACT_OVERFLOW_LABEL,
      value: `另有 ${ordered.length - kept.length} 個報告原文的數值未列出`,
      source: "報告原文事實上限裁剪(據實申報,非全貌)",
    },
  ];
};

/**
 * Info: (20260908 - Emily) 接線端的單一入口:解析每節現行原文 → 抽成事實。
 *
 * 分成兩支再合成一支,是為了讓「以 rawMarkdown 為權威」這個判斷可以單獨被測
 * (它是本模組最容易在日後被改壞的一格)。
 */
export const buildReportFacts = (input: {
  paragraphs?: ReadonlyArray<IReportParagraph>;
  rawMarkdown?: string;
  ledgerFacts: ReadonlyArray<IContextFact>;
  budget: number;
}): IContextFact[] =>
  buildReportSectionFacts(
    resolveReportSectionTexts(input.paragraphs, input.rawMarkdown),
    input.ledgerFacts,
    input.budget,
  );
