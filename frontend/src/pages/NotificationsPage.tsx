import React, { useState, useEffect } from 'react';
import {
  Bell, Mail, CheckCircle2, Clock, Send, Eye,
  AlertTriangle, RefreshCw, Sparkles, Shield
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mailbox, setMailbox] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mailbox' | 'notifications'>('mailbox');
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);

  // Test send form
  const [testForm, setTestForm] = useState({
    notification_type: 'medication_reminder',
    medication_name: 'Metformin',
    dosage: '500mg',
    recipient_email: user?.email || 'margaret.sharma@carecircle.demo'
  });
  const [sendSuccess, setSendSuccess] = useState(false);

  const fetchData = async () => {
    try {
      const [notifs, mail] = await Promise.all([
        api.notifications.list(30),
        api.notifications.mailbox(30)
      ]);
      setNotifications(notifs);
      setMailbox(mail);
      if (mail.length > 0 && !selectedEmail) {
        setSelectedEmail(mail[0]);
      }
    } catch (err) {
      console.error("Notifications fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.notifications.testSend(testForm);
      setSendSuccess(true);
      await fetchData();
      setTimeout(() => setSendSuccess(false), 4000);
    } catch (err: any) {
      alert("Error sending test notification: " + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Mail className="w-4 h-4" />
            <span>Notification Engine & Live Mailbox</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 dark:text-white">
            Email Notifications & Mailbox
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Full email delivery pipeline with real HTML email templates and in-app inspection sandbox.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-ivory-100 p-1.5 rounded-2xl border border-ivory-300">
          <button
            onClick={() => setActiveTab('mailbox')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mailbox'
                ? 'bg-careteal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-navy-800'
            }`}
          >
            Delivered Emails ({mailbox.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'notifications'
                ? 'bg-careteal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-navy-800'
            }`}
          >
            System Log ({notifications.length})
          </button>
        </div>
      </div>

      {/* Test Notification Trigger Drawer */}
      <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-navy-800 dark:text-white">
            <Send className="w-4 h-4 text-careteal-600" />
            <span>Test Notification Dispatcher (Evaluator Tool)</span>
          </div>
          {sendSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              ✓ Email generated & delivered to mailbox!
            </span>
          )}
        </div>

        <form onSubmit={handleSendTest} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-500 uppercase mb-1">Notification Type</label>
            <select
              value={testForm.notification_type}
              onChange={e => setTestForm({ ...testForm, notification_type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            >
              <option value="medication_reminder">Medication Reminder</option>
              <option value="missed_medication">Unconfirmed Alert</option>
              <option value="escalation_alert">Caregiver Escalation</option>
              <option value="refill_alert">Refill Alert</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-500 uppercase mb-1">Medication Name</label>
            <input
              type="text"
              value={testForm.medication_name}
              onChange={e => setTestForm({ ...testForm, medication_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-500 uppercase mb-1">Recipient Email</label>
            <input
              type="email"
              value={testForm.recipient_email}
              onChange={e => setTestForm({ ...testForm, recipient_email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold transition-all shadow"
            >
              Dispatch Email
            </button>
          </div>
        </form>
      </div>

      {/* Main Mailbox View: Split Pane (Left: Email List, Right: Rendered HTML Email) */}
      {activeTab === 'mailbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
          {/* Email List (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-navy-900 rounded-3xl p-4 border border-slate-200 dark:border-navy-700 shadow-sm space-y-2 overflow-y-auto max-h-[700px]">
            {mailbox.map((mail) => {
              const isSelected = selectedEmail?.id === mail.id;
              return (
                <div
                  key={mail.id}
                  onClick={() => setSelectedEmail(mail)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-careteal-50/70 border-careteal-300 dark:bg-navy-800 dark:border-careteal-600 shadow-sm'
                      : 'hover:bg-ivory-50 border-transparent text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-careteal-800 dark:text-careteal-400 capitalize">
                      {mail.notification_type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-400">
                      {new Date(mail.sent_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-navy-800 dark:text-white leading-tight">
                    {mail.subject}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    To: {mail.to_email}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Rendered HTML Email Preview (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col">
            {selectedEmail ? (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      Delivery: {selectedEmail.delivery_status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(selectedEmail.sent_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-navy-800 dark:text-white mt-2">
                    {selectedEmail.subject}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    From: <strong>CareCircle Support &lt;carecircle@health.local&gt;</strong> • To: <strong>{selectedEmail.to_email}</strong>
                  </div>
                </div>

                {/* Live Rendered HTML iframe or innerHTML */}
                <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 bg-ivory-50 p-2">
                  <iframe
                    title="Rendered Email Preview"
                    srcDoc={selectedEmail.rendered_html}
                    className="w-full h-[520px] rounded-xl border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                Select an email from the list to preview the delivered template.
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Notification Log View */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.id} className="py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-navy-800 dark:text-white">
                      {n.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      {n.channel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                </div>
                <div className="text-right text-xs text-slate-400 flex-shrink-0">
                  <div>{new Date(n.sent_at).toLocaleDateString()}</div>
                  <div className="text-emerald-600 font-semibold">{n.delivery_status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
