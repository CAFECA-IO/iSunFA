// Info: (20260520 - Tzuhan) [AUDIT FIX] Mapped to UniversalAccountTag for multi-region compatibility
import { UniversalAccountTag } from "@/constants/account_tags";
// Info: (20260520 - Tzuhan) [AUDIT FIX] Mapped hallucinated codes to valid tw.ts accounts
// Info: (20260515 - Julian) 台灣企業最常報帳的 100 間公司
export const VENDOR_RULES = [
  {
    vendorId: "chunghwa_telecom",
    aliases: ["中華電信", "中華電信股份有限公司", "Chunghwa Telecom", "CHT"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "taiwan_power_company",
    aliases: [
      "台灣電力公司",
      "台電",
      "Taiwan Power Company",
      "Taipower",
      "TPC",
      "台灣電力",
    ],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.UTILITIES_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "taiwan_water_corporation",
    aliases: [
      "台灣自來水公司",
      "台水",
      "Taiwan Water Corporation",
      "台灣自來水",
      "TWC",
    ],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.UTILITIES_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "cpc_corporation",
    aliases: ["台灣中油", "CPC Corporation", "中油", "台灣中油股份有限公司"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "formosa_petrochemical",
    aliases: ["台塑石油", "台塑石化", "Formosa Petrochemical"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "taiwan_high_speed_rail",
    aliases: ["台灣高鐵", "高鐵", "台灣高速鐵路", "THSR"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "taiwan_railways",
    aliases: ["台灣鐵路", "台鐵", "交通部台灣鐵路管理局", "TRA"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "uni_president_7_11",
    aliases: ["統一超商", "7-11", "統一超商股份有限公司", "7-Eleven"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "familymart",
    aliases: ["全家便利商店", "全家便利商店股份有限公司", "FamilyMart", "全家"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "google_workspace_cloud",
    aliases: [
      "Google",
      "GWS",
      "Cloud",
      "Google Cloud",
      "GCP",
      "Google Workspace",
    ],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.SOFTWARE_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "microsoft_office_365",
    aliases: ["Microsoft", "Office 365", "Microsoft 365", "微軟"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.SOFTWARE_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "adobe",
    aliases: ["Adobe", "Adobe Creative Cloud"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.SOFTWARE_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "zoom",
    aliases: ["Zoom", "Zoom Video Communications"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.SOFTWARE_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "uber",
    aliases: ["Uber", "Uber Eats", "優步"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "pchome_24h",
    aliases: ["PChome 24h", "PChome", "網路家庭", "PChome Online"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.OFFICE_SUPPLIES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "momo",
    aliases: ["momo 購物網", "momo", "富邦媒體科技"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "shopee",
    aliases: ["蝦皮購物", "蝦皮", "Shopee", "樂購蝦皮"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "far_eas_tone",
    aliases: ["遠傳電信", "遠傳", "Far EasTone", "FET"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "taiwan_mobile",
    aliases: ["台灣大哥大", "台哥大", "Taiwan Mobile"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "cathay_pacific",
    aliases: ["國泰航空", "Cathay Pacific"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "eva_air",
    aliases: ["長榮航空", "EVA Air", "長榮"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "china_airlines",
    aliases: ["中華航空", "華航", "China Airlines"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "starlux_airlines",
    aliases: ["星宇航空", "星宇", "STARLUX Airlines"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "agoda",
    aliases: ["Agoda", "雅高達"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "booking_com",
    aliases: ["Booking.com", "繽客"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "slack",
    aliases: ["Slack", "Slack Technologies"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.SOFTWARE_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "notion",
    aliases: ["Notion", "Notion Labs"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.SOFTWARE_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "canva",
    aliases: ["Canva"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "meta_ads",
    aliases: ["Meta", "Facebook Ads", "Facebook", "IG Ads", "Instagram Ads"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "google_ads",
    aliases: ["Google Ads", "Google AdWords"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "line_pay",
    aliases: ["LINE Pay", "連加網路", "連加網路商業"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "ecpay",
    aliases: ["綠界科技", "ECPay", "綠界"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "newebpay",
    aliases: ["藍新科技", "NewebPay", "藍新"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "foodpanda",
    aliases: ["Foodpanda", "富胖達"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "hi_lai_harbour",
    aliases: ["漢來海港", "漢來美食", "漢來"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.ENTERTAINMENT_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "wowprime",
    aliases: ["王品集團", "王品", "Wowprime"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.ENTERTAINMENT_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "din_tai_fung",
    aliases: ["鼎泰豐", "Din Tai Fung"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.ENTERTAINMENT_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "starbucks",
    aliases: ["星巴克", "Starbucks", "統一星巴克", "悠旅生活事業"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.ENTERTAINMENT_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "louisa_coffee",
    aliases: ["路易莎咖啡", "路易莎", "Louisa Coffee"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "costco",
    aliases: ["好市多", "Costco", "好市多股份有限公司"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "carrefour",
    aliases: ["家樂福", "Carrefour", "家福"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "pxmart",
    aliases: ["全聯福利中心", "全聯", "全聯實業", "PX Mart"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "kingstone_eslite",
    aliases: ["金石堂", "誠品", "Kingstone", "Eslite", "誠品書店"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "9x9_stationery",
    aliases: ["九乘九文具專家", "九乘九", "9x9"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.OFFICE_SUPPLIES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "aurora",
    aliases: ["震旦行", "震旦", "Aurora"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.RENT_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "hti",
    aliases: ["互盛", "互盛股份有限公司"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "hotai_leasing",
    aliases: ["和運租車", "和運", "Hotai Leasing"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.RENT_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "carplus",
    aliases: ["格上租車", "格上", "Carplus"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.RENT_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "irent",
    aliases: ["iRent", "和雲行動服務"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "taiwan_taxi",
    aliases: ["台灣大車隊", "55688", "Taiwan Taxi"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "line_taxi",
    aliases: ["LINE TAXI", "LINE GO"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "mtaxi",
    aliases: ["大都會計程車", "大都會", "MTaxi"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "sf_express",
    aliases: ["順豐速運", "順豐", "SF Express", "台灣順豐"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "kerry_tj",
    aliases: ["嘉里大榮", "大榮貨運", "Kerry TJ Logistics"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.SHIPPING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "hct_logistics",
    aliases: ["新竹物流", "新竹貨運", "HCT"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.SHIPPING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "tcat",
    aliases: ["黑貓宅急便", "黑貓", "統一速達"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "chunghwa_post",
    aliases: ["中華郵政", "郵局", "Chunghwa Post"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "lalamove",
    aliases: ["Lalamove", "啦啦快送"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "dhl",
    aliases: ["DHL", "洋基通運"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "fedex",
    aliases: ["FedEx", "聯邦快遞"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "apple",
    aliases: [
      "蘋果",
      "Apple iCloud",
      "Storage",
      "Apple",
      "Apple Storage",
      "蘋果公司",
    ],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "aws",
    aliases: ["AWS", "Amazon Web Services", "Amazon"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.SOFTWARE_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "digitalocean",
    aliases: ["DigitalOcean", "DO"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "github",
    aliases: ["GitHub"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "openai",
    aliases: ["ChatGPT", "OpenAI"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "linkedin",
    aliases: ["LinkedIn"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "104_job_bank",
    aliases: ["104 人力銀行", "104", "一零四資訊科技"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "1111_job_bank",
    aliases: ["1111 人力銀行", "1111", "全球華人"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "yourator",
    aliases: ["Yourator", "新創職涯平台"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "cakeresume",
    aliases: ["CakeResume", "Cake"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "surveycake",
    aliases: ["SurveyCake", "問卷蛋糕"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "mailchimp",
    aliases: ["Mailchimp"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "shopify",
    aliases: ["Shopify"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "91app",
    aliases: ["91APP", "九易宇軒"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "cyberbiz",
    aliases: ["Cyberbiz", "順立智慧"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "gogoro",
    aliases: ["Gogoro", "睿能創意"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "youbike",
    aliases: ["YouBike", "微笑單車"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "taipei_mrt",
    aliases: ["台北大眾捷運", "台北捷運", "北捷", "Taipei MRT"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "easycard",
    aliases: ["悠遊卡公司", "悠遊卡", "EasyCard"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "dodohome",
    aliases: ["嘟嘟房", "中興電工", "Dodo Home"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "taiwan_parking",
    aliases: ["台灣聯通", "台灣聯通停車場"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "far_eastern_electronic_toll_collection",
    aliases: ["eTag", "遠通電信", "遠通電收", "FETC"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "tsannkuen",
    aliases: ["燦坤 3C", "燦坤", "Tsannkuen"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.OFFICE_SUPPLIES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "elife_mall",
    aliases: ["全國電子", "Elife Mall"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "ikea",
    aliases: ["宜家家居", "IKEA"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "test_rite_retail",
    aliases: ["特力屋", "Test Rite Retail"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TRAVEL_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "watsons",
    aliases: ["屈臣氏", "Watsons"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "cosmed",
    aliases: ["康是美", "COSMED", "統一生活"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "rt_mart",
    aliases: ["大潤發", "RT-Mart"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "cathay_century_insurance",
    aliases: ["國泰產險", "國泰世紀產物保險", "Cathay Century Insurance"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "fubon_insurance",
    aliases: ["富邦產險", "富邦產物保險", "Fubon Insurance"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MARKETING_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "nan_shan_life_insurance",
    aliases: ["南山人壽", "Nan Shan Life Insurance"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "expensify",
    aliases: ["Expensify"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "trello",
    aliases: ["Trello"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "asana",
    aliases: ["Asana"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "wix",
    aliases: ["Wix"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "godaddy",
    aliases: ["GoDaddy"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.TELECOM_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "le_meridien_taipei",
    aliases: ["台北寒舍艾美", "寒舍艾美", "Le Meridien Taipei"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "grand_hyatt_taipei",
    aliases: ["君悅酒店", "台北君悅", "Grand Hyatt Taipei"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.ENTERTAINMENT_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "hahow",
    aliases: ["Hahow 好學校", "Hahow", "好學校"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "udemy",
    aliases: ["Udemy"],
    rules: {
      ACCRUAL_NOTICE: [
        {
          accountingCode: UniversalAccountTag.MISCELLANEOUS_EXPENSE,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: UniversalAccountTag.OTHER_PAYABLES,
          isDebit: true,
        },
        {
          accountingCode: UniversalAccountTag.CASH_IN_BANK,
          isDebit: false,
        },
      ],
    },
  },
];
