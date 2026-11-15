import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, Check, X, Key, Trash2,
  AlertTriangle, Mail, Phone, Heart, CheckCircle2
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const CareNetworkPage: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [activePermModal, setActivePermModal] = useState<any | null>(null);

  // Invite Form
  const [inviteForm, setInviteForm] = useState({
    invited_email: '',
    invited_role: 'caretaker',
    relationship_label: 'Visiting Nurse',
    permissions: {
      can_view_medications: true,
      can_confirm_medications: true,
      can_manage_schedules: false,
      can_view_appointments: true,
      can_schedule_appointments: false,
      can_view_health_records: true,
      can_view_analytics: true,
      can_receive_escalations: true,
      can_write_handover_logs: true
    }
  });

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinSuccessMsg, setJoinSuccessMsg] = useState('');

  const fetchMembers = async () => {
    try {
      const data = await api.careNetwork.members();
      setMembers(data);
    } catch (err) {
      console.error("Error fetching network members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.careNetwork.invite(inviteForm);
      setGeneratedCode(res.invite_code);
      fetchMembers();
    } catch (err) {
      console.error("Error sending invite:", err);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.careNetwork.acceptInvite(joinCode);
      setJoinSuccessMsg(res.message);
      setJoinCode('');
      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Failed to accept invite");
    }
  };

  const handleRevoke = async (networkId: string) => {
    if (!confirm("Are you sure you want to revoke access for this care team member?")) return;
    try {
      await api.careNetwork.revoke(networkId);
      fetchMembers();
    } catch (err) {
      console.error("Error revoking member:", err);
    }
  };

  const handleSavePermissions = async () => {
    if (!activePermModal) return;
    try {
      await api.careNetwork.updatePermissions(activePermModal.id, activePermModal.permissions);
      setActivePermModal(null);
      fetchMembers();
    } catch (err) {
      console.error("Error saving permissions:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Consent-Driven Care Network</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 dark:text-white">
            My CareCircle Network
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Authorised family members and caretakers. You maintain 100% control over permissions and access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-navy-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100"
          >
            Enter Invite Code
          </button>
          <button
            onClick={() => { setShowInviteModal(true); setGeneratedCode(null); }}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm shadow-md"
          >
            <UserPlus className="w-5 h-5" />
            <span>Invite New Member</span>
          </button>
        </div>
      </div>

      {/* Network Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-careteal-100 dark:bg-careteal-900/50 text-careteal-700 dark:text-careteal-300 font-black text-lg flex items-center justify-center">
                    {member.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-navy-800 dark:text-white">
                      {member.full_name}
                    </h3>
                    <div className="text-xs font-semibold text-careteal-700 dark:text-careteal-400 capitalize">
                      {member.relationship_label} ({member.role.replace('_', ' ')})
                    </div>
                  </div>
                </div>
                <span className="flex h-3 w-3 rounded-full bg-emerald-500" title="Active Connection" />
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <div>✉️ {member.email}</div>
                <div>📅 Connected since: {new Date(member.added_at).toLocaleDateString()}</div>
              </div>

              {/* Permissions Highlights */}
              <div className="bg-ivory-50 dark:bg-navy-800 p-3.5 rounded-2xl border border-ivory-200 dark:border-navy-700 space-y-1.5 text-xs">
                <div className="font-bold text-navy-800 dark:text-white uppercase tracking-wider text-[10px]">
                  Granted Privileges:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {member.permissions?.can_view_medications && (
                    <span className="px-2 py-0.5 rounded-md bg-careteal-100/70 text-careteal-800 text-[11px] font-semibold">
                      View Meds
                    </span>
                  )}
                  {member.permissions?.can_confirm_medications && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                      Confirm Doses
                    </span>
                  )}
                  {member.permissions?.can_receive_escalations && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-semibold">
                      Receive Escalations
                    </span>
                  )}
                  {member.permissions?.can_write_handover_logs && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-semibold">
                      Shift Handover
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-navy-800 flex items-center justify-between">
              <button
                onClick={() => setActivePermModal(JSON.parse(JSON.stringify(member)))}
                className="text-xs font-bold text-careteal-700 hover:text-careteal-800 hover:underline flex items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Edit Permissions</span>
              </button>

              <button
                onClick={() => handleRevoke(member.id)}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                title="Revoke access"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-navy-700 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-navy-800 dark:text-white mb-2">
              Invite Family or Caretaker
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Generates an expiring 6-digit invitation token and email invitation with granular permissions.
            </p>

            {generatedCode ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-navy-800 dark:text-white">
                  Invitation Generated & Sent!
                </h4>
                <p className="text-sm text-slate-500">
                  Share this 6-character invitation code with your caregiver:
                </p>
                <div className="text-4xl font-black text-careteal-700 tracking-widest bg-ivory-50 p-4 rounded-2xl border-2 border-dashed border-careteal-300">
                  {generatedCode}
                </div>
                <p className="text-xs text-slate-400">Valid for single use (expires in 7 days).</p>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-3 rounded-xl bg-careteal-600 text-white font-bold text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="caregiver@email.com"
                    value={inviteForm.invited_email}
                    onChange={e => setInviteForm({ ...inviteForm, invited_email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Role Type</label>
                    <select
                      value={inviteForm.invited_role}
                      onChange={e => setInviteForm({ ...inviteForm, invited_role: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                    >
                      <option value="caretaker">Caretaker</option>
                      <option value="family_member">Family Member</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Relationship</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Daughter / Morning Nurse"
                      value={inviteForm.relationship_label}
                      onChange={e => setInviteForm({ ...inviteForm, relationship_label: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                {/* Granular Permissions Checkboxes */}
                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-700 uppercase mb-2">Granular Permissions Granted:</div>
                  <div className="space-y-2 bg-ivory-50 p-4 rounded-2xl border border-slate-200 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={inviteForm.permissions.can_confirm_medications}
                        onChange={e => setInviteForm({
                          ...inviteForm,
                          permissions: { ...inviteForm.permissions, can_confirm_medications: e.target.checked }
                        })}
                        className="rounded text-careteal-600"
                      />
                      <span>Can record physical medication assistance</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={inviteForm.permissions.can_write_handover_logs}
                        onChange={e => setInviteForm({
                          ...inviteForm,
                          permissions: { ...inviteForm.permissions, can_write_handover_logs: e.target.checked }
                        })}
                        className="rounded text-careteal-600"
                      />
                      <span>Can write shift handover logs & record vitals</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={inviteForm.permissions.can_receive_escalations}
                        onChange={e => setInviteForm({
                          ...inviteForm,
                          permissions: { ...inviteForm.permissions, can_receive_escalations: e.target.checked }
                        })}
                        className="rounded text-careteal-600"
                      />
                      <span>Can receive escalation alerts when medications remain unconfirmed</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm shadow-md"
                  >
                    Create & Send Invite
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Enter Invite Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-2">
              Join CareCircle with Invite Code
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the 6-character code provided by the elderly individual.
            </p>
            {joinSuccessMsg ? (
              <div className="text-center py-4 space-y-3">
                <div className="text-emerald-600 font-bold text-base">{joinSuccessMsg}</div>
                <button
                  onClick={() => { setShowJoinModal(false); setJoinSuccessMsg(''); }}
                  className="px-5 py-2.5 rounded-xl bg-careteal-600 text-white font-bold text-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleAcceptInvite} className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7K9X2M"
                    maxLength={10}
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full text-center text-2xl font-black tracking-widest px-4 py-3 rounded-xl border border-slate-300 text-careteal-800"
                  />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-careteal-600 text-white font-bold text-sm"
                  >
                    Join Network
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {activePermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-1">
              Permissions for {activePermModal.full_name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Toggle specific capabilities granted to this {activePermModal.role.replace('_', ' ')}.
            </p>

            <div className="space-y-3 text-sm">
              {Object.keys(activePermModal.permissions || {}).filter(k => k.startsWith('can_')).map(k => (
                <label key={k} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50">
                  <span className="text-xs font-semibold text-slate-700 capitalize">
                    {k.replace('can_', '').replace(/_/g, ' ')}
                  </span>
                  <input
                    type="checkbox"
                    checked={activePermModal.permissions[k]}
                    onChange={e => setActivePermModal({
                      ...activePermModal,
                      permissions: { ...activePermModal.permissions, [k]: e.target.checked }
                    })}
                    className="rounded text-careteal-600"
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
              <button
                onClick={() => setActivePermModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                className="px-5 py-2 rounded-xl bg-careteal-600 text-white font-bold text-sm shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
