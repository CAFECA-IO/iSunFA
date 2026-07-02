"use client";

import { useState, FormEvent } from "react";
import { Dialog } from "@headlessui/react";
import { X, ScanQrCode } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";
import { request, ApiError } from "@/lib/utils/request";
import { TeamRole } from "@/constants/team";

interface IInviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeamId: string;
  onSuccess: () => void;
  showAlert: (message: string, title?: string) => void;
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  selectedTeamId,
  onSuccess,
  showAlert,
}: IInviteMemberModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [inviteAddress, setInviteAddress] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<TeamRole>(TeamRole.VIEWER);
  const [inviting, setInviting] = useState<boolean>(false);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !inviteAddress.trim() || !user?.address) return;
    setInviting(true);
    try {
      const { challenge } = await getLoginOptions(user.address);
      const authentication = await fido2ClientService.startLogin({ challenge });

      const json = await request<{ success: boolean; message?: string }>(
        `/api/v1/user/team/${selectedTeamId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            address: inviteAddress.trim(),
            role: inviteRole,
            authentication,
          }),
        },
      );

      if (json.success) {
        setInviteAddress("");
        onClose();
        onSuccess();
        showAlert(t("teamManagement.alerts.inviteSuccess"));
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        showAlert(err.message);
      } else {
        showAlert(t("teamManagement.alerts.errorInvite"));
      }
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => !inviting && onClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t("teamManagement.inviteMember")}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="size-5 shrink-0" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label
                  htmlFor="invite-address"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t("teamManagement.web3Address")}
                </label>
                <div className="flex w-full items-center gap-2">
                  <input
                    id="invite-address"
                    type="text"
                    required
                    value={inviteAddress}
                    onChange={(e) => setInviteAddress(e.target.value)}
                    disabled={inviting}
                    aria-label={t("teamManagement.web3Address")}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder="0x123..."
                  />
                  <button
                    type="button"
                    className="flex shrink-0 items-center justify-center rounded-lg bg-orange-300 p-2 text-slate-800 transition-colors hover:bg-orange-400"
                  >
                    <ScanQrCode size={24} />
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="invite-role"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t("teamManagement.role")}
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  disabled={inviting}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                >
                  <option value={TeamRole.OWNER}>
                    {t("teamManagement.roles.OWNER")}
                  </option>
                  <option value={TeamRole.ADMIN}>
                    {t("teamManagement.roles.ADMIN")}
                  </option>
                  <option value={TeamRole.EDITOR}>
                    {t("teamManagement.roles.EDITOR")}
                  </option>
                  <option value={TeamRole.VIEWER}>
                    {t("teamManagement.roles.VIEWER")}
                  </option>
                </select>
              </div>
              <div className="mt-2 flex items-start rounded-lg border border-orange-100 bg-orange-50 p-3">
                <div className="text-xs text-orange-800">
                  <span className="mb-1 block font-semibold">
                    {t("teamManagement.fido2Requirement")}
                  </span>
                  {t("teamManagement.fido2RequirementText")}
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={inviting}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                >
                  {t("teamManagement.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteAddress.trim()}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 sm:w-auto"
                >
                  {inviting
                    ? t("teamManagement.signing")
                    : t("teamManagement.inviteViaFido2")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
