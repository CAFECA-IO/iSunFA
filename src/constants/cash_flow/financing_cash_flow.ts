import { IDirectCashFlowMapping } from '@/interfaces/cash_flow';
import { CASH_AND_CASH_EQUIVALENTS_REGEX } from '@/constants/cash_flow/common_cash_flow';

export const FINANCING_CASH_FLOW_DIRECT_MAPPING: Map<string, IDirectCashFlowMapping> = new Map([
  [
    'C00100',
    {
      name: '短期借款增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^210[0-8]/]), // Short-term borrowings
        },
      },
    },
  ],
  [
    'C00200',
    {
      name: '短期借款減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^210[0-8]/]), // Short-term borrowings
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C00500',
    {
      name: '應付短期票券增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^211[0-9]/]), // Short-term notes payable
        },
      },
    },
  ],
  [
    'C00600',
    {
      name: '應付短期票券減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^211[0-9]/]), // Short-term notes payable
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  // Info Murky (20240712): 在投資現金流量就已經有了
  [
    'C00900',
    {
      name: '取得避險之金融資產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(), // Hedging financial assets
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  [
    'C01000',
    {
      name: '處分避險之金融資產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  [
    'C01100',
    {
      name: '除列避險之金融負債',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  [
    'C01200',
    {
      name: '發行公司債',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2531/]), // Corporate bonds issued
        },
      },
    },
  ],
  [
    'C01300',
    {
      name: '償還公司債',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2531/]), // Corporate bonds repaid
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C01600',
    {
      name: '舉借長期借款',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^254[1-3]/]),
        },
      },
    },
  ],
  [
    'C01700',
    {
      name: '償還長期借款',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^254[1-3]/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C01800',
    {
      name: '其他借款增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2542/]), // Other borrowings
        },
      },
    },
  ],
  [
    'C01900',
    {
      name: '其他借款減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2542/]), // Other borrowings repaid
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C02000',
    {
      name: '附買回票券及債券負債增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2116/]),
        },
      },
    },
  ],
  [
    'C02100',
    {
      name: '附買回票券及債券負債減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2116/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C02200',
    {
      name: '指定為透過損益按公允價值衡量之金融負債增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^212[3-4]/]),
        },
      },
    },
  ],
  [
    'C02300',
    {
      name: '指定為透過損益按公允價值衡量之金融負債減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^212[3-4]/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C02400',
    {
      name: '按攤銷後成本衡量之金融負債增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2128/, /^2520/]),
        },
      },
    },
  ],
  [
    'C02500',
    {
      name: '按攤銷後成本衡量之金融負債減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2128/, /^2520/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C02800',
    {
      name: '發行特別股負債',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2325/, /^2635/]), // Preferred stock liabilities issued
        },
      },
    },
  ],
  [
    'C02900',
    {
      name: '償還特別股負債',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2325/, /^2635/]), // Preferred stock liabilities repaid
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C03000',
    {
      name: '存入保證金增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2645/]),
        },
      },
    },
  ],
  [
    'C03100',
    {
      name: '存入保證金減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2645/]), // Deposits received
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  // Info: (20240710 - Murky) - 金融資產證券化款項不曉得分錄是什麼
  [
    'C03200',
    {
      name: '金融資產證券化款項',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  [
    'C03500',
    {
      name: '應付款項增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2219/, /^2612/]), // Accounts payable
        },
      },
    },
  ],
  [
    'C03600',
    {
      name: '應付款項減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2219/, /^2612/]), // Accounts payable
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C03700',
    {
      name: '其他應付款－關係人增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2220/, /^2622/]),
        },
      },
    },
  ],
  [
    'C03800',
    {
      name: '其他應付款－關係人減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2220/, /^2622/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C03900',
    {
      name: '應付租賃款增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2355/, /^2613/]),
        },
      },
    },
  ],
  [
    'C04000',
    {
      name: '應付租賃款減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2355/, /^2613/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  // Info: (20240710 - Murky) - 租賃本金償和應付租賃款目前是一樣的分錄的，暫時不處理
  [
    'C04020',
    {
      name: '租賃本金償還',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  [
    'C04100',
    {
      name: '其他金融負債增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2305/]), // Other financial liabilities
        },
      },
    },
  ],
  [
    'C04200',
    {
      name: '其他金融負債減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2305/]), // Other financial liabilities
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C04300',
    {
      name: '其他非流動負債增加',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2600/]), // Other non-current liabilities
        },
      },
    },
  ],
  [
    'C04400',
    {
      name: '其他非流動負債減少',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2600/]), // Other non-current liabilities
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C04500',
    {
      name: '發放現金股利',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2216/]), // Dividends payable
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C04600',
    {
      name: '現金增資',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^3120/, /^3110/]), // Capital increase
        },
      },
    },
  ],
  [
    'C04650',
    {
      name: '發行具證券性質之虛擬通貨',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^3199/]),
        },
      },
    },
  ],
  [
    'C04700',
    {
      name: '現金減資',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^3120/, /^3110/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C04800',
    {
      name: '員工執行認股權',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^3271/]),
        },
      },
    },
  ],
  [
    'C04900',
    {
      name: '庫藏股票買回成本',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^3500/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C04950',
    {
      name: '買回具證券性質之虛擬通貨',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^3199/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'C05000',
    {
      name: '庫藏股票處分',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^3500/]),
        },
      },
    },
  ],
  [
    'C05100',
    {
      name: '員工購買庫藏股',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^3491/]), // Employee purchase of treasury stock
        },
      },
    },
  ],
  // Info: (20240710 - Murky) 和發行特別股相同，不知道怎麼區分
  [
    'C05200',
    {
      name: '子公司發行特別股',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  // Info: (20240710 - Murky) 不知道怎麼做
  [
    'C05300',
    {
      name: '合併發行新股追溯調整',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  // Info: (20240710 - Murky) 和投資現金流量裡面的權益法是一樣的，暫時先不拆分
  [
    'C05400',
    {
      name: '取得子公司股權',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  // Info: (20240710 - Murky) 和投資現金流量裡面的權益法是一樣的，暫時先不拆分
  [
    'C05500',
    {
      name: '處分子公司股權（未喪失控制力）',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  [
    'C05600',
    {
      name: '支付之利息',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2203/, /^7510/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  // Info: Murky (20240710): 不曉得該怎麼做，暫時暫時先不implement
  [
    'C05700',
    {
      name: '退還（支付）之所得稅',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  // Info: Murky (20240710): 暫時先不implement
  [
    'C09900',
    {
      name: '其他籌資活動',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
]);
