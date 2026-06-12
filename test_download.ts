import { POST } from "./src/app/api/v1/digital_product_passport_simulator/download/route";

async function test() {
  const req = new Request(
    "http://localhost/api/v1/digital_product_passport_simulator/download",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockId: "8349",
        year: "2025",
        skuId: "P-EV-BN-002",
      }),
    },
  );

  try {
    const res = await POST(req);
    console.log("Status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.log("Error body:", text);
    } else {
      console.log("Success! Got a blob of size", (await res.blob()).size);
    }
  } catch (e) {
    console.error("Crash:", e);
  }
}

test();
