import { toPng } from "html-to-image";

export function useChartExport(
  getContainer: () => HTMLElement | null,
  filenamePrefix: string = "chart",
) {
  // Info: (20260615 - Julian) 匯出成 PNG 圖片
  const exportPng = async (e?: React.MouseEvent | MouseEvent) => {
    e?.stopPropagation();
    const container = getContainer();
    if (!container) return;

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
      link.download = `${filenamePrefix}-${Date.now()}.png`;
      link.click();
    } catch (error) {
      console.error("Failed to export PNG", error);
    }
  };

  // Info: (20260615 - Julian) 匯出成 SVG 向量圖
  const exportSvg = (e?: React.MouseEvent | MouseEvent) => {
    e?.stopPropagation();
    const container = getContainer();
    if (!container) return;

    const svgElement = container.querySelector("svg");
    if (!svgElement) return;

    const svgClone = svgElement.cloneNode(true) as SVGElement;
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenamePrefix}-${Date.now()}.svg`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return { exportPng, exportSvg };
}
