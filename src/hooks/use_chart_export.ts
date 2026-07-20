import { timestampToString } from "@/lib/utils/common";
import { toPng } from "html-to-image";

// Info: (20260720 - Julian)
// 淨化下載檔名：移除檔名保留字元、將空白收斂為底線，避免圖表標題含 / : * 等造成下載失敗。
// 保留中日文等一般字元。全空則退回預設 "chart"。
const sanitizeFileName = (name: string): string => {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, "") // Info: (20260720 - Julian) 移除檔名保留字元
    .replace(/\s+/g, "_") // Info: (20260720 - Julian) 空白收斂為底線
    .replace(/^\.+|\.+$/g, "") // Info: (20260720 - Julian) 去除頭尾的點
    .trim();
  return cleaned || "chart";
};

// Info: (20260720 - Julian)
// 匯出（PNG / SVG）前，暫時以內聯 opacity 強制顯示標記為 .export-reveal 的元素
// （如 boxplot 平時 hover 才顯示的五數綜合），確保「下載時顯示全部數據」；匯出後還原原狀。
const EXPORT_REVEAL_SELECTOR = ".export-reveal";
const revealForExport = (container: HTMLElement): (() => void) => {
  const els = Array.from(
    container.querySelectorAll(EXPORT_REVEAL_SELECTOR),
  ) as (HTMLElement | SVGElement)[];
  const previous = els.map((el) => el.style.opacity);
  els.forEach((el) => {
    el.style.opacity = "1";
  });
  return () => {
    els.forEach((el, i) => {
      el.style.opacity = previous[i];
    });
  };
};

export function useChartExport(
  getContainer: () => HTMLElement | null,
  filenamePrefix: string = "chart",
) {
  // Info: (20260720 - Julian) 檔名前綴一律淨化（可能來自圖表標題）
  const safePrefix = sanitizeFileName(filenamePrefix);

  // Info: (20260720 - Julian) 日期字串
  const dateStr = timestampToString(Date.now() / 1000).dateWithDash;

  // Info: (20260615 - Julian) 匯出成 PNG 圖片
  const exportPng = async (e?: React.MouseEvent | MouseEvent) => {
    e?.stopPropagation();
    const container = getContainer();
    if (!container) return;

    // Info: (20260720 - Julian) 匯出期間強制顯示 hover-only 數據
    const restoreReveal = revealForExport(container);
    try {
      const dataUrl = await toPng(container, {
        backgroundColor: "#F8FAFC", // Info: (20260615 - Julian) 圖片底色配合 viewport
        pixelRatio: 5, // Info: (20260615 - Julian) 放大 5 倍提高圖片品質
        filter: (node) => {
          if (
            node instanceof HTMLElement &&
            node.classList?.contains("export-exclude")
          ) {
            return false;
          }
          return true;
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${safePrefix}_${dateStr}.png`;
      link.click();
    } catch (error) {
      console.error("Failed to export PNG", error);
    } finally {
      restoreReveal();
    }
  };

  // Info: (20260615 - Julian) 匯出成 SVG 向量圖
  const exportSvg = (e?: React.MouseEvent | MouseEvent) => {
    e?.stopPropagation();
    const container = getContainer();
    if (!container) return;

    const svgElement = container.querySelector("svg");
    if (!svgElement) return;

    // Info: (20260720 - Julian) 先強制顯示 hover-only 數據，再 clone，確保匯出的 SVG 內含全部數據
    const restoreReveal = revealForExport(container);
    try {
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      const svgString = new XMLSerializer().serializeToString(svgClone);
      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${safePrefix}-${dateStr}.svg`;
      link.click();

      URL.revokeObjectURL(url);
    } finally {
      restoreReveal();
    }
  };

  return { exportPng, exportSvg };
}
