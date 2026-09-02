import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getPromotionBanners,
  deletePromotionBanner,
  togglePromotionBanner,
  type PromotionBanner
} from "../../api/bannerApi";
import { getBannerImageUrl } from "../../utils/media";
import AddBannerModal from "./AddBannerModal";
import ConfirmDialog from "../common/ConfirmDialog";

interface PromotionalBannerCarouselProps {
  isAdmin: boolean;
}

export default function PromotionalBannerCarousel({ isAdmin }: PromotionalBannerCarouselProps) {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<PromotionBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingBannerId, setDeletingBannerId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  // Auto slide effect
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  async function fetchBanners() {
    setLoading(true);
    try {
      const data = await getPromotionBanners();
      setBanners(data);
      if (currentIndex >= data.length) {
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error("Failed to load banners:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleBannerCreated(newBanner: PromotionBanner) {
    setBanners((prev) => [newBanner, ...prev]);
    setCurrentIndex(0);
  }

  async function handleDeleteBanner(id: number) {
    setIsDeleting(true);
    try {
      await deletePromotionBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      setCurrentIndex(0);
      toast.success("Banner removed.");
    } catch (err) {
      console.error("Failed to delete banner:", err);
      toast.error("Failed to delete banner.");
    } finally {
      setIsDeleting(false);
      setDeletingBannerId(null);
    }
  }

  async function handleToggleBanner(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const updated = await togglePromotionBanner(id);
      setBanners((prev) => prev.map((b) => (b.id === id ? updated : b)));
      toast.success(updated.is_active ? "Banner activated." : "Banner paused.");
    } catch (err) {
      toast.error("Failed to toggle banner status.");
    }
  }


  function handleBannerClick(banner: PromotionBanner) {
    if (banner.target_url) {
      if (banner.target_url.startsWith("http://") || banner.target_url.startsWith("https://")) {
        window.open(banner.target_url, "_blank");
      } else {
        navigate(banner.target_url);
      }
    }
  }

  // If learner and no banners exist, don't show empty placeholder
  if (!loading && banners.length === 0 && !isAdmin) {
    return null;
  }

  return (
    <div className="w-full relative space-y-3">
      {/* Admin Quick Action Header */}
      {isAdmin && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E5F842] animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Promotional Offers & Campaign Studio
            </span>
            <span className="px-2 py-0.2 rounded-full bg-[#25272F] text-[10px] font-bold text-slate-400 border border-[#333642]">
              {banners.length} {banners.length === 1 ? "Offer" : "Offers"} Active
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#121316]" />
            <span>Add Promotional Banner</span>
          </button>
        </div>
      )}

      {/* Banner View Container */}
      {banners.length === 0 && isAdmin ? (
        <div
          onClick={() => setIsAddModalOpen(true)}
          className="w-full h-44 rounded-3xl border-2 border-dashed border-[#3E4251] hover:border-[#E5F842] bg-[#1E2028]/60 hover:bg-[#1E2028] transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group shadow-xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#25272F] group-hover:bg-[#E5F842]/15 text-[#E5F842] flex items-center justify-center mb-2 transition-colors">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-white mb-1">
            No Promotional Banners Created
          </h3>
          <p className="text-xs text-slate-400 max-w-md">
            Click to upload promotion images from your device and link them to courses.
          </p>
        </div>
      ) : banners.length > 0 ? (
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative w-full h-52 sm:h-64 md:h-72 rounded-3xl overflow-hidden border border-[#3E4251] shadow-2xl bg-[#121316] group"
        >
          {/* Slides */}
          {banners.map((banner, index) => {
            const isActive = index === currentIndex;
            const fullImgUrl = getBannerImageUrl(banner.image_url);

            return (
              <div
                key={banner.id}
                onClick={() => handleBannerClick(banner)}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${
                  isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                {/* Background Banner Image */}
                <img
                  src={fullImgUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover transform scale-100 group-hover:scale-102 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop";
                  }}
                />

                {/* Subtle bottom gradient for readability of the course pill */}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Floating Course Link Pill */}
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#121316]/90 hover:bg-[#121316] text-white border border-[#3E4251] group-hover:border-[#E5F842] backdrop-blur-md text-xs font-extrabold shadow-xl transition-all">
                    <BookOpen className="w-4 h-4 text-[#E5F842]" />
                    <span className="truncate max-w-xs sm:max-w-md">{banner.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#E5F842] group-hover:translate-x-1 transition-transform" />
                  </div>
                  {!banner.is_active && isAdmin && (
                    <span className="px-3 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold backdrop-blur-md">
                      Paused (Hidden from Learners)
                    </span>
                  )}
                </div>

                {/* Admin Management Toolbar */}
                {isAdmin && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-4 right-4 z-30 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleToggleBanner(banner.id, e)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                        banner.is_active
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                      }`}
                      title={banner.is_active ? "Click to Pause" : "Click to Activate"}
                    >
                      {banner.is_active ? "Active" : "Paused"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingBannerId(banner.id)}
                      className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Navigation Arrows (if >1 banner) */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white border border-white/15 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev + 1) % banners.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white border border-white/15 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Slide Indicator Dots */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex
                      ? "w-6 bg-[#E5F842]"
                      : "w-2 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Add Banner Modal */}
      <AddBannerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onBannerCreated={handleBannerCreated}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deletingBannerId !== null}
        title="Delete Promotional Banner"
        message="Are you sure you want to remove this promotional banner? It will no longer be visible to learners."
        confirmText="Delete Banner"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={() => {
          if (deletingBannerId !== null) {
            handleDeleteBanner(deletingBannerId);
          }
        }}
        onCancel={() => setDeletingBannerId(null)}
      />
    </div>
  );
}
