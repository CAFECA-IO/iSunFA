import { FLOW_TYPES, FORM_TYPES, IInvoiceBeta, TAX_TYPE } from '@/interfaces/invoice';
import { IFileUIBeta } from '@/interfaces/file';
import { PARTER_TYPES } from '@/interfaces/counterparty';
import { ProgressStatus } from '@/constants/account';

// Info: (20241022 - tzuhan) @Murky, @Jacky 這裡是參考 data model 來定義 Certificate 的介面，需要確認是否有遺漏或錯誤
export interface ICertificate {
  id: number;
  companyId: number;
  file: IFileUIBeta;
  unRead?: boolean;
  invoice: IInvoiceBeta;
  voucherNo: string | null;

  aiResultId?: string;
  aiStatus?: string;

  createdAt: number;
  updatedAt: number;
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
  function randomDate(start: Date, end: Date): number {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.getTime() / 1000;
  }

  // function randomTaxID(): string {
  //   return Math.floor(Math.random() * 1_000_000_000)
  //     .toString()
  //     .padStart(8, '0');
  // }

  // Info: (20240920 - tzuhan) 幫助函數: 生成隨機的 Number
  function randomNumber(): number {
    return Math.floor(Math.random() * 1_000_000_000);
  }

  // Info: (20240920 - tzuhan) 幫助函數: 生成隨機的 VoucherNo
  function randomVoucherNo(id: number): string | null {
    return Math.random() < 0.5
      ? `${new Date().getFullYear()}${(Math.random() * 100000).toFixed(0)}-${id.toString().padStart(3, '0')}`
      : null;
  }

  // Info: (20240920 - tzuhan) 幫助函數: 生成隨機的價格
  function randomPrice(): number {
    return Math.random() * 5000000; // Info: (20240920 - tzuhan) 隨機生成0到500萬 NTD
  }

  const generateRandomCode = () =>
    `${Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')}-${Math.floor(10000000 + Math.random() * 90000000)}`;

  let i = 1;
  while (i <= maxCount) {
    const taxRatio = [5, 10, 15][Math.floor(Math.random() * 3)];
    const priceBeforeTax = randomPrice();
    const certificate: ICertificate = {
      id: i,
      companyId: randomNumber(),

      file: {
        id: randomNumber(),
        name: 'fileName',
        size: 10234,
        url: `images/demo_certifate.png`,
        progress: 100,
        status: ProgressStatus.SUCCESS,
      },

      invoice: {
        id: randomNumber(),
        inputOrOutput: Math.random() > 0.5 ? FLOW_TYPES.INPUT : FLOW_TYPES.OUTPUT, // Info: (20240920 - tzuhan) 隨機生成 Input/Output
        name: `Invoice ${i.toString().padStart(6, '0')}`,
        date: randomDate(new Date(2020, 0, 1), new Date(2024, 11, 31)), // Info: (20240920 - tzuhan) 隨機生成 2020 到 2024 年之間的日期
        no: generateRandomCode(),
        priceBeforeTax,
        taxRatio, // Info: (20240920 - tzuhan) 隨機生成 5%, 10%, 15%
        taxPrice: (taxRatio / 100) * priceBeforeTax, // Info: (20240920 - tzuhan) 計算稅金
        totalPrice: priceBeforeTax + (taxRatio / 100) * priceBeforeTax, // Info: (20240920 - tzuhan) 計算總價
        type: [FORM_TYPES.TRIPLICATE, FORM_TYPES.DUPLICATE, FORM_TYPES.SPECIAL][
          Math.floor(Math.random() * 3)
        ], // Info: (20240920 - tzuhan) 隨機生成 Triplicate/Duplicate/Special
        counterParty: {
          id: randomNumber(),
          name: `PX Mart`,
          taxId: randomNumber(),
          type: PARTER_TYPES.SUPPLIER,
          note: `Note for PX Mart`,
        },
        deductible: Math.random() > 0.5 ? true : !true, // Info: (20240920 - tzuhan) 隨機生成 Yes/No
        uploader: `Tzuhan`,

        currencyAlias: 'TWD',
        taxType: TAX_TYPE.TAXABLE,
        createdAt: new Date().getTime() / 1000,
        updatedAt: new Date().getTime() / 1000,
      },
      voucherNo: randomVoucherNo(i),

      createdAt: new Date().getTime() / 1000,
      updatedAt: new Date().getTime() / 1000,
    };
    certificates.push(certificate);
    i += 1;
  }

  return certificates;
};
