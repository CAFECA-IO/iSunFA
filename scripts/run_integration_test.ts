import "dotenv/config";
import crypto from "crypto";
import { registerBotService } from "@/services/bot.register.service";
import { checkinBotService } from "@/services/bot.checkin.service";
import { uploadBotService } from "@/services/bot.upload.service";
import { reportBotService } from "@/services/bot.report.service";
import { analysisBotService } from "@/services/bot.analysis.service";

async function main() {
  console.log("=== Integration Test Execution Started ===");

  const seed = crypto.randomBytes(32).toString("hex");
  const username = `Bot_${seed.substring(0, 6)}`;

  console.log(`[1] Generated random bot: ${username}`);
  console.log(`    Seed: ${seed}`);

  // Info: (20260430 - Luphia) 1. Register and Login
  console.log(`\n[2] Registering and logging in via registerBotService...`);
  const { dewt, scwAddress, privKeyHex, credentialID, pubKeyX, pubKeyY } =
    await registerBotService.registerAndLogin(seed, username);

  console.log(`    Bot SCW Address: ${scwAddress}`);
  console.log(`    Bot Private Key: ${privKeyHex.substring(0, 10)}...`);
  console.log(`    DeWT Token: ${dewt.substring(0, 20)}...`);

  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Info: (20260430 - Luphia) 2. Claim Check-in Reward
  await checkinBotService.claimReward(dewt, apiUrl);

  // Info: (20260430 - Luphia) 3. Upload Voucher (Creates Team, AccountBook, and Voucher)
  const accountBookId = await uploadBotService.uploadVoucher(
    dewt,
    apiUrl,
    scwAddress,
    privKeyHex,
    credentialID,
    pubKeyX,
    pubKeyY,
  );

  // Info: (20260430 - Luphia) 4. Generate Reports
  await reportBotService.generateReport(dewt, apiUrl, accountBookId);

  // Info: (20260430 - Luphia) 5. Ask AI Consultant (Payment flow for analysis)
  await analysisBotService.generateAnalysis(
    dewt,
    apiUrl,
    scwAddress,
    privKeyHex,
    credentialID,
    pubKeyX,
    pubKeyY,
    accountBookId,
  );

  console.log("\n=== Integration Test Execution Finished ===");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
