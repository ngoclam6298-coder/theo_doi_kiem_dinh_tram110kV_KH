# HƯỚNG DẪN TRIỂN KHAI WEB APP THEO DÕI HẠN KIỂM ĐỊNH TRẠM 110kV

Hệ thống quản lý, theo dõi thời hạn kiểm định thiết bị đo đếm điện năng (Công tơ, TU, TI) tại các Trạm biến áp 110kV khách hàng, tích hợp trực tiếp với **Google Sheets**, **Google Drive** và cảnh báo **Zalo**.

---

## 📁 CÁC TỆP NGUỒN TRONG DỰ ÁN
Toàn bộ mã nguồn nằm tại thư mục: `Theo dõi hạn kiểm định trạm 110kV khách hàng`
1. `Code.gs`: Mã nguồn Backend xử lý đọc/ghi Google Sheet, giải mã các ô gộp (Merged Cells), tự động tạo thư mục phân cấp và upload file lên Google Drive, tích hợp Zalo Webhook và Trigger tự động hàng tuần.
2. `Index.html`: Giao diện Web App tương thích mọi thiết bị (Responsive), Tailwind CSS, hiển thị Dashboard thống kê, bộ lọc thông minh, Modal upload đa file lên Drive, Modal gửi tin nhắn Zalo 1-Click và Form sửa nhanh thông tin.
3. `appsscript.json`: Tệp cấu hình quyền hạn (OAuth scopes) và múi giờ Việt Nam (`Asia/Ho_Chi_Minh`).

---

## 🚀 CÁC BƯỚC TRIỂN KHAI LÊN GOOGLE APPS SCRIPT

### BƯỚC 1: Mở trình soạn thảo Google Apps Script
1. Mở file Google Sheet dữ liệu của bạn:  
   👉 [Google Sheets Theo dõi hạn KĐ 110kV](https://docs.google.com/spreadsheets/d/1iI3Cl98W-WMg6ioHe8w4CZkb5NopkN8ZwzaUJM5WMDU/edit?gid=0#gid=0)
2. Trên thanh menu của Google Sheets, chọn: **Tiện ích mở rộng (Extensions)** ➔ **Apps Script**.
3. Dự án Apps Script mới sẽ được mở ra. Bạn có thể đổi tên dự án thành: `QuanLyKiemDinh_110kV`.

---

### BƯỚC 2: Dán mã nguồn vào dự án Apps Script

#### 1. Cập nhật file `Code.gs`:
- Xóa toàn bộ nội dung mặc định trong file `Mã.gs` (hoặc `Code.gs`).
- Mở file [Code.gs](file:///e:/Antigraviti_PCVT/Theo%20do%CC%83i%20ha%CC%A3n%20ki%C3%AA%CC%89m%20%C4%91i%CC%A3nh%20tra%CC%A3m%20110kV%20kha%CC%81ch%20ha%CC%80ng/Code.gs) trong thư mục dự án, copy toàn bộ nội dung và dán vào.

#### 2. Tạo file giao diện `Index.html`:
- Trong cột bên trái của trình duyệt Apps Script, nhấn dấu **`+`** bên cạnh mục **Tệp (Files)** ➔ Chọn **HTML**.
- Đặt tên file là: `Index` (Apps Script sẽ tự thêm đuôi `.html`).
- Mở file [Index.html](file:///e:/Antigraviti_PCVT/Theo%20do%CC%83i%20ha%CC%A3n%20ki%C3%AA%CC%89m%20%C4%91i%CC%A3nh%20tra%CC%A3m%20110kV%20kha%CC%81ch%20ha%CC%80ng/Index.html), copy toàn bộ nội dung và dán vào.

#### 3. Cập nhật tệp kê khai `appsscript.json` (Tùy chọn nâng cao):
- Vào biểu tượng **Cài đặt dự án (Project Settings)** (hình bánh răng ở menu trái).
- Tích chọn ô: **"Hiển thị tệp kê khai appsscript.json trong trình chỉnh sửa"**.
- Quay lại mục **Trình chỉnh sửa (Editor)** ➔ Mở file `appsscript.json` và dán nội dung từ file [appsscript.json](file:///e:/Antigraviti_PCVT/Theo%20do%CC%83i%20ha%CC%A3n%20ki%C3%AA%CC%89m%20%C4%91i%CC%A3nh%20tra%CC%A3m%20110kV%20kha%CC%81ch%20ha%CC%80ng/appsscript.json) vào.
- Nhấn **Lưu dự án (Ctrl + S)**.

---

### BƯỚC 3: Triển khai (Deploy) thành Web App
1. Nhấn nút **Triển khai (Deploy)** (màu xanh dương ở góc trên bên phải) ➔ Chọn **Quản lý bản triển khai (Manage deployments)** hoặc **Bản triển khai mới (New deployment)**.
2. Nhấn vào biểu tượng bánh răng **Chọn loại (Select type)** ➔ Chọn **Ứng dụng web (Web app)**.
3. Điền các thông tin:
   - **Mô tả (Description):** `Phiên bản 1.0 - Theo dõi hạn KĐ 110kV`
   - **Thực thi dưới dạng (Execute as):** `Tôi (tài khoản email của bạn)`
   - **Ai có quyền truy cập (Who has access):** 
     - Chọn `Bất kỳ ai (Anyone)` nếu muốn chia sẻ link nội bộ cho đồng nghiệp mở trực tiếp mà không bắt buộc đăng nhập Google.
     - Hoặc chọn `Bất kỳ ai trong tổ chức EVN` nếu có Google Workspace EVN.
4. Nhấn **Triển khai (Deploy)**.
5. Google sẽ yêu cầu cấp quyền:
   - Nhấn **Ủy quyền truy cập (Authorize access)**.
   - Chọn tài khoản Google của bạn.
   - Nếu xuất hiện màn hình *"Google hasn't verified this app" (Google chưa xác minh ứng dụng này)*:
     ➔ Bấm vào **Advanced (Nâng cao)** ở góc dưới bên trái.
     ➔ Bấm tiếp vào **Go to QuanLyKiemDinh_110kV (unsafe) / Tiếp tục đến...**.
     ➔ Nhấn **Allow (Cho phép)**.
6. Sau khi hoàn tất, bạn sẽ nhận được **URL Ứng dụng web (Web App URL)** (dạng `https://script.google.com/macros/s/.../exec`).
   👉 **Đây chính là link Web App để bạn và đơn vị sử dụng hàng ngày!**

---

## ⚙️ HƯỚNG DẪN CẤU HÌNH SỐ ĐIỆN THOẠI CỦA BẠN (NGƯỜI QUẢN LÝ)

Ngay phía trên cùng của Web App, bạn sẽ thấy thanh nổi bật màu xanh đen:
👉 **"SỐ ĐIỆN THOẠI ZALO CỦA TÔI (Nhận thông báo để làm Văn bản gửi nhắc các đơn vị)"**:
1. **Nhập số điện thoại:** Nhập SĐT Zalo của bạn (ví dụ: `098xxxxxxx`) vào ô nhập liệu.
2. **Lưu SĐT:** Nhấn nút **"Lưu SĐT của tôi"** (hệ thống lưu vào trình duyệt và tự động đồng bộ lên Google Apps Script Properties).
3. **Thử nghiệm:** Nhấn **"Gửi thử Zalo"** để kiểm tra chuyển hướng qua Zalo chat.
4. **Bật tự động hàng tuần:** Tích chọn ô *"Tự động quét và nhắc nhở vào 08h00 Thứ Hai hàng tuần"* để hệ thống tự động gửi danh sách các điểm đo cần làm văn bản về Zalo của bạn.

---

## 💡 CÁC TÍNH NĂNG VÀ HƯỚNG DẪN VẬN HÀNH

### 1. Quy tắc Cảnh báo làm Văn bản theo CỘT Y (Thời gian thực từ ngày hôm nay & Tự động Hoàn thành):
- **Cột Y: NGÀY KIỂM ĐỊNH GẦN NHẤT CẦN CẢNH BÁO** được tính toán theo thời gian thực từ ngày hôm nay (`new Date()`):
  + **Hạn trước ngày hôm nay (trong quá khứ):** Hệ thống tự động xem như **`✅ ĐÃ HOÀN THÀNH GỬI VB (Hạn trước hôm nay)`**, giúp bạn không bị báo động giả đối với các chu kỳ trước đó.
  + **Đã gửi văn bản (Cột Z ghi "ĐÃ HOÀN THÀNH" hoặc "ĐÃ GỬI"):** Hệ thống hiển thị **`✅ ĐÃ HOÀN THÀNH GỬI VB`** (màu xanh lá cây) kèm đường dẫn mở file văn bản đã lưu.
  + **Chưa gửi văn bản và hạn đến gần trong vòng ≤ 6 tháng tính từ hôm nay:** Hệ thống tự động kích hoạt cảnh báo **`🚨 CẦN GỬI VB NHẮC NHỞ`** (nhấp nháy đỏ khẩn cấp) để bạn kịp thời làm văn bản gửi khách hàng.
  + **Thời gian còn lại từ 6 đến 13 tháng:** Ghi nhận **`Cần lưu ý (6 - 13T)`** để chuẩn bị phương án.
  + **Thời gian còn lại > 13 tháng:** Ghi nhận **`Chưa đến hạn làm VB`**.

### 2. Thao tác 1-Click "Đã gửi VB", Upload File & "Trả lại chưa hoàn thành":
- **Cách 1 - Thao tác 1-Click "Đã gửi VB":**
  + Tại dòng điểm đo cần xử lý, bấm nút **"Đã gửi VB"** (hình dấu kiểm màu xanh lá).
  + Xác nhận trên hộp thoại, hệ thống sẽ **chuyển ngay trạng thái sang `ĐÃ HOÀN THÀNH GỬI VB`** trên Web App và ghi lại ngày giờ vào **Cột Z trên Google Sheet**.
- **Cách 2 - Upload file văn bản / hồ sơ đã gửi:**
  + Bấm nút **"Up file"** tại dòng điểm đo.
  + Chọn loại hồ sơ là **"📄 Văn bản thông báo kiểm định đã gửi (Cột Z - Hoàn thành)"**.
  + Giữ nguyên tích chọn ô *"Chuyển ngay sang trạng thái ĐÃ HOÀN THÀNH GỬI VB sau khi upload"*.
  + Chọn file PDF/Word/Ảnh công văn đã phát hành, bấm **"Tải lên Drive & Lưu Sheet"**.
  + Hệ thống tự động upload file vào đúng thư mục trên Drive (`[Gốc]/[Tên TBA]/[Mã Điểm Đo]`), tạo link xem file và cập nhật công thức Hyperlink vào **Cột Z trên Google Sheet**, đồng thời chuyển trạng thái điểm đo sang **`✅ ĐÃ HOÀN THÀNH GỬI VB`**.
- **Cách 3 - Trả lại trạng thái CHƯA HOÀN THÀNH (Hoàn tác):**
  + Khi điểm đo đang ở trạng thái `ĐÃ HOÀN THÀNH`, ngay cạnh huy hiệu "Đã xong" sẽ xuất hiện nút **"Trả lại"** (hình mũi tên hoàn tác màu hổ phách).
  + Bấm nút **"Trả lại"** và xác nhận trên hộp thoại, hệ thống sẽ:
    * Chuyển trạng thái điểm đo từ `Đã hoàn thành` về lại `Chưa hoàn thành` (hoặc `CẦN GỬI VB NHẮC NHỞ` nếu Cột Y ≤ 6 tháng).
    * Tự động xóa hoặc đặt lại trạng thái tương ứng tại **Cột Z trên Google Sheet**.
    * Cập nhật tức thì số đếm trên 6 thẻ KPI và bộ lọc.
  + Ngoài ra, bạn cũng có thể bấm nút **Sửa (cây bút)** để tự nhập lại nội dung Cột Z theo ý muốn.

### 3. Gửi nhắc nhở qua Zalo & Soạn Mẫu Công văn:
- Tại mỗi dòng điểm đo, nhấn nút **"Nhắc VB"** (hình chiếc chuông):
  + **Chế độ 1 - Nhắc việc cho CHÍNH TÔI:** Tự động điền SĐT Zalo của bạn và soạn sẵn nội dung nhắc việc: Trạm nào, Điểm đo nào, Hạn Cột Y ngày nào, còn bao nhiêu tháng, thiết bị nào cần kiểm định để bạn soạn văn bản.
  + **Chế độ 2 - Gửi cho Khách hàng:** Tự động điền SĐT đầu mối khách hàng (Cột X) và soạn sẵn thông báo đôn đốc.
  + **Nút "Copy Mẫu Công Văn Word":** Bấm 1-click để sao chép nguyên mẫu văn bản hành chính ngành điện (đầy đủ số hiệu, trích yếu, căn cứ pháp lý Thông tư 42/2015/TT-BCT và Thông tư 39/2022/TT-BCT) để dán ngay vào Microsoft Word ban hành văn bản.
  + **Nút "Mở Chat Zalo (zalo.me)":** Tự động copy nội dung vào clipboard và mở ngay cửa sổ chat Zalo, bạn chỉ cần bấm `Ctrl + V` là gửi đi.

### 4. Xử lý Ô gộp (Merged Cells) thông minh:
- Bảng tính gốc có các ô gộp ở cột `TÊN TBA`, `STT KH`, `TU`, `TI`, `GHI CHÚ`, `LIÊN HỆ`.
- Script tự động quét qua tất cả `MergedRanges` và điền giá trị của ô trên cùng xuống tất cả các dòng con bên dưới, đảm bảo mỗi Điểm đo đều có đầy đủ thông tin Trạm và đầu mối liên hệ khi lọc hoặc tìm kiếm.

### 5. Sửa nhanh thông tin ngay trên Web App:
- Bấm nút **Sửa (hình cây bút)** tại bất kỳ dòng nào.
- Cập nhật số Serial, ngày kiểm định, hạn kiểm định mới, thông tin liên hệ.
- Bấm "Lưu thay đổi", hệ thống sẽ ghi ngược chính xác vào đúng hàng và cột trên Google Sheets.
