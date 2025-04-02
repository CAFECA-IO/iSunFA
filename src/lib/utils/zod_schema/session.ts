import { z } from 'zod';
import { TeamRole } from '@/interfaces/team';

// 定義團隊成員的 schema
const teamMemberSchema = z.object({
  teamId: z.string(),
  role: z.nativeEnum(TeamRole),
});

// 定義 session 資料的 schema
export const sessionDataSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
  teams: z.array(teamMemberSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 定義 session 更新資料的 schema
export const sessionUpdateDataSchema = z.object({
  teams: z.array(teamMemberSchema).optional(),
});

// 導出類型
export type ISessionDataSchema = z.infer<typeof sessionDataSchema>;
export type ISessionUpdateDataSchema = z.infer<typeof sessionUpdateDataSchema>;
