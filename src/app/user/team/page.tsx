"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { Users, UserCircle2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";

import { useCallback } from "react";

interface ITeam {
  id: string;
  name: string;
}

interface ITeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  user?: {
    id: string;
    address: string;
    name: string | null;
    imageUrl: string | null;
  };
}

interface IPendingInvitation {
  id: string;
  team: { id: string; name: string };
  inviter: { name: string | null; address: string; imageUrl: string | null };
  role: string;
}

export default function TeamManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [teams, setTeams] = useState<ITeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<ITeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<IPendingInvitation[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const [inviteAddress, setInviteAddress] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch("/api/v1/user/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setTeams(json.payload || []);
        if (json.payload?.length > 0 && !selectedTeamId) {
          setSelectedTeamId(json.payload[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  const fetchPendingInvitations = useCallback(async () => {
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch("/api/v1/user/team/invitations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setPendingInvitations(json.payload || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchPendingInvitations();
  }, [fetchTeams, fetchPendingInvitations]);

  const fetchMembers = async (teamId: string) => {
    setMembersLoading(true);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${teamId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setMembers(json.payload || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMembersLoading(false);
    }
  };

  const currentTeam = teams.find((t) => t.id === selectedTeamId);
  const currentUserMember = members.find((m) => m.user?.address === user?.address);
  const isOwnerOrAdmin = currentUserMember?.role === "OWNER" || currentUserMember?.role === "ADMIN";
  const isOwner = currentUserMember?.role === "OWNER";

  const handleUpdateName = async () => {
    if (!selectedTeamId || !tempName.trim() || tempName === currentTeam?.name) {
      setEditingName(false);
      return;
    }

    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${selectedTeamId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: tempName }),
      });
      const json = await res.json();
      if (json.success) {
        setTeams(teams.map((t) => (t.id === selectedTeamId ? { ...t, name: tempName } : t)));
        setEditingName(false);
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error updating team name");
    }
  };

  const handleInvite = async () => {
    if (!selectedTeamId || !inviteAddress.trim() || !user?.address) return;

    setInviting(true);
    try {
      // Info: (20260325 - Tzuhan) 1. Get FIDO2 challenge for current user
      const { challenge } = await getLoginOptions(user.address);

      // Info: (20260325 - Tzuhan) 2. Perform FIDO2 signing
      const authentication = await fido2ClientService.startLogin({ challenge });

      // Info: (20260325 - Tzuhan) 3. Send invitation with signature
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${selectedTeamId}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: inviteAddress.trim(),
          role: "MEMBER",
          authentication
        }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteAddress("");
        alert("Invitation sent successfully!");
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error inviting member");
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!user?.address) return;
    setAcceptingId(inviteId);
    try {
      const { challenge } = await getLoginOptions(user.address);
      const authentication = await fido2ClientService.startLogin({ challenge });

      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/invitations/${inviteId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ authentication }),
      });
      const json = await res.json();
      if (json.success) {
        fetchPendingInvitations();
        fetchTeams();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error accepting invitation");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!selectedTeamId) return;

    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${selectedTeamId}/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMembers(selectedTeamId);
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error changing role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeamId || !confirm("Are you sure you want to remove this member?")) return;

    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${selectedTeamId}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        if (memberId === currentUserMember?.id) {
          // Info: (20260325 - Tzuhan) If self removed, reset selected team
          setSelectedTeamId(null);
          fetchTeams();
        } else {
          fetchMembers(selectedTeamId);
        }
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error removing member");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("sidebar.team") || "Team Management"}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your teams and members here.
          </p>
        </div>
      </div>

      {pendingInvitations.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-orange-900 mb-4">Pending Invitations</h2>
          <div className="space-y-3">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{inv.team.name}</h3>
                    <p className="text-sm text-gray-500">Invited by {inv.inviter.name || "Unknown"} ({inv.role})</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAcceptInvite(inv.id)}
                  disabled={acceptingId === inv.id}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {acceptingId === inv.id ? "Accepting..." : "Accept FIDO2"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Info: (20260325 - Tzuhan) Left sidebar for team selection */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {teams.map((teamData) => (
            <button
              key={teamData.id}
              aria-label={`Select team ${teamData.name}`}
              onClick={() => setSelectedTeamId(teamData.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between group ${selectedTeamId === teamData.id
                ? "bg-orange-50 text-orange-900 ring-1 ring-orange-200"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-transparent shadow-sm"
                }`}
            >
              <div className="flex items-center space-x-3">
                <Users className={`w-5 h-5 ${selectedTeamId === teamData.id ? "text-orange-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                <span className="font-medium truncate">{teamData.name}</span>
              </div>
            </button>
          ))}
          {teams.length === 0 && (
            <div className="text-sm text-gray-500 p-4 text-center border rounded-xl bg-white">
              No teams available.
            </div>
          )}
        </div>

        {/* Info: (20260325 - Tzuhan) Right side for team details */}
        {selectedTeamId && currentTeam && (
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Info: (20260325 - Tzuhan) Team Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              {editingName ? (
                <div className="flex items-center space-x-2 w-full max-w-sm">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-lg font-semibold border-b-2 border-orange-500 focus:outline-none bg-gray-50 rounded-t"
                  />
                  <button aria-label="Save Team Name" onClick={handleUpdateName} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                    <Check className="w-5 h-5" />
                  </button>
                  <button aria-label="Cancel Editing" onClick={() => setEditingName(false)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-gray-900">{currentTeam.name}</h2>
                  {isOwnerOrAdmin && (
                    <button
                      aria-label="Edit Team Name"
                      onClick={() => {
                        setTempName(currentTeam.name);
                        setEditingName(true);
                      }}
                      className="text-gray-400 hover:text-orange-600 p-1 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Info: (20260325 - Tzuhan) Invite Section */}
            {isOwnerOrAdmin && (
              <div className="mb-8 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Invite Member by Web3 Address</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={inviteAddress}
                    onChange={(e) => setInviteAddress(e.target.value)}
                    disabled={inviting}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900 bg-white"
                  />
                  <button
                    aria-label="Invite Member"
                    onClick={handleInvite}
                    disabled={inviting || !inviteAddress}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    {inviting ? "Inviting..." : "Invite"}
                  </button>
                </div>
              </div>
            )}

            {/* Info: (20260325 - Tzuhan) Members List */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Members</h3>
              {membersLoading ? (
                <div className="text-sm text-gray-500">Loading members...</div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white"
                    >
                      <div className="flex items-center space-x-3">
                        {member.user?.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={member.user.imageUrl} alt="Avatar" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <UserCircle2 className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 text-sm">
                              {member.user?.name || "Anonymous"}
                              {member.user?.address === user?.address && <span className="text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded ml-2">You</span>}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 font-mono truncate max-w-[150px] sm:max-w-[200px]">
                            {member.user?.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Info: (20260325 - Tzuhan) Role dropdown / display */}
                        {isOwner && member.user?.address !== user?.address && member.role !== 'OWNER' ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value)}
                            className="text-xs border-gray-200 rounded-md bg-white text-gray-700 py-1 pl-2 pr-6 focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Member</option>
                          </select>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            {member.role}
                          </span>
                        )}

                        {/* Info: (20260325 - Tzuhan) Remove / Leave button */}
                        {(isOwner || member.user?.address === user?.address) && (
                          <button
                            aria-label={member.user?.address === user?.address ? "Leave Team" : "Remove Member"}
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={member.user?.address === user?.address ? "Leave Team" : "Remove Member"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
