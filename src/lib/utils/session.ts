import { SESSION_GUEST } from '@/constants/session';
import { ONE_DAY_IN_MS } from '@/constants/time';
import {
  ISessionData,
  ISessionHandlerOption,
  ISessionOption,
  ISessionUpdateData,
} from '@/interfaces/session';
import { NextApiRequest } from 'next';
import path from 'path';
import loggerBack from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

const parseSessionId = (options: ISessionOption) => {
  const sessionId = options?.sid
    ? options?.sid
    : options?.cookie?.path
      ? options.cookie.path
      : 'GUEST';
  loggerBack.warn(`Session ID: ${sessionId}`);
  return sessionId;
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

  filePath: string;

  secret: string;

  constructor(option: ISessionHandlerOption) {
    this.gcInterval = option.gcInterval
      ? option.gcInterval
      : DefaultValue.SESSION_OPTION.GC_INTERVAL;
    this.filePath = option.filePath ? option.filePath : DefaultValue.SESSION_OPTION.FILE_PATH;
    this.secret = option.secret ? option.secret : DefaultValue.SESSION_OPTION.SECRET;
  }

  async read(options: ISessionOption) {
    const sessionId = parseSessionId(options);
    const result = this.data.get(sessionId);
    return result;
  }

  async update(options: ISessionOption, data: ISessionUpdateData) {
    const sessionId = parseSessionId(options);
    const session = this.data.get(sessionId) || SESSION_GUEST;
    const newSession = { ...session, ...data };
    this.data.set(sessionId, newSession);
  }

  async destroy(options: ISessionOption) {
    const sessionId = parseSessionId(options);
    this.data.delete(sessionId);
  }

  async garbageCollection() {
    // Info: (20250107 - Luphia) remove expired session
    const now = new Date();
    this.data.forEach((session, key) => {
      if (session.cookie.expires && session.cookie.expires < now) {
        this.data.delete(key);
      }
    });
  }
}

const sessionFolder = process.env.BASE_STORAGE_PATH || './';
const sessionHandlerOption: ISessionHandlerOption = {
  gcInterval: ONE_DAY_IN_MS,
  filePath: path.resolve(sessionFolder, 'session.store'),
  secret: process.env.NEXTAUTH_SECRET || DEFAULT_SESSION_OPTION.SECRET,
};
const sessionHandler = SessionHandler.getInstance(sessionHandlerOption);

export const getSession = async (req: NextApiRequest) => {
  // Info: (20250107 - Luphia) 根據 header 取得用戶 session，未登入則回傳 undefined
  const options = req.cookies as unknown as ISessionOption;
  const session = sessionHandler.read(options) as unknown as ISessionData;
  return session;
};

export function setSession(
  session: ISessionData,
  data: { userId?: number; companyId?: number; challenge?: string; roleId?: number }
) {
  const options: ISessionOption = session.cookie as unknown as ISessionOption;
  sessionHandler.update(options, data);
}

export function destroySession(session: ISessionData) {
  session.destroy();
}
