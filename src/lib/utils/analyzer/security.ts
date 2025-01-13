import { ILoginDevice } from '@/interfaces/login_device';

// Info: (20250113 - Luphia) 檢查所有用戶登入裝置並判斷是否為異常登入
export const checkAbnormalDevice = async (devices: ILoginDevice[]) => {
  // Info: (20250113 - Luphia) 不知道怎麼判斷，先全部回傳正常
  const result = devices.map((d) => {
    const device = { ...d, normal: true };
    return device;
  });
  return result;
};
