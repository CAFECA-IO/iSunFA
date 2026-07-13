// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Define initial mock states and constants for the Carbon Chatbot.

import {
  ChatRoleEnum,
  IChatSession,
  SessionStatusEnum,
} from "@/types/carbon_chatbot.types";
import { DEFAULT_SESSION_ID } from "@/constants/carbon_chatbot";

export const INITIAL_SESSIONS: Record<string, IChatSession> = {
  [DEFAULT_SESSION_ID]: {
    id: DEFAULT_SESSION_ID,
    title: "2025 溫室氣體盤查報告",
    time: "今天",
    status: SessionStatusEnum.IN_PROGRESS,
    statusColor: "text-orange-500 bg-orange-100",
    progress: 10,
    currentStep: "組織邊界鑑定",
    // Info: (20260712 - Luphia) 招呼詞改由進入 channel 後 AI 前置作業產生並經 Centrifugo 回傳，故初始為空
    messages: [],
    reportData: {
      documentName: "2025_Carbon_Report_Draft_v1.pdf",
      title: "溫室氣體排放量摘要",
      section: "Section 03",
      categories: [
        {
          id: "1",
          name: "Category 1: 直接排放",
          description: "天然氣燃燒、\n公務車",
          emissions: 85.42,
        },
        {
          id: "2",
          name: "Category 2: 能源間接",
          description: "外購電力",
          emissions: 594.0,
        },
      ],
      paragraphs: [
        {
          id: "p1",
          title: "### SECTION 01: 基準年設定",
          content:
            "### SECTION 01: 基準年設定\n\n本報告選定 **2025年** 作為溫室氣體盤查之基準年。此年度資料將作為未來減碳目標設定與績效追蹤的基礎。",
          isCompleted: true,
          isVerified: true,
        },
        {
          id: "p2",
          title: "### SECTION 02: 組織邊界鑑定",
          content:
            "### SECTION 02: 組織邊界鑑定\n\n採用**營運控制權法**（Operational Control Approach）涵蓋總部大樓與新竹廠區。排除海外銷售辦事處，因其排放量占比小於 1%。",
          isCompleted: true,
          isVerified: false,
        },
        {
          id: "p3",
          title: "### SECTION 03: 排放源與活動數據",
          content:
            "### SECTION 03: 排放源與活動數據\n\n- **範疇一 (Category 1)**: 公務車用油 (汽油 5,000 公升)、緊急發電機用柴油 (500 公升)。\n- **範疇二 (Category 2)**: 辦公室與廠區外購電力 (約 1,200,000 度)。",
          isCompleted: false,
          isVerified: false,
        },
      ],
      totalEmissions: 679.42,
    },
  },
  "2024": {
    id: "2024",
    title: "2024 永續報告書 (ESG)",
    time: "2天前",
    status: SessionStatusEnum.COMPLETED,
    statusColor: "text-green-600 bg-green-100",
    progress: 100,
    currentStep: "盤查報告產出",
    messages: [
      {
        id: "1",
        sender: ChatRoleEnum.AI,
        text: "歡迎回來。2024 年度的盤查報告已全數生成並歸檔。您可以點擊右側預覽並下載最終版本 PDF。",
      },
      { id: "2", sender: ChatRoleEnum.USER, text: "謝謝！報告很完整。" },
    ],
    reportData: {
      documentName: "2024_ESG_Report_Final.pdf",
      title: "2024 永續報告書 (ESG)",
      section: "Section 05",
      categories: [
        {
          id: "1",
          name: "Category 1: 直接排放",
          description: "天然氣、製程排放",
          emissions: 120.5,
        },
        {
          id: "2",
          name: "Category 2: 能源間接",
          description: "外購電力",
          emissions: 610.25,
        },
        {
          id: "3",
          name: "Category 3: 價值鏈上游",
          description: "採購原物料",
          emissions: 1540.8,
        },
      ],
      totalEmissions: 2271.55,
    },
  },
  cbam: {
    id: "cbam",
    title: "CBAM 產品碳足跡計算",
    time: "1週前",
    status: SessionStatusEnum.DRAFT,
    statusColor: "text-gray-500 bg-gray-100",
    progress: 45,
    currentStep: "排放源鑑別",
    messages: [
      {
        id: "1",
        sender: ChatRoleEnum.AI,
        text: "我們正在進行 CBAM 碳足跡計算。請提供您產品的 BOM 表單以利後續的碳排放係數比對。",
      },
    ],
    reportData: {
      documentName: "CBAM_Product_A_Footprint.pdf",
      title: "CBAM 產品碳足跡",
      section: "Appendix A",
      categories: [
        {
          id: "1",
          name: "原物料取得",
          description: "鋼材、鋁錠採購",
          emissions: 340.1,
        },
        {
          id: "2",
          name: "製造階段",
          description: "廠內加工、組裝",
          emissions: 85.0,
        },
        {
          id: "3",
          name: "運輸階段",
          description: "海運至歐盟",
          emissions: 42.5,
        },
      ],
      totalEmissions: 467.6,
    },
  },
};
