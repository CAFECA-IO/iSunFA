import { useEffect, useState } from "react";
import mermaid from "mermaid";
import { detectChartType } from "@/lib/utils/mermaid_helpers";
import { MermaidChartType } from "@/constants/mermaid_chart";

/**
 * Info: (20260714 - Julian) useMermaidRender 回傳介面
 */
export interface IUseMermaidRenderReturn {
  // Info: (20260714 - Julian) 渲染後的 SVG 字串（尚未渲染或失敗時為空字串）
  svg: string;
  // Info: (20260714 - Julian) 是否渲染失敗（含未知圖表類型）
  hasError: boolean;
}

/**
 * Info: (20260714 - Julian)
 * 將 Mermaid 定義字串非同步渲染為 SVG，並處理競態（僅採用最後一次結果）與錯誤。
 * @param chartStr - Mermaid 定義字串
 * @param skip - 是否略過渲染（例如改由其他元件呈現，如圓餅圖走 DonutChart）
 */
export const useMermaidRender = (
  chartStr: string,
  skip = false,
): IUseMermaidRenderReturn => {
  const [svg, setSvg] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const trimmed = chartStr.trim();

    // Info: (20260714 - Julian) 略過、空字串時清空狀態
    if (skip || !trimmed) {
      setSvg("");
      setHasError(false);
      return;
    }

    // Info: (20260714 - Julian) 無法辨識的圖表類型直接視為錯誤，不進 mermaid.render
    if (detectChartType(trimmed) === MermaidChartType.UNKNOWN) {
      setSvg("");
      setHasError(true);
      return;
    }

    let isCurrent = true;

    const render = async () => {
      try {
        const id = `mermaid-preview-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: rendered } = await mermaid.render(id, trimmed);
        if (isCurrent) {
          setSvg(rendered);
          setHasError(false);
        }
      } catch (error) {
        console.error("Preview Mermaid rendering failed", error);
        if (isCurrent) {
          setSvg("");
          setHasError(true);
        }
      }
    };

    render();

    return () => {
      // Info: (20260714 - Julian) 標記此次 effect 已過期，避免舊結果覆蓋新結果
      isCurrent = false;
    };
  }, [chartStr, skip]);

  return { svg, hasError };
};
