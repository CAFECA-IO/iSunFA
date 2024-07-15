import { IDirectCashFlowMapping } from '@/interfaces/cash_flow';
import { CASH_AND_CASH_EQUIVALENTS_REGEX } from '@/constants/cash_flow/common_cash_flow';

const PPE_REGEX = [/^(16[0-9][0-9]|17[0-4][0-9])/];

export const INVESTING_CASH_FLOW_DIRECT_MAPPING: Map<string, IDirectCashFlowMapping> = new Map([
  [
    'B00010',
    {
      name: '取得透過其他綜合損益按公允價值衡量之金融資產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1121/, /^1123/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B00020',
    {
      name: '處分透過其他綜合損益按公允價值衡量之金融資產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1121/, /^1123/]),
        },
      },
      credit: {
        type: 'CODE',
        codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
      },
    },
  ],
  [
    'B00020',
    {
      name: '處分透過其他綜合損益按公允價值衡量之金融資產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
      // Info: Murky (20240710): 有調整的才算是處分，不然算減資
      either: {
        type: 'EITHER',
        debit: {
          type: 'CODE',
          codes: new Set([/^1122/, /^1124/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1122/, /^1124/]),
        },
      },
    },
  ],
  [
    'B00030',
    {
      name: '透過其他綜合損益按公允價值衡量之金融資產減資退回股款',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B00040',
    {
      name: '取得按攤銷後成本衡量之金融資產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1137/, /^1535/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  // Info: (20240710 - Murky):有備抵損失，不然算到期還本?
  [
    'B00050',
    {
      name: '處分按攤銷後成本衡量之金融資產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1137/, /^1536/]),
        },
      },
      either: {
        type: 'EITHER',
        debit: {
          type: 'CODE',
          codes: new Set([/^1138/, /^1537/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set([]),
        },
      },
    },
  ],
  [
    'B00060',
    {
      name: '按攤銷後成本衡量之金融資產到期還本', // Info: (20240710 - Murky) 是對方還本我方收錢
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1137/, /^1536/]),
        },
      },
    },
  ],
  [
    'B00100',
    {
      name: '取得透過損益按公允價值衡量之金融資產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1111/, /^1112/, /^1113/, /^1114/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B00200',
    {
      name: '處分透過損益按公允價值衡量之金融資產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1111/, /^1112/, /^1113/, /^1114/]),
        },
      },
    },
  ],
  // Info: Murky (20240710) 避險工具都不太確定
  [
    'B01500',
    {
      name: '取得避險之金融資產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1139/, /^1538/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B01600',
    {
      name: '處分避險之金融資產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1139/, /^1538/]),
        },
      },
    },
  ],
  [
    'B01700',
    {
      name: '除列避險之金融負債',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2126/, /^2511/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B01800',
    {
      name: '取得採用權益法之投資',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1551/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B01900',
    {
      name: '處分採用權益法之投資',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1551/]),
        },
      },
    },
  ],
  [
    'B02000',
    {
      name: '預付投資款增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1422/, /^1960/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B02100',
    {
      name: '預付投資款減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1422/, /^1960/]),
        },
      },
    },
  ],
  // Info: Murky (20240710): 收購子公司我先抓借方有應收帳款, 存貨, 機器, 貸方有應付帳款
  [
    'B02200',
    {
      name: '對子公司之收購（扣除所取得之現金）',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'AND',
          patterns: [
            {
              type: 'CODE',
              codes: new Set([/^1172/]),
            },
            {
              type: 'CODE',
              codes: new Set([/^(13[0-3][0-9])/]),
            },
            {
              type: 'CODE',
              codes: new Set(PPE_REGEX),
            },
          ],
        },
        credit: {
          type: 'AND',
          patterns: [
            {
              type: 'CODE',
              codes: new Set([/^2171/]),
            },
            {
              type: 'CODE',
              codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
            },
          ],
        },
      },
    },
  ],
  [
    'B02300',
    {
      name: '處分子公司',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'AND',
          patterns: [
            {
              type: 'CODE',
              codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
            },
            {
              type: 'CODE',
              codes: new Set([/^1172/]),
            },
          ],
        },
        credit: {
          type: 'AND',
          patterns: [
            {
              type: 'CODE',
              codes: new Set([/^2171/]),
            },
            {
              type: 'CODE',
              codes: new Set([/^(13[0-3][0-9])/]),
            },
            {
              type: 'CODE',
              codes: new Set([/^(16[0-9][0-9]|17[0-4][0-9])/]),
            },
          ],
        },
      },
    },
  ],
  // Info: Murky (20240710): 這個和B01900一樣的結構，暫時暫時先不
  [
    'B02400',
    {
      name: '採用權益法之被投資公司減資退回股款',
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
    'B02500',
    {
      name: '取得待出售非流動資產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1461/]), // 假設1461為待出售非流動資產的科目代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B02600',
    {
      name: '處分待出售非流動資產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1461/]), // 假設1461為待出售非流動資產的科目代碼
        },
      },
    },
  ],
  [
    'B02700',
    {
      name: '取得不動產、廠房及設備',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(PPE_REGEX), // 不動產、廠房及設備的代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B02800',
    {
      name: '處分不動產、廠房及設備',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set(PPE_REGEX), // 不動產、廠房及設備的代碼
        },
      },
    },
  ],
  // Info: Murky (20240710): 不確定“資產”指什麼
  [
    'B02900',
    {
      name: '預收款項增加－處分資產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^2315/]),
        },
        credit: {
          type: 'AND',
          patterns: [
            {
              type: 'CODE',
              codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
            },
            {
              type: 'CODE',
              codes: new Set([...PPE_REGEX, /^17/, /^18[0-3][0-9]/]),
            },
          ],
        },
      },
    },
  ],
  // Info: Murky (20240710): 不確定“資產”指什麼
  [
    'B03000',
    {
      name: '預收款項減少－處分資產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'AND',
          patterns: [
            {
              type: 'CODE',
              codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
            },
            {
              type: 'CODE',
              codes: new Set([...PPE_REGEX, /^17/, /^18[0-3][0-9]/]),
            },
          ],
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^2315/]),
        },
      },
    },
  ],
  [
    'B03700',
    {
      name: '存出保證金增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1478/, /^1920/]), // 假設1920為存出保證金的科目代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B03800',
    {
      name: '存出保證金減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1478/, /^1920/]), // 假設1920為存出保證金的科目代碼
        },
      },
    },
  ],
  [
    'B04100',
    {
      name: '其他應收款增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^120[1-9]/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B04200',
    {
      name: '其他應收款減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^120[1-9]/]),
        },
      },
    },
  ],
  [
    'B04300',
    {
      name: '其他應收款－關係人增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^121[1-2]/]), // 假設1210為其他應收款－關係人的科目代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B04400',
    {
      name: '其他應收款－關係人減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^121[1-2]/]), // 假設1210為其他應收款－關係人的科目代碼
        },
      },
    },
  ],
  [
    'B04500',
    {
      name: '取得無形資產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^17[8-9][0-9]/, /^18[0-1][1-5]/]), // 無形資產的代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B04600',
    {
      name: '處分無形資產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^17[8-9][0-9]/, /^18[0-1][1-5]/]), // 無形資產的代碼
        },
      },
    },
  ],
  // Info: Murky (20240710): 和權益法與子公司一樣的結構，暫時先不實作
  [
    'B04900',
    {
      name: '概括承受他公司之淨現金收取數',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'AND',
          patterns: [
            { type: 'CODE', codes: new Set() },
            { type: 'CODE', codes: new Set() },
          ],
        },
      },
    },
  ],
  // Info: Murky (20240710): 和權益法與子公司一樣的結構，暫時先不實作
  [
    'B05000',
    {
      name: '因合併產生之現金流入',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(),
        },
        credit: {
          type: 'CODE',
          codes: new Set(), // 假設科目代碼
        },
      },
    },
  ],
  // Info: Murky (20240710): 和權益法與子公司一樣的結構，暫時先不實作
  [
    'B05100',
    {
      name: '概括承受他公司之賠付款',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'AND',
          patterns: [
            { type: 'CODE', codes: new Set() },
            { type: 'CODE', codes: new Set() },
          ],
        },
        credit: {
          type: 'CODE',
          codes: new Set(),
        },
      },
    },
  ],
  [
    'B05350',
    {
      name: '取得使用權資產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^17[A-G][A-C]/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B05400',
    {
      name: '取得投資性不動產',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1761/, /^1765/, /^1771/, /^1776/, /^1773/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B05500',
    {
      name: '處分投資性不動產',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1761/, /^1765/, /^1771/, /^1776/, /^1773/]),
        },
      },
    },
  ],
  [
    'B05800',
    {
      name: '應收款項增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^193[1-7]/, /^194[1-6]/]), // 假設應收款項的代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B05900',
    {
      name: '應收款項減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^193[1-7]/, /^194[1-6]/]), // 假設應收款項的代碼
        },
      },
    },
  ],
  [
    'B06000',
    {
      name: '長期應收租賃款增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^194B/, /^194E/, /^194I/, /^194L/, /^194M/]), // 長期應收租賃款的代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B06100',
    {
      name: '長期應收租賃款減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^194B/, /^194E/, /^194I/, /^194L/, /^194M/]),
        },
      },
    },
  ],
  [
    'B06500',
    {
      name: '其他金融資產增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1476/, /^1981/, /^1984/]),
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B06600',
    {
      name: '其他金融資產減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1476/, /^1981/, /^1984/]),
        },
      },
    },
  ],
  [
    'B06700',
    {
      name: '其他非流動資產增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^199[2-6]/]), // 其他非流動資產的代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B06800',
    {
      name: '其他非流動資產減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^199[2-6]/]), // 其他非流動資產的代碼
        },
      },
    },
  ],
  [
    'B07100',
    {
      name: '預付設備款增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1915/]), // 預付設備款的代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B07200',
    {
      name: '預付設備款減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1915/]), // 預付設備款的代碼
        },
      },
    },
  ],
  [
    'B07300',
    {
      name: '其他預付款項增加',
      cashInflow: false,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set([/^1429/]), // 假設為其他預付款項的科目代碼
        },
        credit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
      },
    },
  ],
  [
    'B07400',
    {
      name: '其他預付款項減少',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1429/]), // 假設為其他預付款項的科目代碼
        },
      },
    },
  ],
  [
    'B07500',
    {
      name: '收取之利息',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^1174/, /^1183/, /^4240/, /^710[1-7]/]), // 假設為利息收入的科目代碼
        },
      },
    },
  ],
  [
    'B07600',
    {
      name: '收取之股利',
      cashInflow: true,
      voucherPattern: {
        debit: {
          type: 'CODE',
          codes: new Set(CASH_AND_CASH_EQUIVALENTS_REGEX),
        },
        credit: {
          type: 'CODE',
          codes: new Set([/^4221/, /7130/]), // 假設為股利收入的科目代碼
        },
      },
    },
  ],
  // Info: Murky (20240710): 不曉得該怎麼做，暫時暫時先不implement
  [
    'B07700',
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
  // Info: Murky (20240710): 不曉得該怎麼做，暫時暫時先不implement
  [
    'B09900',
    {
      name: '其他投資活動之現金流量',
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
]);
