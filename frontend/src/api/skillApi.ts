import { api } from "./api";

export interface CourseSkillItem {
  id: number;
  course_id: number;
  name: string;
  description: string;
  category: string;
  order_index: number;
  created_at: string;
}

export interface CourseSkillMasteryItem {
  skill_id: number;
  skill_name: string;
  category: string;
  description: string;
  questions_attempted: number;
  questions_correct: number;
  mastery_percentage: number;
  status: "Mastered" | "Needs Practice" | "Unassessed";
}

export interface CourseMasteryProfile {
  course_id: number;
  course_title: string;
  user_id: number;
  user_name: string;
  overall_mastery_percentage: number;
  total_skills: number;
  mastered_count: number;
  needs_practice_count: number;
  unassessed_count: number;
  skills: CourseSkillMasteryItem[];
}

export interface CourseAdminSkillStat {
  skill_id: number;
  skill_name: string;
  category: string;
  average_mastery: number;
  students_mastered_count: number;
  students_needing_practice_count: number;
  total_tested_students: number;
}

export interface CourseAdminStudentMasteryRow {
  user_id: number;
  student_name: string;
  student_email: string;
  quizzes_taken: number;
  mastered_skills_count: number;
  total_skills_count: number;
  overall_percentage: number;
  last_quiz_at: string | null;
}

export interface CourseAdminMasterySummary {
  course_id: number;
  course_title: string;
  total_students_enrolled: number;
  total_quizzes_attempted: number;
  average_score: number;
  skill_summaries: CourseAdminSkillStat[];
  student_masteries: CourseAdminStudentMasteryRow[];
}

export async function getCourseSkills(courseId: number): Promise<CourseSkillItem[]> {
  const response = await api.get(`/courses/${courseId}/skills`);
  return response.data;
}

export async function generateCourseSkills(courseId: number): Promise<{ message: string; skills: CourseSkillItem[] }> {
  const response = await api.post(`/courses/${courseId}/skills/generate`);
  return response.data;
}

export async function createCourseSkill(
  courseId: number,
  data: { name: string; description?: string; category?: string; order_index?: number }
): Promise<CourseSkillItem> {
  const response = await api.post(`/courses/${courseId}/skills`, data);
  return response.data;
}

export async function updateCourseSkill(
  courseId: number,
  skillId: number,
  data: { name?: string; description?: string; category?: string; order_index?: number }
): Promise<CourseSkillItem> {
  const response = await api.put(`/courses/${courseId}/skills/${skillId}`, data);
  return response.data;
}

export async function deleteCourseSkill(courseId: number, skillId: number): Promise<void> {
  await api.delete(`/courses/${courseId}/skills/${skillId}`);
}

export async function getStudentCourseMastery(courseId: number): Promise<CourseMasteryProfile> {
  const response = await api.get(`/courses/${courseId}/mastery`);
  return response.data;
}

export async function getCourseAdminMasterySummary(courseId: number): Promise<CourseAdminMasterySummary> {
  const response = await api.get(`/courses/${courseId}/admin/mastery-summary`);
  return response.data;
}

export async function getUserCourseMasteryAsAdmin(userId: number, courseId: number): Promise<CourseMasteryProfile> {
  const response = await api.get(`/admin/users/${userId}/course-mastery/${courseId}`);
  return response.data;
}

export async function getOverallAdminMasterySummary(courseId?: number): Promise<CourseAdminMasterySummary> {
  const url = courseId && courseId > 0 ? `/admin/mastery-summary?courseId=${courseId}` : `/admin/mastery-summary`;
  const response = await api.get(url);
  return response.data;
}
