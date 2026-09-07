"use client";

import { useEffect } from "react";

/**
 * Info: (20260814 - Julian) 設定分頁標題。
 *
 * 不用 `next/head`：App Router 不再處理它，`<Head>` 裡的 `<title>` 一個字都不會出現
 * （全樹有 19 個檔案還在用，多半是從 Pages Router 時期複製過來的）。
 * 也不用 `export const metadata`：那要求 server component，而人事模組整個子樹
 * 連 `layout.tsx` 都是 `"use client"`，標題本身又來自執行期的 i18n context。
 *
 * ToDo: (20260814 - Julian) 若人事模組日後改為 server component，這支應換成
 * 各路由 `layout.tsx` 的 `generateMetadata()`——那才拿得到 SEO 與分享預覽。
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
