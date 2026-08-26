# ملاحظات تكامل شحن محفظة السائقين عبر فوري باي

راجعت التوثيق الرسمي لفوري باي في 26 أغسطس 2026. يدعم FawryPay تكامل REST API من الخادم، والدفع برقم مرجعي عبر نقاط البيع، والدفع بالبطاقات والمحافظ الإلكترونية، كما يوفر Checkout مستضافًا أو زر دفع. يوضح التوثيق أن إشعارات حالة المعاملة تصل إلى endpoint مهيأ مسبقًا لدى التاجر، وتُرسل كطلب HTTP GET عند تغيّر الحالة.

## حقائق مؤثرة في التنفيذ

- لا يمكن تشغيل دفع إنتاجي حقيقي دون حساب تاجر وبيانات merchantCode وsecureKey وإعداد callback لدى فوري.
- إشعار الخادم يتضمن FawryRefNo وMerchantRefNo وOrderStatus وAmount وMessage Signature.
- التوقيع الموثق في Server Notification V1 يعتمد MD5 للسلسلة: secureKey + amount بصيغة عشرية + fawryRefNo + merchantRefNo + orderStatus.
- يجب قبول الإشعار بعد التحقق من التوقيع والمبلغ والمرجع، وجعل معالجة الدفع idempotent حتى لا يتكرر شحن المحفظة عند إعادة إرسال callback.
- مرحلة التنفيذ الحالية يجب أن تجهز نموذج الدفع والحالات والواجهة، وتوقف قبل الاتصال الإنتاجي إذا لم تُقدّم بيانات التاجر.

## المصادر الرسمية

1. https://developer.fawrystaging.com/ — FawryPay Developers Guide.
2. https://developer.fawrystaging.com/docs/payment-notifications/server-notification-v1 — Server To Server Notification V1.
3. https://www.fawry.com/business/acceptance/online-checkout/ — Fawry Accept Online Checkout.
