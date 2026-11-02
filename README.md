# Week 3 HW1 — Production Studio Drum Kit

Drum Kit là một studio trống chạy hoàn toàn trên trình duyệt. Bảy pad tạo tiếng bằng Web Audio API, nhận phím vật lý, có volume/mute, meter đầu ra, tổng lượt đánh và lịch sử tám lượt đánh gần nhất.

## Chạy ứng dụng

Cần Node.js 22 trở lên và npm. Từ thư mục repo:

```powershell
npm ci
npm run dev
```

Mở URL Vite hiển thị trên terminal. Để xem bản build production:

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Sau đó mở `http://127.0.0.1:4173/MSIS207.R11.CTTT.Week3.Hw1/`.

## Điều khiển

| Phím vật lý | Pad |
| --- | --- |
| W / A / S / D | Tom 1 / Tom 2 / Tom 3 / Tom 4 |
| J | Snare |
| K | Crash |
| L | Kick |

Nhấn hoặc chạm pad để chơi; khi pad đang được chọn, Enter và Space dùng hành vi native của button. Công tắc “Phím tắt bàn phím” tắt riêng các phím trống. Thanh trượt chỉnh volume master; “Tắt tiếng” mute âm thanh nhưng vẫn ghi lại lượt đánh. Âm thanh được khởi tạo lười ở lần chơi đầu tiên và resume sau thao tác người dùng.

## Kiến trúc

- `src/drums.ts`: bảy pad, mapping `KeyboardEvent.code`, model lịch sử và giới hạn tám mục.
- `src/hooks/useDrumKeyboard.ts`: listener keydown/keyup cấp window, trạng thái phím giữ, composition/editable guard và giải phóng khi blur/tab ẩn.
- `src/audio.ts` và `src/hooks/useAudioEngine.ts`: bảy tiếng tổng hợp, master gain, compressor, analyser và lifecycle cleanup.
- `src/components/DrumPad.tsx`: button có tên truy cập, `aria-pressed`, pointer cancel và native Enter/Space.
- `src/App.tsx`: bàn trộn, meter dBFS, hit history và thông báo live gộp theo lượt đánh nhanh.

## Âm thanh và bản quyền

Không dùng sample hay URL âm thanh bên ngoài. Tất cả tiếng trống được tổng hợp cục bộ bằng oscillator, noise buffer và filter của Web Audio API; không có giấy phép sample cần phân phối. Master gain giữ headroom, compressor giới hạn transient, cho phép các source chồng nhau và tự ngắt node khi tiếng kết thúc.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
npm run verify:browser
```

Browser check chạy trên Chrome với bản preview production, axe-core WCAG A/AA, bàn phím/pointer, volume/mute và analyser, toggle shortcut, viewport mobile, reduced motion và ảnh chụp. Báo cáo cùng ảnh ở [`evidence/`](evidence/). Lighthouse HTML/JSON và điều kiện chạy được lưu ở [`reports/lighthouse/`](reports/lighthouse/). Các công cụ tự động không chứng minh đầy đủ WCAG; chỉ ghi nhận screen reader nếu có phiên thử thực tế. Xem [kết quả kiểm chứng](evidence/verification.md) để biết các mục còn chưa kiểm tra.

## Giới hạn và demo

- Audio phụ thuộc hỗ trợ Web Audio API của trình duyệt và thiết bị đầu ra; mọi tiếng đều là âm tổng hợp, không nhằm thay thế bộ sample acoustic.
- Meter hiển thị mức RMS hiện thời đo sau compressor và ghi theo dBFS; không phải loudness tích hợp hay peak hold.
- Lịch sử nằm trong state của tab và mất khi tải lại trang.
- Chưa xác minh bằng screen reader thật.
- Không tìm thấy tài liệu “Legacy Slide 26” trong workspace cục bộ tại thời điểm triển khai; giao diện bám theo đặc tả trong yêu cầu.

Demo: https://24521450.github.io/MSIS207.R11.CTTT.Week3.Hw1/
