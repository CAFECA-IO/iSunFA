import { ISessionOption, ISessionData } from '@/interfaces/session';
import { DefaultValue } from '@/constants/default_value';
import crypto from 'crypto';
import { parseSessionId } from '@/lib/utils/parser/session';

// Info: (20250112 - Luphia) 初始化用戶的 session 資料
export const sessionOptionToSession = (options: ISessionOption) => {
  const data = options || {};
  const isunfa = parseSessionId(data);
  const deviceId = crypto.createHash('md5').update(isunfa).digest('hex');
  const ipAddress = data['x-forwarded-for'] || DefaultValue.IP;
  const userAgent = data['user-agent'] || DefaultValue.USER_AGENT;
  const session = {
    isunfa,
    deviceId,
    ipAddress,
    userAgent,
  } as ISessionData;
  return session;
};
