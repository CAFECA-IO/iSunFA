"use client";

/**
 * Info: (20260801 - Luphia) 計算方式說明區塊。
 *
 * 與 PDF 附錄共用 LOGISTICS_METHODOLOGY_SECTIONS —— 兩處各寫一份必然失去同步,
 * 而「網頁說的與報告說的不一樣」對審計文件是致命的。
 *
 * 預設收合:多數使用者只想看結果,但需要的人必須找得到。
 * 收合而非隱藏在另一個頁面,是因為「計算方式」與「計算結果」放在一起才有對照的意義。
 */

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import {
  LOGISTICS_METHODOLOGY_SECTIONS,
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

  return (
    <div className="border-border-default bg-surface-overlay rounded-2xl border">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="hover:bg-surface-hover flex w-full items-center gap-3 px-5 py-4 text-left transition-colors"
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
          {LOGISTICS_METHODOLOGY_SECTIONS.map((section) => (
            <MethodologySectionBody key={section.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}
