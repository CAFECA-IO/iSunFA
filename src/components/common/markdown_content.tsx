"use client";

import { FC, ComponentPropsWithoutRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { MermaidChart } from "@/components/chart/mermaid_chart";
import { CustomChart } from "@/components/chart/custom_chart";
import { detectCustomChartType } from "@/lib/utils/custom_chart_parser";
import {
  CARBON_EVIDENCE_FENCE_LANG,
  parseEvidenceFence,
} from "@/constants/carbon_evidence";
import { useState, useEffect } from "react";
import { downloadFile } from "@/lib/file_operator";
import { stripMarkdownComments } from "@/lib/utils/markdown_comment";
import { stripHtmlLineBreaksOutsideFences } from "@/lib/utils/markdown_line_break";
import dynamic from "next/dynamic";
import { escapeArithmeticEmphasis } from "@/lib/utils/markdown_arithmetic_safety";
import { restoreLineStructure } from "@/lib/utils/markdown_line_structure";

// Info: (20260720 - Tzuhan) #54 證據鏈元件動態載入:含 RecordTabModal 依賴鏈,不拖累一般 markdown 渲染
const EvidenceChain = dynamic(
  () =>
    import("@/components/carbon_chatbot/evidence_chain").then(
      (mod) => mod.EvidenceChain,
    ),
  { ssr: false },
);

const AsyncLariaImage = ({
  src,
  alt = "",
  className = "",
}: {
  src: string;
  alt?: string;
  className?: string;
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    let active = true;
    let urlToRevoke: string | null = null;

    // Info: (20260517 - Luphia) Check if it's a file from our Laria storage
    const match = src.match(/\/api\/v1\/file\/(.+)/);
    if (match && match[1]) {
      const cid = match[1];
      downloadFile(cid, {
        onSuccess: (blob) => {
          if (!active) return;
          const url = URL.createObjectURL(blob);
          urlToRevoke = url;
          setObjectUrl(url);
        },
        onError: (err) => {
          console.error("Failed to load Laria image:", err);
          if (active) {
            setObjectUrl(src);
          }
        },
      });
    } else {
      setObjectUrl(src);
    }

    return () => {
      active = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [src]);

  if (!objectUrl) {
    return (
      <div
        className={`my-4 flex h-48 w-full animate-pulse items-center justify-center rounded-lg bg-gray-200/50 ${className || ""}`.trim()}
      >
        <span className="text-sm text-gray-400">Loading image...</span>
      </div>
    );
  }

  return (
    <Image
      src={objectUrl}
      alt={alt || "Markdown Image"}
      width={0}
      height={0}
      sizes="100vw"
      unoptimized
      style={{ width: "100%", height: "auto" }}
      className={`my-4 max-w-full break-inside-avoid rounded-lg print:break-inside-avoid ${className || ""}`.trim()}
    />
  );
};

// Info: (20260713 - Tzuhan) 字級變體:document 為 A4 文件級(預設,匯出 PDF 用);compact 為嵌入式 UI 級(與 app text-sm 基準協調)
export type MarkdownContentVariant = "document" | "compact";

interface IMarkdownContentProps {
  content: string;
  /**
   * Info: (20260810 - Emily) 把段落內的換行還原成硬斷行(碳盤查報告專用)。
   *
   * 用 opt-in 而不是預設:這個元件同時服務文件工具、任務板與公開分享頁,
   * 那些內容的斷行慣例未經量測。碳報告的原文行結構有量過(見
   * markdown_line_structure 的說明),其他使用端沒有,不該替它們決定。
   */
  restoreSourceLineBreaks?: boolean;
  theme?: "dark" | "light";
  variant?: MarkdownContentVariant;
  onContentChange?: (newContent: string) => void;
}

const MarkdownContent: FC<IMarkdownContentProps> = ({
  content,
  restoreSourceLineBreaks = false,
  theme = "dark",
  variant = "document",
  onContentChange = () => {},
}) => {
  const isDark = theme === "dark";
  // Info: (20260713 - Tzuhan) compact 全面降一級,body 固定 text-sm;以明確 class 輸出,避免與外層 CSS 覆寫打架
  const isCompact = variant === "compact";
  const h1Size = isCompact ? "text-xl" : "text-2xl";
  const h2Size = isCompact ? "text-lg" : "text-xl";
  const h3Size = isCompact ? "text-base" : "text-lg";
  const h4Size = isCompact ? "text-sm" : "text-base";
  const h5Size = isCompact ? "text-xs" : "text-sm";
  const bodySize = isCompact ? "text-sm" : "";
  /**
   * Info: (20260802 - Luphia) 這裡的 `theme` 問的是「我背後是深色還是淺色」，
   * 不是「App 目前是什麼主題」—— 聊天泡泡就是靠它區分使用者（深底）與回覆（淺底）。
   * 兩個分支因此有不同的處理方式：
   *
   * - `dark` 分支的背後**永遠**是深色（深色泡泡、`bg-slate-800` 的條款頁），
   *   與 App 主題無關，色值維持字面值。
   * - `light` 分支的背後是「卡片」，而卡片會隨主題變 —— 原本寫死 `#111827`
   *   之類的深色文字，App 切深色後卡片變深、字沒變，對比只剩 1.0。
   *   改用語意 token 與色階 utility，讓它跟著卡片走。
   *
   * 淺色模式下多數色值與原字面值完全相同（`#e5e7eb`、`#d1d5db`、`#fff7ed`、
   * `#f9fafb` 都是 Tailwind 色票的原值）；少數幾個原本寫的是 Tailwind v3 的色票，
   * 換成 v4 同名色階後有極小差異，已逐項量測（最大 oklab 0.02，低於可察覺門檻）。
   */
  const textColor = isDark ? "text-[#ffffff]" : "text-gray-900";
  const secondaryTextColor = isDark ? "text-[#E0E0E0]" : "text-gray-700";
  /** Info: (20260802 - Luphia) 連結沿用藍色語意；blue-600 即原本的 #2563eb，深色下由色階規則提亮 */
  const linkColor = isDark ? "text-[#64B5F6]" : "text-blue-600";
  const borderColor = isDark ? "border-[#444]" : "border-border-default";
  /** Info: (20260802 - Luphia) orange-50 / orange-800 即原本的 #fff7ed / #9a3412 */
  const blockquoteBg = isDark ? "bg-[#FF9800]/10" : "bg-orange-50";
  const blockquoteText = isDark ? "text-[#FFE0B2]" : "text-orange-800";
  const tableBorder = isDark ? "border-[#444]" : "border-border-strong";
  /** Info: (20260802 - Luphia) gray-50 即原本的 #f9fafb；深色下會比卡片再深一階，表頭仍分得出來 */
  const theadBg = isDark ? "bg-[#ffffff]/5" : "bg-gray-50";
  /** Info: (20260802 - Luphia) orange-700 即原本的 #c2410c */
  const thText = isDark ? "text-[#FFB74D]" : "text-orange-700";
  /**
   * Info: (20260802 - Luphia) 表格列 hover 與行內程式碼的底色。
   * 原本兩處都寫死 `bg-black/5` —— 那在深色卡片上等於沒有效果，
   * 因為黑色疊在深色上看不出差別。改為與其他色一樣分兩個分支。
   */
  const subtleBg = isDark ? "bg-white/10" : "bg-surface-hover";
  const subtleHoverBg = isDark ? "hover:bg-white/5" : "hover:bg-surface-hover";

  /**
   * Info: (20260722 - Tzuhan) 顯示層剝除 HTML 註解(UAT:錨點註解外洩至預覽/PDF)。
   * 未啟用 rehype-raw 時 react-markdown 會把 HTML 註解當純文字印出;
   * 系統以註解作段落錨點(carbon-data-table / carbon-chart 等,重算連動據此替換),
   * 錨點必須留在原文、只在渲染時隱藏 — 僅影響顯示,不動資料。
   * Info: (20260730 - Tzuhan) 原為行內 regex,會連程式碼區塊內的註解一起吃掉 ——
   * 使用者貼 HTML 教學範例時 fence 內的 `<!-- ... -->` 是內容而非錨點,那等於靜默改寫他的文件。
   * 改用 fence-aware 的共用工具(見 markdown_comment.ts,有單元測試護住)。
   */
  /**
   * Info: (20260804 - Tzuhan) 一併清除 `<br>`:模型逐字照錄 PDF 表格時,
   * 會用它表示原文版面的折行,而本元件未啟用 rehype-raw(刻意的,見上方註解),
   * 於是它被當純文字印在儲存格裡。下載 PDF 走同一個 DOM,所以兩邊一起解決。
   * 與註解剝除一樣:僅影響顯示,存下來的原文一字不改。
   */
  const displayContent = useMemo(
    /**
     * Info: (20260810 - Emily) 一併轉義算式裡的星號 —— 否則預覽與下載的 PDF
     * 會顯示不同的數字,而那正是這幾天一直在追的那種分歧。
     */
    () => {
      const normalized = escapeArithmeticEmphasis(
        stripHtmlLineBreaksOutsideFences(stripMarkdownComments(content)),
      );
      return restoreSourceLineBreaks
        ? restoreLineStructure(normalized)
        : normalized;
    },
    [content, restoreSourceLineBreaks],
  );

  const components = useMemo(
    () => ({
      h1: ({ children, ...props }: ComponentPropsWithoutRef<"h1">) => (
        <h1
          className={`mt-5 mb-3 flex items-center gap-2 border-b ${borderColor} pb-2 ${h1Size} font-bold ${textColor}`}
          {...props}
        >
          {children}
        </h1>
      ),
      h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
        <h2
          className={`mt-4 mb-2 flex items-center gap-2 ${h2Size} font-bold ${textColor}`}
          {...props}
        >
          <span
            className={`inline-block h-5 w-1 rounded-sm bg-[#FF9800]`}
          ></span>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
        <h3
          className={`mt-3 mb-1.5 ${h3Size} font-bold ${textColor}`}
          {...props}
        >
          {children}
        </h3>
      ),
      h4: ({ children, ...props }: ComponentPropsWithoutRef<"h4">) => (
        <h4
          className={`mt-3 mb-1.5 ${h4Size} font-semibold ${textColor}`}
          {...props}
        >
          {children}
        </h4>
      ),
      h5: ({ children, ...props }: ComponentPropsWithoutRef<"h5">) => (
        <h5
          className={`mt-2 mb-1 ${h5Size} font-semibold ${textColor}`}
          {...props}
        >
          {children}
        </h5>
      ),
      h6: ({ children, ...props }: ComponentPropsWithoutRef<"h6">) => (
        <h6
          className={`mt-2 mb-1 ${h5Size} font-medium ${textColor}`}
          {...props}
        >
          {children}
        </h6>
      ),
      strong: ({ children, ...props }: ComponentPropsWithoutRef<"strong">) => (
        <strong className={`font-bold ${textColor}`} {...props}>
          {children}
        </strong>
      ),
      ul: ({ children, ...props }: ComponentPropsWithoutRef<"ul">) => (
        <ul
          className={`mb-3 list-disc pl-6 ${bodySize} ${secondaryTextColor}`}
          {...props}
        >
          {children}
        </ul>
      ),
      ol: ({ children, ...props }: ComponentPropsWithoutRef<"ol">) => (
        <ol
          className={`mb-3 list-decimal pl-6 ${bodySize} ${secondaryTextColor}`}
          {...props}
        >
          {children}
        </ol>
      ),
      li: ({
        children,
        ...props
      }: ComponentPropsWithoutRef<"li"> & { ordered?: boolean }) => {
        return (
          <li className={`mb-1.5 ${secondaryTextColor}`} {...props}>
            {children}
          </li>
        );
      },
      p: ({ children, ...props }: ComponentPropsWithoutRef<"p">) => (
        <p
          className={`mb-3 leading-relaxed ${bodySize} ${secondaryTextColor}`}
          {...props}
        >
          {children}
        </p>
      ),
      a: ({ children, ...props }: ComponentPropsWithoutRef<"a">) => (
        <a
          className={`${linkColor} font-medium underline transition-opacity hover:opacity-80`}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      ),
      blockquote: ({
        children,
        ...props
      }: ComponentPropsWithoutRef<"blockquote">) => (
        <blockquote
          className={`my-3 rounded-r-lg border-l-4 border-[#FF9800] ${blockquoteBg} px-4 py-3 italic ${bodySize} ${blockquoteText} break-inside-avoid print:break-inside-avoid`}
          {...props}
        >
          {children}
        </blockquote>
      ),
      table: ({ children, ...props }: ComponentPropsWithoutRef<"table">) => (
        <div
          className={`my-5 w-full overflow-x-auto rounded-lg border ${tableBorder} not-prose break-inside-avoid align-middle shadow-sm sm:rounded-lg print:break-inside-avoid`}
        >
          <table
            className={`min-w-full divide-y ${isDark ? "divide-[#444]" : "divide-gray-200"} text-sm`}
            {...props}
          >
            {children}
          </table>
        </div>
      ),
      thead: ({ children, ...props }: ComponentPropsWithoutRef<"thead">) => (
        <thead className={theadBg} {...props}>
          {children}
        </thead>
      ),
      tbody: ({ children, ...props }: ComponentPropsWithoutRef<"tbody">) => (
        <tbody
          className={`divide-y ${isDark ? "divide-[#333]" : "divide-gray-200"} ${isDark ? "bg-transparent" : "bg-white"}`}
          {...props}
        >
          {children}
        </tbody>
      ),
      tr: ({ children, ...props }: ComponentPropsWithoutRef<"tr">) => (
        <tr className={`transition-colors ${subtleHoverBg}`} {...props}>
          {children}
        </tr>
      ),
      th: ({ children, ...props }: ComponentPropsWithoutRef<"th">) => (
        <th
          className={`px-4 py-3.5 text-left font-semibold ${thText} whitespace-nowrap`}
          {...props}
        >
          {children}
        </th>
      ),
      td: ({ children, ...props }: ComponentPropsWithoutRef<"td">) => (
        <td
          className={`px-4 py-3 text-left ${secondaryTextColor} align-top whitespace-normal`}
          {...props}
        >
          {children}
        </td>
      ),
      pre: ({ children, ...props }: ComponentPropsWithoutRef<"pre">) => (
        <pre
          className={`my-4 break-inside-avoid overflow-x-auto rounded-lg p-4 font-mono text-sm leading-relaxed print:break-inside-avoid print:overflow-visible ${isDark ? "border border-[#333] bg-[#1E1E1E] text-gray-200" : "border border-orange-100 bg-white text-gray-800 shadow-sm"}`}
          {...props}
        >
          {children}
        </pre>
      ),
      code: ({
        inline,
        className,
        children,
        ...props
      }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) => {
        // Info: (20260717 - Julian) 允許帶連字號的語言標籤（如 custom-matrix）
        const match = /language-([\w-]+)/.exec(className || "");
        const fenceLang = match?.[1] ?? "";
        const getFenceText = () =>
          (Array.isArray(children)
            ? children.join("")
            : (children?.toString() ?? "")
          ).replace(/\n$/, "");

        // Info: (20260717 - Julian) 攔截自訂圖表標籤，交由 CustomChart 解析渲染
        const customType = !inline ? detectCustomChartType(fenceLang) : null;
        if (customType) {
          const chartText = getFenceText();
          return (
            <CustomChart
              type={customType}
              raw={chartText}
              onChartChange={
                onContentChange
                  ? (newChart) => {
                      // Info: (20260730 - Julian) AI 採用後回寫 Markdown 原始碼（優先整塊替換）
                      const targetBlock = `\`\`\`${fenceLang}\n${chartText}\n\`\`\``;
                      const newBlock = `\`\`\`${fenceLang}\n${newChart}\n\`\`\``;
                      if (content.includes(targetBlock)) {
                        onContentChange(content.replace(targetBlock, newBlock));
                      } else {
                        onContentChange(content.replace(chartText, newChart));
                      }
                    }
                  : undefined
              }
            />
          );
        }

        // Info: (20260720 - Tzuhan) #54 證據鏈 fence:層層下鑽至單一憑證(數據實時問 API,
        // Info: (20260720 - Tzuhan) 帳本閱覽權限由 server 裁決);格式不符退回一般程式碼區塊呈現
        if (!inline && fenceLang === CARBON_EVIDENCE_FENCE_LANG) {
          const accountBookId = parseEvidenceFence(getFenceText());
          if (accountBookId) {
            return <EvidenceChain accountBookId={accountBookId} />;
          }
        }

        if (!inline && match && match[1] === "mermaid") {
          const chartText = getFenceText();
          return (
            <MermaidChart
              chart={chartText}
              onChartChange={
                onContentChange
                  ? (newChart) => {
                      const targetBlock = `\`\`\`mermaid\n${chartText}\n\`\`\``;
                      const newBlock = `\`\`\`mermaid\n${newChart}\n\`\`\``;
                      if (content.includes(targetBlock)) {
                        onContentChange(content.replace(targetBlock, newBlock));
                      } else if (content.includes(chartText)) {
                        onContentChange(content.replace(chartText, newChart));
                      } else {
                        onContentChange(content.replace(chartText, newChart));
                      }
                    }
                  : undefined
              }
            />
          );
        }
        if (inline) {
          return (
            <code
              className={`rounded-md ${subtleBg} px-1.5 py-0.5 text-sm ${textColor} font-mono`}
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      img: ({ src, alt, className }: ComponentPropsWithoutRef<"img">) => {
        if (!src) return null;
        return (
          <AsyncLariaImage
            src={src as string}
            alt={alt}
            className={className}
          />
        );
      },
    }),
    [
      textColor,
      secondaryTextColor,
      linkColor,
      borderColor,
      blockquoteBg,
      blockquoteText,
      tableBorder,
      theadBg,
      thText,
      subtleBg,
      subtleHoverBg,
      isDark,
      content,
      onContentChange,
      h1Size,
      h2Size,
      h3Size,
      h4Size,
      h5Size,
      bodySize,
    ],
  );

  const result = (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {displayContent}
    </ReactMarkdown>
  );

  return result;
};

export { MarkdownContent };
