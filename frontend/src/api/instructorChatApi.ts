import { api } from "./api";

export interface InstructorChatChannel {
  id: number;
  course_id: number;
  course_title: string;
  student_id: number;
  student_name: string;
  student_email: string;
  instructor_id?: number;
  instructor_name?: string;
  title: string;
  last_message?: string;
  last_message_type?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InstructorChatMessage {
  id: number;
  channel_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: "student" | "admin";
  text: string;
  message_type: "text" | "image" | "document" | "voice" | "video" | "youtube";
  media_url?: string;
  file_name?: string;
  file_size?: number;
  extra_data?: string;
  created_at: string;
}

export interface SendMessagePayload {
  text?: string;
  message_type?: "text" | "image" | "document" | "voice" | "video" | "youtube";
  media_url?: string;
  file_name?: string;
  file_size?: number;
  extra_data?: string;
}

export async function getInstructorChatChannels(courseId?: number): Promise<InstructorChatChannel[]> {
  const url = courseId ? `/instructor-chat/channels?course_id=${courseId}` : "/instructor-chat/channels";
  const res = await api.get(url);
  return res.data;
}

export async function createOrGetInstructorChatChannel(courseId: number, studentId?: number, title?: string): Promise<InstructorChatChannel> {
  const res = await api.post("/instructor-chat/channels", {
    course_id: courseId,
    student_id: studentId,
    title
  });
  return res.data;
}

export async function getInstructorChatMessages(channelId: number): Promise<InstructorChatMessage[]> {
  const res = await api.get(`/instructor-chat/channels/${channelId}/messages`);
  return res.data;
}

export async function sendInstructorChatMessage(channelId: number, payload: SendMessagePayload): Promise<InstructorChatMessage> {
  const res = await api.post(`/instructor-chat/channels/${channelId}/messages`, payload);
  return res.data;
}

export async function uploadInstructorChatMedia(
  channelId: number,
  file: File,
  messageType?: "image" | "document" | "voice" | "video",
  text?: string,
  extraData?: string
): Promise<InstructorChatMessage> {
  const formData = new FormData();
  formData.append("file", file);
  if (messageType) formData.append("messageType", messageType);
  if (text) formData.append("text", text);
  if (extraData) formData.append("extraData", extraData);

  const res = await api.post(`/instructor-chat/channels/${channelId}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return res.data;
}

export async function deleteInstructorChatMessage(messageId: number): Promise<{ success: boolean; message_id: number }> {
  const res = await api.delete(`/instructor-chat/messages/${messageId}`);
  return res.data;
}

