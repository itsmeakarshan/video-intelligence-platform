import { useRef, useState } from "react";
import { UploadCloud, FileVideo, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { getVideos } from "../../api/api";
import { upload } from "../../services/videoService";
import { useVideo } from "../../context/VideoContext";

interface Props {
  courseId?: number;
  onUploaded?: () => void;
}

export default function Upload({ courseId, onUploaded }: Props = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { setVideos } = useVideo();

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    setProgress(0);

    const fileArray = Array.from(files);

    for (const file of fileArray) {
      setCurrentFileName(file.name);
      try {
        await upload(file, (p) => setProgress(p), courseId);
        toast.success(`Uploaded ${file.name}`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    try {
      const videos = await getVideos(courseId);
      setVideos(videos);
      window.dispatchEvent(new Event("videosUpdated"));
      onUploaded?.();
    } catch (err) {
      console.error("Failed to refresh videos after upload:", err);
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentFileName("");
    }
  }

  return (
    <div className="w-full space-y-4 pt-2">
      <input
        hidden
        multiple
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={(e) => {
          if (!e.target.files?.length) return;
          uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
          isDragOver
            ? "border-[#E5F842] bg-[#E5F842]/10 shadow-xs"
            : "border-[#333642] bg-[#18191E] hover:bg-[#25272F] hover:border-[#E5F842]/50"
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-[#25272F] border border-[#333642] text-[#E5F842] flex items-center justify-center mb-3.5 shadow-xs">
          <UploadCloud className="w-7 h-7 text-[#E5F842]" />
        </div>

        <h4 className="text-base font-extrabold text-white mb-1">
          Drag & Drop Video Files
        </h4>
        <p className="text-xs text-slate-400 max-w-sm mb-4 font-medium">
          Supports MP4, MOV, MKV, and AVI files up to 2GB. Automatically transcribes and chunks speech.
        </p>

        <button
          type="button"
          disabled={uploading}
          className="px-5 py-2.5 rounded-xl bg-[#25272F] border border-[#333642] hover:border-[#E5F842]/40 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          Browse Local Files
        </button>

        {uploading && (
          <div className="w-full max-w-md mt-6 p-4 rounded-xl bg-[#18191E] border border-[#333642] shadow-xs text-left">
            <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
              <span className="flex items-center gap-1.5 truncate">
                <FileVideo className="w-4 h-4 text-[#E5F842] shrink-0" />
                <span className="truncate">{currentFileName || "Uploading video..."}</span>
              </span>
              <span className="text-[#E5F842]">{progress}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#25272F] overflow-hidden">
              <div
                className="h-full bg-[#E5F842] rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2 font-medium">
              <Loader2 className="w-3 h-3 animate-spin text-[#E5F842]" />
              <span>Uploading to secure media storage & queuing Whisper engine...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}