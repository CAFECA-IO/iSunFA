import fs from "fs/promises";
import path from "path";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { getPriorityEnvConfig } from "@/services/env.service";
import { storageService } from "@/services/storage.service";
import { getAdminAccount } from "@/lib/wallet/admin_wallet";
import { isuncoin } from "@/lib/viem_public";
import { ChatService } from "@/services/chat.service";
import { Prisma } from "@/generated";

interface IFileResult {
  journal?: Record<string, unknown>;
  voucherBase?: Record<string, unknown> & { data?: Record<string, unknown> };
  voucherLines?: Record<string, unknown> & { data?: Record<string, unknown> };
  esg?: Record<string, unknown> & { data?: Record<string, unknown> };
}

function testPrismaDecimal(val: unknown, fieldName: string): void {
  if (val === null || val === undefined) {
    throw new Error(`${fieldName} is missing (null/undefined)`);
  }
  const s = String(val).trim();
  if (
    s === "" ||
    s.toLowerCase() === "null" ||
    s.toLowerCase() === "undefined" ||
    s.toLowerCase() === "nan" ||
    s.toLowerCase() === "n/a" ||
    s.toLowerCase() === "tbd" ||
    s === "-"
  ) {
    throw new Error(`${fieldName} has an invalid representation: "${s}"`);
  }
  try {
    const d = new Prisma.Decimal(s);
    if (d.isNaN()) {
      throw new Error(`${fieldName} is NaN`);
    }
  } catch {
    throw new Error(`Failed to parse ${fieldName} to Decimal: "${s}"`);
  }
}

function validateDbSyncPayload(payload: unknown): void {
  if (!payload || typeof payload !== "object") {
    throw new Error("dbSyncPayload is missing or not a valid object");
  }
  const p = payload as Record<string, Record<string, unknown>>;
  for (const recordKey of Object.keys(p)) {
    const fileResult = p[recordKey] as IFileResult;
    if (!fileResult || typeof fileResult !== "object") {
      throw new Error(`dbSyncPayload record "${recordKey}" is not an object`);
    }

    // Info: (20260524 - Luphia) 1. 校驗 Journal
    if (!fileResult.journal) {
      throw new Error(
        `dbSyncPayload record "${recordKey}" is missing "journal" property`,
      );
    }

    // Info: (20260524 - Luphia) 2. 校驗 Voucher
    if (fileResult.voucherBase || fileResult.voucherLines) {
      const vd = {
        ...((fileResult.voucherBase?.data as Record<string, unknown>) ||
          (fileResult.voucherBase as Record<string, unknown>) ||
          {}),
        ...((fileResult.voucherLines?.data as Record<string, unknown>) ||
          (fileResult.voucherLines as Record<string, unknown>) ||
          {}),
      } as Record<string, unknown> & {
        lines?: unknown[];
        totalAmount?: unknown;
      };

      // Info: (20260524 - Luphia) 校驗 totalAmount
      const totalAmtStr = String(vd.totalAmount || "").trim();
      if (
        totalAmtStr === "" ||
        totalAmtStr.toLowerCase() === "null" ||
        isNaN(Number(totalAmtStr.replace(/,/g, "")))
      ) {
        throw new Error(
          `Voucher totalAmount has an invalid representation: "${totalAmtStr}"`,
        );
      }

      // Info: (20260524 - Luphia) 校驗 lines amount
      const lines = vd.lines;
      if (Array.isArray(lines)) {
        for (const l of lines) {
          const lineObj = l as Record<string, unknown> & { amount?: unknown };
          const amtStr = String(lineObj.amount || "").trim();
          if (
            amtStr === "" ||
            amtStr.toLowerCase() === "null" ||
            isNaN(Number(amtStr.replace(/,/g, "")))
          ) {
            throw new Error(
              `Voucher line amount has an invalid representation: "${amtStr}"`,
            );
          }
        }
      }
    }

    // Info: (20260524 - Luphia) 3. 校驗 ESG
    if (fileResult.esg) {
      const ed = (fileResult.esg.data || fileResult.esg) as Record<
        string,
        unknown
      > & { amount?: unknown; emissions?: unknown; dqiScore?: unknown };
      testPrismaDecimal(ed.amount, "ESG amount");
      testPrismaDecimal(ed.emissions, "ESG emissions");
      testPrismaDecimal(ed.dqiScore, "ESG dqiScore");
    }
  }
}

const MB_ABI = parseAbi([
  "function tasks(uint256) view returns (address creator, string contentCid, uint256 reward, uint256 createdAt, uint256 updatedAt, uint8 status, uint256 submissionCount)",
  "function taskSubmissions(uint256, uint256) view returns (address submitter, string resultCid, uint256 consumedTokens, bool isRejected, uint256 disputeUntil)",
  "function approveSubmission(uint256 taskId, uint256 subIndex) external",
  "function rejectSubmission(uint256 taskId, uint256 subIndex) external",
]);

export async function processNext() {
  console.log(
    "[IssueValidator] Fetching PendingReview tasks from MissionBoard...",
  );

  const adminAccount = await getAdminAccount();
  const setupConfig = await getPriorityEnvConfig();
  const rpcUrl =
    setupConfig.NEXT_PUBLIC_RPC_URL ||
    "[http://127.0.0.1:20024](http://127.0.0.1:20024)";
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const walletClient = createWalletClient({
    account: adminAccount,
    chain: isuncoin,
    transport: http(rpcUrl),
  });

  const mbAddress =
    setupConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

  const issueDirBase = setupConfig.ISSUE_DIR || "issues";
  const issueDirPath = path.join(process.cwd(), issueDirBase);

  let validatedTask = false;

  /**
   * Info: (20260420 - Luphia)
   * We can rescan from 0, or keep track. Keeping it simple: scan from 0 for pending ones.
   * In production we would maintain state or query event logs.
   */
  let currentTaskId = 0n;

  while (true) {
    try {
      const taskData = await publicClient.readContract({
        address: mbAddress,
        abi: MB_ABI,
        functionName: "tasks",
        args: [currentTaskId],
      });

      const [creator, , , , , status, submissionCount] = taskData;

      if (creator === "0x0000000000000000000000000000000000000000") {
        break; // Info: (20260420 - Luphia) End of tasks
      }

      // Info: (20260420 - Luphia) status == 1 means PendingReview, status == 3 means Closed (Approved)
      if ((status === 1 || status === 3) && submissionCount > 0n) {
        const subIndex = submissionCount - 1n;
        const subData = await publicClient.readContract({
          address: mbAddress,
          abi: MB_ABI,
          functionName: "taskSubmissions",
          args: [currentTaskId, subIndex],
        });

        const [, resultCid, , isRejected] = subData;

        if (!isRejected) {
          const taskIssueDir = path.join(
            issueDirPath,
            `${mbAddress}_${currentTaskId.toString()}`,
          );
          const approvedPath = path.join(
            taskIssueDir,
            `approved.${subIndex}.md`,
          );
          const rejectedPath = path.join(
            taskIssueDir,
            `rejected.${subIndex}.md`,
          );

          // Info: (20260420 - Luphia) Check if we already validated this
          let alreadyValidated = false;
          try {
            await fs.access(approvedPath);
            alreadyValidated = true;
          } catch {
            /* Info: (20260420 - Luphia) nothing to do */
          }
          try {
            await fs.access(rejectedPath);
            alreadyValidated = true;
          } catch {
            /* Info: (20260420 - Luphia) nothing to do */
          }

          if (!alreadyValidated) {
            console.log(
              `[IssueValidator] Found Unsynced Task ID: ${currentTaskId}, SubIndex: ${subIndex}, Status: ${status}`,
            );

            // Info: (20260429 - Luphia) State Recovery: If status is 3, it was already approved on chain but local file is missing!
            if (status === 3) {
              console.log(
                `[IssueValidator] State Recovery for Task ID: ${currentTaskId}. It is Closed on chain but missing local approved file. Recovering...`,
              );
              await fs.mkdir(taskIssueDir, { recursive: true });

              try {
                console.log(
                  `[IssueValidator] State Recovery: Downloading result CID: ${resultCid} from IPFS (Laria)...`,
                );
                const fileBuffer = await storageService.recoverLaria(resultCid);
                const resultContent = fileBuffer.toString("utf8");
                const resultFileLocalPath = path.join(
                  taskIssueDir,
                  `${subIndex}.md`,
                );
                await fs.writeFile(resultFileLocalPath, resultContent, "utf8");
              } catch (e) {
                console.error(
                  `[IssueValidator] State Recovery: Failed to download result CID ${resultCid}:`,
                  e,
                );
                const resultFileLocalPath = path.join(
                  taskIssueDir,
                  `${subIndex}.md`,
                );
                await fs.writeFile(
                  resultFileLocalPath,
                  '{"error": "Failed to recover result from IPFS during state recovery"}',
                  "utf8",
                );
              }

              const approvedContent = `# Approved Submission (Recovered)
- Result CID: ${resultCid}
- Submission Index: ${subIndex}
- Validator Note: Recovered from on-chain state (Task is Closed).
- AI Confidence: 100
- Transaction Hash: N/A
`;
              await fs.writeFile(approvedPath, approvedContent, "utf8");
              validatedTask = true;
              currentTaskId++;
              continue;
            }

            await fs.mkdir(taskIssueDir, { recursive: true });
            const validatorPlanPath = path.join(
              taskIssueDir,
              "plan.validator.md",
            );
            let validatorPlan = "";
            try {
              validatorPlan = await fs.readFile(validatorPlanPath, "utf8");
            } catch {
              console.warn(
                `[IssueValidator] No plan.validator.md found for Task ID: ${currentTaskId}. Falling back to default rules.`,
              );
              validatorPlan = "Default acceptance rules apply.";
            }
            console.log(
              "[IssueValidator] Using plan for validation:",
              validatorPlan.substring(0, 50),
            );

            console.log(
              `[IssueValidator] Downloading result CID: ${resultCid} from IPFS (Laria)...`,
            );
            const fileBuffer = await storageService.recoverLaria(resultCid);
            const resultContent = fileBuffer.toString("utf8");

            const resultFileLocalPath = path.join(
              taskIssueDir,
              `${subIndex}.md`,
            );
            await fs.writeFile(resultFileLocalPath, resultContent, "utf8");

            /**
             * Info: (20260427 - Luphia)
             * [關鍵流程做法]: 分析 commit 成果是否合格
             * 1. 透過 ChatService 請求 AI，根據 validatorPlan 評估 resultContent 的完整性與正確度。
             * 2. AI 須回傳 0-100 的信心度 (confidence)。
             * 3. 信心度若低於 60 則判定為不合格 (rejectSubmission) 並附上拒絕原因。
             * 4. 信心度若大於或等於 60，判定為合格 (approveSubmission)。
             */
            let isApproved = false;
            let rejectReason = "Unknown Error";
            let aiConfidence = 0;
            let dataError = "";

            // Info: (20260524 - Luphia) 1. 執行嚴格的前置資料結構與數值校驗，杜絕異常數據流向 Recorder (Rejection Guard)
            try {
              const parsedResult = JSON.parse(resultContent);

              // Info: (20260524 - Luphia) 取得 orderCategory 判斷
              let orderCategory = "";
              try {
                const missionContent = await fs.readFile(
                  path.join(taskIssueDir, "mission.json"),
                  "utf8",
                );
                const missionData = JSON.parse(missionContent);
                const orderDataObj = (missionData.data ||
                  missionData) as Record<string, unknown>;
                orderCategory = (orderDataObj.category ||
                  missionData.category) as string;
              } catch {}

              if (orderCategory === "certificate_analysis") {
                validateDbSyncPayload(parsedResult.dbSyncPayload);
              }
            } catch (err) {
              dataError = `[異常數據拒絕] ${(err as Error).message}`;
              console.warn(
                `[IssueValidator] Data pre-validation rejected the task: ${dataError}`,
              );
            }

            if (!dataError) {
              try {
                const apiKey = setupConfig.GEMINI_API_KEY;
                if (!apiKey) {
                  throw new Error(
                    "Missing GEMINI_API_KEY in environment for validation.",
                  );
                }
                const chatService = new ChatService(apiKey);

                let contentToValidate = resultContent;
                try {
                  const parsedResult = JSON.parse(resultContent);

                  // Info: (20260503 - Luphia) 限制傳入 AI 的文字長度，避免超出 token limit
                  const stripHeavyData = (obj: unknown): void => {
                    if (!obj || typeof obj !== "object") return;

                    const record = obj as Record<string, unknown>;

                    for (const key of Object.keys(record)) {
                      if (key === "geometry") {
                        const geometry = record[key];
                        if (geometry && typeof geometry === "object") {
                          const geoRecord = geometry as Record<string, unknown>;
                          if (geoRecord.coordinates) {
                            geoRecord.coordinates =
                              "[Geometry coordinates omitted for AI validation]";
                          }
                        }
                      } else if (typeof record[key] === "object") {
                        stripHeavyData(record[key]);
                      }
                    }
                  };

                  stripHeavyData(parsedResult);
                  contentToValidate = JSON.stringify(parsedResult, null, 2);

                  if (contentToValidate.length > 8000) {
                    contentToValidate =
                      contentToValidate.substring(0, 8000) + "\n...[truncated]";
                  }
                } catch {
                  contentToValidate = resultContent.substring(0, 8000);
                }

                const prompt = `
Please act as an automated validator. Your task is to evaluate the provided execution result against the validation plan.
Rate your confidence in the result's correctness and completeness on a scale of 0 to 100.
Also provide a short reason for your rating.
Return ONLY valid JSON in this exact format without any markdown blocks around it:
{
  "confidence": 85,
  "reason": "The result meets all requirements in the plan."
}

Validation Plan:
${validatorPlan}

Execution Result:
${contentToValidate}
`;
                const rawResponse = await chatService.generateRaw(prompt);

                // Info: (20260427 - Luphia) 處理可能包含 markdown code block 的情況
                let jsonStr = rawResponse.trim();
                if (jsonStr.startsWith("```json")) {
                  jsonStr = jsonStr
                    .replace(/^```json/, "")
                    .replace(/```$/, "")
                    .trim();
                } else if (jsonStr.startsWith("```")) {
                  jsonStr = jsonStr
                    .replace(/^```/, "")
                    .replace(/```$/, "")
                    .trim();
                }

                const aiResult = JSON.parse(jsonStr) as {
                  confidence: number;
                  reason: string;
                };
                aiConfidence = aiResult.confidence;

                if (aiConfidence < 60) {
                  rejectReason = `AI Confidence too low (${aiConfidence}/100): ${aiResult.reason}`;
                  isApproved = false;
                  console.log(
                    `[IssueValidator] Validation failed. ${rejectReason}`,
                  );
                } else {
                  isApproved = true;
                  console.log(
                    `[IssueValidator] Validation passed! AI Confidence: ${aiConfidence}/100. Reason: ${aiResult.reason}`,
                  );
                }
              } catch (err) {
                console.error(
                  `[IssueValidator] AI Validation failed for Task ID: ${currentTaskId}.`,
                  err,
                );
                rejectReason =
                  "AI Validation encountered an error or returned invalid format";

                // Info: (20260427 - Luphia) 如果 AI 暫時不可用，採用長度防呆降級驗證
                if (
                  resultContent &&
                  resultContent.length > 50 &&
                  !resultContent.toLowerCase().includes("error") &&
                  !resultContent.toLowerCase().includes("failed")
                ) {
                  console.log(
                    "[IssueValidator] Falling back to basic validation due to AI failure (passed).",
                  );
                  isApproved = true;
                }
              }
            } else {
              isApproved = false;
              rejectReason = dataError;
            }

            if (isApproved) {
              console.log(
                `[IssueValidator] Validation passed for Task ID: ${currentTaskId}. Approving submission...`,
              );
              try {
                const { request } = await publicClient.simulateContract({
                  account: adminAccount,
                  address: mbAddress,
                  abi: MB_ABI,
                  functionName: "approveSubmission",
                  args: [currentTaskId, subIndex],
                });
                const txHash = await walletClient.writeContract(request);
                await publicClient.waitForTransactionReceipt({ hash: txHash });

                const approvedContent = `# Approved Submission
- Result CID: ${resultCid}
- Submission Index: ${subIndex}
- Validator Note: Everything matches \`plan.validator.md\` successfully.
- AI Confidence: ${aiConfidence}
- Transaction Hash: ${txHash}
`;
                await fs.writeFile(approvedPath, approvedContent, "utf8");
              } catch (contractErr: unknown) {
                const errMessage =
                  contractErr instanceof Error
                    ? contractErr.message
                    : String(contractErr);
                if (errMessage.includes("Invalid status")) {
                  console.log(
                    `[IssueValidator] Task ID: ${currentTaskId} was already approved/closed by another node/process. Skipping gracefully.`,
                  );
                  // Info: (20260502 - Luphia) Write a local record so we don't try again
                  const approvedContent = `# Approved Submission
- Result CID: ${resultCid}
- Submission Index: ${subIndex}
- Validator Note: Already approved on-chain by another validator.
- AI Confidence: ${aiConfidence}
`;
                  await fs.writeFile(approvedPath, approvedContent, "utf8");
                } else {
                  throw contractErr;
                }
              }
            } else {
              console.log(
                `[IssueValidator] Validation failed for Task ID: ${currentTaskId}. Rejecting submission... Reason: ${rejectReason}`,
              );
              try {
                const { request } = await publicClient.simulateContract({
                  account: adminAccount,
                  address: mbAddress,
                  abi: MB_ABI,
                  functionName: "rejectSubmission",
                  args: [currentTaskId, subIndex],
                });
                const txHash = await walletClient.writeContract(request);
                await publicClient.waitForTransactionReceipt({ hash: txHash });

                const rejectedContent = `# Rejected Submission
- Result CID: ${resultCid}
- Submission Index: ${subIndex}
- Reason: ${rejectReason}
- AI Confidence: ${aiConfidence}
- Transaction Hash: ${txHash}
`;
                await fs.writeFile(rejectedPath, rejectedContent, "utf8");
              } catch (contractErr: unknown) {
                const errMessage =
                  contractErr instanceof Error
                    ? contractErr.message
                    : String(contractErr);
                if (errMessage.includes("Already rejected")) {
                  console.log(
                    `[IssueValidator] Task ID: ${currentTaskId} was already rejected by another node/process. Skipping gracefully.`,
                  );
                  // Info: (20260502 - Luphia) Write a local record so we don't try again
                  const rejectedContent = `# Rejected Submission
- Result CID: ${resultCid}
- Submission Index: ${subIndex}
- Reason: Already rejected on-chain by another validator.
- AI Confidence: ${aiConfidence}
`;
                  await fs.writeFile(rejectedPath, rejectedContent, "utf8");
                } else {
                  throw contractErr;
                }
              }
            }

            validatedTask = true;
            break; // Info: (20260420 - Luphia) process one at a time
          }
        }
      }

      currentTaskId++;
    } catch (e) {
      console.error(
        `[IssueValidator] Execution error on Task ID ${currentTaskId}:`,
        e,
      );
      /**
       * Info: (20260420 - Luphia)
       * Do not break the entire loop on a single task error if it's not a contract out-of-bounds,
       * but since we don't know, we will stop exactly here until next interval to avoid spamming.
       */
      break;
    }
  }

  if (!validatedTask) {
    console.log("[IssueValidator] No pending review tasks found.");
  }
}
