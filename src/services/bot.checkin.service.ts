import { ApiCode } from "@/lib/utils/status";
export class CheckinBotService {
  public async claimReward(dewt: string, apiUrl: string): Promise<unknown> {
    console.log(`\n[Bot:Checkin] Claiming daily check-in reward...`);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const res = await fetch(`${apiUrl}/api/v1/auth/checkin`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${dewt}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error(
        `[Bot:Checkin] Non-JSON response (status ${res.status}): ${text.substring(0, 200)}`,
      );
      throw new Error(`Check-in failed with non-JSON response`);
    }

    if (res.ok && (data.code === ApiCode.SUCCESS || data.success)) {
      console.log(
        `[Bot:Checkin] Success! Checkin Result:`,
        data.payload || data,
      );
      return data.payload || data;
    } else {
      console.error(
        `[Bot:Checkin] Check-in failed: ${data.message || JSON.stringify(data)}`,
      );
      throw new Error(
        `Check-in failed: ${data.message || JSON.stringify(data)}`,
      );
    }
  }
}

export const checkinBotService = new CheckinBotService();
