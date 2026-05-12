import si from "systeminformation";
import * as http from "http";
import * as https from "https";
import * as os from "os";

let cachedFlops = 0;

function measureFlops(): number {
  if (cachedFlops > 0) return cachedFlops;

  const iterations = 50000000;
  let a = 1.5;
  let c = 0.0;

  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    c = c + a * 1.000001;
    a = a * 0.999999;
  }
  const end = process.hrtime.bigint();

  // Info: (20260512 - Luphia) Prevent engine from optimizing away the loop
  if (c === 0) console.log("prevent optimization:", c);

  const durationInSeconds = Number(end - start) / 1e9;
  // Info: (20260512 - Luphia) 2 operations per iteration (multiplication + addition)
  const flopsPerCore = (iterations * 2) / durationInSeconds;
  const totalCores = os.cpus().length;

  cachedFlops = flopsPerCore * totalCores;
  return cachedFlops;
}

async function getIsuncoinNodeInfo() {
  return new Promise((resolve) => {
    const req = http.request(
      "http://127.0.0.1:20024",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const result = JSON.parse(data);
            if (result && result.result) {
              resolve({
                enode: result.result.enode,
                networkId:
                  result.result.protocols?.eth?.network ||
                  result.result.protocols?.isuncoin?.network ||
                  8017,
                client: result.result.name,
              });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      },
    );

    req.on("error", (err) => {
      console.error("[Node Reporting] Wait for isuncoin RPC...", err.message);
      resolve(null);
    });

    req.write(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "admin_nodeInfo",
        params: [],
        id: 1,
      }),
    );
    req.end();
  });
}

const collectAndReportNodeStats = async () => {
  try {
    const nodeInfo = await getIsuncoinNodeInfo();

    if (!nodeInfo) {
      console.log(
        "[Node Reporting] Node info not available (RPC not ready?), skipping report.",
      );
      return;
    }

    // Info: (20260412 - Luphia) Keep flops at 0 or extract if cached
    const flopsVal = measureFlops();

    const mem = await si.mem();
    const fsData = await si.fsSize();

    const totalStorageTb =
      fsData.reduce((acc, drive) => acc + drive.size, 0) /
      (1024 * 1024 * 1024 * 1024);
    const totalRamGb = mem.total / (1024 * 1024 * 1024);

    const payload = {
      nodeInfo: {
        enode: nodeInfo.enode,
        networkId: nodeInfo.networkId,
        client: nodeInfo.client,
      },
      resources: {
        flops: parseFloat(flopsVal.toFixed(2)),
        storage: parseFloat(totalStorageTb.toFixed(2)),
        ram: Math.round(totalRamGb),
      },
    };

    console.log("[Node Reporting] Sending report:", JSON.stringify(payload));

    const targets = [
      "https://isuncloud.com/api/v1/nodes",
      "https://sinobee.ai/api/v1/nodes",
    ];

    for (const target of targets) {
      try {
        console.log(
          `[Node Reporting] Sending POST request to ${target} with payload:`,
          JSON.stringify(payload),
        );
        const req = https.request(
          target,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(JSON.stringify(payload)),
            },
          },
          (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(
                `[Node Reporting] Report sent successfully to ${target}.`,
              );
            } else {
              console.error(
                `[Node Reporting] Failed to send report to ${target}: ${res.statusCode} ${res.statusMessage}`,
              );
            }
          },
        );

        req.on("error", (err) => {
          console.error(
            `[Node Reporting] Network error sending to ${target}:`,
            err.message,
          );
        });

        req.write(JSON.stringify(payload));
        req.end();
      } catch (err) {
        console.error(
          `[Node Reporting] Network error sending to ${target}:`,
          err.message,
        );
      }
    }
  } catch (error) {
    console.error("[Node Reporting] Error during reporting:", error);
  }
};

console.log("[Node Reporting] Service started.");

// Info: (20260412 - Luphia) Initial wait for node to boot
setTimeout(() => {
  collectAndReportNodeStats();
  // Info: (20260412 - Luphia) Run every 10 minutes
  setInterval(collectAndReportNodeStats, 600 * 1000);
}, 30000);
