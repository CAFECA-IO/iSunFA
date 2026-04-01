"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { Users, UserCircle2, Plus, Pencil, Trash2, Check, X, Book } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";
import ConfirmModal from "@/components/common/confirm_modal";

interface IAccountBook { id: string; name: string; country: string; currency: string; rule: string; }
interface ITeam { id: string; name: string; accountBooks?: IAccountBook[]; }
interface ITeamMember { id: string; teamId: string; userId: string; role: string; user?: { address: string; name: string | null; imageUrl: string | null; }; }
interface IPendingInvitation { id: string; team: { id: string; name: string }; inviter: { name: string | null; address: string; imageUrl: string | null }; role: string; inviteeAddress?: string; }

export default function TeamManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<ITeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<IPendingInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<IPendingInvitation[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteAddress, setInviteAddress] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [inviting, setInviting] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: ""
  });

  const showAlert = (message: string, title = t("common.notification") || "Notification") => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      isConfirm: false
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = t("common.confirm") || "Confirm") => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      isConfirm: true,
      onConfirm
    });
  };

  const fetchTeams = useCallback(async () => {
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch("/api/v1/user/team", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setTeams(json.payload || []);
        if (json.payload?.length > 0 && !selectedTeamId) setSelectedTeamId(json.payload[0].id);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [selectedTeamId]);

  const fetchPendingInvitations = useCallback(async () => {
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch("/api/v1/user/team/invitations", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setPendingInvitations(json.payload || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchSentInvitations = useCallback(async (teamId: string) => {
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${teamId}/invitations`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setSentInvitations(json.payload || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchPendingInvitations();
  }, [fetchTeams, fetchPendingInvitations]);

  const fetchMembers = useCallback(async (teamId: string) => {
    setMembersLoading(true);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${teamId}/members`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setMembers(json.payload || []);
      await fetchSentInvitations(teamId);
    } catch { console.error("Error fetching members"); } finally { setMembersLoading(false); }
  }, [fetchSentInvitations]);

  useEffect(() => {
    if (selectedTeamId) fetchMembers(selectedTeamId);
  }, [selectedTeamId, fetchMembers]);

  const currentTeam = teams.find((t) => t.id === selectedTeamId);
  const currentUserMember = members.find((m) => m.user?.address === user?.address);
  const isOwnerOrAdmin = currentUserMember?.role === "OWNER" || currentUserMember?.role === "ADMIN";
  const isOwner = currentUserMember?.role === "OWNER";

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch("/api/v1/user/team", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newTeamName })
      });
      const json = await res.json();
      if (json.success) {
        setNewTeamName(""); setIsCreateModalOpen(false); fetchTeams(); setSelectedTeamId(json.payload.id);
        showAlert(t("teamManagement.alerts.createSuccess") || "Team created successfully!");
      } else showAlert(json.message);
    } catch { showAlert(t("teamManagement.alerts.errorCreate") || "Error creating team"); } finally { setCreating(false); }
  };

  const handleUpdateName = async () => {
    if (!selectedTeamId || !tempName.trim() || tempName === currentTeam?.name) return setEditingName(false);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${selectedTeamId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: tempName }),
      });
      const json = await res.json();
      if (json.success) {
        setTeams(teams.map((t) => (t.id === selectedTeamId ? { ...t, name: tempName } : t)));
        setEditingName(false);
        showAlert(t("teamManagement.alerts.updateSuccess") || "Team name updated successfully!");
      } else showAlert(json.message);
    } catch { showAlert(t("teamManagement.alerts.errorUpdate") || "Error updating team name"); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !inviteAddress.trim() || !user?.address) return;
    setInviting(true);
    try {
      const { challenge } = await getLoginOptions(user.address);
      const authentication = await fido2ClientService.startLogin({ challenge });
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${selectedTeamId}/invitations`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address: inviteAddress.trim(), role: inviteRole, authentication }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteAddress("");
        setIsInviteModalOpen(false);
        fetchSentInvitations(selectedTeamId);
        showAlert(t("teamManagement.alerts.inviteSuccess") || "Invitation sent successfully!");
      }
      else showAlert(json.message);
    } catch { showAlert(t("teamManagement.alerts.errorInvite") || "Error inviting member"); } finally { setInviting(false); }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!user?.address) return;
    setAcceptingId(inviteId);
    try {
      const { challenge } = await getLoginOptions(user.address);
      const authentication = await fido2ClientService.startLogin({ challenge });
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/invitations/${inviteId}/accept`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ authentication }),
      });
      const json = await res.json();
      if (json.success) {
        fetchPendingInvitations();
        fetchTeams();
        showAlert(t("teamManagement.alerts.acceptSuccess") || "Invitation accepted successfully!");
      } else showAlert(json.message);
    } catch { showAlert(t("teamManagement.alerts.errorAccept") || "Error accepting invitation"); } finally { setAcceptingId(null); }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!selectedTeamId) return;
    try {
      if (!user?.address) return;
      const { challenge } = await getLoginOptions(user.address);
      const authentication = await fido2ClientService.startLogin({ challenge });
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${selectedTeamId}/members/${memberId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole, authentication }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMembers(selectedTeamId);
        showAlert(t("teamManagement.alerts.roleSuccess") || "Role updated successfully!");
      } else showAlert(json.message);
    } catch { showAlert(t("teamManagement.alerts.errorRole") || "Error changing role"); }
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedTeamId) return;
    showConfirm(
      t("teamManagement.confirmRemoveLabel") || "Are you sure you want to remove this member?",
      async () => {
        try {
          if (!user?.address) return;
          const { challenge } = await getLoginOptions(user.address);
          const authentication = await fido2ClientService.startLogin({ challenge });
          const token = localStorage.getItem("dewt");
          const res = await fetch(`/api/v1/user/team/${selectedTeamId}/members/${memberId}`, {
            method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ authentication })
          });
          const json = await res.json();
          if (json.success) {
            showAlert(t("teamManagement.alerts.removeSuccess") || "Member removed successfully!");
            if (memberId === currentUserMember?.id) { setSelectedTeamId(null); fetchTeams(); } else fetchMembers(selectedTeamId);
          } else showAlert(json.message);
        } catch { showAlert(t("teamManagement.alerts.errorRemove") || "Error removing member"); }
      }
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t("teamManagement.title") || t("sidebar.team") || "Team Management"}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("teamManagement.description") || "Manage your teams and members here."}</p>
          </div>
          <button onClick={() => setIsCreateModalOpen(true)} className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4 mr-2" />
            {t("teamManagement.createTeam") || "Create Team"}
          </button>
        </div>

        {pendingInvitations.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-orange-900 mb-4">{t("teamManagement.pendingInvitations") || "Pending Invitations"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 flex flex-col justify-between">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg"><Users className="w-5 h-5 text-orange-600" /></div>
                    <div>
                      <h3 className="font-medium text-gray-900">{inv.team.name}</h3>
                      <p className="text-xs text-gray-500">From {inv.inviter.name || "Unknown"} as {t("teamManagement.roles." + inv.role) || inv.role}</p>
                    </div>
                  </div>
                  <button onClick={() => handleAcceptInvite(inv.id)} disabled={acceptingId === inv.id} className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50">
                    {acceptingId === inv.id ? (t("teamManagement.accepting") || "Accepting...") : (t("teamManagement.acceptViaFido2") || "Accept via FIDO2")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 shrink-0 space-y-2">
            {teams.map((teamData) => (
              <button key={teamData.id} onClick={() => setSelectedTeamId(teamData.id)} className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center space-x-3 group ${selectedTeamId === teamData.id ? "bg-orange-50 text-orange-900 ring-1 ring-orange-200" : "bg-white text-gray-700 hover:bg-gray-50 border border-transparent shadow-sm"}`}>
                <Users className={`w-5 h-5 ${selectedTeamId === teamData.id ? "text-orange-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                <span className="font-medium truncate">{teamData.name}</span>
              </button>
            ))}
            {teams.length === 0 && <div className="text-sm text-gray-500 p-4 text-center border rounded-xl bg-white shadow-sm">{t("teamManagement.noTeams") || "No teams available."}</div>}
          </div>

          {selectedTeamId && currentTeam && (
            <div className="flex-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 mb-6 gap-4">
                  {editingName ? (
                    <div className="flex items-center space-x-2 w-full max-w-sm">
                      <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} aria-label={t("teamManagement.teamName") || "Team Name"} className="flex-1 w-full px-3 py-1.5 text-lg font-semibold text-gray-900 border-b-2 border-orange-500 focus:outline-none bg-gray-50 rounded-t" />
                      <button onClick={handleUpdateName} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-5 h-5" /></button>
                      <button onClick={() => setEditingName(false)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><X className="w-5 h-5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <h2 className="text-xl font-semibold text-gray-900">{currentTeam.name}</h2>
                      {isOwnerOrAdmin && <button onClick={() => { setTempName(currentTeam.name); setEditingName(true); }} className="text-gray-400 hover:text-orange-600 p-1 transition-colors"><Pencil className="w-4 h-4" /></button>}
                    </div>
                  )}
                  {isOwnerOrAdmin && (
                    <button onClick={() => setIsInviteModalOpen(true)} className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium border border-orange-200">
                      <Plus className="w-4 h-4 mr-2" /> {t("teamManagement.inviteMember") || "Invite Member"}
                    </button>
                  )}
                </div>

                {membersLoading ? <div className="text-sm text-gray-500">Loading members...</div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {members.map((member) => (
                      <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-orange-500 transition-all group relative block">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-50 transition-colors">
                              <UserCircle2 className="h-6 w-6 text-gray-400 text-orange-500" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                                {member.user?.name || "Anonymous"}
                                {member.user?.address === user?.address && <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded ml-2">{t("teamManagement.you") || "You"}</span>}
                              </h3>
                              <p className="text-xs text-gray-500 font-mono mt-1 break-all w-32 truncate">{member.user?.address}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            {isOwner && member.user?.address !== user?.address && member.role !== "OWNER" ? (
                              <select aria-label="Role" value={member.role} onChange={(e) => handleChangeRole(member.id, e.target.value)} className="text-xs border-gray-200 rounded-md bg-white text-gray-700 py-1 px-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm">
                                <option value="ADMIN">{t("teamManagement.roles.ADMIN") || "Admin"}</option>
                                <option value="EDITOR">{t("teamManagement.roles.EDITOR") || "Editor"}</option>
                                <option value="VIEWER">{t("teamManagement.roles.VIEWER") || "Viewer"}</option>
                              </select>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t("teamManagement.roles." + member.role) || member.role}</span>
                            )}
                            {(isOwner || member.user?.address === user?.address) && (
                              <button onClick={() => handleRemoveMember(member.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Remove Member"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {sentInvitations.map((inv) => (
                      <div key={inv.id} className="bg-orange-50/50 rounded-xl border border-dashed border-orange-200 p-4 opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white rounded-lg"><UserCircle2 className="h-6 w-6 text-gray-300" /></div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">{t("teamManagement.pendingInvite") || "Pending Invite"}</h3>
                              <p className="text-xs text-gray-400 font-mono mt-1 break-all w-32 truncate">{inv.inviteeAddress}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">{t("teamManagement.pending")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentTeam.accountBooks && currentTeam.accountBooks.length > 0 && (
                  <div className="mt-8 border-t border-gray-100 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t("teamManagement.accountBooks") || "Account Books (Companies)"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                      {currentTeam.accountBooks.map((ab: IAccountBook) => (
                        <div key={ab.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-orange-500 transition-all flex items-start space-x-3 group">
                          <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                            <Book className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">{ab.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{ab.country} • {ab.currency} • {ab.rule}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCreateModalOpen} onClose={() => !creating && setIsCreateModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">{t("teamManagement.createNewTeam") || "Create New Team"}</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1">{t("teamManagement.teamName") || "Team Name"}</label>
                  <input id="team-name" type="text" required value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} disabled={creating} aria-label={t("teamManagement.teamName") || "Team Name"} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900 bg-white" placeholder={t("teamManagement.enterTeamName") || "Enter team name"} />
                </div>
                <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={creating} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg text-center">{t("teamManagement.cancel") || "Cancel"}</button>
                  <button type="submit" disabled={creating || !newTeamName.trim()} className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50 text-center">{creating ? (t("teamManagement.creating") || "Creating...") : (t("teamManagement.createTeam") || "Create Team")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog open={isInviteModalOpen} onClose={() => !inviting && setIsInviteModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">{t("teamManagement.inviteMember") || "Invite Member"}</h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label htmlFor="invite-address" className="block text-sm font-medium text-gray-700 mb-1">{t("teamManagement.web3Address") || "Web3 Address"}</label>
                  <input id="invite-address" type="text" required value={inviteAddress} onChange={(e) => setInviteAddress(e.target.value)} disabled={inviting} aria-label={t("teamManagement.web3Address") || "Web3 Address"} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900 bg-white" placeholder="0x123..." />
                </div>
                <div>
                  <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">{t("teamManagement.role") || "Role"}</label>
                  <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} disabled={inviting} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900 bg-white">
                    <option value="OWNER">{t("teamManagement.roles.OWNER") || "Owner"}</option>
                    <option value="ADMIN">{t("teamManagement.roles.ADMIN") || "Admin"}</option>
                    <option value="EDITOR">{t("teamManagement.roles.EDITOR") || "Editor"}</option>
                    <option value="VIEWER">{t("teamManagement.roles.VIEWER") || "Viewer"}</option>
                  </select>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-start mt-2">
                  <div className="text-xs text-orange-800"><span className="font-semibold block mb-1">{t("teamManagement.fido2Requirement") || "FIDO2 Requirement:"}</span>{t("teamManagement.fido2RequirementText") || "You will be asked to authenticate via Passkey to sign this transaction on-chain."}</div>
                </div>
                <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <button type="button" onClick={() => setIsInviteModalOpen(false)} disabled={inviting} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg text-center">{t("teamManagement.cancel") || "Cancel"}</button>
                  <button type="submit" disabled={inviting || !inviteAddress.trim()} className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50 text-center">{inviting ? (t("teamManagement.signing") || "Signing...") : (t("teamManagement.inviteViaFido2") || "Invite via FIDO2")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Dialog>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.isConfirm ? t('common.confirm') || 'Confirm' : t('common.ok') || 'OK'}
        cancelText={confirmModal.isConfirm ? t('common.cancel') || 'Cancel' : undefined}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
