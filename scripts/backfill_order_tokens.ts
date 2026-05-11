import { orderBackfillService } from "@/services/order.backfill.service";

async function main() {
  await orderBackfillService.syncTokensFromBlockchain();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
