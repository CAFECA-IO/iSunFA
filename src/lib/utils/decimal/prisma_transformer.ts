import { Decimal } from 'decimal.js';

/**
 * Info: (20250807 - Shirley)
 * Prisma Decimal 型別轉換工具
 * 用於處理 NUMERIC(26,8) 資料庫欄位與字串格式 API 之間的轉換
 */
export class PrismaDecimalTransformer {
  /**
   * Info: (20250807 - Shirley)
   * 將 Prisma Decimal 轉為字串 (API 傳輸)
   * @param prismaDecimal Prisma Decimal 物件或 null/undefined
   * @returns 字串格式的金額或 '0'
   */
  static toApiString(prismaDecimal: unknown): string {
    if (prismaDecimal === null || prismaDecimal === undefined) {
      return '0';
    }

    // Info: (20250807 - Shirley) Prisma Decimal 物件轉字串
    try {
      // 檢查是否有 toString 方法
      if (
        typeof prismaDecimal === 'object' &&
        prismaDecimal !== null &&
        'toString' in prismaDecimal
      ) {
        return (prismaDecimal as { toString(): string }).toString();
      }
      return String(prismaDecimal);
    } catch (error) {
      // Deprecated: (20250807 - Shirley)
      // eslint-disable-next-line no-console
      console.warn('PrismaDecimalTransformer.toApiString conversion warning:', error);
      return '0';
    }
  }

  /**
   * Info: (20250807 - Shirley)
   * 將 Prisma Decimal 轉為字串，null 值保持 null
   * @param prismaDecimal Prisma Decimal 物件或 null/undefined
   * @returns 字串格式的金額或 null
   */
  static toApiStringNullable(prismaDecimal: unknown): string | null {
    if (prismaDecimal === null || prismaDecimal === undefined) {
      return null;
    }

    try {
      // Info: (20250807 - Shirley) 檢查是否有 toString 方法
      if (
        typeof prismaDecimal === 'object' &&
        prismaDecimal !== null &&
        'toString' in prismaDecimal
      ) {
        return (prismaDecimal as { toString(): string }).toString();
      }
      return String(prismaDecimal);
    } catch (error) {
      // Deprecated: (20250807 - Shirley)
      // eslint-disable-next-line no-console
      console.warn('PrismaDecimalTransformer.toApiStringNullable conversion warning:', error);
      return null;
    }
  }

  /**
   * Info: (20250807 - Shirley)
   * 將字串轉為 Prisma 可接受的 Decimal
   * @param amountStr 字串格式的金額
   * @returns Decimal 物件
   * @throws Error 如果字串格式無效
   */
  static fromApiString(amountStr: string): Decimal {
    try {
      return new Decimal(amountStr);
    } catch (error) {
      throw new Error(`Invalid decimal format: ${amountStr}`);
    }
  }

  /**
   * Info: (20250807 - Shirley)
   * 將字串轉為 Prisma 可接受的 Decimal，空值處理
   * @param amountStr 字串格式的金額或 null/undefined
   * @returns Decimal 物件或 null
   */
  static fromApiStringNullable(amountStr: string | null | undefined): Decimal | null {
    if (amountStr === null || amountStr === undefined || amountStr === '') {
      return null;
    }

    try {
      return new Decimal(amountStr);
    } catch (error) {
      throw new Error(`Invalid decimal format: ${amountStr}`);
    }
  }

  /**
   * Info: (20250807 - Shirley)
   * 批量轉換 Prisma 查詢結果中的 Decimal 欄位為字串
   * @param data 查詢結果物件
   * @param decimalFields 需要轉換的 Decimal 欄位名稱陣列
   * @returns 轉換後的物件，金額欄位轉為字串格式
   */
  static transformQueryResult<T extends Record<string, unknown>>(
    data: T,
    decimalFields: (keyof T)[]
  ): T & Record<keyof T, string | unknown> {
    if (!data) return data as T & Record<keyof T, string | unknown>;

    const transformed = { ...data } as T & Record<keyof T, string | unknown>;

    decimalFields.forEach((field) => {
      if (transformed[field] !== null && transformed[field] !== undefined) {
        // Info: (20250513 - Tzuhan) 安全地將 Decimal 欄位轉換為字串
        const stringValue = this.toApiString(transformed[field]);
        (transformed as Record<string, string | unknown>)[field as string] = stringValue;
      }
    });

    return transformed;
  }

  /**
   * Info: (20250807 - Shirley)
   * 批量轉換查詢結果陣列中的 Decimal 欄位為字串
   * @param dataArray 查詢結果陣列
   * @param decimalFields 需要轉換的 Decimal 欄位名稱陣列
   * @returns 轉換後的陣列，金額欄位轉為字串格式
   */
  static transformQueryResultArray<T extends Record<string, unknown>>(
    dataArray: T[],
    decimalFields: (keyof T)[]
  ): Array<T & Record<keyof T, string | unknown>> {
    if (!Array.isArray(dataArray)) return dataArray as Array<T & Record<keyof T, string | unknown>>;

    return dataArray.map((data) => this.transformQueryResult(data, decimalFields));
  }

  /**
   * Info: (20250807 - Shirley)
   * 為排序準備 Decimal 欄位
   * @param amountStr 字串格式的金額
   * @returns Decimal 物件用於排序比較
   */
  static prepareForSorting(amountStr: string | null | undefined): Decimal {
    if (amountStr === null || amountStr === undefined || amountStr === '') {
      return new Decimal(0);
    }

    try {
      return new Decimal(amountStr);
    } catch (error) {
      // Deprecated: (20250807 - Shirley)
      // eslint-disable-next-line no-console
      console.warn('PrismaDecimalTransformer.prepareForSorting conversion warning:', error);
      return new Decimal(0);
    }
  }

  /**
   * Info: (20250807 - Shirley)
   * 加法運算 - 兩個字串金額相加
   * @param amount1 第一個金額字串
   * @param amount2 第二個金額字串
   * @returns 相加結果的字串
   */
  static addAmounts(amount1: string | null, amount2: string | null): string {
    const decimal1 = this.prepareForSorting(amount1);
    const decimal2 = this.prepareForSorting(amount2);
    return decimal1.add(decimal2).toString();
  }

  /**
   * Info: (20250807 - Shirley)
   * 減法運算 - 兩個字串金額相減
   * @param amount1 被減數字串
   * @param amount2 減數字串
   * @returns 相減結果的字串
   */
  static subtractAmounts(amount1: string | null, amount2: string | null): string {
    const decimal1 = this.prepareForSorting(amount1);
    const decimal2 = this.prepareForSorting(amount2);
    return decimal1.sub(decimal2).toString();
  }

  /**
   * Info: (20250807 - Shirley)
   * 比較兩個金額字串是否相等
   * @param amount1 第一個金額字串
   * @param amount2 第二個金額字串
   * @returns 是否相等
   */
  static areAmountsEqual(amount1: string | null, amount2: string | null): boolean {
    const decimal1 = this.prepareForSorting(amount1);
    const decimal2 = this.prepareForSorting(amount2);
    return decimal1.equals(decimal2);
  }
}
