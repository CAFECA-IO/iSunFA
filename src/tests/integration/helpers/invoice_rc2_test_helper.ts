// invoice_rc2_test_helper.ts

import { DefaultValue } from '@/constants/default_value';
import { UploadType } from '@/constants/file';
import { InvoiceDirection, CurrencyCode } from '@/constants/invoice_rc2';
import { IAccountBook } from '@/interfaces/account_book';
import { IFileBeta } from '@/interfaces/file';
import {
  IInvoiceRC2Input,
  IInvoiceRC2InputUI,
  IInvoiceRC2Output,
  IInvoiceRC2OutputUI,
} from '@/interfaces/invoice_rc2';
import { IStatusInfo } from '@/interfaces/status_info';
import { ITeam } from '@/interfaces/team';
import { ApiClient } from '@/tests/integration/api-client';
import { IntegrationTestSetup } from '@/tests/integration/setup';
import fs from 'fs';
import path from 'path';

export class InvoiceRC2TestHelper {
  static apiClient = new ApiClient();

  static async init() {
    await IntegrationTestSetup.initialize();
    process.env.DEBUG_TESTS = 'true';
    process.env.DEBUG_API = 'true';
  }

  static async teardown() {
    await IntegrationTestSetup.cleanup();
  }

  static async createUser(
    email: string = DefaultValue.EMAIL_LOGIN.EMAIL[0],
    code: string = DefaultValue.EMAIL_LOGIN.CODE
  ) {
    await this.apiClient.get(`/api/v2/email/${email}/one_time_password`);
    const response = await this.apiClient.post(`/api/v2/email/${email}/one_time_password`, {
      code,
    });
    if (!response.success) {
      throw new Error(`Failed to create user: ${response.message}`);
    }
    return response.payload as {
      email: string;
    };
  }

  static async getStatusInfo() {
    const res = await this.apiClient.get(`/api/v2/status_info`);
    return res.payload as IStatusInfo;
  }

  static async createTeam(name?: string) {
    const teamName = name ?? `Test Team ${Date.now()}`;
    const response = await this.apiClient.post(`/api/v2/team`, {
      name: teamName,
      description: 'Integration test team',
    });

    if (!response.success) {
      throw new Error(`Create team failed: ${response.message}`);
    }

    return response.payload as ITeam;
  }

  static async createAccountBookWithTeam(teamId: number, userId: number, name = 'SnowWhite') {
    const response = await this.apiClient.post(`/api/v2/user/${userId}/account_book`, {
      name,
      taxId: '12345678',
      tag: 'ALL',
      teamId,
      taxSerialNumber: '',
    });
    if (!response.success) {
      throw new Error(`Failed to create account book: ${response.message}`);
    }
    return response.payload as IAccountBook;
  }

  static async connectAccountBook(accountBookId: number) {
    const response = await this.apiClient.get(`/api/v2/account_book/${accountBookId}/connect`);
    if (!response.success) {
      throw new Error(`Failed to connect account book: ${response.message}`);
    }
    return response.payload as IAccountBook;
  }

  static async uploadEncryptedFile(
    fileBuffer: Buffer,
    filename: string,
    accountBookId: number,
    encryptedSymmetricKey: number[],
    iv: number[],
    publicKey: Record<string, unknown> = {}
  ) {
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), filename);
    formData.append('encryptedSymmetricKey', JSON.stringify(encryptedSymmetricKey));
    formData.append('iv', iv.join(','));
    formData.append('publicKey', JSON.stringify(publicKey));

    const response = await this.apiClient.post(
      `/api/v2/file?type=invoice&targetId=${accountBookId}`,
      formData
    );
    if (!response.success) {
      throw new Error(`Failed to upload file: ${response.message}`);
    }
    return response.payload as IFileBeta;
  }

  static async uploadEncryptedFileFake(accountBookId: number) {
    const filePath = path.resolve(__dirname, '../test_files/mock_invoice.png');
    // eslint-disable-next-line no-console
    console.log('File Path:', filePath);

    const fileBuffer = fs.readFileSync(filePath);

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), 'mock_invoice.pdf');
    formData.append('encryptedSymmetricKey', 'dummy-key');
    formData.append('publicKey', JSON.stringify({ dummy: true }));
    formData.append('iv', '1,2,3,4,5,6,7,8,9,10,11,12');

    const response = await this.apiClient.post(
      `/api/v2/file?type=${UploadType.INVOICE}&targetId=${accountBookId}`,
      formData
    );

    if (!response.success) {
      throw new Error(`Failed to upload file: ${response.message}`);
    }

    return response.payload as IFileBeta;
  }

  static async createInvoiceRC2Input(accountBookId: number, fileId: number) {
    const response = await this.apiClient.post(
      `/api/rc2/account_book/${accountBookId}/invoice/input`,
      {
        fileId,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      }
    );
    if (!response.success) {
      throw new Error(`Failed to create invoice input: ${response.message}`);
    }
    return response.payload as IInvoiceRC2Input;
  }

  static async updateInvoiceRC2Input(
    accountBookId: number,
    invoiceId: number,
    data: Partial<IInvoiceRC2InputUI>
  ) {
    const response = await this.apiClient.put(
      `/api/rc2/account_book/${accountBookId}/invoice/${invoiceId}/input`,
      data
    );
    if (!response.success) {
      throw new Error(`Failed to update invoice input: ${response.message}`);
    }
    return response.payload as IInvoiceRC2Input;
  }

  static async deleteInvoiceRC2Input(accountBookId: number, invoiceIds: number[]) {
    const response = await this.apiClient.delete(
      `/api/rc2/account_book/${accountBookId}/invoice/undefined/input`,
      {
        invoiceIds,
      }
    );
    if (!response.success) {
      throw new Error('Failed to delete invoice input');
    }
    return response.payload as { success: boolean; deletedIds: number[] };
  }

  static async getInvoiceRC2Input(accountBookId: number, invoiceId: number) {
    return this.apiClient.get(`/api/v2/account_book/${accountBookId}/invoice/${invoiceId}/input`);
  }

  static async createInvoiceRC2Output(accountBookId: number, fileId: number) {
    const response = await this.apiClient.post(
      `/api/v2/account_book/${accountBookId}/invoice/output`,
      {
        fileId,
        direction: InvoiceDirection.OUTPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      }
    );
    if (!response.success) {
      throw new Error('Failed to create invoice output');
    }
    return response.payload as IInvoiceRC2Output;
  }

  static async updateInvoiceRC2Output(
    accountBookId: number,
    invoiceId: number,
    data: Partial<IInvoiceRC2OutputUI>
  ) {
    const response = await this.apiClient.put(
      `/api/rc2/account_book/${accountBookId}/invoice/${invoiceId}/output`,
      data
    );
    if (!response.success) {
      throw new Error('Failed to update invoice output');
    }
    return response.payload as IInvoiceRC2Output;
  }

  static async deleteInvoiceRC2Output(accountBookId: number, invoiceIds: number[]) {
    const response = await this.apiClient.delete(
      `/api/rc2/account_book/${accountBookId}/invoice/undefined/output`,
      {
        invoiceIds,
      }
    );
    if (!response.success) {
      throw new Error('Failed to delete invoice output');
    }
    return response.payload as { success: boolean; deletedIds: number[] };
  }

  static async getInvoiceRC2Output(accountBookId: number, invoiceId: number) {
    return this.apiClient.get(`/api/v2/account_book/${accountBookId}/invoice/${invoiceId}/output`);
  }
}
