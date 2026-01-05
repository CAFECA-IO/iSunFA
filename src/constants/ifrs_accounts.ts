export interface IIFRAccount {
  code: string;
  name: string;
  description: string;
}

export const IFRS_ACCOUNTS: IIFRAccount[] = [
  // Info: (20260105 - Luphia) Assets - Current (資產-流動)
  {
    code: '1100',
    name: '現金及約當現金 (Cash and Cash Equivalents)',
    description: '庫存現金、銀行存款及零星支出之週轉金，以及隨時可轉換為定額現金且價值變動風險甚小之短期並具高度流動性之投資。',
  },
  {
    code: '1110',
    name: '透過損益按公允價值衡量之金融資產－流動 (Financial Assets at Fair Value Through Profit or Loss - Current)',
    description: '持有供交易之金融資產，或原始認列時被指定為透過損益按公允價值衡量之金融資產。',
  },
  {
    code: '1120',
    name: '透過其他綜合損益按公允價值衡量之金融資產－流動 (Financial Assets at Fair Value Through Other Comprehensive Income - Current)',
    description: '指定為透過其他綜合損益按公允價值衡量之權益工具投資，或非持有供交易之債務工具投資。',
  },
  {
    code: '1130',
    name: '按攤銷後成本衡量之金融資產－流動 (Financial Assets at Amortized Cost - Current)',
    description: '持有至到期日之債務工具投資，如公司債、政府公債等（一年內到期）。',
  },
  {
    code: '1150',
    name: '應收票據淨額 (Notes Receivable, Net)',
    description: '因出售商品或勞務而收受之票據，減除備抵損失後之淨額。',
  },
  {
    code: '1170',
    name: '應收帳款淨額 (Accounts Receivable, Net)',
    description: '因出售商品或勞務而發生之債權，減除備抵損失後之淨額。',
  },
  {
    code: '1200',
    name: '其他應收款淨額 (Other Receivables, Net)',
    description: '不屬於應收票據及應收帳款之其他應收款項淨額。',
  },
  {
    code: '1220',
    name: '本期所得稅資產 (Current Tax Assets)',
    description: '已支付之所得稅金額超過本期及前期應付金額之部分。',
  },
  {
    code: '1300',
    name: '存貨 (Inventories)',
    description: '持有供正常營業過程出售者；或正在製造過程中以供出售者；或將於製造過程或勞務提供過程中消耗之原料或物料。',
  },
  {
    code: '1410',
    name: '預付款項 (Prepayments)',
    description: '預付之各項費用，如預付保險費、預付租金等。',
  },
  {
    code: '1470',
    name: '其他流動資產 (Other Current Assets)',
    description: '不能歸屬於以上各類之流動資產。',
  },

  // Info: (20260105 - Luphia) Assets - Non-Current (資產-非流動)
  {
    code: '1510',
    name: '透過損益按公允價值衡量之金融資產－非流動 (Financial Assets at Fair Value Through Profit or Loss - Non-Current)',
    description: '持有供交易或指定為透過損益按公允價值衡量之金融資產（超過一年）。',
  },
  {
    code: '1520',
    name: '透過其他綜合損益按公允價值衡量之金融資產－非流動 (Financial Assets at Fair Value Through Other Comprehensive Income - Non-Current)',
    description: '指定為透過其他綜合損益按公允價值衡量之權益工具投資（超過一年）。',
  },
  {
    code: '1530',
    name: '按攤銷後成本衡量之金融資產－非流動 (Financial Assets at Amortized Cost - Non-Current)',
    description: '持有至到期日之債務工具投資（超過一年）。',
  },
  {
    code: '1550',
    name: '採用權益法之投資 (Investments Accounted for Using Equity Method)',
    description: '對被投資公司具有重大影響力或控制能力之長期股權投資。',
  },
  {
    code: '1600',
    name: '不動產、廠房及設備 (Property, Plant and Equipment)',
    description: '用於商品或勞務之生產或提供、出租予他人或供管理目的而持有，且預期使用期間超過一個會計期間之有形資產。',
  },
  {
    code: '1755',
    name: '使用權資產 (Right-of-Use Assets)',
    description: '承租人於租賃期間內對標的資產具有使用權之資產。',
  },
  {
    code: '1760',
    name: '投資性不動產淨額 (Investment Property, Net)',
    description: '為賺取租金或資本增值或兩者兼有，而由所有者或融資租賃之承租人所持有之不動產。',
  },
  {
    code: '1780',
    name: '無形資產 (Intangible Assets)',
    description: '無實體形式之可辨認非貨幣性資產，如商標權、專利權、電腦軟體等。',
  },
  {
    code: '1840',
    name: '遞延所得稅資產 (Deferred Tax Assets)',
    description: '與可減除暫時性差異、未使用課稅損失遞轉後期及未使用所得稅抵減遞轉後期有關之未來期間可回收所得稅金額。',
  },
  {
    code: '1900',
    name: '其他非流動資產 (Other Non-Current Assets)',
    description: '不能歸屬於以上各類之非流動資產。',
  },

  // Info: (20260105 - Luphia) Liabilities - Current (負債-流動)
  {
    code: '2100',
    name: '短期借款 (Short-term Borrowings)',
    description: '向銀行或其他金融機構借入償還期限在一年以內之款項。',
  },
  {
    code: '2110',
    name: '應付短期票券 (Short-term Notes and Bills Payable)',
    description: '為自貨幣市場獲取資金，而委託金融機構發行之短期票券。',
  },
  {
    code: '2130',
    name: '合約負債－流動 (Contract Liabilities - Current)',
    description: '企業已收或應收客戶對價而負有移轉商品或勞務予客戶之義務（一年內）。',
  },
  {
    code: '2150',
    name: '應付票據 (Notes Payable)',
    description: '因賒購商品或勞務而簽發之票據。',
  },
  {
    code: '2170',
    name: '應付帳款 (Accounts Payable)',
    description: '因賒購商品或勞務而發生之債務。',
  },
  {
    code: '2200',
    name: '其他應付款 (Other Payables)',
    description: '不屬於應付票據及應付帳款之其他應付款項，如應付薪資、應付租金、應付設備款等。',
  },
  {
    code: '2230',
    name: '本期所得稅負債 (Current Tax Liabilities)',
    description: '尚未支付之本期及前期所得稅。',
  },
  {
    code: '2250',
    name: '負債準備－流動 (Provisions - Current)',
    description: '不確定時點或金額之負債（一年內），如保固準備。',
  },
  {
    code: '2280',
    name: '租賃負債－流動 (Lease Liabilities - Current)',
    description: '承租人尚未支付租賃給付之現值（一年內）。',
  },
  {
    code: '2300',
    name: '其他流動負債 (Other Current Liabilities)',
    description: '不能歸屬於以上各類之流動負債，如預收款項等。',
  },

  // Info: (20260105 - Luphia) Liabilities - Non-Current (負債-非流動)
  {
    code: '2540',
    name: '長期借款 (Long-term Borrowings)',
    description: '償還期限在一年以上之借款。',
  },
  {
    code: '2570',
    name: '遞延所得稅負債 (Deferred Tax Liabilities)',
    description: '與應課稅暫時性差異有關之未來期間應付所得稅金額。',
  },
  {
    code: '2580',
    name: '租賃負債－非流動 (Lease Liabilities - Non-Current)',
    description: '承租人尚未支付租賃給付之現值（超過一年）。',
  },
  {
    code: '2600',
    name: '其他非流動負債 (Other Non-Current Liabilities)',
    description: '不能歸屬於以上各類之非流動負債，如存入保證金、淨確定福利負債等。',
  },

  // Info: (20260105 - Luphia) Equity (權益)
  {
    code: '3110',
    name: '普通股股本 (Ordinary Share)',
    description: '公司發行之普通股面值總額。',
  },
  {
    code: '3200',
    name: '資本公積 (Capital Surplus)',
    description: '指公司發行股票溢價、受領贈與之所得等。',
  },
  {
    code: '3310',
    name: '法定盈餘公積 (Legal Reserve)',
    description: '依公司法規定提列之公積。',
  },
  {
    code: '3320',
    name: '特別盈餘公積 (Special Reserve)',
    description: '依主管機關規定或公司章程規定提列之公積。',
  },
  {
    code: '3350',
    name: '未分配盈餘 (Unappropriated Retained Earnings)',
    description: '累積尚未分配亦未提撥之盈餘（或累積虧損）。',
  },
  {
    code: '3400',
    name: '其他權益 (Other Equity Interest)',
    description: '包括國外營運機構財務報表換算之兌換差額、透過其他綜合損益按公允價值衡量之金融資產未實現損益等。',
  },

  // Info: (20260105 - Luphia) Operating Revenue (營業收入)
  {
    code: '4000',
    name: '營業收入合計 (Total Operating Revenue)',
    description: '本期內因銷售商品或提供勞務等主要營業活動所獲得之收入。',
  },

  // Info: (20260105 - Luphia) Operating Costs (營業成本)
  {
    code: '5000',
    name: '營業成本合計 (Total Operating Costs)',
    description: '本期內因銷售商品或提供勞務等主要營業活動所發生之成本。',
  },

  // Info: (20260105 - Luphia) Operating Expenses (營業費用)
  {
    code: '6100',
    name: '推銷費用 (Selling Expenses)',
    description: '與銷售商品或勞務有關之費用，如廣告費、業務員薪資等。',
  },
  {
    code: '6200',
    name: '管理費用 (Administrative Expenses)',
    description: '與一般管理有關之費用，如行政人員薪資、辦公室租金、水電費等。',
  },
  {
    code: '6300',
    name: '研究發展費用 (Research and Development Expenses)',
    description: '為研究發展新產品或新技術所發生之費用。',
  },
  {
    code: '6450',
    name: '預期信用減損損失（利益） (Impairment Loss (Reversal of Impairment Loss) Determined in Accordance with IFRS 9)',
    description: '依IFRS 9規定認列之金融資產預期信用損失或迴轉利益。',
  },

  // Info: (20260105 - Luphia) Non-Operating Income and Expenses (營業外收支)
  {
    code: '7100',
    name: '利息收入 (Interest Income)',
    description: '貸出款項或存款所獲得之利息。',
  },
  {
    code: '7010',
    name: '其他收入 (Other Income)',
    description: '不屬於營業收入及利息收入之其他收入，如租金收入、股利收入等。',
  },
  {
    code: '7020',
    name: '其他利益及損失 (Other Gains and Losses)',
    description: '處分資產損益、外幣兌換損益、透過損益按公允價值衡量之金融資產（負債）淨損益等。',
  },
  {
    code: '7050',
    name: '財務成本 (Finance Costs)',
    description: '包括利息費用等融資活動產生之成本。',
  },

  // Info: (20260105 - Luphia) Tax (所得稅)
  {
    code: '7950',
    name: '所得稅費用（利益） (Income Tax Expense (Benefit))',
    description: '依據所得稅法規定計算之當期所得稅及遞延所得稅變動數。',
  },

  // Info: (20260105 - Luphia) OCI (其他綜合損益)
  {
    code: '8310',
    name: '不重分類至損益之項目 (Items that will not be reclassified to profit or loss)',
    description: '如確定福利計畫之再衡量數、透過其他綜合損益按公允價值衡量之權益工具投資之未實現評價損益等。',
  },
  {
    code: '8360',
    name: '後續可能重分類至損益之項目 (Items that may be reclassified subsequently to profit or loss)',
    description: '如國外營運機構財務報表換算之兌換差額、避險工具之損益等。',
  },
];
