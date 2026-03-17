import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { TASK_BOARD_ABI } from '@/lib/task_board_abi';
import { uploadFile, downloadFile } from '@/lib/laria.server';
import { TASK_STATUS } from '@/constants/status';
import 'dotenv/config';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.isuncoin.com";
const privateKey = process.env.ISUNCOIN_PRIVATE_KEY;
const taskBoardAddress = process.env.NEXT_PUBLIC_TASK_BOARD_ADDRESS;

async function runTaskManager() {
  console.log('[TaskManager] Starting Smart Contract Task Manager...');

  if (!privateKey || !taskBoardAddress) {
    console.error("[TaskManager] Missing ISUNCOIN_PRIVATE_KEY or NEXT_PUBLIC_TASK_BOARD_ADDRESS in .env. Exiting.");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const taskBoard = new ethers.Contract(taskBoardAddress, TASK_BOARD_ABI, wallet);

  console.log(`[TaskManager] Connected to TaskBoard at ${taskBoardAddress} with wallet ${wallet.address}`);

  let isRunning = true;

  process.on('SIGINT', () => {
    console.log('\n[TaskManager] Stopping...');
    isRunning = false;
  });

  while (isRunning) {
    try {
      await processLocalTasksToContract(taskBoard, wallet);
      await processContractTasks(taskBoard);

      // Info: (20260317 - Luphia) Check periodically
      await new Promise(resolve => setTimeout(resolve, 30000));
    } catch (error) {
      console.error('[TaskManager] Error in loop:', error);
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  console.log('[TaskManager] Stopped.');
  process.exit(0);
}

// Info: (20260317 - Luphia) 1. 從 TASK table 找出所有尚未有 contract 的 task，並建立之
async function processLocalTasksToContract(taskBoard: ethers.Contract, wallet: ethers.Wallet) {
  const pendingTasks = await prisma.task.findMany({
    where: {
      contract: null,
      status: TASK_STATUS.PENDING
    },
    include: {
      mission: true
    }
  });

  for (const task of pendingTasks) {
    // Info: (20260317 - Luphia) 1.1 根據 order 判斷此任務前置作業是否已完成，若尚未完成則跳過
    if (task.order > 0) {
      const prevTasks = await prisma.task.findMany({
        where: {
          missionId: task.missionId,
          order: {
            lt: task.order
          }
        }
      });

      const prevCompleted = prevTasks.every(t => t.status === TASK_STATUS.COMPLETED || t.status === TASK_STATUS.SKIPPED);
      if (!prevCompleted) {
        console.log(`[TaskManager] Skipping task ${task.id} (Order ${task.order}): Prerequisites not finished.`);
        continue;
      }

      // Info: (20260317 - Luphia) 1.2 將前置作業的成果與這份 Task 內的資料整理成 task.md markdown 格式文字檔
      let markdownContent = `# Task: ${task.type}\n\n## Mission Context\n${task.mission?.name || 'Unknown Mission'}\n\n## Task Data\n\`\`\`json\n${JSON.stringify(task.data, null, 2)}\n\`\`\`\n\n## Previous Results\n`;

      for (const prevTask of prevTasks) {
        if (prevTask.result) {
          markdownContent += `### Result from Phase ${prevTask.order}\n\`\`\`json\n${JSON.stringify(prevTask.result, null, 2)}\n\`\`\`\n\n`;
        }
      }

      console.log(`[TaskManager] Publishing Task ${task.id} to Contract...`);
      const buffer = Buffer.from(markdownContent, 'utf-8');

      try {
        // Info: (20260317 - Luphia) 上傳取得 cid，作為 contract 內容
        const { metadataHash } = await uploadFile(buffer, `task_${task.id}.md`);
        console.log(`[TaskManager] Uploaded task instructions to CID: ${metadataHash}`);

        // Info: (20260317 - Luphia) 需要有足夠的 Token Allowance，這邊簡化處理，實務上應確保事前 Approve 足夠數量
        const tokenAddress = await taskBoard.token();
        const tokenAbi = ["function approve(address spender, uint256 amount) public returns (bool)"];
        const token = new ethers.Contract(tokenAddress, tokenAbi, wallet);
        const txApprove = await token.approve(await taskBoard.getAddress(), ethers.MaxUint256);
        await txApprove.wait();

        // Info: (20260317 - Luphia) 依此建立智能合約上的委託
        const txCreate = await taskBoard.createTask(metadataHash);
        await txCreate.wait();

        console.log(`[TaskManager] Task ${task.id} created on contract with CID ${metadataHash}`);

        // Info: (20260317 - Luphia) 更新資料庫
        await prisma.task.update({
          where: { id: task.id },
          data: {
            contract: metadataHash,
            status: TASK_STATUS.RUNNING
          }
        });

      } catch (e) {
        console.error(`[TaskManager] Failed to publish task ${task.id}:`, e);
      }
    }
  }
}

// Info: (20260317 - Luphia) 2, 3, 4 檢查合約任務狀態
async function processContractTasks(taskBoard: ethers.Contract) {
  const runningTasks = await prisma.task.findMany({
    where: {
      contract: { not: null },
      status: TASK_STATUS.RUNNING
    }
  });

  for (const task of runningTasks) {
    if (!task.contract) continue;

    try {
      const taskDetails = await taskBoard.tasks(task.contract);
      const status = Number(taskDetails.status);
      const deadline = Number(taskDetails.deadline);
      const publisher = taskDetails.publisher;
      const now = Math.floor(Date.now() / 1000);

      // Info: (20260317 - Luphia) 確認本錢包是發布者，且任務還在 Open 階段
      const runnerAddress = taskBoard.runner ? await (taskBoard.runner as ethers.Signer).getAddress() : "";
      if (status === 0 && publisher.toLowerCase() === runnerAddress.toLowerCase()) {

        // Info: (20260317 - Luphia) 取得提交列表（目前 ABI submissions 無法直接遍歷，若有 subgraph 較佳，這裡簡化取第一個或過濾 events）
        const filter = taskBoard.filters.WorkSubmitted(task.contract);
        const events = await taskBoard.queryFilter(filter, -10000); // 查詢過去 10000 個區塊

        if (events.length > 0) {
          // Info: (20260317 - Luphia) 2. 檢查將合約上是否有提交成果，若有...
          const lastEvent = events[events.length - 1] as ethers.EventLog;
          const submitter = lastEvent.args[1];
          const workCid = lastEvent.args[2];

          console.log(`[TaskManager] Task ${task.id} has submission from ${submitter} with CID ${workCid}`);

          try {
            // Info: (20260317 - Luphia) 下載成果
            const { buffer } = await downloadFile(workCid);
            const resultText = buffer.toString('utf-8');

            // Info: (20260317 - Luphia) 檢驗成果是否正確 (此處簡化為有內容即正確)
            if (resultText && resultText.trim().length > 0) {
              console.log(`[TaskManager] Validation passed for ${task.id}. Approving on contract...`);

              const txApprove = await taskBoard.approveWork(task.contract, [submitter]);
              await txApprove.wait();

              const txSettle = await taskBoard.settlement(task.contract);
              await txSettle.wait();

              // Info: (20260317 - Luphia) 放回資料庫
              await prisma.task.update({
                where: { id: task.id },
                data: {
                  status: TASK_STATUS.COMPLETED,
                  result: {
                    content: resultText,
                    submitter,
                    workCid
                  }
                }
              });
              console.log(`[TaskManager] Task ${task.id} marked as COMPLETED.`);
            } else {
              console.log(`[TaskManager] Validation failed for ${task.id}. Work result is empty.`);
            }

          } catch (downloadErr) {
            console.error(`[TaskManager] Failed to download or validate workCid ${workCid} for task ${task.id}:`, downloadErr);
          }

        } else {
          // Info: (20260317 - Luphia) 沒有提交的情況
          const taskAgeMs = Date.now() - task.updatedAt.getTime();
          const oneHourMs = 60 * 60 * 1000;

          if (taskAgeMs > oneHourMs) {
            // Info: (20260317 - Luphia) 4. 將合約上超過 1 小時還沒完成的任務關閉
            if (now > deadline) {
              console.log(`[TaskManager] Task ${task.id} is over 1 hour old and past deadline. Cancelling...`);
              const txCancel = await taskBoard.cancelTask(task.contract);
              await txCancel.wait();

              await prisma.task.update({
                where: { id: task.id },
                data: {
                  status: TASK_STATUS.FAILED,
                  result: { error: "Timeout: No submissions within 1 hour." }
                }
              });
              console.log(`[TaskManager] Task ${task.id} cancelled as FAILED.`);
            } else {
              console.log(`[TaskManager] Task ${task.id} is over 1 hour old but deadline hasn't passed yet. Waiting...`);
            }
          } else {
            // Info: (20260317 - Luphia) 3. 將合約上還沒完成的任務延長
            // Info: (20260317 - Luphia) 如果 deadline 快到了 (< 60s)，就執行延長
            if (deadline - now < 60) {
              console.log(`[TaskManager] Task ${task.id} deadline is approaching. Extending...`);

              // Info: (20260317 - Luphia) Approve another BASE_FEE
              const tokenAddress = await taskBoard.token();
              const tokenAbi = ["function approve(address spender, uint256 amount) public returns (bool)"];
              const token = new ethers.Contract(tokenAddress, tokenAbi, taskBoard.runner as ethers.Signer);
              const txApprove = await token.approve(await taskBoard.getAddress(), ethers.parseEther("1"));
              await txApprove.wait();

              const txExtend = await taskBoard.extendTask(task.contract);
              await txExtend.wait();
              console.log(`[TaskManager] Task ${task.id} extended via Smart Contract.`);

              // Info: (20260317 - Luphia) Also update the database updatedAt to refresh the 1 hour timer
              await prisma.task.update({
                where: { id: task.id },
                data: { updatedAt: new Date() }
              });
            }
          }
        }
      }
    } catch (err) {
      console.error(`[TaskManager] Error processing contract task ${task.id}:`, err);
    }
  }
}

runTaskManager().catch(err => {
  console.error('[TaskManager] Fatal error:', err);
  process.exit(1);
});
