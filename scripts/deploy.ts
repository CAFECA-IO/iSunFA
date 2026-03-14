import { ethers } from "ethers";
import * as fs from "fs";
import "dotenv/config";

async function main() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.isuncoin.com";
  const privateKey = process.env.ISUNCOIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing ISUNCOIN_PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying contracts with the account:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Account balance (wei):", balance.toString());

  // Load compiled artifact
  const artifactRaw = fs.readFileSync("./artifacts/contracts/task_board.sol/TaskBoard.json", "utf8");
  const artifact = JSON.parse(artifactRaw);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("Deploying TaskBoard...");
  const taskBoard = await factory.deploy();
  await taskBoard.waitForDeployment();

  const taskBoardAddress = await taskBoard.getAddress();
  console.log("TaskBoard deployed to:", taskBoardAddress);

  console.log("Deployment successful!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
