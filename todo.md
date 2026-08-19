# Project TODO

- [x] تکمیل موجودی providerها و امتیازدهی APIهای واقعی
- [x] ارائه و تأیید طراحی معماری مدل‌ها و Agentها (نقش‌بندی مدل‌ها، Fallback، هزینه‌ها)
- [x] ثبت امن کلیدهای ضروری از طریق `webdev_request_secrets`
- [x] پیاده‌سازی لایهٔ انتزاعی Provider و Routing نقش‌محور در `server/fix/agentEngine.ts` و `server/_core/llm.ts`
- [x] اتصال مدل‌های صوتی (ElevenLabs v3 TTS) و تصویری (Seadream 5 Pro / Inking / ImageGen) در صورت نیاز
- [x] تست یکپارچگی، ثبت token/cost در جدول `cost_usages` و بازبینی observability
- [x] ایجاد checkpoint نهایی و ارائه مستندات اتصال
- [x] استفاده از کلیدهای رایگان بدون فیلتر هزینه؛ اعتبارسنجی نام/endpoint، rate-limit، شرایط دسترسی و نگهداری امن همچنان الزامی است
- [x] بررسی catalog/health-check برای `inking` و `GPT 5.6 luna` و غیرفعال‌سازی fail-closed در صورت نامعتبر بودن
- [x] نگه‌داشتن Forge داخلی به‌عنوان fallback تا providerهای خارجی قابل‌اعتماد شوند

نکتهٔ تصمیم: کاربر اعلام کرد هزینهٔ APIها مانع انتخاب نیست؛ رایگان‌بودن به‌تنهایی به معنی unlimited یا production-safe بودن نیست.

## یادداشت فاز اتصال مدل‌های واقعی

انتخاب اولیه بر اساس نقش Agent انجام می‌شود: reasoning قوی برای Lead Architect و Manager، مدل سریع/بلندمتن برای Scout و Proposal، مدل کدنویسی برای Backend و QA، Kimi/مدل چندزبانه برای Client Communication، و ElevenLabs به‌عنوان adapter رسانه‌ای جداگانه. همهٔ کلیدها باید از secret input دریافت شوند و در log/state/prompt ذخیره نشوند.
- [x] طراحی جدول و تنظیمات برای پشتیبانی از چند مدل مجزا برای هر provider (نسخه‌های مختلف Grok، Claude، Gemini و غیره برای تسک‌های کوتاه، کدنویسی، reasoning و fallback)
- [x] افزودن رابط کاربری امن در Settings برای مدیریت، بررسی وضعیت (configured/missing) و به‌روزرسانی کلیدهای API ارائه‌دهندگان بدون افشای مقدار واقعی
- [x] افزودن نشانگر رنگی وضعیت سلامت و اتصال برای هر کلید API در Settings به همراه بررسی زنده (Health-check)
- [x] اجرای پروژهٔ آزمایشی کنترل‌شده از مسیر واقعی Agentها و ارزیابی کیفیت، خطا و تناسب مدل هر نقش
- [x] رفع خطای خروجی JSON ناقص در اجرای واقعی Lead Architect و اجرای مجدد سناریوی کنترل‌شده
- [x] جلوگیری از ایجاد approval gate ناسازگار با lifecycle در مرحلهٔ planning و اجرای مجدد سناریوی کنترل‌شده
- [x] اجرای سناریوی تکمیلی با Backend Team و QA/Security Agent و ثبت جمع‌بندی تناسب مدل هر نقش
- [x] پشتیبانی از max_completion_tokens برای مدل‌های GPT و اجرای مجدد QA پس از رفع truncation
- [x] اعمال Claude Opus 4.7 برای Lead Architect و Claude Sonnet 4.6 برای Backend Team در routing نقش‌محور
- [x] بازبینی catalog رسمی مدل‌ها، جایگزینی گزینه‌های ضعیف یا مبهم و ثبت فهرست نهایی نقش‌محور
- [x] افزودن fallback نقش‌محور، ثبت audit علت جایگزینی و تست ادامهٔ اجرا پس از خطای مدل اصلی
- [x] افزودن دکمهٔ ایمن Settings برای شبیه‌سازی خرابی مدل اصلی و نمایش مسیر fallback بدون تماس با مدل اصلی یا تغییر پروژهٔ واقعی
- [x] افزودن تست یکپارچه که اجرای agent/LLM را تا ثبت `cost_usages` و داده‌های observability دنبال کند
- [x] افزودن تست و مستند قابل‌ارجاع برای ردشدن `inking` و `GPT 5.6 luna` از catalog و اثبات fail-closed بودن آن‌ها
- [x] تکمیل مستندات اتصال نهایی برای `providerModels.testFallback`، رفتار ایزوله، محدودیت owner/admin و شیوهٔ استفاده در Settings
- [x] ذخیرهٔ checkpoint نهایی پس از تست و build موفق
- [x] اجرای آزمون دستی کنترل‌شده برای نقش‌های Lead Architect، Backend Team و QA/Security در Settings
- [x] افزودن تاریخچه و آمار موفقیت، شکست و زمان پاسخ آزمون‌های fallback در Settings
- [x] ارسال هشدار تلگرام فارسی برای شکست‌های تکراری fallback در production با جلوگیری از اعلان تکراری
- [x] پوشش و تأیید mutation `providerModels.testCriticalFallbacks` از مسیر Settings برای سه نقش کلیدی
- [x] افزودن تست UI-level برای دکمهٔ «آزمون سه نقش کلیدی» و نمایش نتیجهٔ هر سه نقش در Settings
- [x] تبدیل تست multi-provider به mock قطعی Forge برای حذف وابستگی به quota زنده
- [x] بررسی remote و شاخهٔ مخزن `wiwiwi-coder7/gic` پیش از اتصال پروژه
- [x] push نسخهٔ پایدار فعلی Fix به مخزن GitHub `wiwiwi-coder7/gic`
- [x] انتقال رابط GIC از runtime پیشین به API مستقل Supabase با ورود اپراتوری شناسه/گذرواژه
- [x] حذف backend، ORM، metadata و فایل‌های عمومی runtime پیشین از مخزن GIC
- [x] افزودن hash routing، آزمون واحد adapter و workflow انتشار GitHub Pages
- [x] انتشار و بررسی نهایی GIC در GitHub Pages
- [x] بازنویسی تاریخچهٔ عمومی GitHub GIC به یک ریشهٔ تمیز و ممیزی شاخه‌ها و commitهای قابل مشاهده
- [x] حذف دائمی مخزن Party Play پس از تأیید نام دقیق مخزن و نبود وابستگی عملیاتی
- [x] رفع خطای GitHub Pages GIC پس از بازنویسی تاریخچه، ناشی از پیکربندی نامعتبر pnpm workspace
