import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm Delete",
  cancelText = "Cancel",
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#25272F] rounded-3xl border border-[#333642] shadow-2xl p-6 sm:p-7 text-left space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            isDestructive 
              ? "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-lg shadow-rose-950/40" 
              : "bg-[#E5F842]/15 text-[#E5F842] border-[#E5F842]/30 shadow-lg shadow-black/40"
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-white tracking-tight leading-snug">
              {title}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>

        {/* Warning info box */}
        {isDestructive && (
          <div className="p-3.5 rounded-2xl bg-[#18191E] border border-rose-500/20 text-rose-300 text-[11px] font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 animate-ping" />
            <span>This action is permanent and will completely delete the video file, transcripts, vector chunks, and database records.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-[#18191E] border border-[#333642] text-slate-300 hover:text-white hover:bg-[#2E313B] font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-950/50"
                : "bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] shadow-black/40"
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isLoading ? "Deleting..." : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
