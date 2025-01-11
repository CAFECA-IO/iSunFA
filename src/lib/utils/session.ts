import fs from 'fs';
import { ONE_DAY_IN_MS, ONE_HOUR_IN_MS } from '@/constants/time';
import {
  ISessionData,
  ISessionHandlerOption,
  ISessionOption,
  ISessionUpdateData,
} from '@/interfaces/session';
import { NextApiRequest } from 'next';
import path from 'path';
import { DefaultValue } from '@/constants/default_value';

const parseSessionId = (options: ISessionOption) => {
  const sessionId = options?.sid
    ? options?.sid
    : options?.cookie?.sid
      ? options.cookie.sid
      : DefaultValue.SESSION_ID;
  return sessionId;
};

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

  constructor(option: ISessionHandlerOption) {
    this.sessionExpires = option.sessionExpires
      ? option.sessionExpires
      : DefaultValue.SESSION_OPTION.SESSION_EXPIRE;
    this.gcInterval = option.gcInterval
      ? option.gcInterval
      : DefaultValue.SESSION_OPTION.GC_INTERVAL;
    this.filePath = option.filePath ? option.filePath : DefaultValue.SESSION_OPTION.FILE_PATH;
    this.secret = option.secret ? option.secret : DefaultValue.SESSION_OPTION.SECRET;
  }

  // Info: (20250111 - Luphia) 備份 session 資料到檔案
  async backup() {
    try {
      // Info: (20250108 - Luphia) convert session data to JSON string
      const rawString = JSON.stringify(this.data);
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
      this.data = new Map(JSON.parse(decryptedString));
    } catch (error) {
      // Info: (20250108 - Luphia) log error message and nothing to do
    }
    return true;
  }

  // Info: (20250111 - Luphia) 更新 session 時效
  renewSession(options: ISessionOption) {
    const sessionId = parseSessionId(options);
    const session = this.data.get(sessionId);
    if (session) {
      session.expires = Date.now() + this.sessionExpires;
      this.data.set(sessionId, session);
      this.backup();
    }
    return session;
  }

  // Info: (20250111 - Luphia) 列出用戶其他裝置登入的 session 資料
  listSession(options: ISessionData) {
    const { userId } = options;
    const data: ISessionData[] = [];
    if (userId) {
      this.data.forEach((session) => {
        if (session.userId === userId) {
          data.push(session);
        }
      });
    }
    return data;
  }

  // Info: (20250111 - Luphia) 初始化／更新用戶的 session 資料
  async update(options: ISessionOption, data: ISessionUpdateData) {
    const sessionId = parseSessionId(options);
    const session = this.data.get(sessionId);
    const expires = Date.now() + this.sessionExpires;
    // Info: (20250111 - Luphia) 複寫 sid 以及 expires，避免其被不當修改
    const newSession = { ...session, ...data, sid: sessionId, expires } as ISessionData;
    this.data.set(sessionId, newSession);
    this.backup();
    return newSession;
  }

  // Info: (20250111 - Luphia) 讀取用戶的 session 資料
  async read(options: ISessionOption) {
    const sessionId = parseSessionId(options);
    const data = this.data.get(sessionId);
    const expires = data?.expires || 0;
    let result = { sid: sessionId } as ISessionData;
    if (expires > Date.now()) {
      // Info: (20250107 - Luphia) update session expire time
      result = this.renewSession(options) as ISessionData;
    }
    return result;
  }

  // Info: (20250111 - Luphia) 刪除用戶的 session 資料
  async destroy(options: ISessionOption) {
    const sessionId = parseSessionId(options);
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

// Info: (20250107 - Luphia) 根據 header 取得用戶 session，未登入則回傳 { sid: sessionId }
export const getSession = async (req: NextApiRequest) => {
  const options = req.headers as ISessionOption;
  const session = sessionHandler.read(options);
  return session;
};

// Info: (20250107 - Luphia) 設定用戶 session 資料
export function setSession(
  session: ISessionData,
  data: { userId?: number; companyId?: number; challenge?: string; roleId?: number }
) {
  const options: ISessionOption = session;
  const newSession = sessionHandler.update(options, data);
  return newSession;
}

// ToDo: (20250109 - Luphia) require periodical garbage collection
export function destroySession(session: ISessionData) {
  const options: ISessionOption = session;
  sessionHandler.destroy(options);
}

export function listSession(session: ISessionData) {
  const data: ISessionData[] = sessionHandler.listSession(session);
  return data;
}

export async function kickSession(session: ISessionData, targetSessionId: string) {
  // Info: (20250109 - Luphia) kick out the session by sessionId, the operator and target session should have same userId
  // Info: (20250111 - Luphia) the operator session, it might be destroyed
  const targetOptions: ISessionOption = { sid: targetSessionId };
  const targetSession = await sessionHandler.read(targetOptions);
  // Info: (20250111 - Luphia) the operator session, its userId should be the same as the target session
  const operatorSession: ISessionData = await sessionHandler.read(session);
  const operatorUserId = operatorSession.userId;
  let result = false;
  if (operatorUserId === targetSession.userId) {
    sessionHandler.destroy(targetOptions);
    result = true;
  }
  return result;
}
