// Info: (20240920 - tzuhan) 定義 ICertificate 接口

export enum CERTIFICATE_TYPES {
  INPUT = 'Input',
  OUTPUT = 'Output',
}

export enum INVOICE_TYPES {
  TRIPLICATE = 'Triplicate',
  DUPLICATE = 'Duplicate',
  SPECIAL = 'Special',
}
export interface ICertificate {
  id: number;
  type: CERTIFICATE_TYPES;
  invoiceType: INVOICE_TYPES;
  date: string;
  invoiceName: string;
  invoiceNumber: string;
  thumbnailUrl: string;
  fromTo: string;
  taxID: string;
  businessTaxFormatCode: string;
  deductible: boolean;
  priceBeforeTax: number;
  tax: number;
  taxRate: number;
  totalPrice: number;
  voucherNo?: string;
  uploader: string;
}

export enum VIEW_TYPES {
  GRID = 'grid',
  LIST = 'list',
}

export enum OPERATIONS {
  DOWNLOAD = 'Download',
  REMOVE = 'Remove',
}

export interface ICertificateUI extends ICertificate {
  isSelected: boolean;
  actions: OPERATIONS[];
}

// Info: (20240920 - tzuhan) 隨機生成的函數
export const generateRandomCertificates = (num?: number): ICertificate[] => {
  // Info: (20240920 - tzuhan) 隨機生成 1 到 100 之間的數量
  const maxCount = num ?? Math.floor(Math.random() * 100) + 1;
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
  function randomPrice(): number {
    return Math.random() * 5000000; // Info: (20240920 - tzuhan) 隨機生成0到500萬 NTD
  }

  const generateRandomCode = () =>
    `${Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')}-${Math.floor(10000000 + Math.random() * 90000000)}`;

  let i = 1;
  while (i <= maxCount) {
    const taxRate = [5, 10, 15][Math.floor(Math.random() * 3)];
    const priceBeforeTax = randomPrice();
    const certificate: ICertificate = {
      id: i,
      type: Math.random() > 0.5 ? CERTIFICATE_TYPES.INPUT : CERTIFICATE_TYPES.OUTPUT, // Info: (20240920 - tzuhan) 隨機生成 Input/Output
      invoiceType: [INVOICE_TYPES.TRIPLICATE, INVOICE_TYPES.DUPLICATE, INVOICE_TYPES.SPECIAL][
        Math.floor(Math.random() * 3)
      ], // Info: (20240920 - tzuhan) 隨機生成 Triplicate/Duplicate/Special
      date: randomDate(new Date(2020, 0, 1), new Date(2024, 11, 31)), // Info: (20240920 - tzuhan) 隨機生成 2020 到 2024 年之間的日期
      invoiceName: `Invoice ${i.toString().padStart(6, '0')}`,
      invoiceNumber: generateRandomCode(),
      thumbnailUrl: `images/demo_certifate.png`,
      fromTo: `PX Mart`,
      taxID: randomTaxID(),
      businessTaxFormatCode: `23. Proof of Return or Discount for ...`,
      deductible: Math.random() > 0.5 ? true : !true, // Info: (20240920 - tzuhan) 隨機生成 Yes/No
      priceBeforeTax,
      taxRate, // Info: (20240920 - tzuhan) 隨機生成 5%, 10%, 15%
      tax: (taxRate / 100) * priceBeforeTax, // Info: (20240920 - tzuhan) 計算稅金
      totalPrice: priceBeforeTax + (taxRate / 100) * priceBeforeTax, // Info: (20240920 - tzuhan) 計算總價
      voucherNo: randomVoucherNo(i),
      uploader: `Tzuhan`,
    };
    certificates.push(certificate);
    i += 1;
  }

  return certificates;
};
