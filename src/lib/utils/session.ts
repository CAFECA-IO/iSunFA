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

  async update(options: ISessionOption, data: ISessionUpdateData) {
    const sessionId = parseSessionId(options);
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

  async destroy(options: ISessionOption) {
    const sessionId = parseSessionId(options);
    this.data.delete(sessionId);
    this.backup();
  }

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

export const getSession = async (req: NextApiRequest) => {
  // Info: (20250107 - Luphia) 根據 header 取得用戶 session，未登入則回傳 { sid: sessionId }
  const options = req.headers as ISessionOption;
  const session = sessionHandler.read(options);
  return session;
};

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
