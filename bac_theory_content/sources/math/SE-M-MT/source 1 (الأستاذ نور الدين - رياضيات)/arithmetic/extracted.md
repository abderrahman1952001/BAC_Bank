---
subject: الرياضيات
subjectCode: MATH
streams:
  - SE
  - M
  - MT
unit: الأعداد والحساب
topicCode: ARITHMETIC
source: الأستاذ نور الدين - الرياضيات
sourceSection: الأعداد والحساب من الألف إلى الياء
sourcePages:
  index:
    - 0
    - 1
  availableTheoryAndTraining:
    - "8-51"
missingFromCurrentScanBundle:
  - "الصفحات 2-7 غير موجودة في المجلد المضاف."
streamCaveats:
  - "هذا المجال خاص بشعبتي M و MT حسب خريطة البرنامج المعتمدة لدينا."
assetStrategy: "روابط صور كاملة لكل صفحة؛ يمكن لاحقا إضافة قصاصات ضيقة للجداول والبراهين."
---

# الأعداد والحساب

## طبيعة المصدر

هذا الجزء من مصدر الأستاذ نور الدين يعالج محور **الأعداد والحساب** لشعبتي الرياضيات والتقني رياضي. المصدر كثيف التمارين: يبدأ بقابلية القسمة والقسمة الإقليدية والموافقات ونظام العد، ثم ينتقل إلى القواسم والمضاعفات و `PGCD` و `PPCM` والأعداد الأولية، مع تمارين تدريبية وتطبيقية كثيرة.

![فهرس الأعداد والحساب - الصفحة 0](assets/arithmetic-page-0.jpg)

![فهرس الأعداد والحساب - الصفحة 1](assets/arithmetic-page-1.jpg)

## فهرس الجزء المتوفر

| المحور | الصفحات |
| --- | --- |
| قابلية القسمة في `Z` | 8 |
| القسمة الإقليدية في `Z` | 8 |
| الموافقة بترديد `n` | 9 |
| نظام العد | 10 |
| تمارين تدريبية حول قابلية القسمة والقسمة الإقليدية | 11-18 |
| الموافقات وحل المعادلات وجملة المعادلات | 18-22 |
| القواسم، `PGCD`، `PPCM`، والأعداد الأولية | 14-25 |
| تمارين تطبيقية طويلة | 27-51 |

## 01. قابلية القسمة في `Z`

يعرف المصدر القسمة في مجموعة الأعداد الصحيحة:

```math
a \mid b \Longleftrightarrow \exists k \in Z,\ b=ka
```

ويعرض خواص القواسم والمضاعفات:

- للعددين `b` و `-b` القواسم نفسها.
- كل عدد صحيح يقبل القسمة على `1` و `-1`.
- كل عدد صحيح غير معدوم قاسم لـ `0`.
- إذا كان `a` يقسم `b` و `c` فإنه يقسم كل تركيب خطي من الشكل `mb+nc`.

![قابلية القسمة في Z](assets/arithmetic-page-8.jpg)

## 02. القسمة الإقليدية في `Z`

المبرهنة المركزية: إذا كان `a` و `b` عددين صحيحين و `b != 0`، توجد ثنائية وحيدة `(q,r)` بحيث:

```math
a=bq+r,\qquad 0 \le r < |b|
```

يسمى `q` حاصل القسمة الإقليدية و `r` باقي القسمة الإقليدية.

يدرب المصدر على:

- إيجاد الحاصل والباقي.
- استعمال الباقي لدراسة قابلية القسمة.
- دراسة بواقي قوى أو عبارات حسب الترديد.

![القسمة الإقليدية والموافقات](assets/arithmetic-page-9.jpg)

## 03. الموافقة بترديد `n`

يعرض المصدر الموافقة باستعمال:

```math
a \equiv b \pmod n
```

ومعناها أن `n` يقسم `a-b`. ثم يستعمل خواص الموافقات:

- الجمع والطرح.
- الضرب.
- رفع القوى.
- التعويض داخل عبارات كثيرة الحدود.
- حل معادلات أو جمل معادلات بالترديد.

![الموافقة بترديد n ونظام العد](assets/arithmetic-page-10.jpg)

## 04. نظام العد

يدخل المصدر نظام العد ضمن محور الحساب، خصوصا:

- الكتابة في أساس معين.
- التحويل من أساس إلى آخر.
- استعمال القسمة الإقليدية في استخراج الأرقام.
- ربط الكتابة بالأعداد الصحيحة وقابلية القسمة.

![تمارين تدريبية أولى](assets/arithmetic-page-11.jpg)

## التمارين التدريبية

تمتد التمارين التدريبية من قابلية القسمة إلى الموافقات والأعداد الأولية. الأنماط المتكررة:

- برهان قابلية القسمة بالتراجع.
- تعيين بواقي قسمة حدود متتالية أو قوى.
- إيجاد قواسم عدد طبيعي.
- حساب `PGCD` وتعيين الثنائيات.
- حل معادلات توافقية.
- استعمال خوارزمية إقليدس.
- دراسة أولية عدد طبيعي.
- العلاقة بين `PGCD` و `PPCM`.

![تمارين تدريبية 02](assets/arithmetic-page-12.jpg)

![تمارين تدريبية 03](assets/arithmetic-page-13.jpg)

![إيجاد قواسم عدد طبيعي](assets/arithmetic-page-14.jpg)

![القاسم المشترك الأكبر وتعيين الثنائيات](assets/arithmetic-page-15.jpg)

![تتمة القاسم المشترك الأكبر](assets/arithmetic-page-16.jpg)

![دراسة بواقي القسمة الإقليدية](assets/arithmetic-page-17.jpg)

![الموافقات وحل المعادلات](assets/arithmetic-page-18.jpg)

![الموافقات وجملة المعادلات](assets/arithmetic-page-19.jpg)

![القاسم المشترك والموافقات](assets/arithmetic-page-20.jpg)

![براهين وتطبيقات في الموافقات](assets/arithmetic-page-21.jpg)

![تمارين إضافية في الموافقات](assets/arithmetic-page-22.jpg)

![معرفة أولية عدد طبيعي](assets/arithmetic-page-23.jpg)

![العلاقة بين PGCD و PPCM وإيجاد حل خاص](assets/arithmetic-page-24.jpg)

![تتمة التمارين التدريبية](assets/arithmetic-page-25.jpg)

![نهاية مجموعة التمارين التدريبية](assets/arithmetic-page-26.jpg)

## التمارين التطبيقية

تبدأ الصفحة `27` قسما تطبيقيا أطول. بحسب الفهرس، يغطي هذا القسم:

- قابلية القسمة والبرهان بالتراجع.
- القواسم والمضاعفات.
- القسمة الإقليدية.
- الموافقات.
- `PGCD` و `PPCM`.
- الأعداد الأولية.
- أنظمة العد.
- وضعيات من مواضيع بكالوريا قديمة.

![التمارين التطبيقية - بداية](assets/arithmetic-page-27.jpg)

![تمرين تطبيقي 01](assets/arithmetic-page-28.jpg)

![تمرين تطبيقي 02](assets/arithmetic-page-29.jpg)

![تمرين تطبيقي 03](assets/arithmetic-page-30.jpg)

![تمرين تطبيقي 04](assets/arithmetic-page-31.jpg)

![تمرين تطبيقي 05](assets/arithmetic-page-32.jpg)

![تمرين تطبيقي 06](assets/arithmetic-page-33.jpg)

![تمرين تطبيقي 07](assets/arithmetic-page-34.jpg)

![تمرين تطبيقي 08](assets/arithmetic-page-35.jpg)

![تمرين تطبيقي 09](assets/arithmetic-page-36.jpg)

![تمرين تطبيقي 10](assets/arithmetic-page-37.jpg)

![تمرين تطبيقي 11](assets/arithmetic-page-38.jpg)

![تمرين تطبيقي 12](assets/arithmetic-page-39.jpg)

![تمرين تطبيقي 13](assets/arithmetic-page-40.jpg)

![تمرين تطبيقي 14](assets/arithmetic-page-41.jpg)

![تمرين تطبيقي 15](assets/arithmetic-page-42.jpg)

![تمرين تطبيقي 16](assets/arithmetic-page-43.jpg)

![تمرين تطبيقي 17](assets/arithmetic-page-44.jpg)

![تمرين تطبيقي 18](assets/arithmetic-page-45.jpg)

![تمرين تطبيقي 19](assets/arithmetic-page-46.jpg)

![تمرين تطبيقي 20](assets/arithmetic-page-47.jpg)

![تمرين تطبيقي 21](assets/arithmetic-page-48.jpg)

![تمرين تطبيقي 22](assets/arithmetic-page-49.jpg)

![تمرين تطبيقي 23](assets/arithmetic-page-50.jpg)

![نهاية التمارين التطبيقية](assets/arithmetic-page-51.jpg)

## روابط كل صفحات المصدر المتوفرة

- [ص 0](assets/arithmetic-page-0.jpg) | [ص 1](assets/arithmetic-page-1.jpg) | [ص 8](assets/arithmetic-page-8.jpg) | [ص 9](assets/arithmetic-page-9.jpg) | [ص 10](assets/arithmetic-page-10.jpg) | [ص 11](assets/arithmetic-page-11.jpg) | [ص 12](assets/arithmetic-page-12.jpg) | [ص 13](assets/arithmetic-page-13.jpg)
- [ص 14](assets/arithmetic-page-14.jpg) | [ص 15](assets/arithmetic-page-15.jpg) | [ص 16](assets/arithmetic-page-16.jpg) | [ص 17](assets/arithmetic-page-17.jpg) | [ص 18](assets/arithmetic-page-18.jpg) | [ص 19](assets/arithmetic-page-19.jpg) | [ص 20](assets/arithmetic-page-20.jpg) | [ص 21](assets/arithmetic-page-21.jpg)
- [ص 22](assets/arithmetic-page-22.jpg) | [ص 23](assets/arithmetic-page-23.jpg) | [ص 24](assets/arithmetic-page-24.jpg) | [ص 25](assets/arithmetic-page-25.jpg) | [ص 26](assets/arithmetic-page-26.jpg) | [ص 27](assets/arithmetic-page-27.jpg) | [ص 28](assets/arithmetic-page-28.jpg) | [ص 29](assets/arithmetic-page-29.jpg)
- [ص 30](assets/arithmetic-page-30.jpg) | [ص 31](assets/arithmetic-page-31.jpg) | [ص 32](assets/arithmetic-page-32.jpg) | [ص 33](assets/arithmetic-page-33.jpg) | [ص 34](assets/arithmetic-page-34.jpg) | [ص 35](assets/arithmetic-page-35.jpg) | [ص 36](assets/arithmetic-page-36.jpg) | [ص 37](assets/arithmetic-page-37.jpg)
- [ص 38](assets/arithmetic-page-38.jpg) | [ص 39](assets/arithmetic-page-39.jpg) | [ص 40](assets/arithmetic-page-40.jpg) | [ص 41](assets/arithmetic-page-41.jpg) | [ص 42](assets/arithmetic-page-42.jpg) | [ص 43](assets/arithmetic-page-43.jpg) | [ص 44](assets/arithmetic-page-44.jpg) | [ص 45](assets/arithmetic-page-45.jpg)
- [ص 46](assets/arithmetic-page-46.jpg) | [ص 47](assets/arithmetic-page-47.jpg) | [ص 48](assets/arithmetic-page-48.jpg) | [ص 49](assets/arithmetic-page-49.jpg) | [ص 50](assets/arithmetic-page-50.jpg) | [ص 51](assets/arithmetic-page-51.jpg)
