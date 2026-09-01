import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import {
  getAdminUsers,
  createAdminUser,
  deleteAdminUser,
  getAdminStats
} from "../api/api";
import type { AdminUserListItem, AdminPlatformStats } from "../api/api";
import {
  Users,
  UserPlus,
  Video,
  Shield,
  Trash2,
  TrendingUp,
  Search,
  Award,
  RefreshCw,
  BookOpen
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import ConfirmDialog from "../components/common/ConfirmDialog";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user: authUser, isAdmin } = useAuth();

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("student");
  const [submitting, setSubmitting] = useState(false);

  // Delete User Modal state
  const [deletingUser, setDeletingUser] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/", { replace: true });
      return;
    }
    loadData();
  }, [isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        getAdminUsers(),
        getAdminStats()
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err: any) {
      console.error("Failed to load admin data:", err);
      toast.error(err.response?.data?.detail || "Failed to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      await createAdminUser({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole
      });
      toast.success(`Account created for ${newName} (${newRole})`);
      setModalOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("student");
      loadData();
    } catch (err: any) {
      console.error("Create user error:", err);
      toast.error(err.response?.data?.detail || "Failed to create user account.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteUser(userId: number, userName: string) {
    setDeletingUser({ id: userId, name: userName });
  }

  async function confirmDeleteUser() {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await deleteAdminUser(deletingUser.id);
      toast.success(`User "${deletingUser.name}" deleted.`);
      setDeletingUser(null);
      loadData();
    } catch (err: any) {
      console.error("Delete user error:", err);
      toast.error(err.response?.data?.detail || "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredUsers = users
    .filter((u) => u.role !== "admin")
    .filter((u) => {
      const q = searchQuery.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });

  return (
    <div className="min-h-screen bg-transparent text-white pb-16">
      <Navbar />
      <Toaster position="top-right" />

      <main className="w-full px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#333642]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#25272F] border border-[#333642] text-[#E5F842] flex items-center justify-center shadow-lg shadow-black/40">
              <Shield className="w-8 h-8 text-[#E5F842]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Instructor & Admin Control Room
                </h1>
                <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30 rounded-full">
                  RBAC Mode
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                Manage student accounts, curated video repository, and system-wide learning analytics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25272F] border border-[#333642] text-white font-semibold text-sm hover:bg-[#2E313B] hover:border-[#E5F842]/40 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#E5F842]" : "text-slate-400"}`} />
              Refresh
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-sm shadow-md shadow-black/30 transition-all duration-150 cursor-pointer"
            >
              <UserPlus className="w-4.5 h-4.5" />
              Create New User
            </button>
          </div>
        </div>

        {/* Platform Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8">
          <div className="bg-[#25272F] rounded-3xl p-5 border border-[#333642] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Enrolled Students
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white">
                {stats ? stats.total_students : "--"}
              </span>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {stats ? `${stats.total_students} Active Student${stats.total_students === 1 ? "" : "s"}` : "Loading..."}
              </p>
            </div>
          </div>

          <div className="bg-[#25272F] rounded-3xl p-5 border border-[#333642] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Curated Videos
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#E5F842]">
                {stats ? stats.completed_videos : "--"}
              </span>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {stats ? `${stats.total_videos} total uploaded` : "Loading..."}
              </p>
            </div>
          </div>

          <div className="bg-[#25272F] rounded-3xl p-5 border border-[#333642] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quizzes Completed
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white">
                {stats ? stats.total_quiz_attempts : "--"}
              </span>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Across all student sessions
              </p>
            </div>
          </div>

          <div className="bg-[#25272F] rounded-3xl p-5 border border-[#333642] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Platform Avg Score
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#E5F842]">
                {stats ? `${stats.platform_average_score}%` : "--%"}
              </span>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Average learner mastery
              </p>
            </div>
          </div>
        </div>

        {/* Student Management Section */}
        <div className="mt-10 bg-[#25272F] rounded-3xl border border-[#333642] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#333642] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Enrolled Students & Performance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Inspect student learning progress, quiz attempts, and individual mastery metrics.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#18191E] text-white placeholder-slate-500 rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#18191E] text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-[#333642]">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4 text-center">Enrolled Courses</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-center">Quizzes Taken</th>
                  <th className="px-6 py-4 text-center">Last Score</th>
                  <th className="px-6 py-4 text-center">Average Score</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333642]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isCurrentUser = authUser?.id === u.id;
                    const courseCount = u.enrolled_courses_count ?? 1;

                    return (
                      <tr key={u.id} className="hover:bg-[#2E313B] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              u.role === "admin"
                                ? "bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30"
                                : "bg-[#18191E] text-slate-300 border border-[#333642]"
                            }`}>
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                {u.name}
                                {isCurrentUser && (
                                  <span className="text-[10px] bg-[#18191E] text-[#E5F842] border border-[#E5F842]/30 px-1.5 py-0.2 rounded-md font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold rounded-xl bg-[#18191E] border border-[#333642] text-[#E5F842]">
                            <BookOpen className="w-3.5 h-3.5 text-[#E5F842]" />
                            <span>{courseCount} {courseCount === 1 ? "Course" : "Courses"}</span>
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(u.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>

                        <td className="px-6 py-4 text-center font-semibold text-slate-200">
                          {u.quiz_attempt_count}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {u.last_score_percentage != null ? (
                            <span className={`font-bold text-xs px-2.5 py-1 rounded-lg ${
                              u.last_score_percentage >= 70
                                ? "bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30"
                                : u.last_score_percentage >= 50
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            }`}>
                              {Math.round((u.last_score_percentage / 100) * 10)}/10 ({u.last_score_percentage.toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">None</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {u.average_score_percentage != null ? (
                            <span className="font-bold text-xs text-white">
                              {u.average_score_percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">--</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCurrentUser && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Delete user account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Create User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#25272F] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#333642] animate-in fade-in zoom-in-95 duration-150 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-[#333642]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-[#E5F842]" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Create New User
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white placeholder-slate-500 focus:outline-hidden focus:border-[#E5F842] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. student@school.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white placeholder-slate-500 focus:outline-hidden focus:border-[#E5F842] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#18191E] rounded-xl border border-[#333642] text-white placeholder-slate-500 focus:outline-hidden focus:border-[#E5F842] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRole("student")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      newRole === "student"
                        ? "bg-[#E5F842]/20 border-[#E5F842] text-[#E5F842]"
                        : "bg-[#18191E] border-[#333642] text-slate-400 hover:bg-[#2E313B]"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Student
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole("admin")}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      newRole === "admin"
                        ? "bg-[#E5F842]/20 border-[#E5F842] text-[#E5F842]"
                        : "bg-[#18191E] border-[#333642] text-slate-400 hover:bg-[#2E313B]"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[#333642] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-[#2E313B] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-extrabold text-[#121316] bg-[#E5F842] hover:bg-[#D6EA35] rounded-xl shadow-md shadow-black/30 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={!!deletingUser}
        title={`Delete User "${deletingUser?.name}"?`}
        message={`Are you sure you want to permanently delete user "${deletingUser?.name}"? All their quiz history and performance records will be permanently removed.`}
        confirmText="Delete User"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
}
