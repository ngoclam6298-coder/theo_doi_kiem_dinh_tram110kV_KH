# Quản Lý & Theo Dõi Thời Hạn Kiểm Định Thiết Bị Đo Đếm Trạm 110kV (EVNHCMC)

Ứng dụng Web App giám sát và cảnh báo thời hạn kiểm định hệ thống thiết bị đo đếm điện năng (Công tơ, TU, TI) tại các Trạm biến áp 110kV khách hàng, tích hợp đồng bộ trực tiếp với Google Sheets, Google Drive và Cảnh báo Zalo.

---

## ⚡ Các Tính Năng Trọng Tâm

1. **Chuẩn hóa Cột Y (Ngưỡng cảnh báo 6 tháng):**
   - Tính toán thời gian thực từ ngày hôm nay (`new Date()`).
   - Các trạm có hạn trước ngày hôm nay tự động xác nhận là **`ĐÃ HOÀN THÀNH GỬI VB`**.
   - Thiết bị có thời hạn kiểm định gần nhất còn lại **$\le$ 6 tháng** chưa gửi văn bản sẽ lập tức kích hoạt trạng thái **`🚨 CẦN GỬI VB NHẮC NHỞ`**.

2. **Thao tác 1-Click "Đã gửi VB" & "Trả lại chưa hoàn thành":**
   - Nút **"Đã gửi VB"** chuyển trạng thái sang `ĐÃ HOÀN THÀNH GỬI VB` và tự động lưu vào Cột Z Google Sheet.
   - Nút **"Trả lại" (Hoàn tác)** cho phép hoàn tác về lại `Chưa hoàn thành` bất kỳ lúc nào nếu cần theo dõi tiếp.

3. **Tích hợp Google Drive:**
   - Tự động tạo cây thư mục chuẩn: `[Gốc]/[Tên Trạm TBA]/[Mã Điểm Đo]`.
   - Upload file công văn/hồ sơ kiểm định và tự động ghi công thức Hyperlink vào Cột Z.

4. **Kênh Cảnh Báo Zalo & Mẫu Công Văn Hành Chính:**
   - Hỗ trợ lưu SĐT Zalo của cán bộ phụ trách để nhận tin nhắc việc tự động mỗi sáng Thứ Hai hàng tuần.
   - Tích hợp mẫu công văn chuẩn Thông tư 42/2015/TT-BCT & Thông tư 39/2022/TT-BCT để dán ngay vào Word.

5. **Xuất Báo Cáo:**
   - Hỗ trợ xuất dữ liệu ra file Excel (`.csv` UTF-8 BOM chuẩn tiếng Việt).
   - In ấn / Xuất PDF tối ưu hóa bản in.

---

## 🚀 Triển Khai Trên Vercel

Dự án đã được cấu hình sẵn file `vercel.json` phục vụ triển khai máy chủ tĩnh (Static Web App).

### Các bước triển khai:
1. Đăng nhập vào [Vercel](https://vercel.com).
2. Chọn **"Add New..."** -> **"Project"**.
3. Import kho lưu trữ GitHub: `https://github.com/ngoclam6298-coder/theo_doi_kiem_dinh_tram110kV_KH`.
4. Tại mục **Framework Preset**, chọn **"Other"** (hoặc để mặc định).
5. Bấm **"Deploy"**. Vercel sẽ tự động build và cấp domain truy cập trực tuyến miễn phí (dạng `https://...vercel.app`).

---

## 📂 Cấu Trúc Mã Nguồn

```text
├── index.html                 # Giao diện chính (Tailwind CSS, Lucide Icons, Plus Jakarta Sans)
├── Code.gs                    # Backend Google Apps Script (Xử lý Sheet, Drive, Zalo, Trigger)
├── appsscript.json            # Manifest cấu hình quyền Google Apps Script
├── vercel.json                # Cấu hình rewrite URL khi host trên Vercel
├── server.py                  # Server local Python phục vụ test offline (cổng 8080)
├── start_localhost.bat        # File chạy nhanh localhost trên Windows
├── HUONG_DAN_TRIEN_KHAI.md    # Tài liệu hướng dẫn triển khai chi tiết
└── README.md                  # Giới thiệu dự án
```
