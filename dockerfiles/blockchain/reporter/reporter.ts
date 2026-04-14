import si from "systeminformation";
import * as http from "http";
import * as https from "https";

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
    const flopsVal = 0;

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
