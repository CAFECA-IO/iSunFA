import { ethers } from "ethers";
import * as fs from "fs";
import "dotenv/config";

async function main() {
  console.log("Starting Live Smart Contract Tests...\n");

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.isuncoin.com";
  const privateKey = process.env.ISUNCOIN_PRIVATE_KEY;
  const taskBoardAddress = process.env.NEXT_PUBLIC_TASK_BOARD_ADDRESS;

  if (!privateKey) {
    throw new Error("Missing ISUNCOIN_PRIVATE_KEY in .env");
  }

  if (!taskBoardAddress) {
    throw new Error("Missing NEXT_PUBLIC_TASK_BOARD_ADDRESS in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  /** Info: (20260316 - Luphia) 
   * Using the same wallet for publisher and worker for simplicity in live test, 
   * or derived wallets if needed. We'll use the main wallet for everything 
   * to avoid needing multiple funded live private keys.
   */
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Testing with account:", wallet.address);

  // Info: (20260316 - Luphia) Load ABIs
  const taskBoardArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/task_board.sol/TaskBoard.json", "utf8"));
  const tokenArtifact = JSON.parse(fs.readFileSync("./node_modules/@erc3643org/erc-3643/artifacts/contracts/token/Token.sol/Token.json", "utf8"));

  const taskBoard = new ethers.Contract(taskBoardAddress, taskBoardArtifact.abi, wallet);

  const tokenAddress = await taskBoard.token();
  const token = new ethers.Contract(tokenAddress, tokenArtifact.abi, wallet);

  console.log("TaskBoard Address:", taskBoardAddress);
  console.log("Token Address:", tokenAddress);

  // Info: (20260316 - Luphia) Check if token is paused and unpause
  const isPaused = await token.paused();
  if (isPaused) {
    console.log("Token is paused. Unpausing...");
    const txUnpause = await token.unpause();
    await txUnpause.wait();
    console.log("✔ Token unpaused.");
  } else {
    console.log("✔ Token is already active (not paused).");
  }

  // Info: (20260316 - Luphia) Check if TaskBoard is verified
  const irAddress = await taskBoard.identityRegistry();
  const irArtifact = JSON.parse(fs.readFileSync("./node_modules/@erc3643org/erc-3643/artifacts/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json", "utf8"));
  const identityRegistry = new ethers.Contract(irAddress, irArtifact.abi, wallet);

  const isContractVerified = await identityRegistry.isVerified(taskBoardAddress);
  if (!isContractVerified) {
    console.log("TaskBoard is not verified. Whitelisting TaskBoard...");
    const userIdentity = await identityRegistry.identity(wallet.address);
    if (userIdentity === ethers.ZeroAddress) {
      console.log("Warning: Wallet doesn't have an identity either! Token transfers will fail.");
    } else {
      const txWhitelistContract = await taskBoard.addWhitelist(taskBoardAddress, userIdentity, 1);
      await txWhitelistContract.wait();
      console.log("✔ TaskBoard whitelisted successfully.");
    }
  } else {
    console.log("✔ TaskBoard is already verified.");
  }

  // Info: (20260316 - Luphia) Wrapping ETH to get Tokens
  const depositAmount = ethers.parseEther("0.1");
  console.log(`\nWrapping ${ethers.formatEther(depositAmount)} ETH to Tokens...`);
  try {
    const txDeposit = await taskBoard.deposit({ value: depositAmount });
    await txDeposit.wait();
    console.log("✔ Deposit successful.");
  } catch (e: unknown) {
    const err = e as Error;
    console.error("Deposit failed. User might not be whitelisted or verified. Expected on a fresh address without Identity.", err.message);
    // Info: (20260316 - Luphia) If not verified, add whitelist first if caller is the owner.
    // Info: (20260316 - Luphia) Assuming the wallet is the owner of TaskBoard (from deploy script).
    console.log("Attempting to whitelist self...");
    try {
      const txWhitelist = await taskBoard.addWhitelist(wallet.address, wallet.address, 1);
      await txWhitelist.wait();
      console.log("✔ Whitelisted self. Retrying deposit...");
      const txDepositRetry = await taskBoard.deposit({ value: depositAmount });
      await txDepositRetry.wait();
      console.log("✔ Deposit successful on retry.");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Self whitelist/deposit failed:", error.message);
      return;
    }
  }

  const balanceAfterDeposit = await token.balanceOf(wallet.address);
  console.log("Token Balance:", ethers.formatEther(balanceAfterDeposit));

  // Info: (20260316 - Luphia) Creating a Task
  const taskCid = "QmTestTaskCid" + Date.now();
  const rewardAmount = ethers.parseEther("0.05");
  const duration = 3600;

  console.log(`\nCreating Task ${taskCid} with reward ${ethers.formatEther(rewardAmount)} Tokens...`);

  // Info: (20260316 - Luphia) Approve tokens for escrow
  console.log("Approving tokens for TaskBoard...");
  const txApprove = await token.approve(taskBoardAddress, ethers.MaxUint256);
  await txApprove.wait();

  // Info: (20260316 - Luphia) Wait a little bit for the network state to fully propagate
  await new Promise(r => setTimeout(r, 2000));

  const allowance = await token.allowance(wallet.address, taskBoardAddress);
  console.log("Allowance set to:", allowance.toString());

  // Info: (20260316 - Luphia) Create Task
  console.log("Sending createTask tx...");
  const txCreate = await taskBoard.createTask(taskCid, rewardAmount, duration);
  await txCreate.wait();
  console.log("✔ Task created successfully.");

  // Info: (20260316 - Luphia) Submitting Work
  const workCid = "QmTestWorkCid" + Date.now();
  console.log(`\nSubmitting work ${workCid} for Task ${taskCid}...`);
  const txSubmit = await taskBoard.submitWork(taskCid, workCid);
  await txSubmit.wait();
  console.log("✔ Work submitted successfully.");

  // Info: (20260316 - Luphia) Approving Work
  console.log(`\nApproving work for worker ${wallet.address}...`);
  const txApproveWork = await taskBoard.approveWork(taskCid, [wallet.address]);
  await txApproveWork.wait();
  console.log("✔ Work approved.");

  // Info: (20260316 - Luphia) Settling and Distributing Rewards
  console.log("\nSettling task and distributing rewards...");
  const txSettle = await taskBoard.settlement(taskCid);
  await txSettle.wait();

  const finalBalance = await token.balanceOf(wallet.address);
  console.log("✔ Task settled successfully.");
  console.log("Final Token Balance:", ethers.formatEther(finalBalance));

  console.log("\nLive Smart Contract Tests passed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
