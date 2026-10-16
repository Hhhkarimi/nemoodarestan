# افزودن یک نمودار به نمودارستان

هدف این ساختار، اضافه‌کردن ابزار بدون تغییر گالری یا مسیریاب است.

۱. یک شناسهٔ انگلیسی کوتاه و یکتا مثل `sunburst` انتخاب کنید.

۲. کد مستقل ابزار را بدون `.git`، `node_modules`، `.env` و فایل‌های ورود حساب در `apps/sunburst` قرار دهید. `package.json`، `package-lock.json` و دستور `npm run build` لازم‌اند. خروجی باید در `dist/index.html` و فایل‌های همراه آن باشد.

۳. ابزار باید زیر `/studios/sunburst/` اجرا شود. برای Vite، `--base=/studios/sunburst/` را در `buildArgs` بنویسید. مسیر فایل‌های runtime مانند `fetch('/fonts/...')` را به مسیر نسبی سند یا `import.meta.env.BASE_URL` تبدیل کنید. مسیر فونت در فایل خروجی SVG را هم بررسی کنید.

۴. پیش‌نمایش ۶۰۰×۳۲۴ را در `public/previews/sunburst.svg` قرار دهید. پیش‌نمایش باید نمایندهٔ خود نمودار باشد. از دادهٔ ساختگی تجاری برای ادعای واقعی استفاده نکنید.

۵. این رکورد را به `catalog.json` اضافه کنید و مقادیر متناسب با ابزار را وارد کنید:

```json
{
  "id": "sunburst",
  "title": "سان‌برست",
  "englishTitle": "Sunburst diagram",
  "category": "part",
  "categoryLabel": "سهم و ترکیب",
  "useCase": "سلسله‌مراتب را لایه‌لایه ببینید",
  "description": "سهم بخش‌ها و زیربخش‌ها در یک ساختار حلقه‌ای.",
  "tags": ["سلسله‌مراتب", "حلقه‌ای"],
  "formats": ["SVG", "PNG"],
  "inputs": "CSV و ورود دستی",
  "directory": "apps/sunburst",
  "buildArgs": ["--base=/studios/sunburst/"],
  "entry": "/studios/sunburst/index.html",
  "preview": "/previews/sunburst.svg",
  "source": "https://github.com/OWNER/REPO",
  "sourceCommit": "COMMIT_SHA_WITH_40_HEX_CHARACTERS"
}
```

`category` یکی از دسته‌های فعلی (`flow`، `part`، `geo`) یا یک شناسهٔ جدید است. دستهٔ تازه نیز خودکار در گالری ظاهر می‌شود.

`source` و `sourceCommit` اختیاری‌اند و منبع ابزارهای واردشده از ریپوهای دیگر را ثبت می‌کنند. اگر ابزار تازه را مستقیماً داخل نمودارستان می‌سازید، این دو فیلد را حذف کنید؛ نیازی به ساخت ریپوی جداگانه نیست.

۶. یک کلید ذخیرهٔ محلی مستقل برای ابزار انتخاب کنید. دسترسی به دادهٔ یک ابزار دیگر لازم نیست. فونت فارسی را محلی سرو کنید و ورودی فایل و خروجی SVG/PNG را بررسی کنید.

۷. `npm run install:studios`، `npm run check`، `npm run test:studios` و `npm run build` را اجرا کنید. آدرس مستقیم `/studio/sunburst`، بازبارگذاری صفحه، موبایل و دریافت فایل را در مرورگر بررسی کنید.

ساخت استاندارد از فهرست مرکزی پیروی می‌کند. اسکریپت اختیاری portable فقط برای ابزارهای TypeScript/React فعلی طراحی شده؛ ابزار با فریم‌ورک تازه ممکن است به تنظیم loader آن نیاز داشته باشد.
