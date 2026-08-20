"use client";

/**
 * Info: (20260820 - Luphia) 使用說明分頁。
 *
 * 這個分頁的存在是為了修掉一個版面問題:操作說明本來沒有,而計算方式說明掛在
 * 頁尾的折疊區 —— 位置在一份含地圖的長報告之後,且預設收合。
 * 兩個條件疊起來,等於使用者永遠不會發現它。
 *
 * 現在兩者並列在一個固定的分頁裡,左側目錄常駐,任何一節都是一次點擊可達。
 * 順序刻意是「操作說明在前、計算方式在後」:先讓人做得出報告,再讓人讀得懂報告。
 *
 * 文案(含每一步的圖上標記說明)全部來自 i18n 的 guide.chapters,
 * 插圖則由 guide_figures.tsx 依語言檔指定的識別碼渲染 —— 語言檔不含圖形資訊。
 */

import { BookOpen, ArrowRight, Lightbulb } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  GUIDE_ANCHOR_PREFIX,
  interpolateGuideChapters,
  type IGuideChapter,
} from "@/constants/logistics_guide";
import {
  MethodologyContent,
  renderEmphasis,
  useMethodologySections,
} from "@/components/transportation_carbon_footprint_calculator/methodology_section";
import { GuideFigure } from "@/components/transportation_carbon_footprint_calculator/guide_figures";

/** Info: (20260820 - Luphia) 圖上標記與圖下說明共用的編號樣式,兩者靠順序對應 */
function CalloutBadge({ n }: { n: number }) {
  return (
    <span className="bg-brand text-text-inverted mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] leading-none font-bold">
      {n}
    </span>
  );
}

function GuideStepCard({
  step,
  index,
}: {
  step: IGuideChapter["steps"][number];
  index: number;
}) {
  const { t } = useTranslation();

  return (
    <li
      id={`${GUIDE_ANCHOR_PREFIX.CHAPTER}${step.id}`}
      className="border-border-default bg-surface-overlay scroll-mt-24 rounded-2xl border p-5"
    >
      <div className="flex items-start gap-3">
        <span className="bg-brand-soft text-brand-on-soft inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-text-primary text-sm font-bold">{step.title}</h3>
          <p className="text-text-secondary mt-1.5 text-xs leading-relaxed">
            {renderEmphasis(step.body)}
          </p>

          {step.notes && step.notes.length > 0 && (
            <ul className="mt-2 space-y-1">
              {step.notes.map((note, noteIndex) => (
                <li
                  key={noteIndex}
                  className="text-text-secondary flex gap-2 text-xs leading-relaxed"
                >
                  <Lightbulb className="text-text-muted mt-0.5 size-3.5 shrink-0" />
                  <span>{renderEmphasis(note)}</span>
                </li>
              ))}
            </ul>
          )}

          {step.figure && (
            <GuideFigure
              figure={step.figure}
              caption={t(
                "transportation_carbon_footprint_calculator.guide.figure_caption",
                { title: step.title },
              )}
            />
          )}

          {step.callouts && step.callouts.length > 0 && (
            <ol className="mt-3 space-y-1.5">
              {step.callouts.map((callout, calloutIndex) => (
                <li
                  key={calloutIndex}
                  className="text-text-secondary flex gap-2 text-xs leading-relaxed"
                >
                  <CalloutBadge n={calloutIndex + 1} />
                  <span>{renderEmphasis(callout)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </li>
  );
}

export function GuideSection({
  onStartAnalysis,
}: {
  onStartAnalysis: () => void;
}) {
  const { t } = useTranslation();

  /**
   * Info: (20260820 - Luphia) 章節取自語言檔,其中的門檻與費用由常數插入 ——
   * 「不足 {{minSeaKm}} km 不會出現海運方案」與適用性引擎讀的是同一個值。
   */
  const chapters = interpolateGuideChapters(
    t<IGuideChapter[] | undefined>(
      "transportation_carbon_footprint_calculator.guide.chapters",
    ),
  );
  const methodologySections = useMethodologySections();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
      {/* Info: (20260820 - Luphia) 側邊目錄:整份說明很長,沒有常駐目錄就又變成一份要捲的長文 */}
      <nav
        aria-label={t(
          "transportation_carbon_footprint_calculator.guide.nav_title",
        )}
        className="lg:sticky lg:top-24 lg:self-start"
      >
        <div className="border-border-default bg-surface-overlay rounded-2xl border p-4">
          <p className="text-text-muted text-[11px] font-bold tracking-wide uppercase">
            {t("transportation_carbon_footprint_calculator.guide.nav_title")}
          </p>
          <ul className="mt-2 space-y-1">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <a
                  href={`#${GUIDE_ANCHOR_PREFIX.CHAPTER}${chapter.id}`}
                  className="text-text-secondary hover:bg-surface-hover hover:text-text-primary block rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
                >
                  {chapter.title}
                </a>
              </li>
            ))}
          </ul>

          <p className="text-text-muted mt-4 text-[11px] font-bold tracking-wide uppercase">
            {t("transportation_carbon_footprint_calculator.methodology.title")}
          </p>
          <ul className="mt-2 space-y-0.5">
            {methodologySections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${GUIDE_ANCHOR_PREFIX.METHODOLOGY}${section.id}`}
                  className="text-text-secondary hover:bg-surface-hover hover:text-text-primary block rounded-md px-2 py-1 text-xs transition-colors"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="min-w-0 space-y-10">
        <header className="border-border-default bg-surface-overlay rounded-2xl border p-5">
          <h2 className="text-text-primary flex items-center gap-2 text-lg font-bold">
            <BookOpen className="text-brand size-5 shrink-0" />
            {t("transportation_carbon_footprint_calculator.guide.title")}
          </h2>
          <p className="text-text-secondary mt-2 text-sm leading-relaxed">
            {t("transportation_carbon_footprint_calculator.guide.subtitle")}
          </p>
          <p className="text-text-muted mt-2 text-xs leading-relaxed">
            {t("transportation_carbon_footprint_calculator.guide.figure_note")}
          </p>
          <button
            type="button"
            onClick={onStartAnalysis}
            className="bg-brand text-text-inverted mt-4 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
          >
            {t("transportation_carbon_footprint_calculator.guide.start_cta")}
            <ArrowRight className="size-3.5" />
          </button>
        </header>

        {chapters.map((chapter) => (
          <section
            key={chapter.id}
            id={`${GUIDE_ANCHOR_PREFIX.CHAPTER}${chapter.id}`}
            className="scroll-mt-24"
          >
            <h2 className="text-text-primary text-base font-bold">
              {chapter.title}
            </h2>
            {chapter.summary && (
              <p className="text-text-secondary mt-1.5 text-xs leading-relaxed">
                {renderEmphasis(chapter.summary)}
              </p>
            )}
            <ol className="mt-4 space-y-4">
              {chapter.steps.map((step, index) => (
                <GuideStepCard key={step.id} step={step} index={index} />
              ))}
            </ol>
          </section>
        ))}

        {/* Info: (20260820 - Luphia) 計算方式說明:不再收合,並與操作說明共用同一份目錄 */}
        <section className="border-border-default bg-surface-overlay rounded-2xl border p-5">
          <h2 className="text-text-primary text-base font-bold">
            {t("transportation_carbon_footprint_calculator.methodology.title")}
          </h2>
          <p className="text-text-secondary mt-1.5 text-xs leading-relaxed">
            {t("transportation_carbon_footprint_calculator.methodology.intro")}
          </p>
          <div className="border-border-default mt-4 border-t pt-4">
            <MethodologyContent />
          </div>
        </section>
      </div>
    </div>
  );
}
