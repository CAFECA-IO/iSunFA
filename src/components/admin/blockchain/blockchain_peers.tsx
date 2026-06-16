"use client";

import { useState, FormEvent } from "react";
import { Server, Plus, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { type IBlockchainDashboardData } from "@/services/admin.blockchain.service";

const CRITICAL_NODES = [
  {
    id: "4187d61fd4ea7423dabf26b746844f6dfabfb7f295a2dc4ff4570765aba29f77b88774aac15811cbc46dc4e5e3b512e8d82b2a1f8b26ec73f372d385c9f847fa",
    name: "Critical Peer (.146)",
    enode:
      "enode://4187d61fd4ea7423dabf26b746844f6dfabfb7f295a2dc4ff4570765aba29f77b88774aac15811cbc46dc4e5e3b512e8d82b2a1f8b26ec73f372d385c9f847fa@211.22.118.146:30303",
  },
  {
    id: "346b3bd08e94fede9da36e976b781e2d9bb7b9cdd4bc254f5373e32176af3c9d17ca2b82b9c5a3807b39c8fe0641a68ade895b2099374699fdb9f37251e03078",
    name: "Critical Peer (.147)",
    enode:
      "enode://346b3bd08e94fede9da36e976b781e2d9bb7b9cdd4bc254f5373e32176af3c9d17ca2b82b9c5a3807b39c8fe0641a68ade895b2099374699fdb9f37251e03078@211.22.118.147:30303",
  },
  {
    id: "35e060c329bb27e41aea566918b30ca655619feba5200a605be8bae1ea183a845adc2f71350398096da3b2c4a8548ac7749cae799db1a405a62d75d7380fb64d",
    name: "Critical Peer (.148)",
    enode:
      "enode://35e060c329bb27e41aea566918b30ca655619feba5200a605be8bae1ea183a845adc2f71350398096da3b2c4a8548ac7749cae799db1a405a62d75d7380fb64d@211.22.118.148:30303",
  },
  {
    id: "9bf20bea0a1f0f11eb808234807fbd738a76eb47f61e6d0d27a346910462396c1adc5095fd1828120cd50fe6574a893ccc4814a1d98fd5abed1273b902b91996",
    name: "Critical Peer (.150)",
    enode:
      "enode://9bf20bea0a1f0f11eb808234807fbd738a76eb47f61e6d0d27a346910462396c1adc5095fd1828120cd50fe6574a893ccc4814a1d98fd5abed1273b902b91996@211.22.118.150:30303",
  },
];

interface IBlockchainPeersProps {
  data: IBlockchainDashboardData | null;
  mutate: () => Promise<void>;
  setToastMessage: (
    msg: { type: "success" | "error"; text: string } | null,
  ) => void;
}

export default function BlockchainPeers({
  data,
  mutate,
  setToastMessage,
}: IBlockchainPeersProps) {
  const { t } = useTranslation();
  const [enodeUrl, setEnodeUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [connectingPeers, setConnectingPeers] = useState<
    Record<string, boolean>
  >({});

  const handleAddPeer = async (e: FormEvent) => {
    e.preventDefault();
    if (!enodeUrl) return;

    setIsAdding(true);
    try {
      const res = await request<{
        success: boolean;
        payload?: { message?: string };
      }>("/api/v1/admin/blockchain/peers", {
        method: "POST",
        body: JSON.stringify({ enodeUrl }),
      });

      if (res.success) {
        setEnodeUrl("");
        setToastMessage({
          type: "success",
          text: t("admin_blockchain.page.peer_added_success"),
        });
        await mutate();
      }
    } catch (err: unknown) {
      setToastMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to add peer",
      });
    } finally {
      setIsAdding(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleReconnect = async (targetEnodeUrl: string, id: string) => {
    setConnectingPeers((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await request<{
        success: boolean;
        payload?: { message?: string };
      }>("/api/v1/admin/blockchain/peers", {
        method: "POST",
        body: JSON.stringify({ enodeUrl: targetEnodeUrl }),
      });

      if (res.success) {
        setToastMessage({
          type: "success",
          text: t("admin_blockchain.page.peer_added_success"),
        });
        await mutate();
      }
    } catch (err: unknown) {
      setToastMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to add peer",
      });
    } finally {
      setConnectingPeers((prev) => ({ ...prev, [id]: false }));
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const pubkeyFromEnode = (enodeStr: string) => {
    if (!enodeStr) return "";
    const match = enodeStr.match(/^enode:\/\/([a-fA-F0-9]+)@/);
    return match ? match[1].toLowerCase() : "";
  };

  const peers = data?.peers || [];

  const displayPeers = CRITICAL_NODES.map((cn) => {
    const cnPubkey = pubkeyFromEnode(cn.enode);
    const connectedPeer = peers.find(
      (p) => p.enode && pubkeyFromEnode(p.enode) === cnPubkey,
    );
    return {
      id: connectedPeer?.id || cn.id,
      name: connectedPeer?.name || cn.name,
      enode: cn.enode,
      isConnected: !!connectedPeer,
      remoteAddress: connectedPeer?.network?.remoteAddress || "",
      isCritical: true,
    };
  });

  peers.forEach((p) => {
    const pPubkey = pubkeyFromEnode(p.enode);
    const isCriticalNode = CRITICAL_NODES.some(
      (cn) => pubkeyFromEnode(cn.enode) === pPubkey,
    );
    if (!isCriticalNode) {
      displayPeers.push({
        id: p.id,
        name: p.name || "Unknown",
        enode: p.enode,
        isConnected: true,
        remoteAddress: p.network?.remoteAddress || "",
        isCritical: false,
      });
    }
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Server className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {t("admin_blockchain.page.connected_peers")}
          </h2>
          <p className="text-sm text-gray-500">
            {t("admin_blockchain.page.manage_p2p_network")}
          </p>
        </div>
      </div>

      <form onSubmit={handleAddPeer} className="mb-6 flex gap-3">
        <input
          type="text"
          value={enodeUrl}
          onChange={(e) => setEnodeUrl(e.target.value)}
          placeholder="enode://..."
          aria-label={t("admin_blockchain.page.add_peer")}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!enodeUrl || isAdding}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("admin_blockchain.page.add_peer")}
        </button>
      </form>

      <div className="space-y-3">
        {displayPeers.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
            {t("admin_blockchain.page.no_peers")}
          </div>
        ) : (
          displayPeers.map((peer, i) => (
            <div
              key={i}
              className={`flex flex-col gap-2 rounded-lg border p-4 text-sm ${peer.isCritical ? "border-blue-100 bg-blue-50/30" : "border-gray-100 bg-gray-50"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {peer.name}
                  </span>
                  {peer.isCritical && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                      CRITICAL
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {peer.isConnected ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {peer.remoteAddress || "Connected"}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Disconnected
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReconnect(peer.enode, peer.id)}
                        disabled={connectingPeers[peer.id]}
                        className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                      >
                        {connectingPeers[peer.id] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        Connect
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="truncate text-xs text-gray-500">
                <span className="font-medium">Enode: </span>
                {peer.enode}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
