// Info: (20260712 - Luphia) 碳盤查結構化狀態資料存取層（唯一碰 Prisma）；方案 A：伺服器端明文 Jsonb
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated";
import type { ICarbonInventoryState } from "@/types/carbon_chatbot.types";

export class CarbonInventoryStateRepository {
  // Info: (20260712 - Luphia) 依 chatroom 取回狀態（無則回 null）
  async findByChatroomId(
    chatroomId: string,
  ): Promise<ICarbonInventoryState | null> {
    const row = await prisma.carbonInventoryState.findUnique({
      where: { chatroomId },
    });
    return row ? (row.state as unknown as ICarbonInventoryState) : null;
  }

  // Info: (20260712 - Luphia) 建立或更新狀態；version 由服務層遞增供樂觀鎖/稽核
  async upsert(chatroomId: string, state: ICarbonInventoryState) {
    const jsonState = state as unknown as Prisma.InputJsonValue;
    return prisma.carbonInventoryState.upsert({
      where: { chatroomId },
      update: { state: jsonState, version: state.version },
      create: {
        chatroom: { connect: { id: chatroomId } },
        state: jsonState,
        version: state.version,
      },
    });
  }
}

export const carbonInventoryStateRepo = new CarbonInventoryStateRepository();
