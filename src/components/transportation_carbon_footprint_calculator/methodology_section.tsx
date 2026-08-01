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
 * 預設收合:多數使用者只想看結果,但需要的人必須找得到。
 * 收合而非隱藏在另一個頁面,是因為「計算方式」與「計算結果」放在一起才有對照的意義。
 */

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  interpolateMethodologySections,
  type IMethodologySection,
} from "@/constants/logistics_methodology";

/**
 * Info: (20260801 - Luphia) 內容中的 `**粗體**` 僅用於界定結論邊界的字眼
 * (「不包含」、「僅載入台灣範圍」),故以最小限度的切分處理,不引入 markdown 套件。
 * 切分後偶數段為正文、奇數段為強調 —— 這是 split 於成對分隔符下的固有性質。
 */
function renderEmphasis(text: string) {
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
    <section className="mt-5 first:mt-0">
      <h4 className="text-text-primary text-sm font-bold">{section.title}</h4>
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

export default function MethodologySection({ title }: { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  /**
   * Info: (20260802 - Luphia) 文案自語言檔取得,數值由常數插入。
   *
   * t<T>() 以 split(".").reduce() 取值,故可直接回傳整個章節陣列 ——
   * 不必為 11 節 44 條各建一個鍵。但插值只作用於字串,所以語言檔存 {{token}},
   * 實際值一律由 interpolateMethodologySections 自常數代入:
   * 係數與門檻是計算實際採用的值,寫進語言檔就是把同一個事實複製五份。
   */
  const sections = interpolateMethodologySections(
    t<IMethodologySection[] | undefined>(
      "transportation_carbon_footprint_calculator.methodology.sections",
    ),
  );

  return (
    <div className="border-border-default bg-surface-overlay rounded-2xl border">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        /**
         * Info: (20260801 - Luphia) 按鈕本身必須帶圓角。
         *
         * 外層容器是 rounded-2xl，而按鈕先前是方角 —— hover 背景色因此畫到容器的
         * 圓角之外，視覺上像是圓角被填平。這是「有背景色的子元素放進圓角容器」
         * 的通用陷阱：容器的 border-radius 不會自動裁切子元素的背景。
         *
         * 收合時按鈕即整張卡片，四角皆需圓角；展開時下方緊接內容區，
         * 只有上緣需要圓角，否則會在按鈕與內容之間露出兩個缺口。
         *
         * 不以外層 overflow-hidden 解決：那會一併裁掉按鈕的 focus 外框，
         * 用可及性換一個視覺問題並不值得。
         */
        className={`hover:bg-surface-hover flex w-full items-center gap-3 px-5 py-4 text-left transition-colors ${isOpen ? "rounded-t-2xl" : "rounded-2xl"}`}
      >
        <Info className="text-text-muted size-4 shrink-0" />
        <span className="text-text-primary flex-1 text-sm font-bold">
          {title}
        </span>
        <ChevronDown
          className={`text-text-muted size-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="border-border-default border-t px-5 py-4">
          {sections.map((section) => (
            <MethodologySectionBody key={section.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}
