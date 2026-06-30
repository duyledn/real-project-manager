/** Vietnamese UI dictionary, keyed by the exact English source string.
 *  Anything not listed here falls back to English automatically (see i18n.tsx).
 *  Only interface chrome lives here — never user-entered data, figures, or
 *  currency, which must read the same regardless of language. */
export const VI: Record<string, string> = {
  // --- Global / nav ---------------------------------------------------------
  "Real Project Manager": "Real Project Manager",
  Dashboard: "Bảng điều khiển",
  Financials: "Tài chính",
  "Jobs & Bids": "Công việc & Báo giá",
  Scheduling: "Lịch trình",
  Files: "Tệp tin",
  Timeline: "Tiến độ",
  Subcontractors: "Nhà thầu phụ",
  "Project settings": "Cài đặt dự án",
  Settings: "Cài đặt",
  "Workspace settings": "Cài đặt không gian làm việc",
  "Workspace & profile settings": "Cài đặt không gian làm việc & hồ sơ",
  Workspace: "Không gian làm việc",
  Projects: "Dự án",
  "{years}-yr": "{years} năm",
  "Your projects": "Dự án của bạn",
  "View all projects": "Xem tất cả dự án",
  "All projects": "Tất cả dự án",
  "No projects yet.": "Chưa có dự án nào.",
  "Loading…": "Đang tải…",
  "Switch project": "Chuyển dự án",
  Current: "Hiện tại",
  "New / all projects": "Mới / tất cả dự án",
  "Admin console": "Bảng quản trị",
  "Sign out": "Đăng xuất",
  "Back to all projects": "Quay lại tất cả dự án",
  "Admin · full control": "Quản trị · toàn quyền",
  "Project manager": "Quản lý dự án",
  Active: "Đang hoạt động",
  "{years}-yr hold · Active": "Giữ {years} năm · Đang hoạt động",

  // --- Project header kickers / titles -------------------------------------
  Overview: "Tổng quan",
  "Project finance": "Tài chính dự án",
  "The hero workspace": "Không gian chính",
  Preferences: "Tùy chọn",
  Project: "Dự án",

  // --- Financials sub-tabs --------------------------------------------------
  "Construction Estimate": "Dự toán xây dựng",
  "Investment Estimates": "Dự toán đầu tư",
  Analysis: "Phân tích",
  "Math check": "Kiểm tra số liệu",
  "Investment report": "Báo cáo đầu tư",

  // --- Save indicator -------------------------------------------------------
  "Saving…": "Đang lưu…",
  Saved: "Đã lưu",
  "Save failed": "Lưu thất bại",

  // --- Misc shared ----------------------------------------------------------
  "{years}-yr hold": "giữ {years} năm",
  "Buy-Rehab-Hold Rental": "Mua – Sửa – Giữ cho thuê",

  // --- Dashboard ------------------------------------------------------------
  "Total budget": "Tổng ngân sách",
  "Bids in play": "Báo giá đang xử lý",
  Awarded: "Đã trao thầu",
  Scheduled: "Đã lên lịch",
  "{n} jobs": "{n} công việc",
  "{n} total": "{n} tổng cộng",
  "{a}/{b} jobs": "{a}/{b} công việc",
  "jobs dated": "công việc có ngày",
  "Bids needing your decision": "Báo giá cần bạn quyết định",
  "{n} pending": "{n} đang chờ",
  "Nothing awaiting a decision. Received bids show up here.":
    "Không có gì cần quyết định. Báo giá đã nhận sẽ hiển thị ở đây.",
  Review: "Xem xét",
  Unassigned: "Chưa gán",
  "Awarded vs budget": "Đã trao thầu so với ngân sách",
  "{a} of {b} jobs committed": "{a} trên {b} công việc đã cam kết",
  "Compliance alerts": "Cảnh báo tuân thủ",
  "No subcontractors engaged yet.": "Chưa có nhà thầu phụ nào tham gia.",
  "All engaged subs have W-9, License & Workers' Comp on file.":
    "Tất cả nhà thầu đang tham gia đều có W-9, Giấy phép & Bảo hiểm lao động.",
  "Missing {docs}": "Thiếu {docs}",
  "Manage subcontractors": "Quản lý nhà thầu phụ",
  "Edit project details": "Chỉnh sửa thông tin dự án",
  "Edit project name, strategy and address": "Chỉnh sửa tên, chiến lược và địa chỉ dự án",
  "No address set": "Chưa đặt địa chỉ",
  "{strategy} · {years}-yr hold · {address}": "{strategy} · giữ {years} năm · {address}",

  // --- Edit identity modal --------------------------------------------------
  "Edit project": "Chỉnh sửa dự án",
  Details: "Chi tiết",
  "Project name": "Tên dự án",
  "Investment strategy": "Chiến lược đầu tư",
  Address: "Địa chỉ",
  Cancel: "Hủy",
  Save: "Lưu",
  Close: "Đóng",

  // --- Settings (System / Workspace) ---------------------------------------
  "Preferences for your whole workspace and profile. Per-project options live under each project’s settings.":
    "Tùy chọn cho toàn bộ không gian làm việc và hồ sơ của bạn. Tùy chọn riêng cho từng dự án nằm trong cài đặt của mỗi dự án.",
  Appearance: "Giao diện",
  "Applies across every project. Choose a fixed theme or follow the time of day.":
    "Áp dụng cho mọi dự án. Chọn giao diện cố định hoặc theo thời gian trong ngày.",
  Light: "Sáng",
  Dark: "Tối",
  Auto: "Tự động",
  "Always the warm daytime palette.": "Luôn dùng bảng màu ban ngày ấm áp.",
  "Always the dark estate palette.": "Luôn dùng bảng màu tối.",
  "Light by day, dark after 6 PM.": "Sáng vào ban ngày, tối sau 6 giờ chiều.",
  Language: "Ngôn ngữ",
  "Choose the interface language. Your data, figures, and currency stay exactly as entered.":
    "Chọn ngôn ngữ giao diện. Dữ liệu, số liệu và tiền tệ của bạn được giữ nguyên như đã nhập.",
  English: "Tiếng Anh",
  Vietnamese: "Tiếng Việt",
  "Interface in English.": "Giao diện bằng tiếng Anh.",
  "Giao diện bằng tiếng Việt.": "Giao diện bằng tiếng Việt.",
  Profile: "Hồ sơ",
  "Your @tag and avatar, shown in the top-right of the nav bar.":
    "Thẻ @tag và ảnh đại diện của bạn, hiển thị ở góc trên bên phải thanh điều hướng.",
  Handle: "Tên định danh",
  Administrator: "Quản trị viên",
  "Processing…": "Đang xử lý…",
  "Replace photo": "Thay ảnh",
  "Upload photo": "Tải ảnh lên",
  Remove: "Xóa",

  // --- Subcontractors -------------------------------------------------------
  "Back to {name}": "Quay lại {name}",
  project: "dự án",

  // --- Bid statuses (short labels) -----------------------------------------
  "Not sent": "Chưa gửi",
  Sent: "Đã gửi",
  Received: "Đã nhận",
  Approved: "Đã duyệt",
  "In progress": "Đang thực hiện",
  Finished: "Hoàn thành",
  "Partly paid": "Thanh toán một phần",
  "Fully paid": "Đã thanh toán đủ",

  // --- Auth -----------------------------------------------------------------
  "Welcome back": "Chào mừng trở lại",
  "Sign in to your workspace": "Đăng nhập vào không gian làm việc của bạn",
  Username: "Tên đăng nhập",
  Password: "Mật khẩu",
  "Sign in": "Đăng nhập",
  "Signing in…": "Đang đăng nhập…",
  "Create an account": "Tạo tài khoản",
  "Forgot password?": "Quên mật khẩu?",
};
