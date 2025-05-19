/**
 * Info: (20250715 - Shirley) 地址數據處理工具函數
 * 用於處理 CompanySetting 表中的 address 欄位
 */

// 定義地址數據接口
export interface IAddress {
  city: string;
  district: string;
  enteredAddress: string;
  [key: string]: unknown; // 添加索引簽名以兼容 Prisma JSON 類型
}

/**
 * 解析地址數據
 * @param address 地址數據，可能是字符串或對象
 * @returns 格式化後的地址對象
 */
export function parseAddress(address: unknown): IAddress {
  // 如果是字符串，嘗試解析 JSON
  if (typeof address === 'string') {
    try {
      return JSON.parse(address) as IAddress;
    } catch (error) {
      // 解析失敗時返回默認值
      return { city: '', district: '', enteredAddress: '' };
    }
  }

  // 如果是對象，確保有正確的屬性
  if (address && typeof address === 'object') {
    const addr = address as Record<string, unknown>;
    return {
      city: typeof addr.city === 'string' ? addr.city : '',
      district: typeof addr.district === 'string' ? addr.district : '',
      enteredAddress: typeof addr.enteredAddress === 'string' ? addr.enteredAddress : '',
    };
  }

  // 默認值
  return { city: '', district: '', enteredAddress: '' };
}

/**
 * 創建地址對象
 * @param city 城市
 * @param district 區域
 * @param enteredAddress 詳細地址
 * @returns 地址對象
 */
export function createAddress(
  city: string = '',
  district: string = '',
  enteredAddress: string = ''
): IAddress {
  return {
    city,
    district,
    enteredAddress,
  };
}

/**
 * 從現有地址和新值創建合併的地址對象
 * @param existingAddress 現有地址數據
 * @param newCity 新城市值
 * @param newDistrict 新區域值
 * @param newEnteredAddress 新詳細地址值
 * @returns 合併後的地址對象
 */
export function mergeAddress(
  existingAddress: unknown,
  newCity?: string,
  newDistrict?: string,
  newEnteredAddress?: string
): IAddress {
  const parsed = parseAddress(existingAddress);

  return {
    city: newCity !== undefined ? newCity : parsed.city,
    district: newDistrict !== undefined ? newDistrict : parsed.district,
    enteredAddress: newEnteredAddress !== undefined ? newEnteredAddress : parsed.enteredAddress,
  };
}
