import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ArrowLeft,
  Video,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Layers,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useVideo } from "../context/VideoContext";
import { useChat } from "../context/ChatContext";
import {
  getCourse,
  updateCourse,
  deleteVideo,
  generateTranscript,
  reorderCourseVideos,
  updateCourseVideo,
  type CourseDetail,
  type CourseVideoItem
} from "../api/api";
import VideoPlayer from "../components/video/VideoPlayer";
import Chat from "../components/chat/Chat";
import Upload from "../components/upload/Upload";
import YouTubeDownloader from "../components/video/YouTubeDownloader";
import Navbar from "../components/layout/Navbar";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { API_URL } from "../utils/constants";

export default function CourseStudio() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const {
    videos,
    setVideos,
    selectedVideo,
    setSelectedVideo,
    setVideoUrl,
    setVideoTitle,
    setVideoId,
    loadVideo
  } = useVideo();
  const { setSelectedVideos: setChatSelectedVideos, switchCourse } = useChat();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lessons" | "upload" | "youtube">("lessons");

  // Rename Video Modal
  const [renamingVideo, setRenamingVideo] = useState<CourseVideoItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [renamingSaving, setRenamingSaving] = useState(false);

  // Delete Video Modal
  const [deletingVideo, setDeletingVideo] = useState<CourseVideoItem | null>(null);
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);

  // Edit Course Modal
  const [editCourseModalOpen, setEditCourseModalOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseSaving, setCourseSaving] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (courseId) {
      const cId = Number(courseId);
      fetchCourseDetails(cId);
      switchCourse(cId);
    }
    return () => {
      switchCourse(null);
    };
  }, [courseId, switchCourse]);

  // Polling for processing videos
  useEffect(() => {
    if (!course) return;
    const hasActive = course.videos.some(
      (v) => v.status === "processing" || v.status === "queued"
    );
    if (!hasActive) return;

    const interval = setInterval(() => {
      if (courseId) fetchCourseDetails(Number(courseId), false);
    }, 1500);

    return () => clearInterval(interval);
  }, [course, courseId]);

  async function fetchCourseDetails(id: number, showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const data = await getCourse(id);
      setCourse(data);

      const mappedVideos = data.videos.map((v) => ({
        id: v.id,
        course_id: v.course_id,
        order_index: v.order_index,
        title: v.title,
        filename: v.filename,
        original_filename: v.original_filename,
        file_path: "",
        file_size: v.file_size,
        status: v.status,
        progress: v.progress,
        current_step: v.current_step,
        created_at: v.created_at
      }));

      setVideos(mappedVideos);

      // Auto-select first completed video or first video if none selected
      if (mappedVideos.length > 0) {
        if (!selectedVideo || !mappedVideos.some((v) => v.id === selectedVideo.id) || selectedVideo.course_id !== id) {
          const firstCompleted = mappedVideos.find((v) => v.status === "completed") || mappedVideos[0];
          loadVideo(firstCompleted);
          setChatSelectedVideos([firstCompleted.id]);
        }
      } else {
        // Clear previous video context completely if course has 0 videos
        setSelectedVideo(null);
        setVideoUrl("");
        setVideoTitle("");
        setVideoId(null);
        setChatSelectedVideos([]);
      }
    } catch (err: any) {
      console.error("Failed to load course details:", err);
      toast.error("Failed to load course details.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  function handleSelectVideo(video: CourseVideoItem) {
    const videoItem = {
      id: video.id,
      course_id: video.course_id,
      order_index: video.order_index,
      title: video.title,
      filename: video.filename,
      original_filename: video.original_filename,
      file_path: "",
      file_size: video.file_size,
      status: video.status,
      progress: video.progress,
      current_step: video.current_step,
      created_at: video.created_at
    };
    loadVideo(videoItem);
    setChatSelectedVideos([video.id]);
  }

  async function handleMoveVideo(index: number, direction: "up" | "down") {
    if (!course) return;
    const items = [...course.videos];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Swap items
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    // Re-assign order indexes 1..N
    const reorderedPayload = items.map((item, idx) => ({
      video_id: item.id,
      order_index: idx + 1
    }));

    // Optimistic UI update
    const updatedCourseVideos = items.map((item, idx) => ({
      ...item,
      order_index: idx + 1
    }));
    setCourse({ ...course, videos: updatedCourseVideos });

    try {
      await reorderCourseVideos(course.id, reorderedPayload);
      toast.success("Lesson order updated!");
      fetchCourseDetails(course.id, false);
    } catch (err: any) {
      toast.error("Failed to reorder lessons.");
      fetchCourseDetails(course.id, false);
    }
  }

  function openRenameModal(video: CourseVideoItem, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingVideo(video);
    setNewTitle(video.title || video.original_filename || video.filename);
  }

  async function handleSaveRename(e: React.FormEvent) {
    e.preventDefault();
    if (!course || !renamingVideo || !newTitle.trim()) return;

    setRenamingSaving(true);
    try {
      await updateCourseVideo(course.id, renamingVideo.id, {
        title: newTitle.trim()
      });
      toast.success("Lesson title updated!");
      setRenamingVideo(null);
      fetchCourseDetails(course.id, false);
    } catch (err: any) {
      toast.error("Failed to update lesson title.");
    } finally {
      setRenamingSaving(false);
    }
  }

  function handleDeleteVideo(video: CourseVideoItem, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingVideo(video);
  }

  async function confirmDeleteVideo() {
    if (!deletingVideo) return;
    setIsDeletingVideo(true);
    try {
      await deleteVideo(deletingVideo.id);
      toast.success(`Lesson #${deletingVideo.order_index} completely deleted.`);
      
      // If currently playing video is the one being deleted, reset player
      if (selectedVideo?.id === deletingVideo.id) {
        setSelectedVideo(null);
        setVideoUrl("");
      }
      setVideos(videos.filter((v) => v.id !== deletingVideo.id));
      
      setDeletingVideo(null);
      if (courseId) fetchCourseDetails(Number(courseId), false);
    } catch (err: any) {
      toast.error("Failed to delete lesson.");
    } finally {
      setIsDeletingVideo(false);
    }
  }

  async function handleProcessVideo(video: { id: number; title?: string }, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      await generateTranscript(video.id);
      toast.success("Started AI transcription and chunk indexing!");
      if (courseId) fetchCourseDetails(Number(courseId), false);
    } catch (err: any) {
      toast.error("Failed to start processing.");
    }
  }

  function openEditCourseModal() {
    if (!course) return;
    setCourseTitle(course.title);
    setCourseDesc(course.description);
    setEditCourseModalOpen(true);
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!course || !courseTitle.trim()) return;

    setCourseSaving(true);
    try {
      await updateCourse(course.id, {
        title: courseTitle.trim(),
        description: courseDesc.trim()
      });
      toast.success("Course details updated!");
      setEditCourseModalOpen(false);
      fetchCourseDetails(course.id, false);
    } catch (err: any) {
      toast.error("Failed to update course.");
    } finally {
      setCourseSaving(false);
    }
  }

  function getThumbnailFullUrl(url?: string | null) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
      return url;
    }
    return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  if (loading) {
    return (
      <div className="w-full bg-[#18191E] min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#E5F842] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="w-full bg-[#18191E] min-h-screen p-8 text-center flex flex-col items-center justify-center space-y-4 text-white">
        <h2 className="text-2xl font-extrabold text-white">Course Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm">This course may have been removed or is unavailable.</p>
        <button
          onClick={() => navigate(isAdmin ? "/courses" : "/dashboard")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-md shadow-black/30 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isAdmin ? "Back to Courses" : "Back to Dashboard"}</span>
        </button>
      </div>
    );
  }

  const fullThumbUrl = getThumbnailFullUrl(course.thumbnail_url);

  return (
    <div className="w-full bg-transparent min-h-screen pb-16 font-sans text-white">
      <Navbar />
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6 pt-4">

        {/* 1. TOP HEADER & COURSE BANNER */}
        <div className="bg-[#25272F] rounded-3xl p-6 border border-[#333642] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <button
              onClick={() => navigate(isAdmin ? "/courses" : "/dashboard")}
              className="p-2.5 rounded-2xl bg-[#18191E] border border-[#333642] hover:bg-[#2E313B] text-slate-300 font-bold transition-colors cursor-pointer shrink-0"
              title={isAdmin ? "Back to courses list" : "Back to Dashboard"}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {fullThumbUrl ? (
              <img
                src={fullThumbUrl}
                alt={course.title}
                className="w-16 h-16 rounded-2xl object-cover border border-[#333642] shrink-0 hidden sm:block shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#2E313B] border border-[#333642] text-[#E5F842] flex items-center justify-center shrink-0 hidden sm:flex shadow-xs">
                <BookOpen className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#E5F842]/15 text-[#E5F842] px-2.5 py-0.5 rounded-full border border-[#E5F842]/30">
                  {isAdmin ? "Course Management Studio" : "Course Learning Studio"}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {course.videos.length} {course.videos.length === 1 ? "Lesson" : "Lessons"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-xs text-slate-400 font-medium max-w-2xl line-clamp-2">
                  {course.description}
                </p>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={openEditCourseModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18191E] border border-[#333642] hover:bg-[#2E313B] text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Course Info</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. ROW: VIDEO PLAYER (50%) & AI ASSISTANT CHAT (50%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* LEFT: Video Player */}
          <div className="flex flex-col space-y-4">
            <VideoPlayer />
          </div>

          {/* RIGHT: AI Assistant Chat */}
          <div className="flex flex-col h-[560px] max-h-[560px] overflow-hidden">
            <Chat />
          </div>
        </div>

        {/* 4. FULL-WIDTH ROW: COURSE CURRICULUM & VIDEO LIBRARY */}
        <div className="w-full bg-[#25272F] rounded-3xl p-6 border border-[#333642] shadow-xs space-y-5">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-[#18191E] border border-[#333642] rounded-2xl max-w-xl">
            <button
              onClick={() => setActiveTab("lessons")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "lessons"
                  ? "bg-[#E5F842] text-[#121316] shadow-sm font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Curriculum ({course.videos.length})</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "upload"
                      ? "bg-[#E5F842] text-[#121316] shadow-sm font-extrabold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Video</span>
                </button>

                <button
                  onClick={() => setActiveTab("youtube")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "youtube"
                      ? "bg-[#E5F842] text-[#121316] shadow-sm font-extrabold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>YouTube Import</span>
                </button>
              </>
            )}
          </div>

          {/* TAB 1: CURRICULUM VIDEO LESSONS LIST */}
          {activeTab === "lessons" && (
            <div className="space-y-3">
              {course.videos.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 text-slate-400 border border-dashed border-[#333642] rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
                    <Video className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-extrabold text-white">No lessons uploaded yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {isAdmin
                      ? "Upload MP4 videos or import YouTube lessons using the tabs above to build this course."
                      : "No video lessons available in this course yet."}
                  </p>
                </div>
              ) : (
                course.videos.map((vid, idx) => {
                  const isSelected = selectedVideo?.id === vid.id;

                  return (
                    <div
                      key={vid.id}
                      onClick={() => handleSelectVideo(vid)}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-[#18191E] border-[#E5F842] shadow-md shadow-[#E5F842]/5"
                          : "bg-[#1E2028] border-[#333642] hover:border-slate-500 hover:bg-[#25272F]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                            isSelected
                              ? "bg-[#E5F842] text-[#121316]"
                              : "bg-[#25272F] border border-[#333642] text-slate-400"
                          }`}
                        >
                          #{vid.order_index || idx + 1}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <h4
                            className={`text-sm font-extrabold truncate ${
                              isSelected ? "text-[#E5F842]" : "text-white"
                            }`}
                          >
                            {vid.title}
                          </h4>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>{(vid.file_size / (1024 * 1024)).toFixed(1)} MB</span>
                            <span>•</span>
                            <span className="capitalize">{vid.status}</span>
                            {vid.status === "completed" && (
                              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                AI Indexed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Process Button for Uploaded Videos */}
                        {isAdmin && vid.status === "uploaded" && (
                          <button
                            onClick={(e) => handleProcessVideo(vid, e)}
                            className="px-3 py-1.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 transition-all"
                            title="Transcribe and index with Whisper AI"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#121316]" />
                            <span>Process Video</span>
                          </button>
                        )}

                        {/* Processing Indicator */}
                        {isAdmin && (vid.status === "processing" || vid.status === "queued") && (
                          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>{vid.status === "processing" ? `${vid.progress || 0}%` : "In Queue"}</span>
                          </div>
                        )}

                        {/* Admin Order Controls */}
                        {isAdmin && (
                          <>
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveVideo(idx, "up")}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#2E313B] rounded-lg disabled:opacity-20 cursor-pointer"
                              title="Move lesson up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={idx === course.videos.length - 1}
                              onClick={() => handleMoveVideo(idx, "down")}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#2E313B] rounded-lg disabled:opacity-20 cursor-pointer"
                              title="Move lesson down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => openRenameModal(vid, e)}
                              className="p-1.5 text-slate-400 hover:text-[#E5F842] hover:bg-[#2E313B] rounded-lg cursor-pointer"
                              title="Rename lesson title"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Delete Button */}
                        {isAdmin && (
                          <button
                            onClick={(e) => handleDeleteVideo(vid, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg cursor-pointer"
                            title="Delete lesson"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD VIDEO DIRECTLY TO THIS COURSE */}
          {activeTab === "upload" && (
            <div className="p-2">
              <div className="mb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Upload Video Lesson to "{course.title}"
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Uploaded video will be appended as Lesson #{course.videos.length + 1}.
                </p>
              </div>
              <Upload
                courseId={course.id}
                onUploaded={() => {
                  fetchCourseDetails(course.id, false);
                  setActiveTab("lessons");
                }}
              />
            </div>
          )}

          {/* TAB 3: IMPORT YOUTUBE DIRECTLY TO THIS COURSE */}
          {activeTab === "youtube" && (
            <div className="p-2">
              <div className="mb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Import YouTube Video to "{course.title}"
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Downloaded video will be appended as Lesson #{course.videos.length + 1}.
                </p>
              </div>
              <YouTubeDownloader
                courseId={course.id}
                onDownloaded={() => {
                  fetchCourseDetails(course.id, false);
                  setActiveTab("lessons");
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* RENAME LESSON MODAL */}
      {renamingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#25272F] rounded-3xl border border-[#333642] shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E5F842] text-[#121316] flex items-center justify-center font-extrabold">
                  #{renamingVideo.order_index}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Rename Lesson Title</h3>
                  <p className="text-xs text-slate-400 font-medium">Update the public display title for this lesson</p>
                </div>
              </div>
              <button
                onClick={() => setRenamingVideo(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Lesson Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white font-semibold focus:outline-hidden focus:border-[#E5F842]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingVideo(null)}
                  className="px-4 py-2 rounded-xl border border-[#333642] text-slate-300 font-bold text-xs hover:bg-[#2E313B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renamingSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {renamingSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Title</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COURSE DETAILS MODAL */}
      {editCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#25272F] rounded-3xl border border-[#333642] shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E5F842] text-[#121316] flex items-center justify-center font-extrabold">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Edit Course Info</h3>
                  <p className="text-xs text-slate-400 font-medium">Update title and description</p>
                </div>
              </div>
              <button
                onClick={() => setEditCourseModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#2E313B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Course Title <span className="text-[#E5F842]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white font-semibold focus:outline-hidden focus:border-[#E5F842]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white font-medium focus:outline-hidden focus:border-[#E5F842] resize-none leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#333642]">
                <button
                  type="button"
                  onClick={() => setEditCourseModalOpen(false)}
                  disabled={courseSaving}
                  className="px-5 py-2.5 rounded-xl border border-[#333642] hover:bg-[#2E313B] text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={courseSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {courseSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE LESSON CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={!!deletingVideo}
        title={`Delete Lesson #${deletingVideo?.order_index || ""}?`}
        message={`Are you sure you want to permanently delete "${deletingVideo?.title || deletingVideo?.filename}"?`}
        confirmText="Delete Completely"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeletingVideo}
        onConfirm={confirmDeleteVideo}
        onCancel={() => setDeletingVideo(null)}
      />
    </div>
  );
}
