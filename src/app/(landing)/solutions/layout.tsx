import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const titles: Record<string, string> = {
    "2025_1": "2025_1 企業低碳化轉型方案 | iSunFA",
    "2026_1": "2026_1 製造業數位轉型輔導方案 | iSunFA",
  };

  return {
    title: titles[id || ""] || "iSunFA 專業補助方案清單 | 數位轉型與低碳化輔導",
    description:
      "探索 iSunFA 結合政府補助推出的專屬方案。協助企業以極低成本完成 ISO 14064 盤查與 AI 工具導入。",
    keywords: [
      "政府補助",
      "數位轉型",
      "低碳化轉型",
      "ISO 14064",
      "19+1 補助",
      "16+4 補助",
      "iSunFA 方案",
    ],
  };
}

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
