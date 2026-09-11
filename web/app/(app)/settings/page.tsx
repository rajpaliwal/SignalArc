"use client";

import { AlertTriangle, Download, Mail, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api, ApiError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { NotificationFrequency } from "@/lib/types";

const FREQUENCY_OPTIONS: { value: NotificationFrequency; label: string; hint: string }[] = [
  { value: "instant", label: "Instant", hint: "As soon as a material change is detected" },
  { value: "daily", label: "Daily digest", hint: "One summary per day, if there's anything material" },
  { value: "weekly", label: "Weekly digest", hint: "A single roundup once a week" },
];

export default function SettingsPage() {
  const router = useRouter();
  const {
    profile,
    authToken,
    updateProfileFields,
    notificationSettings,
    updateNotificationSettings,
    implicitLearningEnabled,
    setImplicitLearningEnabled,
    exportData,
    resetAll,
  } = useAppStore();
  const { showToast } = useToast();

  const [city, setCity] = useState(profile?.city ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [profession, setProfession] = useState(profile?.profession ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveProfile = () => {
    updateProfileFields({ city, country, profession });
    showToast("Profile updated.");
  };

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "signalarc-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Export downloaded.");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Guest sessions have no backend account — nothing to delete server-side.
      if (authToken) await api.deleteAccount(authToken);
      resetAll();
      router.push("/");
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to delete your account — try again.",
        "info"
      );
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Profile, notifications and privacy controls.</p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
          <User className="h-4 w-4 text-slate-400" />
          Profile
        </h2>
        <Card className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-400">Name</p>
              <p className="mt-0.5 text-slate-800 dark:text-slate-200">{profile?.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Email</p>
              <p className="mt-0.5 text-slate-800 dark:text-slate-200">{profile?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TextField label="City" value={city} onChange={setCity} />
            <TextField label="Country" value={country} onChange={setCountry} />
            <TextField label="Profession" value={profession} onChange={setProfession} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">Interests, hobbies and sports are edited in your Constellation.</p>
            <Button size="sm" onClick={saveProfile}>
              Save
            </Button>
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
          <Mail className="h-4 w-4 text-slate-400" />
          Notifications
        </h2>
        <Card className="space-y-5 p-5">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Email notifications</p>
              <p className="text-xs text-slate-400">Receive material-change updates by email.</p>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.emailEnabled}
              onChange={(e) => updateNotificationSettings({ emailEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>

          {notificationSettings.emailEnabled && (
            <TextField
              label="Notification email"
              value={notificationSettings.email}
              onChange={(v) => updateNotificationSettings({ email: v })}
              placeholder={profile?.email}
            />
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Default frequency</p>
            <div className="space-y-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                >
                  <input
                    type="radio"
                    name="frequency"
                    checked={notificationSettings.defaultFrequency === opt.value}
                    onChange={() => updateNotificationSettings({ defaultFrequency: opt.value })}
                    className="mt-0.5 h-3.5 w-3.5 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{opt.label}</p>
                    <p className="text-xs text-slate-400">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Quiet hours start"
              type="time"
              value={notificationSettings.quietHoursStart}
              onChange={(v) => updateNotificationSettings({ quietHoursStart: v })}
            />
            <TextField
              label="Quiet hours end"
              type="time"
              value={notificationSettings.quietHoursEnd}
              onChange={(v) => updateNotificationSettings({ quietHoursEnd: v })}
            />
          </div>

          <label className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Learn from my conversations</p>
              <p className="text-xs text-slate-400">Also editable from your Constellation page.</p>
            </div>
            <input
              type="checkbox"
              checked={implicitLearningEnabled}
              onChange={(e) => setImplicitLearningEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
          <AlertTriangle className="h-4 w-4 text-slate-400" />
          Privacy &amp; data
        </h2>
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Export your data</p>
              <p className="text-xs text-slate-400">Download your full profile, graph and history as JSON.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete profile &amp; graph</p>
              <p className="text-xs text-slate-400">
                Permanently deletes your account, interests and graph presence from the server
                (not just this browser).
              </p>
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Deleting…" : "Confirm"}
                </Button>
              </div>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}
