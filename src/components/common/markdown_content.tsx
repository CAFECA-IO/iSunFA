"use client";

import { FC, ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { MermaidChart } from "@/components/common/mermaid_chart";
import { useState, useEffect } from "react";
import { downloadFile } from "@/lib/file_operator";

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
    let urlToRevoke: string | null = null;

    // Info: (20260517 - Luphia) Check if it's a file from our Laria storage
    const match = src.match(/\/api\/v1\/file\/(.+)/);
    if (match && match[1]) {
      const cid = match[1];
      downloadFile(cid, {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          urlToRevoke = url;
          setObjectUrl(url);
        },
        onError: (err) => {
          console.error("Failed to load Laria image:", err);
          setObjectUrl(src);
        },
      });
    } else {
      setObjectUrl(src);
    }

    return () => {
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

interface IMarkdownContentProps {
  content: string;
  theme?: "dark" | "light";
}

const MarkdownContent: FC<IMarkdownContentProps> = ({
  content,
  theme = "dark",
}) => {
  const isDark = theme === "dark";
  const textColor = isDark ? "text-[#ffffff]" : "text-[#111827]";
  const secondaryTextColor = isDark ? "text-[#E0E0E0]" : "text-[#374151]";
  const linkColor = isDark ? "text-[#64B5F6]" : "text-[#2563eb]";
  const borderColor = isDark ? "border-[#444]" : "border-[#e5e7eb]";
  const blockquoteBg = isDark ? "bg-[#FF9800]/10" : "bg-[#fff7ed]";
  const blockquoteText = isDark ? "text-[#FFE0B2]" : "text-[#9a3412]";
  const tableBorder = isDark ? "border-[#444]" : "border-[#d1d5db]";
  const theadBg = isDark ? "bg-[#ffffff]/5" : "bg-[#f9fafb]";
  const thText = isDark ? "text-[#FFB74D]" : "text-[#c2410c]";

  const result = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children, ...props }: ComponentPropsWithoutRef<"h1">) => (
          <h1
            className={`mt-5 mb-3 flex items-center gap-2 border-b ${borderColor} pb-2 text-2xl font-bold ${textColor}`}
            {...props}
          >
            {children}
          </h1>
        ),
        h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
          <h2
            className={`mt-4 mb-2 flex items-center gap-2 text-xl font-bold ${textColor}`}
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
            className={`mt-3 mb-1.5 text-lg font-bold ${textColor}`}
            {...props}
          >
            {children}
          </h3>
        ),
        h4: ({ children, ...props }: ComponentPropsWithoutRef<"h4">) => (
          <h4
            className={`mt-3 mb-1.5 text-base font-semibold ${textColor}`}
            {...props}
          >
            {children}
          </h4>
        ),
        h5: ({ children, ...props }: ComponentPropsWithoutRef<"h5">) => (
          <h5
            className={`mt-2 mb-1 text-sm font-semibold ${textColor}`}
            {...props}
          >
            {children}
          </h5>
        ),
        h6: ({ children, ...props }: ComponentPropsWithoutRef<"h6">) => (
          <h6
            className={`mt-2 mb-1 text-sm font-medium ${textColor}`}
            {...props}
          >
            {children}
          </h6>
        ),
        strong: ({
          children,
          ...props
        }: ComponentPropsWithoutRef<"strong">) => (
          <strong className={`font-bold ${textColor}`} {...props}>
            {children}
          </strong>
        ),
        ul: ({ children, ...props }: ComponentPropsWithoutRef<"ul">) => (
          <ul
            className={`mb-3 list-disc pl-6 ${secondaryTextColor}`}
            {...props}
          >
            {children}
          </ul>
        ),
        ol: ({ children, ...props }: ComponentPropsWithoutRef<"ol">) => (
          <ol
            className={`mb-3 list-decimal pl-6 ${secondaryTextColor}`}
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
            className={`mb-3 leading-relaxed ${secondaryTextColor}`}
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
            className={`my-3 rounded-r-lg border-l-4 border-[#FF9800] ${blockquoteBg} px-4 py-3 italic ${blockquoteText} break-inside-avoid print:break-inside-avoid`}
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
          const match = /language-(\w+)/.exec(className || "");
          if (!inline && match && match[1] === "mermaid") {
            return <MermaidChart chart={String(children).replace(/\n$/, "")} />;
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
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return result;
};

export { MarkdownContent };
