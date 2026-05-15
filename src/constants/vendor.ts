// Info: (20260515 - Julian) 台灣企業最常報帳的 100 間公司
export const VENDOR_RULES = [
  {
    vendorId: "chunghwa_telecom",
    aliases: ["中華電信", "中華電信股份有限公司", "Chunghwa Telecom", "CHT"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
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
    ],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6116",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "taiwan_water_corporation",
    aliases: ["台灣自來水公司", "台水", "Taiwan Water Corporation"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6116",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "cpc_corporation",
    aliases: ["台灣中油", "CPC Corporation"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "台塑石油",
    aliases: ["台塑石油"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "台灣高鐵",
    aliases: ["台灣高鐵"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6114",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "台灣鐵路",
    aliases: ["台灣鐵路"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6114",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "統一超商_7-11",
    aliases: ["統一超商", "7-11", "統一超商股份有限公司"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6124",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "全家便利商店",
    aliases: ["全家便利商店", "全家便利商店股份有限公司", "FamilyMart"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6111",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "google_gws_cloud",
    aliases: ["Google", "GWS", "Cloud"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "microsoft_office_365",
    aliases: ["Microsoft", "Office 365"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "adobe",
    aliases: ["Adobe"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "zoom",
    aliases: ["Zoom"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "uber_uber_eats",
    aliases: ["Uber", "Uber Eats"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "pchome_24h",
    aliases: ["PChome 24h"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6119",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "momo_購物網",
    aliases: ["momo 購物網"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6124",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "蝦皮購物",
    aliases: ["蝦皮購物"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6123",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "遠傳電信",
    aliases: ["遠傳電信"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "台灣大哥大",
    aliases: ["台灣大哥大"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "國泰航空",
    aliases: ["國泰航空"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6114",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "長榮航空",
    aliases: ["長榮航空"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6114",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "中華航空",
    aliases: ["中華航空"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6114",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "星宇航空",
    aliases: ["星宇航空"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6114",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "agoda",
    aliases: ["Agoda"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6114",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "booking.com",
    aliases: ["Booking.com"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6114",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "slack",
    aliases: ["Slack"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "notion",
    aliases: ["Notion"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "canva",
    aliases: ["Canva"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "meta_facebook_ads",
    aliases: ["Meta", "Facebook Ads"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "google_ads",
    aliases: ["Google Ads"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "line_pay",
    aliases: ["LINE Pay"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6122",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "綠界科技_ecpay",
    aliases: ["綠界科技", "ECPay"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6122",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "藍新科技",
    aliases: ["藍新科技"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6122",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "foodpanda",
    aliases: ["Foodpanda"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6111",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "漢來海港",
    aliases: ["漢來海港"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6113",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "王品集團",
    aliases: ["王品集團"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6113",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "鼎泰豐",
    aliases: ["鼎泰豐"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6113",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "星巴克_starbucks",
    aliases: ["星巴克", "Starbucks"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6113",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "路易莎咖啡",
    aliases: ["路易莎咖啡"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6123",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "好市多_costco",
    aliases: ["好市多", "Costco"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6120",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "家樂福",
    aliases: ["家樂福"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6123",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "全聯福利中心",
    aliases: ["全聯福利中心"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6123",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "金石堂_誠品",
    aliases: ["金石堂", "誠品"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6121",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "九乘九文具專家",
    aliases: ["九乘九文具專家"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6119",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "震旦行",
    aliases: ["震旦行"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6112",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "互盛",
    aliases: ["互盛"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "和運租車",
    aliases: ["和運租車"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6112",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "格上租車",
    aliases: ["格上租車"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6112",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "irent",
    aliases: ["iRent"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "台灣大車隊_55688",
    aliases: ["台灣大車隊", "55688"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "line_taxi",
    aliases: ["LINE TAXI"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "大都會計程車",
    aliases: ["大都會計程車"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "順豐速運",
    aliases: ["順豐速運"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "嘉里大榮",
    aliases: ["嘉里大榮"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6108",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "新竹物流",
    aliases: ["新竹物流"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6108",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "黑貓宅急便",
    aliases: ["黑貓宅急便"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "中華郵政",
    aliases: ["中華郵政"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "lalamove",
    aliases: ["Lalamove"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "dhl",
    aliases: ["DHL"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "fedex",
    aliases: ["FedEx"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6117",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "蘋果_apple_icloud_storage",
    aliases: ["蘋果", "Apple iCloud", "Storage"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "aws_amazon_web_services",
    aliases: ["AWS", "Amazon Web Services"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "digitalocean",
    aliases: ["DigitalOcean"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "github",
    aliases: ["GitHub"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "chatgpt_openai",
    aliases: ["ChatGPT", "OpenAI"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "linkedin",
    aliases: ["LinkedIn"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "104_人力銀行",
    aliases: ["104 人力銀行"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "1111_人力銀行",
    aliases: ["1111 人力銀行"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "yourator",
    aliases: ["Yourator"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "cakeresume",
    aliases: ["CakeResume"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "surveycake",
    aliases: ["SurveyCake"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "mailchimp",
    aliases: ["Mailchimp"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "shopify",
    aliases: ["Shopify"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "91app",
    aliases: ["91APP"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "cyberbiz",
    aliases: ["Cyberbiz"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "gogoro",
    aliases: ["Gogoro"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "youbike",
    aliases: ["YouBike"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "台北大眾捷運",
    aliases: ["台北大眾捷運"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "悠遊卡公司",
    aliases: ["悠遊卡公司"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "1252",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "嘟嘟房",
    aliases: ["嘟嘟房"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "台灣聯通",
    aliases: ["台灣聯通"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "etag_遠通電信",
    aliases: ["eTag", "遠通電信"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "燦坤_3c",
    aliases: ["燦坤 3C"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6119",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "全國電子",
    aliases: ["全國電子"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6124",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "宜家家居_ikea",
    aliases: ["宜家家居", "IKEA"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6124",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "特力屋",
    aliases: ["特力屋"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6115",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "屈臣氏",
    aliases: ["屈臣氏"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6123",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "康是美",
    aliases: ["康是美"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6123",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "大潤發",
    aliases: ["大潤發"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6123",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "國泰產險",
    aliases: ["國泰產險"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "富邦產險",
    aliases: ["富邦產險"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6118",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "南山人壽",
    aliases: ["南山人壽"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6120",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "expensify",
    aliases: ["Expensify"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "trello",
    aliases: ["Trello"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "asana",
    aliases: ["Asana"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "wix",
    aliases: ["Wix"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "godaddy",
    aliases: ["GoDaddy"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6125",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "台北寒舍艾美",
    aliases: ["台北寒舍艾美"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6120",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "君悅酒店",
    aliases: ["君悅酒店"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6113",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "hahow_好學校",
    aliases: ["Hahow 好學校"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6121",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
  {
    vendorId: "udemy",
    aliases: ["Udemy"],
    rules: {
      BILL_NOTICE: [
        {
          accountingCode: "6121",
          isDebit: true,
        },
        {
          accountingCode: "2141",
          isDebit: false,
        },
      ],
      PAYMENT_RECEIPT: [
        {
          accountingCode: "2141",
          isDebit: true,
        },
        {
          accountingCode: "1101",
          isDebit: false,
        },
      ],
    },
  },
];
