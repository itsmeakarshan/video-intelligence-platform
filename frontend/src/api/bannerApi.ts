import { api } from "./api";

export interface PromotionBanner {
  id: number;
  title: string;
  subtitle?: string;
  discount_tag?: string;
  image_url: string;
  target_url?: string;
  is_active: boolean;
  display_order: number;
  created_by_user_id?: number;
  created_at: string;
}

export async function getPromotionBanners(): Promise<PromotionBanner[]> {
  const res = await api.get("/banners");
  return res.data;
}

export async function createPromotionBanner(formData: FormData): Promise<PromotionBanner> {
  const res = await api.post("/banners", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return res.data;
}

export async function deletePromotionBanner(id: number): Promise<{ success: boolean; id: number }> {
  const res = await api.delete(`/banners/${id}`);
  return res.data;
}

export async function togglePromotionBanner(id: number): Promise<PromotionBanner> {
  const res = await api.patch(`/banners/${id}/toggle`);
  return res.data;
}
