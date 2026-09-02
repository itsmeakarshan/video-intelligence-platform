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
  Search,
  RefreshCw,
  BookOpen,
  GraduationCap,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Coins
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import toast, { Toaster } from "react-hot-toast";
import ConfirmDialog from "../components/common/ConfirmDialog";

// Electric lime / Yellowish-green and complementary color palette
const CHART_COLORS = [
  "#E5F842", // Primary Electric Lime
  "#A3E635", // Vibrant Lime
  "#4ADE80", // Emerald Green
  "#2DD4BF", // Teal
  "#38BDF8", // Cyan Sky
  "#FBBF24"  // Warm Amber
];

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

  // Prepare chart data from real stats
  const revenueChartData = (stats?.course_revenue_stats || []).map((c) => ({
    name: c.course_title,
    earnings: c.total_earnings,
    students: c.enrolled_students_count,
    price: c.price,
    percentage: c.percentage_of_earnings
  }));

  const enrollmentPieData = (stats?.course_revenue_stats || []).map((c) => ({
    name: c.course_title,
    value: c.enrolled_students_count,
    earnings: c.total_earnings,
    percentage: c.percentage_of_students,
    price: c.price
  }));

  return (
    <div className="min-h-screen bg-[#121316] text-white flex flex-col">
      <Navbar />
      <Toaster position="top-right" />

      {/* Full-width Natural Container */}
      <main className="w-full flex-1 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-14 py-8 space-y-8">
        
        {/* Header Banner - Full Width */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#333642]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#25272F] border border-[#333642] text-[#E5F842] flex items-center justify-center shadow-lg shadow-black/40 shrink-0">
              <Shield className="w-8 h-8 text-[#E5F842]" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Instructor & Admin Control Room
                </h1>
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30 rounded-full">
                  Financial & Platform Intelligence
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                Live platform earnings calculation, course enrollment analytics, and complete learner accounts administration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25272F] border border-[#333642] text-white font-semibold text-sm hover:bg-[#2E313B] hover:border-[#E5F842]/40 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#E5F842]" : "text-slate-400"}`} />
              Refresh Data
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5F842] hover:bg-[#D6EA35] text-[#121316] font-extrabold text-sm shadow-md shadow-black/30 transition-all duration-150 cursor-pointer"
            >
              <UserPlus className="w-4.5 h-4.5 text-[#121316]" />
              Create New User
            </button>
          </div>
        </div>

        {/* Top Metric Cards - Natural 4-Column Responsive Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          
          {/* Card 1: Total Earnings Till Now */}
          <div className="bg-[#25272F] rounded-3xl p-6 border border-[#333642] shadow-sm hover:border-[#E5F842]/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Earnings Till Now
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center font-extrabold text-lg">
                <Coins className="w-5 h-5 text-[#E5F842]" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#E5F842] tracking-tight">
                {stats ? `£${stats.total_earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "--"}
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E5F842] bg-[#E5F842]/10 px-2 py-0.5 rounded-md border border-[#E5F842]/20">
                  <TrendingUp className="w-3 h-3" />
                  Realtime Revenue
                </span>
                <span className="text-xs text-slate-400 font-medium truncate">
                  {stats ? `${stats.total_enrollments} total enrollments` : "Loading..."}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Enrolled Students */}
          <div className="bg-[#25272F] rounded-3xl p-6 border border-[#333642] shadow-sm hover:border-[#E5F842]/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Students
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#E5F842]" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {stats ? stats.total_students : "--"}
              </span>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                {stats ? `${stats.total_students} registered student accounts` : "Loading..."}
              </p>
            </div>
          </div>

          {/* Card 3: Total Course Enrollments */}
          <div className="bg-[#25272F] rounded-3xl p-6 border border-[#333642] shadow-sm hover:border-[#E5F842]/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Course Enrollments
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[#E5F842]" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {stats ? stats.total_enrollments : "--"}
              </span>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                {stats ? `Across ${stats.total_courses} published courses` : "Loading..."}
              </p>
            </div>
          </div>

          {/* Card 4: Curated Courses & Videos */}
          <div className="bg-[#25272F] rounded-3xl p-6 border border-[#333642] shadow-sm hover:border-[#E5F842]/50 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Curated Courses & Lessons
              </span>
              <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center">
                <Video className="w-5 h-5 text-[#E5F842]" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {stats ? `${stats.total_courses} Courses` : "--"}
              </span>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                {stats ? `${stats.completed_videos} processed video modules` : "Loading..."}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Analytics Section (Bar Graph + Pie Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* BAR GRAPH: Earnings by Course */}
          <div className="bg-[#25272F] rounded-3xl p-6 sm:p-7 border border-[#333642] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#333642] flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-[#E5F842]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Course Revenue & Earnings
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Calculated from enrolled students & course price (£ GBP)
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 text-xs font-bold rounded-xl bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30">
                  {stats ? `£${stats.total_earnings.toFixed(2)} Total Revenue` : "--"}
                </span>
              </div>

              {/* Bar Chart Container */}
              <div className="h-80 w-full pt-6">
                {revenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueChartData}
                      margin={{ top: 15, right: 15, left: -5, bottom: 25 }}
                    >
                      <XAxis
                        dataKey="name"
                        stroke="#94A3B8"
                        fontSize={12}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `£${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18191E",
                          border: "1px solid #333642",
                          borderRadius: "1rem",
                          color: "#FFFFFF",
                          boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.6)",
                          padding: "12px 16px"
                        }}
                        cursor={{ fill: "rgba(229, 248, 66, 0.08)" }}
                        formatter={(val: any, _name: any, item: any) => [
                          `£${Number(val).toFixed(2)} (${item.payload.students} students @ £${item.payload.price})`,
                          "Total Earned"
                        ]}
                      />
                      <Bar
                        dataKey="earnings"
                        fill="#E5F842"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-medium">
                    No course earnings data found.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom summary pill list */}
            <div className="pt-4 border-t border-[#333642] grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {revenueChartData.slice(0, 3).map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-[#18191E] border border-[#333642]">
                  <p className="text-xs font-semibold text-slate-400 truncate">
                    {item.name}
                  </p>
                  <p className="text-sm font-extrabold text-[#E5F842] mt-0.5">
                    £{item.earnings.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {item.students} students • {item.percentage}% revenue
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* PIE CHART: Student Enrollment Distribution */}
          <div className="bg-[#25272F] rounded-3xl p-6 sm:p-7 border border-[#333642] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#333642] flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#18191E] border border-[#333642] text-[#E5F842] flex items-center justify-center shrink-0">
                    <PieChartIcon className="w-5 h-5 text-[#E5F842]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Students Enrolled by Course
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Distribution of student enrollments per course
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 text-xs font-bold rounded-xl bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30">
                  {stats ? `${stats.total_enrollments} Total Seats` : "--"}
                </span>
              </div>

              {/* Pie Chart Container */}
              <div className="h-80 w-full pt-2">
                {enrollmentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={enrollmentPieData}
                        cx="50%"
                        cy="48%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {enrollmentPieData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke="#18191E"
                            strokeWidth={2.5}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18191E",
                          border: "1px solid #333642",
                          borderRadius: "1rem",
                          color: "#FFFFFF",
                          boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.6)",
                          padding: "12px 16px"
                        }}
                        formatter={(val: any, _name: any, item: any) => [
                          `${val} Students (${item.payload.percentage}% of total enrollments)`,
                          item.payload.name
                        ]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={40}
                        formatter={(value) => (
                          <span className="text-xs font-semibold text-slate-300">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-medium">
                    No course enrollment data found.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom summary row */}
            <div className="pt-4 border-t border-[#333642] flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Active courses: <strong className="text-white">{enrollmentPieData.length}</strong></span>
              <span>Total enrollments: <strong className="text-[#E5F842]">{stats?.total_enrollments ?? 0}</strong></span>
              <span>Total revenue: <strong className="text-[#E5F842]">£{stats?.total_earnings.toFixed(2) ?? "0.00"}</strong></span>
            </div>
          </div>

        </div>

        {/* Course Performance Breakdown Table - Full Width */}
        {stats && stats.course_revenue_stats && stats.course_revenue_stats.length > 0 && (
          <div className="bg-[#25272F] rounded-3xl border border-[#333642] shadow-sm p-6 sm:p-7">
            <div className="flex items-center justify-between pb-4 border-b border-[#333642] mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Course Financial & Enrollment Ledger
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Detailed revenue calculation for each published curriculum
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {stats.course_revenue_stats.length} Courses Total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {stats.course_revenue_stats.map((course, idx) => (
                <div
                  key={course.course_id || idx}
                  className="p-4 rounded-2xl bg-[#18191E] border border-[#333642] hover:border-[#E5F842]/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="text-xs font-bold text-slate-400">
                      £{course.price.toFixed(2)} / seat
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-white truncate" title={course.course_title}>
                      {course.course_title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {course.enrolled_students_count} students enrolled
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#333642]/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Earned</span>
                    <span className="text-sm font-extrabold text-[#E5F842]">
                      £{course.total_earnings.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Accounts Management Table - Full Width */}
        <div className="bg-[#25272F] rounded-3xl border border-[#333642] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#333642] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Enrolled Students & Accounts
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Manage student profiles, inspect enrolled courses, and track individual fees paid.
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#18191E] text-white placeholder-slate-500 rounded-xl border border-[#333642] focus:outline-hidden focus:border-[#E5F842] transition-colors"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#18191E] text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-[#333642]">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4 text-center">Enrolled Courses</th>
                  <th className="px-6 py-4 text-center">Total Fees Paid</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333642]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
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
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                              u.role === "admin"
                                ? "bg-[#E5F842]/15 text-[#E5F842] border border-[#E5F842]/30"
                                : "bg-[#18191E] text-slate-300 border border-[#333642]"
                            }`}>
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{u.name}</span>
                                {isCurrentUser && (
                                  <span className="text-[10px] bg-[#18191E] text-[#E5F842] border border-[#E5F842]/30 px-2 py-0.5 rounded-md font-bold">
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

                        <td className="px-6 py-4 text-center font-extrabold text-[#E5F842] text-sm">
                          £{u.total_spent ? u.total_spent.toFixed(2) : "0.00"}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(u.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isCurrentUser && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
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
        message={`Are you sure you want to permanently delete user "${deletingUser?.name}"? All their course enrollments and records will be permanently removed.`}
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
