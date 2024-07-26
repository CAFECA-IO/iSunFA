import { IOperatingCashFlowMapping } from '@/interfaces/cash_flow';
import {
  adjustAssetIncreaseFromNetIncome,
  adjustLiabilityIncreaseFromNetIncome,
  adjustNonCashExpenseFromNetIncome,
  adjustNonCashRevenueFromNetIncome,
  noAdjustNetIncome,
  removeInterestExpenseFromNetIncome,
  removeInterestOrDividendRevenueFromNetIncome,
  removeInvestAndFinancialExpenseFromNetIncome,
} from '@/lib/utils/account/common';

// Info: (20240708 - Murky) Indirect Cash flow from operating activities

export const OPERATING_REVENUE_AND_EXPENSE_MAPPING: Map<string, IOperatingCashFlowMapping> =
  new Map([
    [
      'A20100',
      {
        fromCode: ['6124', '6224', '6324'],
        name: '折舊費用',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A20200',
      {
        fromCode: ['6125', '6225', '6325'],
        name: '攤銷費用',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A20300',
      {
        fromCode: ['6450', '7055'],
        name: '預期信用減損損失（利益）數∕呆帳費用提列（轉列收入）數',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A20400',
      {
        fromCode: ['4223', '7235', '7635'],
        name: '透過損益按公允價值衡量金融資產及負債之淨損失（利益）',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A20900',
      {
        fromCode: ['7510'],
        name: '利息費用',
        debit: true,
        operatingFunction: removeInterestExpenseFromNetIncome,
      },
    ],
    [
      'A21000',
      {
        fromCode: ['7030'],
        name: '除列按攤銷後成本衡量金融資產淨損失（利益）',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A21100',
      {
        fromCode: ['7080', '7081'],
        name: '金融資產重分類淨損失（利益）',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A21200',
      {
        fromCode: ['4240', '7100'],
        name: '利息收入',
        debit: false,
        operatingFunction: removeInterestOrDividendRevenueFromNetIncome,
      },
    ],
    [
      'A21300',
      {
        fromCode: ['4221', '7130'],
        name: '股利收入',
        debit: false,
        operatingFunction: removeInterestOrDividendRevenueFromNetIncome,
      },
    ],
    // Info: (20240708 - Murky) 股份基礎給付酬勞成本需要使用特殊方法計算
    [
      'A21900',
      {
        fromCode: [],
        name: '股份基礎給付酬勞成本',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    // Info:(20240708 - Murky) 應付公司債匯率影響數不知道怎麼算
    [
      'A22000',
      {
        fromCode: [],
        name: '應付公司債匯率影響數',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A22300',
      {
        fromCode: ['7060'],
        name: '採用權益法認列之關聯企業及合資損失（利益）之份額',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A22500',
      {
        fromCode: ['7210', '7610'],
        name: '處分及報廢不動產、廠房及設備損失（利益）',
        debit: true,
        operatingFunction: removeInvestAndFinancialExpenseFromNetIncome,
      },
    ],
    // Info: (20240708 - Murky) 不動產、廠房及設備轉列費用數不知道怎麼算
    [
      'A22600',
      {
        fromCode: [],
        name: '不動產、廠房及設備轉列費用數',
        debit: true,
        operatingFunction: removeInvestAndFinancialExpenseFromNetIncome,
      },
    ],
    [
      'A22700',
      {
        fromCode: ['7215', '7615'],
        name: '處分投資性不動產損失（利益）',
        debit: true,
        operatingFunction: removeInvestAndFinancialExpenseFromNetIncome,
      },
    ],
    [
      'A22800',
      {
        fromCode: ['7220', '7620'],
        name: '處分無形資產損失（利益）',
        debit: true,
        operatingFunction: removeInvestAndFinancialExpenseFromNetIncome,
      },
    ],
    // Info: (20240708 - Murky) 處分其他資產損失（利益）綜合損益表上似乎沒有類似的項目
    [
      'A22900',
      {
        fromCode: [],
        name: '處分其他資產損失（利益）',
        debit: true,
        operatingFunction: removeInvestAndFinancialExpenseFromNetIncome,
      },
    ],
    // Info: (20240708 - Murky) 處分待出售非流動資產損失（利益）綜合損益表上似乎沒有“損失”只有“利益”
    [
      'A23000',
      {
        fromCode: ['7229'],
        name: '處分待出售非流動資產損失（利益）',
        debit: true,
        operatingFunction: removeInvestAndFinancialExpenseFromNetIncome,
      },
    ],
    [
      'A23100',
      {
        fromCode: ['7225', '7625'],
        name: '處分投資損失（利益）',
        debit: true,
        operatingFunction: removeInvestAndFinancialExpenseFromNetIncome,
      },
    ],
    // Info: (20240708 - Murky) 處分採用權益法之投資損失（利益）綜合損益表上似乎沒有相關項目
    [
      'A23200',
      {
        fromCode: [],
        name: '處分採用權益法之投資損失（利益）',
        debit: true,
        operatingFunction: removeInvestAndFinancialExpenseFromNetIncome,
      },
    ],
    [
      'A23500',
      {
        fromCode: ['7671'],
        name: '金融資產減損損失',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A23600',
      {
        fromCode: ['7271'],
        name: '金融資產減損迴轉利益',
        debit: false,
        operatingFunction: adjustNonCashRevenueFromNetIncome,
      },
    ],
    [
      'A23700',
      {
        fromCode: ['7672', '7673', '767A', '7674', '7675', '7676', '7677', '7678', '7679'],
        name: '非金融資產減損損失',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A23800',
      {
        fromCode: ['7272', '7273', '727A', '7274', '7275', '7276', '7277', '7278', '7279'],
        name: '非金融資產減損迴轉利益',
        debit: false,
        operatingFunction: adjustNonCashRevenueFromNetIncome,
      },
    ],
    [
      'A23900',
      {
        fromCode: ['5910'],
        name: '未實現銷貨利益（損失）',
        debit: false,
        operatingFunction: adjustNonCashRevenueFromNetIncome,
      },
    ],
    [
      'A24000',
      {
        fromCode: ['5920'],
        name: '已實現銷貨損失（利益）',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    // Info: (20240708 - Murky) 未實現外幣兌換損失（利益）綜合損益表上似乎沒有相關項目
    [
      'A24100',
      {
        fromCode: [],
        name: '未實現外幣兌換損失（利益）',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    // Info: (20240708 - Murky) 買回應付公司債損失（利益）綜合損益表上似乎沒有相關項目
    [
      'A24200',
      {
        fromCode: [],
        name: '買回應付公司債損失（利益）',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    [
      'A24500',
      {
        fromCode: [],
        name: '逾期未領董監酬勞轉列其他收入',
        debit: false,
        operatingFunction: adjustNonCashRevenueFromNetIncome,
      },
    ],
    [
      'A24600',
      {
        fromCode: ['7255', '7655'],
        name: '投資性不動產公允價值調整損失(利益)',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
    // Info: (20240708 - Murky) 其他項目綜合損益表上似乎沒有相關項目
    [
      'A29900',
      {
        fromCode: [],
        name: '其他項目',
        debit: true,
        operatingFunction: adjustNonCashExpenseFromNetIncome,
      },
    ],
  ]);

export const OPERATING_ASSETS_MAPPING: Map<string, IOperatingCashFlowMapping> = new Map([
  [
    'A31115',
    {
      fromCode: ['1113', '1114', '1513', '1514'],
      name: '強制透過損益按公允價值衡量之金融資產（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31120',
    {
      fromCode: ['1139', '1538'],
      name: '避險之金融資產（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31125',
    {
      fromCode: ['1140', '1560'],
      name: '合約資產（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31130',
    {
      fromCode: ['1150'],
      name: '應收票據（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31140',
    {
      fromCode: ['1160'],
      name: '應收票據－關係人（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31150',
    {
      fromCode: ['1170'],
      name: '應收帳款（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31160',
    {
      fromCode: ['1180'],
      name: '應收帳款－關係人（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31180',
    {
      fromCode: ['1200'],
      name: '其他應收款（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31190',
    {
      fromCode: ['1210'],
      name: '其他應收款－關係人（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31200',
    {
      fromCode: ['1300', '1310', '1320', '1330'],
      name: '存貨（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31210',
    {
      fromCode: ['1400', '1830'],
      name: '生物資產（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  // Info: (20240709 - Murky) 這個項目合併到下面的預付款項
  [
    'A31220',
    {
      fromCode: [],
      name: '預付費用（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31230',
    {
      fromCode: ['1410'],
      name: '預付款項（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31240',
    {
      fromCode: ['1471', '1472', '1473', '1475', '1478', '1480', '1481', '1482', '1479'],
      name: '其他流動資產（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31250',
    {
      fromCode: ['1476'],
      name: '其他金融資產（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  // Info: (20240708 - Murky) 這個項目合並到負債變動的遞延貸項（減少）增加
  [
    'A31260',
    {
      fromCode: [],
      name: '遞延借項（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31270',
    {
      fromCode: ['1480', '1955'],
      name: '取得合約之增額成本（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  [
    'A31280',
    {
      fromCode: ['1482', '1966'],
      name: '履行合約成本（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
  // Info: (20240708 - Murky) 這個項目沒有在資產負債表上有對應的項目，也許是全部加總
  [
    'A31990',
    {
      fromCode: [], // 需要進一步確定對應代碼
      name: '其他營業資產（增加）減少',
      debit: true,
      operatingFunction: adjustAssetIncreaseFromNetIncome,
    },
  ],
]);

export const OPERATING_LIABILITIES_MAPPING: Map<string, IOperatingCashFlowMapping> = new Map([
  [
    'A32110',
    {
      fromCode: ['2121', '2501'],
      name: '持有供交易之金融負債增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32120',
    {
      fromCode: ['2126', '2511'],
      name: '避險之金融負債增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32125',
    {
      fromCode: ['2130', '2527'],
      name: '合約負債增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32130',
    {
      fromCode: ['2150'],
      name: '應付票據增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32140',
    {
      fromCode: ['2160'],
      name: '應付票據－關係人增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32150',
    {
      fromCode: ['2170'],
      name: '應付帳款增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32160',
    {
      fromCode: ['2180'],
      name: '應付帳款－關係人增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32180',
    {
      fromCode: ['2200'],
      name: '其他應付款增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32190',
    {
      fromCode: ['2220'],
      name: '其他應付款－關係人增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32200',
    {
      fromCode: ['2250', '2550'],
      name: '負債準備增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32210',
    {
      fromCode: ['2310'],
      name: '預收款項增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32220',
    {
      fromCode: ['2305'],
      name: '其他金融負債增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32230',
    {
      fromCode: ['2325', '2330', '2335', '2350', '2355', '2360', '2365', '2370', '2399'], // 其他流動負債
      name: '其他流動負債增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32240',
    {
      fromCode: ['2360', '2640'],
      name: '淨確定福利負債增加(減少)',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  [
    'A32250',
    {
      fromCode: ['2630'],
      name: '遞延貸項增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
  // Info: (20240708 - Murky) 這個項目沒有在資產負債表上有對應的項目，也許是全部加總
  [
    'A32990',
    {
      fromCode: [],
      name: '其他營業負債增加（減少）',
      debit: false,
      operatingFunction: adjustLiabilityIncreaseFromNetIncome,
    },
  ],
]);

export const OPERATING_ACTIVITY_MAPPING: Map<string, IOperatingCashFlowMapping> = new Map([
  // Info: (20240710 - Murky) 暫時不做分類
  // ['A00010', {
  //     fromCode: ['7900'],
  //     name: "繼續營業單位稅前淨利（淨損）",
  //     debit: false,
  //     operatingFunction: noAdjustNetIncome
  // }],
  // ['A00020', {
  //     fromCode: ['8100'],
  //     name: "停業單位稅前淨利（淨損）",
  //     debit: false,
  //     operatingFunction: noAdjustNetIncome
  // }],
  [
    'A00030',
    {
      fromCode: ['7900', '8100'],
      name: '本期稅前淨利（淨損）',
      debit: false,
      operatingFunction: noAdjustNetIncome,
    },
  ],
  [
    'A20000',
    {
      fromCode: [],
      name: '調整項目合計',
      debit: false,
      operatingFunction: noAdjustNetIncome,
      child: new Map([
        [
          'A20010',
          {
            fromCode: [],
            name: '收益費損項目合計',
            debit: false,
            operatingFunction: noAdjustNetIncome,
            child: OPERATING_REVENUE_AND_EXPENSE_MAPPING,
          },
        ],
        [
          'A30000',
          {
            fromCode: [],
            name: '與營業活動相關之資產∕負債變動數',
            debit: true,
            operatingFunction: noAdjustNetIncome,
            child: new Map([
              [
                'A31000',
                {
                  fromCode: [],
                  name: '與營業活動相關之資產之淨變動合計',
                  debit: true,
                  operatingFunction: noAdjustNetIncome,
                  child: OPERATING_ASSETS_MAPPING,
                },
              ],
              [
                'A32000',
                {
                  fromCode: [],
                  name: '與營業活動相關之負債之淨變動合計',
                  debit: false,
                  operatingFunction: noAdjustNetIncome,
                  child: OPERATING_LIABILITIES_MAPPING,
                },
              ],
            ]),
          },
        ],
      ]),
    },
  ],
]);

export const OPERATING_CASH_FLOW_INDIRECT_MAPPING: Map<string, IOperatingCashFlowMapping> = new Map(
  [
    [
      'A33000',
      {
        fromCode: [],
        name: '營運淨現金流入（流出）',
        debit: false,
        operatingFunction: noAdjustNetIncome,
        child: OPERATING_ACTIVITY_MAPPING,
      },
    ],
    // Info: (20240708 - Murky) 這個項目放在投資活動
    // ['A33100', {
    //     fromCode: ['4240', '7100'],
    //     name: '收取之利息',
    //     debit: false,
    //     operatingFunction: noAdjustNetIncome
    // }],
    // Info: (20240708 - Murky) 這個項目放在投資活動
    // ['A33200', {
    //     fromCode: ['4221', '7130'],
    //     name: '收取之股利',
    //     debit: false,
    //     operatingFunction: noAdjustNetIncome
    // }],
    // Info: (20240708 - Murky) 這個項目放在籌資活動
    // ['A33300', {
    //     fromCode: ['7510'],
    //     name: '支付之利息',
    //     debit: true,
    //     operatingFunction: noAdjustNetIncome
    // }],
    // Info: (20240708 - Murky) 這個項目放在籌資活動
    [
      'A33400',
      {
        fromCode: [],
        name: '支付之股利',
        debit: true,
        operatingFunction: noAdjustNetIncome,
      },
    ],
    // Info: (20240708 - Murky) 這個項目需要特別直接算出來
    [
      'A33500',
      {
        fromCode: [],
        name: '退還（支付）之所得稅',
        debit: true,
        operatingFunction: noAdjustNetIncome,
      },
    ],
  ]
);
