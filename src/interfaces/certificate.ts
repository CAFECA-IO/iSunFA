// Info: (20240920 - tzuhan) 定義 ICertificate 接口
export interface ICertificate {
  id: number;
  date: string;
  invoiceName: string;
  taxID: string;
  businessTaxFormatCode: string;
  deductible: string; // Info: (20240920 - tzuhan) Yes/No only
  priceBeforeTax: string;
  tax: string;
  totalPrice: string;
  voucherNo?: string;
}

// Info: (20240920 - tzuhan) 隨機生成的函數
export const generateRandomCertificates = (): ICertificate[] => {
  // Info: (20240920 - tzuhan) 隨機生成 1 到 100 之間的數量
  const maxCount = Math.floor(Math.random() * 100) + 1;
  const certificates: ICertificate[] = [];

  // Info: (20240920 - tzuhan) 幫助函數: 生成隨機日期
  function randomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
      .getDate()
      .toString()
      .padStart(2, '0')}`;
  }

  // Info: (20240920 - tzuhan) 幫助函數: 生成隨機的 TaxID
  function randomTaxID(): string {
    return Math.floor(Math.random() * 1_000_000_000)
      .toString()
      .padStart(8, '0');
  }

  // Info: (20240920 - tzuhan) 幫助函數: 生成隨機的 VoucherNo
  function randomVoucherNo(id: number): string | undefined {
    return Math.random() < 0.5
      ? `${new Date().getFullYear()}${(Math.random() * 100000).toFixed(0)}-${id.toString().padStart(3, '0')}`
      : undefined;
  }

  // Info: (20240920 - tzuhan) 幫助函數: 生成隨機的價格
  function randomPrice(): string {
    return `${(Math.random() * 5000000).toFixed(0)} NTD`; // Info: (20240920 - tzuhan) 隨機生成0到500萬 NTD
  }
  let i = 1;
  while (i <= maxCount) {
    const certificate: ICertificate = {
      id: i,
      date: randomDate(new Date(2020, 0, 1), new Date(2024, 11, 31)), // Info: (20240920 - tzuhan) 隨機生成 2020 到 2024 年之間的日期
      invoiceName: `Invoice ${i.toString().padStart(6, '0')}`,
      taxID: randomTaxID(),
      businessTaxFormatCode: `23. Proof of Return or Discount for ...`,
      deductible: Math.random() > 0.5 ? 'Yes' : 'No', // Info: (20240920 - tzuhan) 隨機生成 Yes/No
      priceBeforeTax: randomPrice(),
      tax: `Taxable ${[5, 10, 15][Math.floor(Math.random() * 3)]}%`, // Info: (20240920 - tzuhan) 隨機生成 5%, 10%, 15%
      totalPrice: randomPrice(),
      voucherNo: randomVoucherNo(i),
    };
    certificates.push(certificate);
    i += 1;
  }

  return certificates;
};
