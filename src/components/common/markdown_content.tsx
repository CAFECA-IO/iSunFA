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
import dynamic from "next/dynamic";

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
  theme?: "dark" | "light";
  variant?: MarkdownContentVariant;
  onContentChange?: (newContent: string) => void;
}

const MarkdownContent: FC<IMarkdownContentProps> = ({
  content,
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
  const textColor = isDark ? "text-[#ffffff]" : "text-[#111827]";
  const secondaryTextColor = isDark ? "text-[#E0E0E0]" : "text-[#374151]";
  const linkColor = isDark ? "text-[#64B5F6]" : "text-[#2563eb]";
  const borderColor = isDark ? "border-[#444]" : "border-[#e5e7eb]";
  const blockquoteBg = isDark ? "bg-[#FF9800]/10" : "bg-[#fff7ed]";
  const blockquoteText = isDark ? "text-[#FFE0B2]" : "text-[#9a3412]";
  const tableBorder = isDark ? "border-[#444]" : "border-[#d1d5db]";
  const theadBg = isDark ? "bg-[#ffffff]/5" : "bg-[#f9fafb]";
  const thText = isDark ? "text-[#FFB74D]" : "text-[#c2410c]";

  /**
   * Info: (20260722 - Tzuhan) 顯示層剝除 HTML 註解(UAT:錨點註解外洩至預覽/PDF)。
   * 未啟用 rehype-raw 時 react-markdown 會把 HTML 註解當純文字印出;
   * 系統以註解作段落錨點(carbon-data-table / carbon-chart 等,重算連動據此替換),
   * 錨點必須留在原文、只在渲染時隱藏 — 僅影響顯示,不動資料。
   * Info: (20260730 - Tzuhan) 原為行內 regex,會連程式碼區塊內的註解一起吃掉 ——
   * 使用者貼 HTML 教學範例時 fence 內的 `<!-- ... -->` 是內容而非錨點,那等於靜默改寫他的文件。
   * 改用 fence-aware 的共用工具(見 markdown_comment.ts,有單元測試護住)。
   */
  const displayContent = useMemo(
    () => stripMarkdownComments(content),
    [content],
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
        <tr className={`transition-colors hover:bg-black/5`} {...props}>
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
          return <CustomChart type={customType} raw={getFenceText()} />;
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
              className={`rounded-md bg-black/5 px-1.5 py-0.5 text-sm ${textColor} font-mono`}
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
