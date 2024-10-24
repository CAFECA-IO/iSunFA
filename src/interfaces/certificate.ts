import { IInvoiceBeta } from '@/interfaces/invoice';
import type { IInvoiceEntity } from '@/interfaces/invoice';
import { IFileUIBeta } from '@/interfaces/file';
import type { IFileEntity } from '@/interfaces/file';
import type { IVoucherEntity } from '@/interfaces/voucher';
import type { ICompanyEntity } from '@/interfaces/company';
import { generateRandomCounterParties } from '@/interfaces/counterparty';
import { ProgressStatus } from '@/constants/account';
import { CERTIFICATE_USER_INTERACT_OPERATION } from '@/constants/certificate';
import { InvoiceType, InvoiceTransactionDirection, InvoiceTaxType } from '@/constants/invoice';

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

export interface ICertificateUI extends ICertificate {
  isSelected: boolean;
  actions: CERTIFICATE_USER_INTERACT_OPERATION[];
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
        inputOrOutput:
          Math.random() > 0.5
            ? InvoiceTransactionDirection.INPUT
            : InvoiceTransactionDirection.OUTPUT, // Info: (20240920 - tzuhan) 隨機生成 Input/Output
        name: `Invoice ${i.toString().padStart(6, '0')}`,
        date: randomDate(new Date(2020, 0, 1), new Date(2024, 11, 31)), // Info: (20240920 - tzuhan) 隨機生成 2020 到 2024 年之間的日期
        no: generateRandomCode(),
        priceBeforeTax,
        taxRatio, // Info: (20240920 - tzuhan) 隨機生成 5%, 10%, 15%
        taxPrice: (taxRatio / 100) * priceBeforeTax, // Info: (20240920 - tzuhan) 計算稅金
        totalPrice: priceBeforeTax + (taxRatio / 100) * priceBeforeTax, // Info: (20240920 - tzuhan) 計算總價
        type: Object.values(InvoiceType)[Math.floor(Math.random() * 3)], // Info: (20240920 - tzuhan) 隨機生成 Triplicate/Duplicate/Special
        counterParty: generateRandomCounterParties(1)[0],
        deductible: Math.random() > 0.5 ? true : !true, // Info: (20240920 - tzuhan) 隨機生成 Yes/No
        uploader: `Tzuhan`,

        currencyAlias: 'TWD',
        taxType: InvoiceTaxType.TAXABLE,
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

/**
 * Info: (20241024 - Murky)
 * @description certificate entity interface specific for backend
 * @note use parsePrismaCertificateToCertificateEntity to convert Prisma.Certificate to ICertificateEntity
 * @note use initCertificateEntity to create a new ICertificateEntity from scratch
 */
export interface ICertificateEntity {
  /**
   * Info: (20241024 - Murky)
   * @description certificate id from database, 0 means not created in database yet
   */
  id: number;

  /**
   * Info: (20241024 - Murky)
   * @description company id of company this certificate belongs to
   */
  companyId: number;

  /**
   * Info: (20241024 - Murky)
   * @description 傳票流水號
   */
  voucherNo: string | null;

  /**
   * Info: (20241024 - Murky)
   * @description aich result id
   * @note database has not yet created this column
   */
  aiResultId?: string;

  /**
   * Info: (20241024 - Murky)
   * @description aich result status
   * @note database has not yet created this column
   */
  aiStatus?: string;

  /**
   * Info: (20241024 - Murky)
   * @note need to be in seconds
   */
  createdAt: number;

  /**
   * Info: (20241024 - Murky)
   * @note need to be in seconds
   */
  updatedAt: number;

  /**
   * Info: (20241024 - Murky)
   * @note need to be in seconds, null if not deleted
   */
  deletedAt: number | null;

  /**
   * Info: (20241024 - Murky)
   * @description file entity contain image meta data and buffer
   */
  file?: IFileEntity;

  /**
   * Info: (20241024 - Murky)
   * @description invoice entity contain invoice meta data
   */
  invoice?: IInvoiceEntity;

  /**
   * Info: (20241024 - Murky)
   * @description which company this certificate belongs to
   */
  company?: ICompanyEntity;

  /**
   * Info: (20241024 - Murky)
   * @description vouchers that take this certificate as reference
   */
  vouchers: IVoucherEntity[];

  // ToDo: (20241024 - Murky) Users
}
