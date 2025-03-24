import fs from 'fs';
import { ONE_DAY_IN_MS, ONE_HOUR_IN_MS } from '@/constants/time';
import {
  ISessionData,
  ISessionHandlerOption,
  ISessionOption,
  ISessionUpdateData,
} from '@/interfaces/session';
import { ILoginDevice } from '@/interfaces/login_device';
import { NextApiRequest } from 'next';
import path from 'path';
import { DefaultValue } from '@/constants/default_value';
import { parseSessionId } from '@/lib/utils/parser/session';
import { getCurrentTimestamp } from '@/lib/utils/common';
import { sessionDataToLoginDevice } from '@/lib/utils/formatter/login_device';
import { sessionOptionToSession } from '@/lib/utils/formatter/session';
import { ALWAYS_LOGIN, SESSION_DEVELOPER } from '@/constants/session';
import { checkAbnormalDevice } from '@/lib/utils/analyzer/security';

// ToDo: (20250108 - Luphia) encrypt string
// Deprecated: (20250108 - Luphia) remove eslint-disable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const encryptString = (data: string, secret: string) => {
  return data;
};

// ToDo: (20250108 - Luphia) decrypt string
// Deprecated: (20250108 - Luphia) remove eslint-disable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const decryptString = (data: string, secret: string) => {
  return data;
};

/* Info: (20250111 - Luphia) Session Handler 功能摘要
 * 1. 初始化／更新用戶的 session 資料
 * 2. 讀取用戶的 session 資料
 * 3. 刪除用戶的 session 資料
 * 4. 執行 session 的垃圾回收，清除過期／無效的資料
 * 5. 列出用戶其他裝置登入的 session 資料 (非必要)
 * 6. 踢出用戶其他裝置登入的 session 資料 (非必要)
 * 7. 備份／還原 session 資料 (非必要)
 */
class SessionHandler {
  static instance: SessionHandler;

  static getInstance(option: ISessionHandlerOption) {
    // Info: (20250107 - Luphia) simgleton constructor
    if (!this.instance) {
      this.instance = new SessionHandler(option);
    }
    return this.instance;
  }

  data: Map<string, ISessionData> = new Map();

  gcInterval: number;

  sessionExpires: number;

  filePath: string;

  secret: string;

  /* Info: (20250112 - Luphia) constructor
   * 1. 設定參數
   * 2. 還原 session 資料
   */
  constructor(option: ISessionHandlerOption) {
    this.sessionExpires = option.sessionExpires
      ? option.sessionExpires
      : DefaultValue.SESSION_OPTION.SESSION_EXPIRE;
    this.gcInterval = option.gcInterval
      ? option.gcInterval
      : DefaultValue.SESSION_OPTION.GC_INTERVAL;
    this.filePath = option.filePath ? option.filePath : DefaultValue.SESSION_OPTION.FILE_PATH;
    this.secret = option.secret ? option.secret : DefaultValue.SESSION_OPTION.SECRET;
    this.restore();
  }

  // Info: (20250111 - Luphia) 備份 session 資料到檔案
  async backup() {
    try {
      // Info: (20250108 - Luphia) convert session data to JSON string
      const dataObject = Object.fromEntries(this.data);
      const rawString = JSON.stringify(dataObject);
      const encryptedString = encryptString(rawString, this.secret);
      // Info: (20250108 - Luphia) convert rawString to base64 string
      const data = Buffer.from(encryptedString).toString('base64');
      // Info: (20250108 - Luphia) save session data to file
      const { filePath } = this;
      fs.promises.writeFile(filePath, data);
    } catch (error) {
      // Info: (20250108 - Luphia) log error message and nothing to do
    }
    return true;
  }

  // Info: (20250111 - Luphia) 從備份檔案還原 session 資料
  async restore() {
    try {
      // Info: (20250108 - Luphia) read session data from file
      const { filePath } = this;
      const data = await fs.promises.readFile(filePath, 'utf-8');
      const rawString = Buffer.from(data, 'base64').toString('utf-8');
      const decryptedString = decryptString(rawString, this.secret);
      // Info: (20250108 - Luphia) convert JSON string to session data
      const dataObject = JSON.parse(decryptedString);
      // Info: (20250112 - Luphia) restore session data to map
      Object.keys(dataObject).forEach((key) => {
        this.data.set(key, dataObject[key]);
      });
    } catch (error) {
      // Info: (20250108 - Luphia) log error message and nothing to do
    }
    return true;
  }

  // Info: (20250111 - Luphia) 列出用戶其他裝置登入的 session 資料
  listDevice(sessionId: string) {
    const currentSession: ISessionData = this.data.get(sessionId) as ISessionData;
    const { userId } = currentSession;
    const data: ILoginDevice[] = [];
    if (userId) {
      this.data.forEach((session) => {
        // Info: (20250112 - Luphia) 若 userId 相同表示為該用戶其他登入裝置，列入清單
        if (session.userId === userId) {
          const device: ILoginDevice = sessionDataToLoginDevice(session);
          // Info: (20250112 - Luphia) 若 session 為當前 session 則標記為 true
          if (session.isunfa === sessionId) {
            device.isCurrent = true;
          }
          data.push(device);
        }
      });
    }
    return data;
  }

  // Info: (20250112 - Luphia) 根據 deviceId 取得 session id
  findDevice(deviceId: string) {
    let sessionId = '';
    this.data.forEach((session) => {
      if (session.deviceId === deviceId) {
        sessionId = session.isunfa;
      }
    });
    return sessionId;
  }

  // Info: (20250111 - Luphia) 初始化／更新用戶的 session 資料
  async update(sessionId: string, data: ISessionUpdateData) {
    const session = this.data.get(sessionId);
    const actionTime = getCurrentTimestamp();
    const expires = actionTime + this.sessionExpires;
    // Info: (20250111 - Luphia) 複寫 isunfa, actionTime, expires，避免其被不當修改
    const newSession = {
      ...session,
      ...data,
      isunfa: sessionId,
      actionTime,
      expires,
    } as ISessionData;
    this.data.set(sessionId, newSession);
    this.backup();
    return newSession;
  }

  // Info: (20250111 - Luphia) 讀取用戶的 session 資料
  async read(sessionId: string) {
    const data = this.data.get(sessionId);
    const expires = data?.expires || 0;
    let result: ISessionData | undefined;
    if (expires > getCurrentTimestamp()) {
      // Info: (20250107 - Luphia) update session expire time
      result = data;
    }
    return result;
  }

  // Info: (20250111 - Luphia) 刪除用戶的 session 資料
  async destroy(sessionId: string) {
    this.data.delete(sessionId);
    this.backup();
  }

  // Info: (20250111 - Luphia) 執行 session 的垃圾回收，清除過期／無效的資料
  async garbageCollection() {
    // Info: (20250107 - Luphia) remove expired session
    const now = new Date().getTime();
    this.data.forEach((session, key) => {
      if (session.expires && session.expires < now) {
        this.data.delete(key);
      }
    });
    this.backup();
  }
}

const sessionFolder = process.env.BASE_STORAGE_PATH || './';
const sessionHandlerOption: ISessionHandlerOption = {
  sessionExpires: ONE_HOUR_IN_MS,
  gcInterval: ONE_DAY_IN_MS,
  filePath: path.resolve(sessionFolder, 'session.store'),
  secret: process.env.NEXTAUTH_SECRET || DefaultValue.SESSION_OPTION.SECRET,
};
const sessionHandler = SessionHandler.getInstance(sessionHandlerOption);

/* Info: (20250107 - Luphia) 讀取 session 資料
 * 1. 根據 header 識別存取設備並取得 session id
 * 2. 由於 set session 不會傳遞 header 資料，故原始 session 缺乏 header 資訊
 * 3. 以 header 資訊為基礎，更新 session 資料
 * 4. 若 session 不存在，則建立新 session
 * 5. 回傳 session 資料
 */
export const getSession = async (req: NextApiRequest) => {
  const options = req.headers as unknown as ISessionOption;
  const defaultSession = sessionOptionToSession(options);
  const sessionId = parseSessionId(options);
  const currentSession = await sessionHandler.read(sessionId);
  let resultSession = defaultSession;
  if (currentSession) {
    const newSession = { ...defaultSession, ...currentSession };
    resultSession = await sessionHandler.update(sessionId, newSession);
  } else {
    await sessionHandler.update(sessionId, defaultSession);
  }

  // Info: (20250113 - Luphia) 開發者模式，固定使用開發者 session
  const devSession = { ...SESSION_DEVELOPER, ...defaultSession };
  resultSession = ALWAYS_LOGIN ? devSession : resultSession;

  return resultSession;
};

// Info: (20250107 - Luphia) 設定用戶 session 資料
export const setSession = async (
  sessoin: ISessionData,
  data: {
    userId?: number;
    companyId?: number;
    challenge?: string;
    roleId?: number;
    teamId?: number;
    teamRole?: string;
    teams?: { id: number; role: string }[];
  }
) => {
  const sessionId = parseSessionId(sessoin);
  const oldSession = (await sessionHandler.read(sessionId)) || ({} as ISessionData);
  const newSession = { ...oldSession, ...data };
  const resultSession = await sessionHandler.update(sessionId, newSession);

  return resultSession;
};

// ToDo: (20250109 - Luphia) require periodical garbage collection
export const destroySession = async (sessoin: ISessionData) => {
  const sessionId = parseSessionId(sessoin);
  await sessionHandler.destroy(sessionId);
};

export const listDevice = async (session: ISessionData) => {
  const sessionId = parseSessionId(session);
  const rawList: ILoginDevice[] = await sessionHandler.listDevice(sessionId);
  const data = checkAbnormalDevice(rawList);
  return data;
};

// Info: (20250109 - Luphia) kick out the session by sessionId, the operator and target session should have same userId
export const kickDevice = async (session: ISessionData, targetDeviceId: string) => {
  // Info: (20250111 - Luphia) the operator session, it might be destroyed
  const targetSessionId = await sessionHandler.findDevice(targetDeviceId);
  const targetSession = await sessionHandler.read(targetSessionId);
  // Info: (20250111 - Luphia) the operator session, its userId should be the same as the target session
  const operatorUserId = session.userId;
  let result = false;
  if (operatorUserId === targetSession?.userId) {
    sessionHandler.destroy(targetSessionId);
    result = true;
  }
  return result;
};
