import React, { useState, useEffect, useRef } from "react";
import { X, UploadCloud, Sparkles, BookOpen, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createPromotionBanner, type PromotionBanner } from "../../api/bannerApi";
import { getCourses, type CourseItem } from "../../api/api";

interface AddBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBannerCreated: (banner: PromotionBanner) => void;
}

export default function AddBannerModal({ isOpen, onClose, onBannerCreated }: AddBannerModalProps) {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCourses();
      setError("");
    }
  }, [isOpen]);

  async function loadCourses() {
    setLoadingCourses(true);
    try {
      const data = await getCourses();
      setCourses(data);
      if (data.length > 0 && selectedCourseId === "") {
        setSelectedCourseId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load courses for banner dropdown:", err);
    } finally {
      setLoadingCourses(false);
    }
  }

  if (!isOpen) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP, GIF).");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer.files?.length) return;
    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) {
      setError("Please upload a promotion banner image from your device.");
      return;
    }
    if (!selectedCourseId) {
      setError("Please select a target course from the dropdown.");
      return;
    }

    const targetCourse = courses.find((c) => c.id === Number(selectedCourseId));
    const courseTitle = targetCourse ? targetCourse.title : "Course Offer";
    const targetUrl = `/courses/${selectedCourseId}`;

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("title", courseTitle);
      formData.append("targetUrl", targetUrl);

      const created = await createPromotionBanner(formData);
      toast.success("Promotional banner published successfully!");
      onBannerCreated(created);
      onClose();
    } catch (err: any) {
      console.error("Banner create error:", err);
      const msg = err.response?.data?.error || "Failed to create promotional banner.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#1E2028] border border-[#333642] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-[#333642] bg-[#25272F] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E5F842]/15 text-[#E5F842] flex items-center justify-center font-extrabold shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Add Promotion Banner</h2>
              <p className="text-xs text-slate-400 font-medium">Upload banner image & link it directly to a course</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#18191E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. Image Upload Zone */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Banner Artwork / Offer Image <span className="text-rose-400">*</span>
            </label>

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#333642] bg-black max-h-56 group">
                <img
                  src={imagePreview}
                  alt="Banner preview"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-[#121316] font-extrabold text-xs shadow-lg cursor-pointer"
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-lg cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-44 rounded-2xl border-2 border-dashed border-[#3E4251] hover:border-[#E5F842] bg-[#18191E]/60 hover:bg-[#18191E] transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#25272F] group-hover:bg-[#E5F842]/15 text-[#E5F842] flex items-center justify-center mb-2 transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-white mb-0.5">
                  Click to upload promotion image from device
                </p>
                <p className="text-[11px] text-slate-400">
                  Supports JPG, PNG, WebP, GIF (Landscape recommended)
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* 2. Target Course Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#E5F842]" />
              Target Course (Opens when banner is clicked) <span className="text-rose-400">*</span>
            </label>

            {loadingCourses ? (
              <div className="p-3 bg-[#141519] rounded-2xl border border-[#333642] text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#E5F842]" />
                <span>Loading available courses...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="p-3 bg-[#141519] rounded-2xl border border-[#333642] text-xs text-amber-400">
                No courses available. Please create a course first.
              </div>
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                className="w-full px-4 py-3 bg-[#141519] border border-[#333642] focus:border-[#E5F842] rounded-2xl text-xs font-bold text-white focus:outline-hidden transition-colors cursor-pointer"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id} className="bg-[#1E2028] text-white">
                    {course.title} ({course.video_count} {course.video_count === 1 ? "Lesson" : "Lessons"})
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-400">
              When learners or students click on this banner, they will directly be routed into this course.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl bg-[#25272F] hover:bg-[#2E313B] text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !imageFile || !selectedCourseId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#121316]" />
                  <span>Publishing Banner...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#121316]" />
                  <span>Publish Banner</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
