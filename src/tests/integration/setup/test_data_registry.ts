// 單純的 POJO，無任何外部相依
export interface RegistryShape {
  userIds: number[];
  teamIds: number[];
  accountBookIds: number[];
  invoiceIds: number[];
  voucherIds: number[];
  fileIds: number[];
  fileNames: string[];
}

class TestDataRegistry implements RegistryShape {
  userIds: number[] = [];

  teamIds: number[] = [];

  accountBookIds: number[] = [];

  invoiceIds: number[] = [];

  voucherIds: number[] = [];

  fileIds: number[] = [];

  fileNames: string[] = [];

  private push<T extends keyof RegistryShape>(key: T, value: RegistryShape[T][number]) {
    const arr = this[key] as unknown as Array<typeof value>;
    if (!arr.includes(value as never)) arr.push(value as never);
  }

  recordUserId(id: number) {
    this.push('userIds', id);
  }

  recordTeamId(id: number) {
    this.push('teamIds', id);
  }

  recordAccountBookId(id: number) {
    this.push('accountBookIds', id);
  }

  recordInvoiceId(id: number) {
    this.push('invoiceIds', id);
  }

  recordVoucherId(id: number) {
    this.push('voucherIds', id);
  }

  recordFileId(id: number) {
    this.push('fileIds', id);
  }

  recordFileName(name: string) {
    this.push('fileNames', name);
  }

  /** 只給 cleaner 用，不要讓測試誤改 */
  getSnapshot(): Readonly<RegistryShape> {
    return JSON.parse(JSON.stringify(this));
  }

  reset() {
    Object.assign(this, new TestDataRegistry());
  }
}

export const Registry = new TestDataRegistry();
