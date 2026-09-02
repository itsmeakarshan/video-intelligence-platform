import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Video,
  Layers,
  Edit,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Search,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadCourseThumbnail,
  type CourseItem
} from "../api/api";
import { getThumbnailFullUrl } from "../utils/media";
import Navbar from "../components/layout/Navbar";
import ConfirmDialog from "../components/common/ConfirmDialog";
import PromotionalBannerCarousel from "../components/banners/PromotionalBannerCarousel";
import EnrollCourseModal from "../components/courses/EnrollCourseModal";

export default function Courses() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<CourseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [enrollModalCourse, setEnrollModalCourse] = useState<CourseItem | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | string>(0);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchCourses();
  }, []);

  async function fetchCourses() {
    setLoading(true);
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (err: any) {
      console.error("Failed to load courses:", err);
      toast.error("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setTitle("");
    setDescription("");
    setPrice(0);
    setThumbnailUrl("");
    setThumbnailFile(null);
    setThumbnailPreview("");
    setFormError("");
    setCreateModalOpen(true);
  }

  function openEditModal(course: CourseItem, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedCourse(course);
    setTitle(course.title);
    setDescription(course.description);
    setPrice(course.price ?? 0);
    setThumbnailUrl(course.thumbnail_url || "");
    setThumbnailFile(null);
    setThumbnailPreview(course.thumbnail_url ? getThumbnailFullUrl(course.thumbnail_url) : "");
    setFormError("");
    setEditModalOpen(true);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }

  function clearSelectedFile() {
    setThumbnailFile(null);
    setThumbnailPreview("");
    setThumbnailUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Course title is required.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      let finalThumbnail = thumbnailUrl;

      if (thumbnailFile) {
        const uploadRes = await uploadCourseThumbnail(thumbnailFile);
        finalThumbnail = uploadRes.thumbnail_url;
      }

      await createCourse({
        title: title.trim(),
        description: description.trim(),
        thumbnail_url: finalThumbnail || null,
        price: Number(price) || 0
      });

      toast.success("Course created successfully!");
      setCreateModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to create course.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse) return;
    if (!title.trim()) {
      setFormError("Course title is required.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      let finalThumbnail = thumbnailUrl;

      if (thumbnailFile) {
        const uploadRes = await uploadCourseThumbnail(thumbnailFile);
        finalThumbnail = uploadRes.thumbnail_url;
      }

      await updateCourse(selectedCourse.id, {
        title: title.trim(),
        description: description.trim(),
        thumbnail_url: finalThumbnail || null,
        price: Number(price) || 0
      });

      toast.success("Course updated successfully!");
      setEditModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to update course.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteCourse(course: CourseItem, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setDeletingCourse(course);
  }

  async function confirmDeleteCourse() {
    if (!deletingCourse) return;
    setIsDeleting(true);
    try {
      await deleteCourse(deletingCourse.id);
      toast.success(`Course "${deletingCourse.title}" and all its videos completely deleted.`);
      setDeletingCourse(null);
      fetchCourses();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to delete course.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }


  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full bg-transparent min-h-screen pb-16 font-sans text-white">
      <Navbar />
      <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 max-w-[1720px] mx-auto space-y-8 pt-6">

        {/* 0. PROMOTIONAL OFFER & CAMPAIGN BANNER */}
        <PromotionalBannerCarousel isAdmin={isAdmin} />

        {/* 1. HERO HEADER SECTION */}
        <div className="bg-[#25272F] rounded-3xl p-6 sm:p-8 border border-[#333642] shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5F842]/15 border border-[#E5F842]/30 text-[#E5F842] text-xs font-extrabold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-[#E5F842]" />
              <span>Video Curriculum & Course Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isAdmin ? "Course Management Studio" : "Course Catalog & Learning Modules"}
            </h1>
          </div>

          {isAdmin && (
            <div className="shrink-0">
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-sm shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Course</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. SEARCH & STATS BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#25272F] rounded-2xl border border-[#333642] text-xs font-medium text-white placeholder:text-slate-500 focus:outline-hidden focus:border-[#E5F842] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 self-end sm:self-auto">
            <Layers className="w-4 h-4 text-[#E5F842]" />
            <span>
              {filteredCourses.length} Course{filteredCourses.length === 1 ? "" : "s"} Available
            </span>
          </div>
        </div>

        {/* 3. COURSES GRID */}
        {loading ? (
          <div className="p-16 rounded-3xl bg-[#25272F] border border-[#333642] shadow-xs text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#E5F842] animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-300">Loading courses catalog...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-16 rounded-3xl bg-[#25272F] border border-dashed border-[#333642] text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                {searchQuery ? "No matching courses found" : "No courses created yet"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 font-medium">
                {searchQuery
                  ? "Try adjusting your search keywords."
                  : isAdmin
                  ? "Click 'Create New Course' above to publish your first video course."
                  : "Check back soon as your instructors publish new learning modules."}
              </p>
            </div>
            {isAdmin && !searchQuery && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-sm transition-all cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Course</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course) => {
              const fullThumbUrl = getThumbnailFullUrl(course.thumbnail_url);
              const isEnrolled = isAdmin || course.is_enrolled;
              const coursePrice = course.price ?? 0;
              const isFree = coursePrice === 0;

              function handleCardClick() {
                if (isEnrolled) {
                  navigate(`/courses/${course.id}`);
                } else {
                  setEnrollModalCourse(course);
                  setIsEnrollModalOpen(true);
                }
              }

              return (
                <div
                  key={course.id}
                  onClick={handleCardClick}
                  className="group bg-[#25272F] rounded-3xl border border-[#333642] shadow-xs hover:shadow-xl hover:border-[#E5F842]/60 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
                >
                  {/* Thumbnail Image Container */}
                  <div className="relative w-full h-48 bg-[#18191E] overflow-hidden shrink-0">
                    {fullThumbUrl ? (
                      <img
                        src={fullThumbUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#2E313B] via-[#1E2028] to-[#18191E] flex flex-col items-center justify-center p-6 text-white text-center">
                        <BookOpen className="w-12 h-12 text-[#E5F842] mb-2 opacity-80" />
                        <span className="text-xs font-extrabold uppercase tracking-widest text-[#E5F842]">
                          Course Studio
                        </span>
                      </div>
                    )}

                    {/* Lesson Count & Price Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[75%]">
                      <div className="bg-[#18191E]/90 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/10 shadow-xs">
                        <Video className="w-3 h-3 text-[#E5F842]" />
                        <span>{course.video_count} {course.video_count === 1 ? "Lesson" : "Lessons"}</span>
                      </div>

                      {/* Price Tag Badge */}
                      <span className={`px-2.5 py-0.8 rounded-full text-[11px] font-black shadow-md ${
                        isFree
                          ? "bg-emerald-500 text-white"
                          : "bg-[#E5F842] text-[#121316]"
                      }`}>
                        {isFree ? "FREE" : `£${coursePrice.toFixed(2)}`}
                      </span>
                    </div>

                    {/* Admin Action Menu */}
                    {isAdmin && (
                      <div
                        className="absolute top-3 right-3 flex items-center gap-1 bg-[#18191E]/90 backdrop-blur-md p-1 rounded-xl shadow-xs border border-[#333642]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => openEditModal(course, e)}
                          className="p-1.5 text-slate-400 hover:text-[#E5F842] hover:bg-[#2E313B] rounded-lg transition-colors cursor-pointer"
                          title="Edit course details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCourse(course, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
                          title="Delete course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Course Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-extrabold text-white group-hover:text-[#E5F842] transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        {isEnrolled && (
                          <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                            Enrolled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                        {course.description || "No description provided for this course."}
                      </p>
                    </div>

                    {/* Footer Info & Action */}
                    <div className="pt-4 border-t border-[#333642] flex items-center justify-between">
                      <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                        <span>By {course.user_name || "Instructor"}</span>
                      </div>

                      {isEnrolled ? (
                        <div className="flex items-center gap-1 text-xs font-extrabold text-[#E5F842] group-hover:translate-x-0.5 transition-transform">
                          <span>{isAdmin ? "Manage Course" : "Start Learning"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEnrollModalCourse(course);
                            setIsEnrollModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-sm transition-all cursor-pointer"
                        >
                          <span>{isFree ? "Enroll Free" : `Enroll (£${coursePrice.toFixed(2)})`}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE COURSE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#25272F] rounded-3xl border border-[#333642] shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E5F842] text-[#121316] flex items-center justify-center font-extrabold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Create New Course</h3>
                  <p className="text-xs text-slate-400 font-medium">Add a structured learning module with videos</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#2E313B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Course Title <span className="text-[#E5F842]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masterclass in Computer Architecture & OS"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white font-semibold focus:outline-hidden focus:border-[#E5F842]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what students will learn in this course..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white font-medium focus:outline-hidden focus:border-[#E5F842] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Course Price (£ GBP) <span className="text-[#E5F842]">*</span></span>
                  <span className="text-[10px] text-slate-500 font-normal">Set £0 for Free courses</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">£</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white font-bold focus:outline-hidden focus:border-[#E5F842]"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {[0, 19.99, 49.99, 99.99].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPrice(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        Number(price) === preset
                          ? "bg-[#E5F842] text-[#121316] border-[#E5F842]"
                          : "bg-[#18191E] text-slate-400 border-[#333642] hover:border-slate-400"
                      }`}
                    >
                      {preset === 0 ? "Free (£0)" : `£${preset}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnail Image Picker from Device */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Course Thumbnail (Cover Image)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                  className="hidden"
                />

                {thumbnailPreview ? (
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-[#333642] group bg-[#18191E]">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-[#E5F842] text-[#121316] rounded-xl text-xs font-extrabold shadow-xs hover:bg-[#D6EA35] transition-colors"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-rose-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-[#333642] hover:border-[#E5F842] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#18191E]/60 hover:bg-[#18191E] flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#2E313B] text-[#E5F842] flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#E5F842]">
                        Choose thumbnail from device
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        Supports PNG, JPG, WEBP (Max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#333642]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl border border-[#333642] hover:bg-[#2E313B] text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Course...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Create Course</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {editModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#25272F] rounded-3xl border border-[#333642] shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E5F842] text-[#121316] flex items-center justify-center font-extrabold">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Edit Course Details</h3>
                  <p className="text-xs text-slate-400 font-medium">Update title, description, or cover image</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#2E313B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Course Title <span className="text-[#E5F842]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white font-semibold focus:outline-hidden focus:border-[#E5F842]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white font-medium focus:outline-hidden focus:border-[#E5F842] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Course Price (£ GBP) <span className="text-[#E5F842]">*</span></span>
                  <span className="text-[10px] text-slate-500 font-normal">Set £0 for Free courses</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">£</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white font-bold focus:outline-hidden focus:border-[#E5F842]"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {[0, 19.99, 49.99, 99.99].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPrice(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        Number(price) === preset
                          ? "bg-[#E5F842] text-[#121316] border-[#E5F842]"
                          : "bg-[#18191E] text-slate-400 border-[#333642] hover:border-slate-400"
                      }`}
                    >
                      {preset === 0 ? "Free (£0)" : `£${preset}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnail Image Picker from Device */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Course Thumbnail (Cover Image)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                  className="hidden"
                />

                {thumbnailPreview ? (
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-[#333642] group bg-[#18191E]">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-[#E5F842] text-[#121316] rounded-xl text-xs font-extrabold shadow-xs hover:bg-[#D6EA35] transition-colors"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-rose-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-[#333642] hover:border-[#E5F842] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#18191E]/60 hover:bg-[#18191E] flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#2E313B] text-[#E5F842] flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#E5F842]">
                        Choose thumbnail from device
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        Supports PNG, JPG, WEBP (Max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#333642]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl border border-[#333642] hover:bg-[#2E313B] text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
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

      {/* ENROLL COURSE CONFIRMATION MODAL */}
      <EnrollCourseModal
        isOpen={isEnrollModalOpen}
        course={enrollModalCourse}
        onClose={() => {
          setIsEnrollModalOpen(false);
          setEnrollModalCourse(null);
        }}
        onEnrolled={() => {
          fetchCourses();
        }}
      />

      {/* DELETE COURSE CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={!!deletingCourse}
        title={`Delete Course "${deletingCourse?.title}"?`}
        message={`Are you sure you want to permanently delete "${deletingCourse?.title}"? All associated lessons, video files, and AI transcripts will be completely deleted.`}
        confirmText="Delete Course Completely"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteCourse}
        onCancel={() => setDeletingCourse(null)}
      />
    </div>
  );
}
