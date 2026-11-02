# Kết quả kiểm chứng — Production Studio Drum Kit

Ngày thực hiện: **02/11/2026**. Mọi ảnh và số liệu ở thư mục này được tạo từ bản production build hiện tại.

## Chạy cục bộ

- `npm ci`: thành công từ `package-lock.json`; npm báo 0 vulnerabilities sau khi cập nhật các bản vá tương thích.
- `npm run typecheck`: thành công với TypeScript strict.
- `npm run lint`: thành công, không còn cảnh báo.
- `npm test -- --reporter=dot`: **19/19 test**, 3 test files.
- `npm run build`: thành công; Vite tạo `dist/`.
- `npm run verify:browser`: thành công trên Chrome headless, production preview tại `http://127.0.0.1:4173/MSIS207.R11.CTTT.Week3.Hw1/`.
- Lighthouse trên production preview: Performance 100, Accessibility 100, Best Practices 100, SEO 100. Điều kiện và báo cáo hồi quy mới nằm trong [`reports/lighthouse/`](../reports/lighthouse/).

## Hồi quy pointer và keyboard

- Mouse regression dùng `page.mouse.move/down/up` thật: hit được ghi ngay lúc pointerdown; kéo khỏi pad rồi thả trả `aria-pressed=false`; click tương thích sau pointerup không tạo hit thứ hai.
- Playwright giữ Enter và Space qua ba keydown liên tiếp: mỗi lần giữ tạo một hit, keyup kết thúc lần nhấn, lần nhấn tiếp theo vẫn hoạt động. `.click()` không có pointer cũng tạo hit.
- Mobile touch tap tạo đúng một hit. Unit tests kiểm tra hai `pointerId` trên hai pad, hai pointer cùng giữ một pad, pointercancel, lost capture, window blur và hidden tab.
- Browser report ghi 0 page error, console error, failed request và 0 axe violation ở desktop/mobile. Shortcut, volume/mute, analyser meter, history và aria-live đều tiếp tục đạt.

## GitHub Pages trước lần deploy hồi quy này

- GitHub Pages được cấu hình deploy bằng Actions và bật HTTPS. Bản live trước thay đổi hồi quy này đã chạy từ commit `14ed83d46c74752d8d01e4bf650bca6da410e316` qua [workflow run 41389396125](https://github.com/24521450/MSIS207.R11.CTTT.Week3.Hw1/actions/runs/41389396125).
- Báo cáo browser và ảnh ở lần kiểm chứng này được tạo từ production preview cục bộ; site live sẽ được kiểm tra lại sau khi push regression fix.

## Trình duyệt, tương tác và accessibility

Playwright kiểm tra phím vật lý `KeyW`, editable target, phím tắt tắt/bật, Enter/Space lặp, native/programmatic click, mouse move/down/up kéo ra ngoài, mobile touch, phát đồng thời Snare/Crash, lịch sử tối đa 8 mục, volume, mute và meter. Unit tests kiểm tra pointercancel/lost capture, nhiều `pointerId`, blur và tab ẩn. Khi volume là 0, analyser ở `−∞ dBFS`; ở mức volume dương, analyser ghi mức hữu hạn. Meter được lấy từ Web Audio analyser sau master gain và compressor.

- Axe: desktop **23 rules passed, 0 violations**; mobile **25 rules passed, 0 violations**.
- Axe để `color-contrast` ở trạng thái incomplete vì không thể xác định nền dưới các gradient; `label-content-name-mismatch` có một switch mà nhãn hiển thị là giá trị On/Off. Đây không phải vi phạm được axe xác nhận.
- Đã đo 24 cặp màu đại diện: các mẫu text thấp nhất **5.85:1** so với ngưỡng 4.5:1; các mẫu viền/focus thấp nhất **3.08:1** so với ngưỡng 3:1. Đây là các mẫu lựa chọn, không phải phép chứng minh toàn bộ giao diện tuân thủ WCAG.
- Kiểm tra skip link, Tab focus-visible, chuyển focus vào `main`, reduced motion, mobile `390 × 844` không tràn ngang, và viewport `720px` làm phép thử reflow tương đương vùng nhìn desktop ở 200% zoom. Pad nhỏ nhất đo được `116px`.
- Không có lỗi JavaScript, lỗi console hoặc request lỗi trong browser run.

### Ảnh và báo cáo

- [`desktop.png`](desktop.png): giao diện production preview trên desktop, `1440 × 1000`.
- [`mobile.png`](mobile.png): giao diện production preview trên mobile, `390 × 844`, ảnh chụp toàn trang.
- [`keyboard-focus.png`](keyboard-focus.png): skip link đang focus, viền focus nhìn thấy rõ.
- [`browser-check.json`](browser-check.json): điều kiện chạy, axe, tương phản, kích thước và kiểm tra tương tác chi tiết.

## Giới hạn đã biết

- Chưa thử UniKey hoặc screen reader thật. Không suy ra hành vi đọc màn hình từ axe hay Lighthouse.
- Kiểm tra focus và bàn phím chạy tự động bằng Playwright; ảnh focus đã được xem lại. Computer Use dừng trước thao tác Chrome UI vì không thể nhận diện URL của cửa sổ Edge đang mở, nên không thay đổi tab đó.
- Chưa nghe thử qua loa hoặc tai nghe vật lý. Browser check xác nhận đồ thị Web Audio và phản ứng của analyser trong Chrome headless.
- Lịch sử và tổng lượt đánh chỉ tồn tại trong tab, mất khi tải lại.
- Không tìm thấy “Legacy Slide 26” trong tài liệu cục bộ của workspace khi thực hiện.
