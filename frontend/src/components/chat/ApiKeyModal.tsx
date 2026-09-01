import React, { useState, useEffect } from "react";
import {
  Key,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Zap,
  ExternalLink,
  Loader2,
  Trash2
} from "lucide-react";
import {
  getApiKeyStatus,
  updateApiKey,
  testApiKey,
  deleteApiKey,
  type ApiKeyStatus,
  type ApiKeyTestResult
} from "../../services/chatService";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<ApiKeyTestResult | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setTestResult(null);
      setSaveSuccessMsg(null);
    }
  }, [isOpen]);

  async function fetchStatus() {
    try {
      setLoadingStatus(true);
      const res = await getApiKeyStatus();
      setStatus(res);
    } catch {
      // Ignored
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    setSaveSuccessMsg(null);
    try {
      const keyToTest = apiKeyInput.trim() || undefined;
      const res = await testApiKey(keyToTest);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to reach test endpoint."
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setSaving(true);
    setSaveSuccessMsg(null);
    try {
      const res = await updateApiKey(apiKeyInput.trim());
      setSaveSuccessMsg(res.message || "API key updated successfully!");
      setApiKeyInput("");
      await fetchStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to save API key."
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveKey() {
    if (!confirm("Are you sure you want to remove the saved Gemini API key?")) return;
    try {
      await deleteApiKey();
      setSaveSuccessMsg("API key removed successfully.");
      setApiKeyInput("");
      setTestResult(null);
      await fetchStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to remove API key."
      });
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#18191E] border border-[#333642] shadow-2xl p-6 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#E5F842]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#333642]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E5F842]/10 flex items-center justify-center text-[#E5F842]">
              <Key className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-snug">Gemini API Key</h3>
              <p className="text-xs text-slate-400">Configure AI provider credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Status Pill */}
        <div className="mt-4 p-3 rounded-xl bg-[#121316] border border-[#2B2D37] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${status?.configured ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-xs font-semibold text-slate-300">
              {loadingStatus ? "Checking status..." : status?.configured ? "Active Key Configured" : "No Key Set"}
            </span>
          </div>
          {status?.configured && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {status.masked_key}
              </span>
              <button
                type="button"
                onClick={handleRemoveKey}
                title="Remove API Key"
                className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Key Input Form */}
        <form onSubmit={handleSaveKey} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Enter New Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setTestResult(null);
                  setSaveSuccessMsg(null);
                }}
                placeholder="AIzaSy... or AQ.Ab8..."
                className="w-full bg-[#121316] border border-[#333642] focus:border-[#E5F842] focus:ring-1 focus:ring-[#E5F842] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 pr-10 outline-none font-mono transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <span className="text-[11px] text-slate-400">Model: gemini-3.5-flash</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#E5F842] hover:underline flex items-center gap-1 font-medium"
              >
                Get free key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Test Feedback Banner */}
          {testing && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-400" />
              <span>Pinging Gemini API service to verify connection...</span>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">
                <p className="font-semibold">{testResult.success ? "Connection Verified" : "Connection Failed"}</p>
                <p className="opacity-90 mt-0.5 text-[11px]">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Save Success Banner */}
          {saveSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || (!apiKeyInput.trim() && !status?.configured)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2B2D37] hover:bg-[#383B47] disabled:opacity-50 disabled:cursor-not-allowed border border-[#3E4251] transition-all cursor-pointer"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Test Connection</span>
            </button>

            <button
              type="submit"
              disabled={saving || !apiKeyInput.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-black bg-[#E5F842] hover:bg-[#d6e838] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
              )}
              <span>Save Key</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
