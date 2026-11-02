# Báo cáo Lighthouse

## Lượt đo production cuối

| Hạng mục | Điểm |
| --- | ---: |
| Performance | 100/100 |
| Accessibility | 100/100 |
| Best Practices | 100/100 |
| SEO | 100/100 |

Lượt đo chạy ngày **02/11/2026, 11:29 (Asia/Saigon)** trên production build được phục vụ cục bộ tại `http://127.0.0.1:4173/MSIS207.R11.CTTT.Week3.Hw1/`. Lighthouse `13.5.0`; Node.js `v24.15.0`; npm `12.0.2`; Windows 11 build `26300`; Headless Chrome `156.0.8078.79`.

Lighthouse dùng preset desktop, viewport `1350 × 940`, device scale factor `1`, CPU slowdown `1×`; cấu hình simulated network có RTT `40 ms` và throughput `10,240 Kbps`. Đây là kết quả của môi trường chạy này, không đảm bảo mọi máy hoặc lần chạy đều có cùng điểm.

- [HTML report](2026-11-02-production-studio.report.html)
- [JSON report](2026-11-02-production-studio.report.json)

Lệnh đã chạy:

```powershell
npx lighthouse http://127.0.0.1:4173/MSIS207.R11.CTTT.Week3.Hw1/ `
  --only-categories=performance,accessibility,best-practices,seo `
  --preset=desktop `
  --chrome-path='C:\Program Files\Google\Chrome\Application\chrome.exe' `
  --chrome-flags='--headless=new' `
  --output=html --output=json `
  --output-path=reports/lighthouse/2026-11-02-production-studio --quiet
```

Lighthouse `100/100` chỉ phản ánh các audit trong lần chạy này, không chứng minh đầy đủ WCAG. Axe còn có các mục `incomplete` vì nền gradient và nội dung trạng thái của switch cần xem xét thủ công. Mẫu tương phản đã đo, các mục chưa quyết định được và giới hạn kiểm chứng được ghi trong [`evidence/verification.md`](../../evidence/verification.md).
