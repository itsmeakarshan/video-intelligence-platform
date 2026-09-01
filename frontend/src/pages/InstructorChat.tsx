import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../utils/constants";
import Navbar from "../components/layout/Navbar";
import VoiceRecorder from "../components/chat/VoiceRecorder";
import VoiceMessagePlayer from "../components/chat/VoiceMessagePlayer";
import YouTubePreviewCard, { extractYouTubeId, YouTubeIcon } from "../components/chat/YouTubePreviewCard";
import CourseVideoPickerModal from "../components/chat/CourseVideoPickerModal";
import {
  getInstructorChatChannels,
  getInstructorChatMessages,
  sendInstructorChatMessage,
  uploadInstructorChatMedia,
  deleteInstructorChatMessage,
  type InstructorChatChannel,
  type InstructorChatMessage
} from "../api/instructorChatApi";
import type { CourseVideoItem } from "../api/api";
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Film,
  Search,
  Download,
  Play,
  Loader2,
  X,
  FileText,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";

export default function InstructorChat() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [channels, setChannels] = useState<InstructorChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<InstructorChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Voice recording & Modal states
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [youtubeInputUrl, setYoutubeInputUrl] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<{ url: string; title: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const token = (localStorage.getItem("access_token") || "").replace(/^"|"$/g, "").trim();

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, []);

  // Poll messages when an active channel is selected
  useEffect(() => {
    if (!activeChannelId) return;

    loadMessages(activeChannelId);

    const interval = setInterval(() => {
      loadMessagesSilently(activeChannelId);
    }, 3500);

    return () => clearInterval(interval);
  }, [activeChannelId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadChannels() {
    setLoadingChannels(true);
    try {
      const data = await getInstructorChatChannels();
      setChannels(data);
      if (data.length > 0 && !activeChannelId) {
        setActiveChannelId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load chat channels:", err);
      toast.error("Could not fetch conversation threads.");
    } finally {
      setLoadingChannels(false);
    }
  }

  async function loadMessages(channelId: number) {
    setLoadingMessages(true);
    try {
      const data = await getInstructorChatMessages(channelId);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function loadMessagesSilently(channelId: number) {
    try {
      const data = await getInstructorChatMessages(channelId);
      setMessages((prev) => {
        if (data.length !== prev.length || (data.length > 0 && prev.length > 0 && data[data.length - 1].id !== prev[prev.length - 1].id)) {
          return data;
        }
        return prev;
      });
    } catch {
      // Ignore polling errors
    }
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  // Send plain text or auto-detect YouTube link
  async function handleSendText(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!activeChannelId || !input.trim() || sending) return;

    const rawText = input.trim();
    setInput("");
    setSending(true);

    try {
      const ytId = extractYouTubeId(rawText);
      if (ytId) {
        // Send as YouTube message
        const newMsg = await sendInstructorChatMessage(activeChannelId, {
          text: rawText,
          message_type: "youtube",
          media_url: rawText,
          extra_data: JSON.stringify({ videoId: ytId })
        });
        setMessages((prev) => [...prev, newMsg]);
      } else {
        // Send as regular text
        const newMsg = await sendInstructorChatMessage(activeChannelId, {
          text: rawText,
          message_type: "text"
        });
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err) {
      console.error("Send message error:", err);
      toast.error("Failed to send message.");
      setInput(rawText);
    } finally {
      setSending(false);
    }
  }

  // Send photo / image attachment
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeChannelId || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    e.target.value = "";

    setSending(true);
    const toastId = toast.loading("Uploading photo...");

    try {
      const newMsg = await uploadInstructorChatMedia(activeChannelId, file, "image", "Sent a photo");
      setMessages((prev) => [...prev, newMsg]);
      toast.success("Photo sent!", { id: toastId });
    } catch (err) {
      console.error("Photo upload error:", err);
      toast.error("Failed to upload photo.", { id: toastId });
    } finally {
      setSending(false);
    }
  }

  // Send document attachment (PDF, Word, etc.)
  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!activeChannelId || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    e.target.value = "";

    setSending(true);
    const toastId = toast.loading("Uploading document...");

    try {
      const newMsg = await uploadInstructorChatMedia(activeChannelId, file, "document", file.name);
      setMessages((prev) => [...prev, newMsg]);
      toast.success("Document attached!", { id: toastId });
    } catch (err) {
      console.error("Document upload error:", err);
      toast.error("Failed to upload document.", { id: toastId });
    } finally {
      setSending(false);
    }
  }

  // Send recorded voice note
  async function handleSendVoice(audioFile: File, durationSec: number) {
    if (!activeChannelId) return;

    const toastId = toast.loading("Sending voice note...");
    try {
      const newMsg = await uploadInstructorChatMedia(
        activeChannelId,
        audioFile,
        "voice",
        `Voice note (${durationSec}s)`,
        JSON.stringify({ duration: durationSec })
      );
      setMessages((prev) => [...prev, newMsg]);
      setIsVoiceRecording(false);
      toast.success("Voice note sent!", { id: toastId });
    } catch (err) {
      console.error("Voice upload error:", err);
      toast.error("Failed to send voice note.", { id: toastId });
    }
  }

  // Attach processed course video (Admin)
  async function handleAttachCourseVideo(video: CourseVideoItem) {
    if (!activeChannelId) return;

    try {
      const videoStreamUrl = `${API_URL}/videos/${video.id}/stream${token ? `?access_token=${token}` : ""}`;
      const thumbUrl = `${API_URL}/videos/${video.id}/thumbnail${token ? `?access_token=${token}` : ""}`;

      const newMsg = await sendInstructorChatMessage(activeChannelId, {
        text: video.title || video.filename,
        message_type: "video",
        media_url: videoStreamUrl,
        file_name: video.filename,
        extra_data: JSON.stringify({
          videoId: video.id,
          videoTitle: video.title || video.filename,
          thumbnailUrl: thumbUrl
        })
      });
      setMessages((prev) => [...prev, newMsg]);
      toast.success("Course lecture video attached!");
    } catch (err) {
      console.error("Video attach error:", err);
      toast.error("Failed to attach course video.");
    }
  }

  // Send YouTube link via modal
  async function handleSendYouTubeLink(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChannelId || !youtubeInputUrl.trim()) return;

    const ytId = extractYouTubeId(youtubeInputUrl.trim());
    if (!ytId) {
      toast.error("Please enter a valid YouTube URL.");
      return;
    }

    try {
      const newMsg = await sendInstructorChatMessage(activeChannelId, {
        text: youtubeInputUrl.trim(),
        message_type: "youtube",
        media_url: youtubeInputUrl.trim(),
        extra_data: JSON.stringify({ videoId: ytId })
      });
      setMessages((prev) => [...prev, newMsg]);
      setYoutubeModalOpen(false);
      setYoutubeInputUrl("");
      toast.success("YouTube resource shared!");
    } catch (err) {
      console.error("YouTube send error:", err);
      toast.error("Failed to send YouTube link.");
    }
  }

  // Unsend message handler
  async function handleUnsendMessage(messageId: number) {
    // Optimistically remove from state
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await deleteInstructorChatMessage(messageId);
      toast.success("Message unsent");
    } catch (err) {
      console.error("Failed to unsend message:", err);
      toast.error("Failed to unsend message.");
      if (activeChannelId) {
        getInstructorChatMessages(activeChannelId).then(setMessages).catch(() => {});
      }
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredChannels = channels.filter((c) => {
    if (!isAdmin || !searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.student_name.toLowerCase().includes(q) ||
      c.course_title.toLowerCase().includes(q) ||
      (c.student_email && c.student_email.toLowerCase().includes(q))
    );
  });

  const getInitials = (name?: string) => {
    if (!name) return "US";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 flex flex-col">
        {/* Main Chat Studio Container */}
        <div className="flex-1 min-h-[600px] h-[calc(100vh-140px)] rounded-3xl border border-[#333642] bg-[#18191E]/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Sidebar: Threads / Channels - ONLY FOR ADMIN */}
          {isAdmin && (
            <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[#333642] bg-[#141519]/90 flex flex-col shrink-0">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-[#333642]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#E5F842]" />
                    <h2 className="text-sm font-extrabold text-white">
                      Student Doubt Sessions
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#E5F842]/15 text-[#E5F842] text-[11px] font-bold border border-[#E5F842]/30">
                    {channels.length} {channels.length === 1 ? "Thread" : "Threads"}
                  </span>
                </div>

                {/* Search Bar - Only for Admin */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#22242B] text-xs text-white placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-[#333642] focus:border-[#E5F842] focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              {/* Channels List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#333642]/40">
                {loadingChannels ? (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#E5F842] mb-2" />
                    <span className="text-xs font-semibold">Loading conversations...</span>
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className="py-12 px-4 text-center text-slate-400">
                    <p className="text-xs font-bold text-white mb-1">No channels found</p>
                    <p className="text-[11px]">No student doubts submitted yet.</p>
                  </div>
                ) : (
                  filteredChannels.map((channel) => {
                    const isActive = channel.id === activeChannelId;
                    const primaryDisplayName = channel.student_name;

                    return (
                      <button
                        key={channel.id}
                        onClick={() => setActiveChannelId(channel.id)}
                        className={`w-full text-left p-4 flex items-start gap-3 transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#25272F] border-l-4 border-l-[#E5F842]"
                            : "hover:bg-[#1E2027]"
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-2xl border flex items-center justify-center font-bold text-xs shrink-0 shadow-xs relative bg-[#2C2E37] border-[#333642] text-slate-200">
                          {getInitials(primaryDisplayName)}
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-[#18191E]" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h4 className="text-xs font-bold text-white truncate">
                              {primaryDisplayName}
                            </h4>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(channel.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <p className="text-[11px] text-[#E5F842] font-semibold truncate mb-1">
                            {channel.course_title}
                          </p>

                          <p className="text-[11px] text-slate-400 truncate">
                            {channel.last_message || "Start asking doubts..."}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          )}

          {/* Right Main Chat Panel */}
          <section className="flex-1 flex flex-col h-full min-h-0 bg-[#121316] relative overflow-hidden">
            {/* Custom Chat Wallpaper Background (blurred) */}
            <div
              className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center scale-105 filter blur-[3px] opacity-45"
              style={{ backgroundImage: "url('/chatback.png')" }}
            />
            <div className="absolute inset-0 pointer-events-none z-0 bg-black/45" />

            {activeChannel ? (
              <div className="flex-1 flex flex-col h-full min-h-0 relative z-10">
                {/* Active Chat Header */}
                <div className="px-5 py-4 border-b border-[#333642] bg-[#1C1E26]/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#E5F842]/15 border border-[#E5F842]/30 flex items-center justify-center text-[#E5F842] shrink-0 font-extrabold text-sm">
                      {getInitials(isAdmin ? activeChannel.student_name : (activeChannel.instructor_name || "Admin"))}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-white truncate">
                          {isAdmin ? activeChannel.student_name : (activeChannel.instructor_name || "Course Instructor")}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-[#25272F] border border-[#333642] text-[10px] font-bold text-[#E5F842]">
                          {isAdmin ? "Student" : "Course Instructor"}
                        </span>
                      </div>
                      {isAdmin ? (
                        <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                          {activeChannel.student_email || "Student Doubt Session"}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                          Direct Doubt Session & Q&A
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Doubt Session
                    </span>
                  </div>
                </div>

                {/* Messages Feed Area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {loadingMessages ? (
                    <div className="h-full py-24 text-center text-slate-400 flex flex-col items-center justify-center">
                      <Loader2 className="w-7 h-7 animate-spin text-[#E5F842] mb-2" />
                      <span className="text-xs font-semibold">Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <div className="w-14 h-14 rounded-3xl bg-[#25272F] border border-[#333642] text-[#E5F842] flex items-center justify-center shadow-lg mb-3">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-extrabold text-white mb-1">
                        Welcome to Course Doubts & Q&A
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm font-medium">
                        Ask any conceptual questions, share screenshots, voice notes, or lecture timestamps. The course instructor will respond directly here.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      const isInstructorMsg = msg.sender_role === "admin";
                      const mediaFullUrl = msg.media_url?.startsWith("http")
                        ? msg.media_url
                        : `${API_URL}${msg.media_url}`;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-2xl mx-auto w-full`}
                        >
                          {/* Sender meta */}
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-[11px] font-bold text-slate-300">
                              {isMe ? "You" : msg.sender_name}
                            </span>
                            {isInstructorMsg ? (
                              <span className="px-1.5 py-0.2 rounded-md bg-[#E5F842] text-[#121316] text-[9px] font-black uppercase tracking-wider">
                                Instructor
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-md bg-[#2C2E37] text-slate-300 text-[9px] font-semibold">
                                Student
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          {/* Message Bubble Container with Unsend Action */}
                          <div className={`relative group/msg flex items-center gap-2 ${isMe ? "flex-row" : "flex-row-reverse"}`}>
                            {(isMe || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleUnsendMessage(msg.id)}
                                className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-xl bg-[#25272F] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#333642] hover:border-rose-500/30 cursor-pointer shadow-md shrink-0"
                                title="Unsend Message"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <div
                              className={`rounded-2xl p-3.5 shadow-md ${
                                isMe
                                  ? "bg-[#2A2D37] text-white border border-[#3E4251] rounded-tr-xs"
                                  : "bg-[#1E2028] text-slate-200 border border-[#333642] rounded-tl-xs"
                              }`}
                            >
                            {/* 1. PHOTO / IMAGE MESSAGE */}
                            {msg.message_type === "image" && msg.media_url && (
                              <div className="space-y-2">
                                <div
                                  onClick={() => setLightboxImage(mediaFullUrl)}
                                  className="rounded-xl overflow-hidden border border-[#333642] bg-black max-w-sm max-h-72 cursor-pointer group relative"
                                >
                                  <img
                                    src={mediaFullUrl}
                                    alt={msg.file_name || "Attachment"}
                                    className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-200"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="px-3 py-1 rounded-full bg-black/80 text-white text-[11px] font-bold">
                                      Click to Expand
                                    </span>
                                  </div>
                                </div>
                                {msg.text && msg.text !== "Sent a photo" && (
                                  <p className="text-xs sm:text-sm font-medium leading-relaxed">{msg.text}</p>
                                )}
                              </div>
                            )}

                            {/* 2. DOCUMENT MESSAGE */}
                            {msg.message_type === "document" && msg.media_url && (
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#141519] border border-[#333642] max-w-sm">
                                <div className="w-10 h-10 rounded-xl bg-[#E5F842]/15 text-[#E5F842] flex items-center justify-center shrink-0 font-bold">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-white truncate" title={msg.file_name || "Document"}>
                                    {msg.file_name || "Document"}
                                  </p>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {formatFileSize(msg.file_size)}
                                  </span>
                                </div>
                                <a
                                  href={mediaFullUrl}
                                  download={msg.file_name || "document"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg bg-[#25272F] text-slate-300 hover:text-[#E5F842] hover:bg-[#2E313B] transition-colors"
                                  title="Download Document"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            )}

                            {/* 3. VOICE NOTE MESSAGE */}
                            {msg.message_type === "voice" && msg.media_url && (
                              <div className="space-y-1">
                                <VoiceMessagePlayer
                                  audioUrl={mediaFullUrl}
                                  duration={(() => {
                                    try {
                                      if (msg.extra_data) {
                                        const parsed = JSON.parse(msg.extra_data);
                                        return parsed.duration || 0;
                                      }
                                    } catch {}
                                    return 0;
                                  })()}
                                />
                                {msg.text && msg.text !== "Sent a voice note" && !msg.text.startsWith("Voice note (") && (
                                  <p className="text-xs text-slate-300 px-1 font-medium">{msg.text}</p>
                                )}
                              </div>
                            )}

                            {/* 4. PROCESSED COURSE VIDEO MESSAGE */}
                            {msg.message_type === "video" && (
                              <div className="space-y-2 max-w-sm">
                                {(() => {
                                  let extra: any = {};
                                  try {
                                    if (msg.extra_data) extra = JSON.parse(msg.extra_data);
                                  } catch {}

                                  const thumb = extra.thumbnailUrl || "";
                                  const videoTitle = extra.videoTitle || msg.file_name || msg.text;

                                  return (
                                    <div className="rounded-2xl border border-[#333642] bg-[#141519] overflow-hidden shadow-lg group">
                                      <div
                                        onClick={() =>
                                          setVideoModalUrl({
                                            url: mediaFullUrl,
                                            title: videoTitle
                                          })
                                        }
                                        className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                                      >
                                        {thumb ? (
                                          <img
                                            src={thumb}
                                            alt={videoTitle}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                              (e.target as HTMLElement).style.display = "none";
                                            }}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-[#25272F]">
                                            <Film className="w-8 h-8 text-slate-500" />
                                          </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                          <div className="w-12 h-12 rounded-full bg-[#E5F842] text-[#121316] flex items-center justify-center shadow-xl group-hover:scale-110 transition-all">
                                            <Play className="w-5 h-5 fill-[#121316] ml-0.5" />
                                          </div>
                                        </div>

                                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-extrabold text-[#E5F842]">
                                          Course Lecture Video
                                        </div>
                                      </div>

                                      <div className="p-3 flex items-center justify-between gap-2 border-t border-[#333642]">
                                        <div className="min-w-0 flex-1">
                                          <h5 className="text-xs font-bold text-white truncate">{videoTitle}</h5>
                                          <p className="text-[10px] text-slate-400">Attached by Instructor</p>
                                        </div>
                                        <button
                                          onClick={() =>
                                            setVideoModalUrl({
                                              url: mediaFullUrl,
                                              title: videoTitle
                                            })
                                          }
                                          className="px-3 py-1 rounded-lg bg-[#E5F842] text-[#121316] font-extrabold text-xs hover:bg-[#D6EA35] transition-colors cursor-pointer"
                                        >
                                          Play
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* 5. YOUTUBE MESSAGE */}
                            {msg.message_type === "youtube" && (
                              <div>
                                <p className="text-xs sm:text-sm font-medium leading-relaxed mb-1.5 text-slate-200">
                                  {msg.text}
                                </p>
                                <YouTubePreviewCard url={msg.media_url || msg.text} />
                              </div>
                            )}

                            {/* 6. PLAIN TEXT MESSAGE */}
                            {msg.message_type === "text" && (
                              <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                              </p>
                            )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Bottom Input & Attachment Toolbar */}
                <div className="p-4 bg-[#141519]/95 border-t border-[#333642] shrink-0 mt-auto">
                  {/* Voice recording bar */}
                  {isVoiceRecording ? (
                    <VoiceRecorder
                      onSendVoice={handleSendVoice}
                      onCancel={() => setIsVoiceRecording(false)}
                    />
                  ) : (
                    <form onSubmit={handleSendText} className="space-y-2">
                      <div className="flex items-center gap-2 bg-[#22242B] rounded-2xl p-1.5 pl-3.5 border border-[#333642] focus-within:border-[#E5F842] transition-all shadow-inner">
                        {/* Text Input */}
                        <input
                          type="text"
                          placeholder={
                            isAdmin
                              ? "Reply to student doubt (paste YouTube links, attach lectures, or type)..."
                              : "Ask your instructor a question or doubt..."
                          }
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          disabled={sending}
                          className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-hidden"
                        />

                        {/* Send Button */}
                        <button
                          type="submit"
                          disabled={!input.trim() || sending}
                          className="p-2.5 rounded-xl bg-[#E5F842] text-[#121316] font-bold hover:bg-[#D6EA35] transition-all disabled:opacity-40 disabled:hover:bg-[#E5F842] cursor-pointer shadow-md"
                        >
                          {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#121316]" />
                          ) : (
                            <Send className="w-4 h-4 text-[#121316]" />
                          )}
                        </button>
                      </div>

                      {/* Media Attachment Action Buttons */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          {/* Image upload trigger */}
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25272F] hover:bg-[#2E313B] text-slate-300 hover:text-white border border-[#333642] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#E5F842]" />
                            <span>Photo</span>
                          </button>

                          {/* Document upload trigger */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25272F] hover:bg-[#2E313B] text-slate-300 hover:text-white border border-[#333642] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-[#E5F842]" />
                            <span>Document</span>
                          </button>

                          {/* Voice note trigger */}
                          <button
                            type="button"
                            onClick={() => setIsVoiceRecording(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25272F] hover:bg-[#2E313B] text-slate-300 hover:text-white border border-[#333642] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Mic className="w-3.5 h-3.5 text-rose-400" />
                            <span>Voice Note</span>
                          </button>

                          {/* YouTube link prompt */}
                          <button
                            type="button"
                            onClick={() => setYoutubeModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25272F] hover:bg-[#2E313B] text-slate-300 hover:text-white border border-[#333642] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <YouTubeIcon className="w-3.5 h-3.5 text-rose-500" />
                            <span>YouTube</span>
                          </button>

                          {/* Admin only: Attach course lecture video */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setVideoPickerOpen(true)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E5F842]/15 hover:bg-[#E5F842]/25 text-[#E5F842] border border-[#E5F842]/40 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Film className="w-3.5 h-3.5" />
                              <span>Attach Course Video</span>
                            </button>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                          Supports Photos, PDFs, Voice & YouTube
                        </span>
                      </div>
                    </form>
                  )}

                  {/* Hidden inputs */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.zip"
                    className="hidden"
                    onChange={handleDocumentUpload}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">
                  {isAdmin ? "Select a student conversation" : "No active course doubt channels"}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  {isAdmin
                    ? "Choose a student thread from the left sidebar to answer questions and resolve doubts."
                    : "You are not enrolled in any courses yet. Enroll in courses to start learning and ask doubts directly."}
                </p>
                {!isAdmin && (
                  <button
                    onClick={() => navigate("/courses")}
                    className="px-4 py-2 rounded-xl bg-[#E5F842] text-[#121316] font-bold text-xs hover:bg-[#D6EA35] transition-colors cursor-pointer shadow-md"
                  >
                    Explore Courses
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Lightbox Modal for Photo viewing */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-[#333642] shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Video Modal for Processed Course Videos */}
      {videoModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-[#18191E] border border-[#333642] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-[#333642] bg-[#22242B]">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-[#E5F842]" />
                <span className="text-sm font-extrabold text-white truncate">
                  {videoModalUrl.title}
                </span>
              </div>
              <button
                onClick={() => setVideoModalUrl(null)}
                className="p-1.5 rounded-xl bg-[#2C2E37] text-slate-400 hover:text-white hover:bg-[#383B46] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              <video
                src={videoModalUrl.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* YouTube Link Prompt Modal */}
      {youtubeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#18191E] border border-[#333642] rounded-3xl overflow-hidden shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#333642] pb-3">
              <div className="flex items-center gap-2">
                <YouTubeIcon className="w-5 h-5 text-rose-500" />
                <h4 className="text-sm font-extrabold text-white">Share YouTube Video</h4>
              </div>
              <button
                onClick={() => setYoutubeModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#25272F] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendYouTubeLink} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeInputUrl}
                  onChange={(e) => setYoutubeInputUrl(e.target.value)}
                  className="w-full bg-[#22242B] text-xs text-white placeholder-slate-500 p-3 rounded-xl border border-[#333642] focus:border-rose-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setYoutubeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#25272F] text-slate-300 font-bold text-xs hover:bg-[#2E313B] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!youtubeInputUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  Share Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Course Video Picker Modal */}
      {isAdmin && activeChannel && (
        <CourseVideoPickerModal
          open={videoPickerOpen}
          courseId={activeChannel.course_id}
          courseTitle={activeChannel.course_title}
          onClose={() => setVideoPickerOpen(false)}
          onSelectVideo={handleAttachCourseVideo}
        />
      )}
    </div>
  );
}
