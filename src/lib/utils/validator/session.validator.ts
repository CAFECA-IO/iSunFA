import { z } from 'zod';

// 定義團隊成員的 schema
const teamMemberSchema = z.object({
  id: z.number(),
  role: z.string(),
});

// 定義 session 資料的 schema
export const sessionDataSchema = z.object({
  isunfa: z.string(),
  deviceId: z.string(),
  ipAddress: z.string(),
  userAgent: z.string(),
  userId: z.number(),
  companyId: z.number(),
  roleId: z.number(),
  teamId: z.number(), // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  teamRole: z.string(), // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  actionTime: z.number(),
  expires: z.number(),
  teams: z.array(teamMemberSchema),
});

// 定義 session 更新資料的 schema
export const sessionUpdateDataSchema = z.object({
  userId: z.number().optional(),
  companyId: z.number().optional(),
  roleId: z.number().optional(),
  actionTime: z.number().optional(),
  teamId: z.number().optional(), // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  teamRole: z.string().optional(), // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。
  teams: z.array(teamMemberSchema).optional(),
});

// 導出類型
export type ISessionDataSchema = z.infer<typeof sessionDataSchema>;
export type ISessionUpdateDataSchema = z.infer<typeof sessionUpdateDataSchema>;
