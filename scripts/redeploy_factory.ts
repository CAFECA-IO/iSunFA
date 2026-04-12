import { config } from "dotenv";
import * as dotenvExpand from "dotenv-expand";
import { createWalletClient, http, publicActions } from "viem";
import { iSunCoin } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

dotenvExpand.expand(config({ path: ".env.setup" }));

async function main() {
    console.log("Compiling contracts with Hardhat...");
    execSync("npx hardhat compile", { stdio: "inherit" });

    const adminPath = path.join(process.cwd(), ".env.admin");
    if (!fs.existsSync(adminPath)) throw new Error("Missing .env.admin");
    const adminJson = JSON.parse(fs.readFileSync(adminPath, "utf-8"));
    const account = privateKeyToAccount(`0x${adminJson.privateKey}`);

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
    const client = createWalletClient({
        chain: iSunCoin,
        account,
        transport: http(rpcUrl)
    }).extend(publicActions);

    console.log("Account:", account.address);
    console.log("Balance:", await client.getBalance({ address: account.address }));

    const artifactPath = path.join(process.cwd(), "artifacts", "contracts", "fido2_account_factory.sol", "Fido2AccountFactory.json");
    const FACTORY_ARTIFACT = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

    const entryPoint = process.env.NEXT_PUBLIC_ENTRY_POINT_ADDRESS;
    if (!entryPoint) throw new Error("Missing ENTRY_POINT");

    console.log("Deploying Fido2AccountFactory...");
    const hash = await client.deployContract({
        abi: FACTORY_ARTIFACT.abi,
        bytecode: FACTORY_ARTIFACT.bytecode as `0x${string}`,
        args: [entryPoint]
    });

    console.log("Tx:", hash);
    const receipt = await client.waitForTransactionReceipt({ hash });

    console.log("-> Deployed Factory at:", receipt.contractAddress);

    // Info: (20260413 - Luphia) Update .env.setup
    const envSetupPath = path.join(process.cwd(), ".env.setup");
    let content = fs.readFileSync(envSetupPath, "utf-8");
    content = content.replace(/^NEXT_PUBLIC_SCW_FACTORY_ADDRESS=.*$/m, `NEXT_PUBLIC_SCW_FACTORY_ADDRESS="${receipt.contractAddress}"`);
    fs.writeFileSync(envSetupPath, content);
    console.log("Updated .env.setup");
}
main().catch(console.error);
