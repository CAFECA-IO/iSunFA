import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@/generated/client";

async function main() {
  console.log("🔄 正在重置任務狀態...");

  const result = await prisma.reportDownloadTask.updateMany({
    where: {
      status: { in: [TaskStatus.SUCCESS, TaskStatus.FAILED] },
    },
    data: {
      status: TaskStatus.PENDING,
      errorMsg: null, // Info: (20260409 - Tzuhan) 清空先前的錯誤訊息
      filePath: null, // Info: (20260409 - Tzuhan) 清空先前的路徑
      retryCount: 0, // Info: (20260409 - Tzuhan) 重試次數歸零
    },
  });

  console.log(`✅ 重置完成！共更新了 ${result.count} 筆任務回 PENDING 狀態。`);
}

main().catch(console.error);
