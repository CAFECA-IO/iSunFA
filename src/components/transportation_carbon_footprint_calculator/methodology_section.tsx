"use client";

/**
 * Info: (20260801 - Luphia) 計算方式說明區塊。
 *
 * 文案來自 i18n 語言檔的 methodology.sections,數值由常數插入 ——
 * 係數與門檻是計算實際採用的值,寫進語言檔就是把同一個事實複製五份。
 *
 * Info: (20260802 - Luphia) 原本此說明也作為 PDF 附錄,現已移出報告(只留在頁面),
 * 故不再有「網頁與報告兩份文案」的同步問題。
 *
 * Info: (20260820 - Luphia) 版面重整:原本是頁尾一個預設收合的折疊區。
 *
 * 那個位置有兩個問題疊在一起 —— 它在一份含地圖的長報告**之後**(捲動數千像素才會出現),
 * 而且收合著,所以連「這裡有東西」都看不出來。實際效果等同於不存在。
 *
 * 現在拆成兩件事:
 *
 * 1. `MethodologyContent` —— 完整內容,搬到「使用說明」分頁,不收合、有側邊目錄可跳,
 *    與操作說明並列。要讀的人在固定的地方找得到,而不是在報告底下挖。
 * 2. `MethodologyHighlights` —— 三條最會影響判讀的限制,**不可收合**地貼在報告結果旁邊。
 *    這是原本那個折疊區真正想做到的事:看到數字的人同時看到數字的邊界。
 */

import { AlertTriangle, ArrowRight } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  interpolateMethodologySections,
  interpolateMethodologyText,
  type IMethodologySection,
} from "@/constants/logistics_methodology";
import { GUIDE_ANCHOR_PREFIX } from "@/constants/logistics_guide";

/**
 * Info: (20260801 - Luphia) 內容中的 `**粗體**` 僅用於界定結論邊界的字眼
 * (「不包含」、「僅載入台灣範圍」),故以最小限度的切分處理,不引入 markdown 套件。
 * 切分後偶數段為正文、奇數段為強調 —— 這是 split 於成對分隔符下的固有性質。
 */
export function renderEmphasis(text: string) {
  return text.split("**").map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="text-brand-on-soft font-semibold">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function MethodologySectionBody({ section }: { section: IMethodologySection }) {
  return (
    <section
      id={`${GUIDE_ANCHOR_PREFIX.METHODOLOGY}${section.id}`}
      className="mt-8 scroll-mt-24 first:mt-0"
    >
      <h3 className="text-text-primary text-sm font-bold">{section.title}</h3>
      {section.paragraphs?.map((text, index) => (
        <p
          key={index}
          className="text-text-secondary mt-1.5 text-xs leading-relaxed"
        >
          {renderEmphasis(text)}
        </p>
      ))}
      {section.items && section.items.length > 0 && (
        <dl className="mt-2 space-y-1.5">
          {section.items.map((item) => (
            <div key={item.term} className="text-xs leading-relaxed">
              <dt className="text-text-secondary font-semibold">{item.term}</dt>
              <dd className="text-text-secondary ml-4">
                {renderEmphasis(item.detail)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/**
 * Info: (20260802 - Luphia) 文案自語言檔取得,數值由常數插入。
 *
 * t<T>() 以 split(".").reduce() 取值,故可直接回傳整個章節陣列 ——
 * 不必為 11 節 44 條各建一個鍵。但插值只作用於字串,所以語言檔存 {{token}},
 * 實際值一律由 interpolateMethodologySections 自常數代入:
 * 係數與門檻是計算實際採用的值,寫進語言檔就是把同一個事實複製五份。
 */
export function useMethodologySections(): IMethodologySection[] {
  const { t } = useTranslation();
  return interpolateMethodologySections(
    t<IMethodologySection[] | undefined>(
      "transportation_carbon_footprint_calculator.methodology.sections",
    ),
  );
}

/** Info: (20260820 - Luphia) 完整的計算方式說明,供「使用說明」分頁展開呈現 */
export function MethodologyContent() {
  const sections = useMethodologySections();
  return (
    <div>
      {sections.map((section) => (
        <MethodologySectionBody key={section.id} section={section} />
      ))}
    </div>
  );
}

/**
 * Info: (20260820 - Luphia) 貼在報告結果旁的限制摘要。
 *
 * 只列三條,且不提供收合 —— 這裡的目的不是把說明搬過來,而是讓「這份數字有邊界」
 * 成為看報告時無法錯過的一句話。要細節的人點連結到使用說明分頁。
 *
 * 三條的挑選標準是「會改變讀者怎麼用這份數字」,而非「最難解釋的原理」。
 */
export function MethodologyHighlights({
  onOpenGuide,
}: {
  onOpenGuide: () => void;
}) {
  const { t } = useTranslation();
  const highlights = (
    t<string[] | undefined>(
      "transportation_carbon_footprint_calculator.methodology.highlights",
    ) ?? []
  ).map((text) => interpolateMethodologyText(text));

  if (highlights.length === 0) return null;

  return (
    <aside className="border-border-default bg-surface-overlay rounded-2xl border p-5">
      <h3 className="text-text-primary flex items-center gap-2 text-sm font-bold">
        <AlertTriangle className="text-brand size-4 shrink-0" />
        {t(
          "transportation_carbon_footprint_calculator.methodology.limits_title",
        )}
      </h3>
      <ul className="mt-3 space-y-1.5">
        {highlights.map((text, index) => (
          <li
            key={index}
            className="text-text-secondary flex gap-2 text-xs leading-relaxed"
          >
            <span className="bg-brand-soft text-brand-on-soft mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold">
              {index + 1}
            </span>
            <span>{renderEmphasis(text)}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onOpenGuide}
        className="text-brand hover:text-brand-on-soft mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors"
      >
        {t("transportation_carbon_footprint_calculator.methodology.read_full")}
        <ArrowRight className="size-3.5" />
      </button>
    </aside>
  );
}
