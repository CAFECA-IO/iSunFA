"use client";

import { useEffect, useState, useCallback } from "react";
import { Ticket, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import CouponDetailModal from "@/components/user/coupon/coupon_detail_modal";
import CouponCard from "@/components/user/coupon/coupon_card";
import { COUPON_STATUS } from "@/constants/status";
import { useAuth } from "@/contexts/auth_context";
import LoginButton from "@/components/common/login_button";

interface ICouponCampaign {
  id: string;
  title: string;
  metadataHash: string;
  claimCode: string | null;
  redemptionDeadline: string;
  usageDeadline: string;
  maxClaims: number;
  claimsCount: number;
  isTransferable: boolean;
  customQrContent: string | null;
}

export interface ICoupon {
  id: string;
  userId: string;
  campaignId: string;
  txHashClaim: string;
  txHashBurn: string | null;
  customQrContent: string | null;
  status: (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];
  createdAt: string;
  updatedAt: string;
  campaign: ICouponCampaign;
}

export default function UserCouponPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<ICoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimCode, setClaimCode] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [selectedCoupon, setSelectedCoupon] = useState<ICoupon | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{
        success: boolean;
        payload: ICoupon[];
      }>("/api/v1/user/coupon");
      if (res.success && res.payload) {
        setCoupons(res.payload);
      }
    } catch (e) {
      console.error("Failed to fetch coupons", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCoupons();
    }
  }, [fetchCoupons, user]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCode.trim()) return;

    setIsClaiming(true);
    setClaimMessage(null);

    try {
      const res = await request<{
        success: boolean;
        payload: ICoupon;
      }>("/api/v1/user/coupon/claim", {
        method: "POST",
        body: JSON.stringify({ claimCode: claimCode.trim() }),
      });

      if (res.success) {
        setClaimMessage({
          type: "success",
          text: t("user_coupon.claim_success"),
        });
        setClaimCode("");
        fetchCoupons();
      } else {
        setClaimMessage({ type: "error", text: t("user_coupon.claim_failed") });
      }
    } catch (e: unknown) {
      console.error("Failed to claim coupon", e);
      if (e instanceof Error) {
        setClaimMessage({
          type: "error",
          text: e.message || t("user_coupon.claim_failed"),
        });
      } else {
        setClaimMessage({ type: "error", text: t("user_coupon.claim_failed") });
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const openCouponDetail = (coupon: ICoupon) => {
    setSelectedCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: newStatus as ICoupon["status"],
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    );
    if (selectedCoupon && selectedCoupon.id === id) {
      setSelectedCoupon({
        ...selectedCoupon,
        status: newStatus as ICoupon["status"],
        updatedAt: new Date().toISOString(),
      });
    }
  };

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 p-4 py-24">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-orange-500">
          <Ticket size={40} />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          {t("user_coupon.title")}
        </h2>
        <p className="mb-8 max-w-md text-center text-gray-500">
          {t("common.please_login")}
        </p>
        <LoginButton />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("user_coupon.title")}
            </h1>
            <p className="text-sm text-gray-500">{t("user_coupon.subtitle")}</p>
          </div>
        </div>

        {/* Info: (20260517 - Luphia) Claim Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form
            onSubmit={handleClaim}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="claimCode"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                {t("user_coupon.claim_placeholder")}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="claimCode"
                  aria-label={t("user_coupon.claim_placeholder")}
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-10 text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:text-sm"
                  placeholder="e.g., SUMMER2026"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isClaiming || !claimCode.trim()}
              className="flex items-center justify-center rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50 sm:w-auto"
            >
              {isClaiming ? t("common.processing") : t("user_coupon.claim")}
            </button>
          </form>

          {claimMessage && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
                claimMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {claimMessage.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {claimMessage.text}
            </div>
          )}
        </div>

        {/* Info: (20260517 - Luphia) Coupon Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-12 text-center text-gray-500">
              {t("common.loading")}
            </div>
          ) : coupons.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
              <Ticket className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">{t("user_coupon.no_coupons")}</p>
            </div>
          ) : (
            coupons.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                onClick={openCouponDetail}
              />
            ))
          )}
        </div>
      </div>

      {selectedCoupon && (
        <CouponDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          coupon={selectedCoupon}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
