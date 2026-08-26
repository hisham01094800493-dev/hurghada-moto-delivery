# نشر Hurghada Delivery على Railway

يُبنى التطبيق على Railway بأمر `pnpm install --frozen-lockfile && pnpm build` ويُشغّل بأمر `pnpm start`. ملف `railway.toml` يضبط هذه الأوامر ويستخدم الصفحة الرئيسية لفحص الصحة.

## المتغيرات المطلوبة

يجب إدخال المتغيرات في Railway من لوحة Variables، وليس داخل GitHub: `DATABASE_URL` لاتصال MySQL، و`JWT_SECRET`، و`OAUTH_SERVER_URL`، و`VITE_OAUTH_PORTAL_URL`، و`BUILT_IN_FORGE_API_URL` و`BUILT_IN_FORGE_API_KEY`، و`VITE_FRONTEND_FORGE_API_URL` و`VITE_FRONTEND_FORGE_API_KEY`، ومتغيرات هوية التطبيق والتحليلات عند الحاجة. يجب نسخ قيم الإنتاج من مدير الأسرار المعتمد دون نشرها في المستودع.

لتفعيل فوري لاحقًا، تُضاف `FAWRY_MERCHANT_CODE` و`FAWRY_SECURE_KEY` و`FAWRY_API_URL` و`FAWRY_CALLBACK_URL` في Railway Variables. لا تُرفع هذه القيم إلى GitHub. يجب تشغيل بيئة الاختبار أولًا ثم فصل مفاتيح الإنتاج عنها.

## قاعدة البيانات

يحتاج Railway إلى قاعدة MySQL متاحة عبر `DATABASE_URL`. يجب تطبيق ترحيلات Drizzle بعد إنشاء قاعدة البيانات، مع مراجعة الاتصال وSSL في بيئة Railway قبل استقبال طلبات حقيقية. لا تُنفذ ترحيلات مدمرة تلقائيًا.

## ملاحظات التوافق

النسخة الحالية تستخدم Manus OAuth وواجهات Forge والتخزين المتكامل، لذلك قد تحتاج هذه الخدمات إلى عناوين عامة وإعدادات Redirect مختلفة خارج Manus. كما يجب تحديث رابط Webhook في فوري إلى نطاق Railway بعد نجاح النشر، وعدم استخدام رابط المعاينة المؤقت.
