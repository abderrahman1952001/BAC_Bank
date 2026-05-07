---
subject: الرياضيات
subjectCode: MATH
streams:
  - SE
  - M
  - MT
unit: الأعداد المركبة
topicCode: COMPLEX_NUMBERS
source: الأستاذ نور الدين - الرياضيات
sourceSection: الأعداد المركبة من الألف إلى الياء
extractionModel: source-faithful-audit-tightened-md
sourcePages:
  index:
    - 3
  availableTheoryAndTraining:
    - "6-24"
missingFromCurrentScanBundle:
  - "الصفحتان 4-5 غير موجودتين في هذا المجلد."
assetStrategy: "صورة كاملة لكل صفحة مصدر في موضعها؛ النص الأساسي مرقون في Markdown؛ الجداول القابلة للتصيير كتبت بـ LaTeX/KaTeX؛ الرسوم والجداول البصرية ربطت بقصاصات إضافية عند الحاجة."
reviewStatus:
  text: "مرور تشديد بنيوي بعد مراجعة بصرية بشرية-آلية: وُحّدت علامات الصفحات وروابط الصور، مع OCR عربي مساعد للصفحات الكثيفة."
  caution:
    - "الصفحات 13-24 كثيفة وتمرينها الطويل رُقن بأعلى قدر عملي في هذا المرور، مع إبقاء صور الصفحات داخل المواضع نفسها للتدقيق."
    - "أي موضع غير مقروء تماما أو بدا فيه خلل مطبعي في المصدر وُسم بملاحظة مراجعة بدل تصحيحه بصمت."
---

# الأعداد المركبة

<!-- source-pages: 3, 6-24 -->

هذا الملف نسخة رقمية وفية لبنية مصدر الأستاذ نور الدين في وحدة **الأعداد المركبة**. الهدف منه أن يحفظ مضمون المصدر للتدقيق وبناء الدروس لاحقا، لا أن يكون درسا كانونيًا نهائيا للمنصة.

## صفحة المصدر 3

<!-- source-page: 3 -->

![صفحة المصدر 3](assets/complex-numbers-page-3.jpg)

## فهرس الجزء المتوفر

| رقم | العنوان كما في المصدر | الصفحة في المصدر |
| --- | --- | --- |
| 01 | تعريف | 6 |
| 02 | كتابة عدد مركب على الشكل الجبري | 6 |
| 03 | مرافق عدد مركب | 6 |
| 04 | طويلة وعمدة عدد مركب | 6 |
| 05 | الشكل المثلثي لعدد مركب | 6 |
| 06 | الشكل الأسي لعدد مركب | 6 |
| 07 | دستور موافر | 7 |
| 08 | النسبة وطبيعة المثلث | 8 |
| 09 | النسبة وطبيعة الرباعي | 9 |
| 10 | تساوي عددين مركبين | 10 |
| 11 | الجذران التربيعيان لعدد مركب | 10 |
| 12 | ملخص التحويلات النقطية | 11 |
| 13 | حل المعادلات في الأعداد المركبة | 12 |
| 14 | المعادلات من الدرجة الثانية | 12 |
| 15 | المعادلات من الدرجة الثالثة | 15 |
| 16 | المعادلات من الدرجة الرابعة | 17 |

## صفحة المصدر 6

<!-- source-page: 6 -->

![صفحة المصدر 6](assets/complex-numbers-page-6.jpg)

## ملخص شامل للأعداد المركبة

درس الأعداد المركبة والتحويلات النقطية:

1. تعريف عدد مركب.
2. الشكل الجبري لعدد مركب.
3. مرافق عدد مركب وخواصه.
4. طويلة وعمدة عدد مركب وخواصهما.
5. الشكل المثلثي لعدد مركب.
6. الشكل الأسي لعدد مركب.
7. دستور موافر وتطبيقاته.
8. النسبة وطبيعة المثلث.
9. طبيعة الرباعي.
10. تساوي عددين مركبين `z` و `z'`.
11. الجذران التربيعيان لعدد مركب.

## 01. تعريف

كل عدد مركب يكتب على الشكل:

$$
z=x+iy
$$

حيث:

$$
i^2=-1
$$

مثال:

$$
z=3+2i
$$

نسمي `x` الجزء الحقيقي للعدد المركب `z` ونكتب:

$$
\operatorname{Re}(z)=x
$$

ونسمي `y` الجزء التخيلي للعدد المركب `z` ونكتب:

$$
\operatorname{Im}(z)=y
$$

إذا كان:

$$
\operatorname{Im}(z)=0
$$

فإن:

$$
z=x
$$

عدد حقيقي.

وإذا كان:

$$
\operatorname{Re}(z)=0
$$

فإن:

$$
z=iy
$$

عدد تخيلي صرف.

العدد `0` عدد حقيقي وتخيلي صرف في آن واحد.

مثال:

$$
\begin{aligned}
(2+3i)^2
&=4+9i^2+12i \\
&=4-9+12i \\
&=-5+12i
\end{aligned}
$$

## 02. كتابة عدد مركب على الشكل الجبري

لكتابة عدد مركب على الشكل الجبري نستعمل غالبا المرافق للتخلص من `i` في المقام.

مثال:

$$
\begin{aligned}
\frac{1+2i}{1+i}
&=\frac{(1+2i)(1-i)}{(1+i)(1-i)} \\
&=\frac{1-i+2i-2i^2}{1^2+1} \\
&=\frac{3+i}{2} \\
&=\frac{3}{2}+\frac{1}{2}i
\end{aligned}
$$

## 03. مرافق عدد مركب

إذا كان:

$$
z=x+iy
$$

فإن مرافقه هو:

$$
\overline{z}=x-iy
$$

أمثلة:

$$
\overline{1+i}=1-i
$$

$$
\overline{5}=5
$$

$$
\overline{2i}=-2i
$$

خواص المرافق:

$$
\begin{array}{c}
\overline{\overline{z}}=z \\
\overline{z_1+z_2}=\overline{z_1}+\overline{z_2} \\
\overline{z_1-z_2}=\overline{z_1}-\overline{z_2} \\
\overline{z_1z_2}=\overline{z_1}\,\overline{z_2} \\
\overline{\left(\frac{z_1}{z_2}\right)}=\frac{\overline{z_1}}{\overline{z_2}}\quad (z_2\neq 0) \\
\overline{kz}=k\overline{z}\quad (k\in\mathbb{R}) \\
\overline{z^n}=(\overline{z})^n\quad (n\in\mathbb{Z})
\end{array}
$$

نتائج:

إذا كان:

$$
z=x+iy,\qquad \overline{z}=x-iy
$$

فإن:

$$
z+\overline{z}=2x
$$

$$
z-\overline{z}=2iy
$$

$$
z\overline{z}=x^2+y^2
$$

ويكون:

$$
z\in\mathbb{R}\Longleftrightarrow \overline{z}=z
$$

$$
z\in i\mathbb{R}\Longleftrightarrow \overline{z}=-z
$$

تطبيق:

ليكن:

$$
f(z)=z^3-3z^2+z-1
$$

بين أن:

$$
\overline{f(z)}=f(\overline{z})
$$

الحل:

$$
\begin{aligned}
\overline{f(z)}
&=\overline{z^3-3z^2+z-1} \\
&=\overline{z}^3-3\overline{z}^2+\overline{z}-1 \\
&=f(\overline{z})
\end{aligned}
$$

## 04. طويلة وعمدة عدد مركب

<!-- source-pages: 6-7 -->

لتكن:

$$
z=x+iy\neq 0
$$

طويلة العدد المركب `z` هي:

$$
r=|z|=\sqrt{x^2+y^2}
$$

وعمدة `z` هي كل عدد حقيقي `\theta` يحقق:

$$
\cos\theta=\frac{x}{r},\qquad \sin\theta=\frac{y}{r}
$$

ونكتب:

$$
\arg(z)=\theta+2k\pi,\qquad k\in\mathbb{Z}
$$

مثال:

$$
z=1+i
$$

لدينا:

$$
r=|z|=\sqrt{1^2+1^2}=\sqrt{2}
$$

إذن:

$$
\cos\theta=\frac{1}{\sqrt{2}}=\frac{\sqrt{2}}{2},\qquad
\sin\theta=\frac{1}{\sqrt{2}}=\frac{\sqrt{2}}{2}
$$

ومنه:

$$
\theta=\frac{\pi}{4}+2k\pi,\qquad k\in\mathbb{Z}
$$

## صفحة المصدر 7

<!-- source-page: 7 -->

![صفحة المصدر 7](assets/complex-numbers-page-7.jpg)

### جدول القيم المثلثية الأساسية

$$
\begin{array}{c|cccccc}
\theta & 0 & \frac{\pi}{6} & \frac{\pi}{4} & \frac{\pi}{3} & \frac{\pi}{2} & \pi \\
\hline
\cos\theta & 1 & \frac{\sqrt{3}}{2} & \frac{\sqrt{2}}{2} & \frac{1}{2} & 0 & -1 \\
\sin\theta & 0 & \frac{1}{2} & \frac{\sqrt{2}}{2} & \frac{\sqrt{3}}{2} & 1 & 0
\end{array}
$$


### الدائرة المثلثية وتحديد العمدة

![الدائرة المثلثية وتحديد العمدة](assets/complex-numbers-unit-circle-arguments.jpg)

العلاقات المثلثية المستعملة في المصدر:

$$
\begin{array}{c|c}
\cos(\pi-\theta)=-\cos\theta & \sin(\pi-\theta)=\sin\theta \\
\cos\left(\frac{\pi}{2}-\theta\right)=\sin\theta & \sin\left(\frac{\pi}{2}-\theta\right)=\cos\theta \\
\cos(\pi+\theta)=-\cos\theta & \sin(\pi+\theta)=-\sin\theta \\
\cos\left(\frac{\pi}{2}+\theta\right)=-\sin\theta & \sin\left(\frac{\pi}{2}+\theta\right)=\cos\theta \\
\sin(2\theta)=2\cos\theta\sin\theta & 2\sin^2\theta=1-\cos(2\theta) \\
2\cos^2\theta=1+\cos(2\theta) &
\end{array}
$$


### خواص الطويلة

$$
\begin{array}{c}
|z|=|\overline{z}|=|-z| \\
|z_B-z_A|=AB \\
|z_1z_2|=|z_1|\,|z_2| \\
\left|\frac{z_1}{z_2}\right|=\frac{|z_1|}{|z_2|}\quad (z_2\neq 0) \\
|z_1|+|z_2|\geq |z_1+z_2| \\
|z_1^n|=|z_1|^n \\
|z_1|-|z_2|\leq |z_1-z_2| \\
|z-z_A|=AM
\end{array}
$$

### الطويلة ومجموعة النقط

لتكن `A` و `B` و `M` نقطا لواحقها على الترتيب:

$$
z_A,\quad z_B,\quad z
$$

إذا كان:

$$
|z-z_A|=k,\qquad k>0
$$

فإن:

$$
AM=k
$$

ومجموعة النقط `M` هي دائرة مركزها `A` ونصف قطرها `k`.

إذا كان:

$$
|z-z_A|=|z-z_B|
$$

فإن:

$$
AM=BM
$$

ومجموعة النقط `M` هي محور القطعة `[AB]`.

إذا تحقق شرط تعامد من الشكل:

$$
\overrightarrow{MA}\cdot\overrightarrow{MB}=0
$$

فإن مجموعة النقط `M` هي الدائرة التي قطرها `[AB]`.

> ملاحظة مراجعة: في الصورة يظهر هذا السطر غير واضح، والكتابة المطبوعة تبدو قريبة من شرط جداء سلمي؛ المعنى الرياضي الموافق للسياق هو دائرة قطرها `[AB]`.

### خواص العمدة

$$
\begin{array}{c}
\arg(\overline{z})=-\arg(z)+2k\pi \\
\arg(-z)=\pi+\arg(z)+2k\pi \\
\arg\left(\frac{1}{z}\right)=-\arg(z)+2k\pi \\
\arg(z_1z_2)=\arg(z_1)+\arg(z_2)+2k\pi \\
\arg\left(\frac{z_1}{z_2}\right)=\arg(z_1)-\arg(z_2)+2k\pi \\
\arg(z^n)=n\arg(z)+2k\pi
\end{array}
\qquad (k\in\mathbb{Z})
$$

### العمدة ومجموعة النقط

<!-- source-pages: 7-8 -->

إذا كان:

$$
\arg(z-z_A)=\theta+2k\pi
$$

فإن:

$$
(\vec{u};\overrightarrow{AM})=\theta+2k\pi
$$

ومجموعة النقط `M` هي نصف المستقيم `[AM)` ما عدا `A`.

إذا كان:

$$
\arg(z-z_A)=\theta+k\pi
$$

فإن مجموعة النقط `M` هي المستقيم `(AM)` ما عدا `A`.

ليكن:

$$
L=\frac{z-z_B}{z-z_A}
$$

حيث `M` تختلف عن `A`.

إذا كان `L` حقيقيا، فإن:

$$
\arg(L)=k\pi
$$

أي:

$$
(\overrightarrow{AM};\overrightarrow{BM})=k\pi
$$

ومجموعة النقط `M` هي المستقيم `(AB)` ما عدا `A`.

إذا كان `L` حقيقيا موجبا، فإن:

$$
\arg(L)=2k\pi
$$

ومجموعة النقط `M` هي المستقيم `(AB)` خارج القطعة المفتوحة بين `A` و `B`، حسب اتجاه النسبة.

إذا كان `L` حقيقيا سالبا، فإن:

$$
\arg(L)=\pi+2k\pi
$$

ومجموعة النقط `M` هي القطعة المستقيمة `]AB[`، مع استثناء النقط غير المسموح بها في النسبة.

إذا كان `L` تخيليا صرفا، فإن:

$$
\arg(L)=\frac{\pi}{2}+k\pi
$$

ومجموعة النقط `M` هي الدائرة التي قطرها `[AB]`، مع استثناء `A`.

إذا كان:

$$
z=z_A+ke^{i\theta}
$$

حيث `k` عدد حقيقي موجب ثابت و `\theta` متغير حقيقي، فإن:

$$
AM=k
$$

ومجموعة النقط `M` هي دائرة مركزها `A` ونصف قطرها `k`.

إذا كان:

$$
z=z_A+ke^{i\theta}
$$

حيث `k` متغير حقيقي و `\theta` ثابت، فإن مجموعة النقط `M` هي المستقيم المار من النقطة `A` والموجه بالشعاع `\vec{v}` حيث:

$$
(\vec{u};\vec{v})=\theta
$$

## صفحة المصدر 8

<!-- source-page: 8 -->

![صفحة المصدر 8](assets/complex-numbers-page-8.jpg)

## 05. الشكل المثلثي لعدد مركب

إذا كان:

$$
z=x+iy\neq 0,\qquad r=|z|,\qquad \theta=\arg(z)
$$

فإن الشكل المثلثي للعدد المركب `z` هو:

$$
z=r(\cos\theta+i\sin\theta)
$$

حيث:

$$
r>0
$$

إذا كتب العدد على الشكل:

$$
z=r(\sin\theta+i\cos\theta)
$$

فإن:

$$
\sin\theta=\cos\left(\frac{\pi}{2}-\theta\right),\qquad
\cos\theta=\sin\left(\frac{\pi}{2}-\theta\right)
$$

إذن:

$$
z=r\left[\cos\left(\frac{\pi}{2}-\theta\right)+i\sin\left(\frac{\pi}{2}-\theta\right)\right]
$$

## 06. الشكل الأسي لعدد مركب

الشكل الأسي للعدد المركب غير المعدوم هو:

$$
z=re^{i\theta}
$$

حيث:

$$
r=|z|,\qquad \theta=\arg(z),\qquad r>0
$$

إذا كان:

$$
z_1=r_1e^{i\theta_1},\qquad z_2=r_2e^{i\theta_2}
$$

فإن:

$$
z_1z_2=r_1r_2e^{i(\theta_1+\theta_2)}
$$

و:

$$
\frac{z_1}{z_2}=\frac{r_1}{r_2}e^{i(\theta_1-\theta_2)}
$$

## 07. دستور موافر

إذا كان:

$$
z=r(\cos\theta+i\sin\theta)=re^{i\theta}
$$

فإن:

$$
z^n=r^n[\cos(n\theta)+i\sin(n\theta)]=r^ne^{in\theta}
$$

### تطبيق 01

اكتب العدد المركب:

$$
z=2\left(\cos\frac{\pi}{3}+i\sin\frac{\pi}{3}\right)
$$

على الشكل الجبري ثم الشكل الأسي.

الحل:

$$
\sin\frac{\pi}{3}=\frac{\sqrt{3}}{2},\qquad
\cos\frac{\pi}{3}=\frac{1}{2}
$$

إذن:

$$
\begin{aligned}
z
&=2\left(\frac{1}{2}+i\frac{\sqrt{3}}{2}\right) \\
&=1+i\sqrt{3}
\end{aligned}
$$

والشكل الأسي هو:

$$
z=2e^{i\frac{\pi}{3}}
$$

### تطبيق 02

ليكن:

$$
z=e^{i\frac{\pi}{3}}
$$

اكتب:

$$
z^{2023}
$$

على الشكل الجبري.

الحل:

$$
\begin{aligned}
z^{2023}
&=\left(e^{i\frac{\pi}{3}}\right)^{2023} \\
&=e^{i\frac{2023\pi}{3}} \\
&=\cos\frac{2023\pi}{3}+i\sin\frac{2023\pi}{3}
\end{aligned}
$$

وبما أن:

$$
2023=3\cdot 674+1
$$

فإن:

$$
z^{2023}
=\cos\frac{\pi}{3}+i\sin\frac{\pi}{3}
=\frac{1}{2}+i\frac{\sqrt{3}}{2}
$$

### تطبيق 03

ليكن:

$$
z=re^{i\theta},\qquad n\in\mathbb{N}
$$

عين قيم `n` حتى يكون:

1. `z^n` حقيقيا.
2. `z^n` حقيقيا موجبا.
3. `z^n` حقيقيا سالبا.
4. `z^n` تخيليا صرفا.

$$
\begin{array}{c|c}
\text{الحالة} & \text{الشرط} \\
\hline
z^n\in\mathbb{R} & n\theta=k\pi \\
z^n\in\mathbb{R}^{+} & n\theta=2k\pi \\
z^n\in\mathbb{R}^{-} & n\theta=2k\pi+\pi \\
z^n\in i\mathbb{R} & n\theta=\frac{\pi}{2}+k\pi
\end{array}
\qquad (k\in\mathbb{Z})
$$


مثال:

$$
z=e^{i\frac{\pi}{4}}
$$

عين قيم `n` حتى يكون:

$$
z^n\in\mathbb{R}^{-}
$$

الحل:

$$
n\frac{\pi}{4}=2k\pi+\pi
$$

إذن:

$$
n=8k+4,\qquad k\in\mathbb{N}
$$

### بعض الحالات المعروفة

$$
\begin{array}{c|c}
\text{الشكل الجبري} & \text{الشكل الأسي} \\
\hline
1 & e^{2k\pi i} \\
-1 & e^{(2k+1)\pi i} \\
i & e^{i(\frac{\pi}{2}+2k\pi)} \\
5 & 5e^{2k\pi i} \\
-5 & 5e^{(2k+1)\pi i} \\
-5i & 5e^{i(-\frac{\pi}{2}+2k\pi)}
\end{array}
\qquad (k\in\mathbb{Z})
$$

### مفاهيم أساسية

لاحقة الشعاع:

$$
z_{\overrightarrow{AB}}=z_B-z_A
$$

لاحقة منتصف القطعة `[AB]`:

$$
z_I=\frac{z_A+z_B}{2}
$$

لاحقة مرجح الجملة:

$$
\left\{(A;\alpha),(B;\beta),(C;\gamma)\right\}
$$

هي:

$$
z_G=\frac{\alpha z_A+\beta z_B+\gamma z_C}{\alpha+\beta+\gamma}
$$

بشرط:

$$
\alpha+\beta+\gamma\neq 0
$$

لاحقة مركز ثقل المثلث `ABC` هي:

$$
z_G=\frac{z_A+z_B+z_C}{3}
$$

إذا كان:

$$
|z_A|=|z_B|=|z_C|=|z_D|=r
$$

أي:

$$
OA=OB=OC=OD=r
$$

فإن النقط `A` و `B` و `C` و `D` تنتمي إلى نفس الدائرة مركزها `O` ونصف قطرها `r`.

## صفحة المصدر 9

<!-- source-page: 9 -->

![صفحة المصدر 9](assets/complex-numbers-page-9.jpg)

## 08. النسبة وطبيعة المثلث

لتكن `A` و `B` و `C` ثلاث نقط لواحقها:

$$
z_A,\qquad z_B,\qquad z_C
$$

نضع:

$$
L=\frac{z_C-z_A}{z_B-z_A}
$$

لدينا:

$$
|L|=\frac{AC}{AB}
$$

و:

$$
\arg(L)=(\overrightarrow{AB};\overrightarrow{AC})
$$

ومن ثم:

إذا كان:

$$
\arg(L)=\pm\frac{\pi}{2},\qquad |L|\neq 1
$$

فإن المثلث `ABC` قائم في `A`.

إذا كان:

$$
\arg(L)=\pm\frac{\pi}{2},\qquad |L|=1
$$

فإن المثلث `ABC` قائم ومتساوي الساقين في `A`.

إذا كان:

$$
\arg(L)=\pm\frac{\pi}{3},\qquad |L|=1
$$

فإن المثلث `ABC` متساوي الأضلاع.

إذا كان:

$$
\arg(L)=\pm\frac{\pi}{4},\qquad |L|=1
$$

فإن المثلث `ABC` متساوي الساقين.

إذا كان:

$$
\arg(L)=\frac{\pi}{4},\qquad |L|=\frac{\sqrt{2}}{2}
$$

فإن المثلث `ABC` قائم ومتساوي الساقين في `C`، حيث:

$$
AC=BC
$$

إذا كان `L` حقيقيا، فإن:

$$
\arg(L)=k\pi
$$

ومن ثم تكون النقط `A` و `B` و `C` على استقامة واحدة.

ملاحظة:

$$
\frac{z_C}{z_B}=\frac{z_C-z_O}{z_B-z_O}
$$

إذا كان `O` هو مبدأ المعلم.

## 09. النسبة وطبيعة الرباعي

يعرض المصدر جدولا لتحديد طبيعة الرباعي باستعمال اللواحق، إما عبر الأشعة والأضلاع أو عبر القطرين.

![جدول طبيعة الرباعي وطرق الإثبات](assets/complex-numbers-quadrilateral-classification.jpg)

خلاصة الجدول:

$$
\begin{array}{c|c}
\text{طبيعة الرباعي} & \text{طريقة إثبات واردة في المصدر} \\
\hline
ABCD\ \text{متوازي أضلاع} &
\overrightarrow{AB}=\overrightarrow{DC}
\ \text{أو}\
\frac{z_A+z_C}{2}=\frac{z_B+z_D}{2} \\
ABCD\ \text{مستطيل} &
ABCD\ \text{متوازي أضلاع و}\ \overrightarrow{AB}\perp\overrightarrow{AD}
\ \text{أو القطران متناصفان ومتقايسان} \\
ABCD\ \text{معين} &
ABCD\ \text{متوازي أضلاع و}\ AB=AD
\ \text{أو القطران متناصفان ومتعامدان} \\
ABCD\ \text{مربع} &
ABCD\ \text{متوازي أضلاع و}\ AB=AD\ \text{و}\ (\overrightarrow{AB};\overrightarrow{AD})=\pm\frac{\pi}{2} \\
ABCD\ \text{شبه منحرف} &
\overrightarrow{AB}=k\overrightarrow{DC},\quad k\in\mathbb{R},\quad k\neq 1
\end{array}
$$

> ملاحظة مراجعة: بعض خانات الجدول في الصورة صغيرة؛ أبقيت القصاصة الأصلية بجانب الصياغة الرقمية لأن التصنيف الدقيق للمعين/المستطيل/المربع يحتاج مراجعة بصرية عند اعتماد هذا الجزء.

## صفحة المصدر 10

<!-- source-page: 10 -->

![صفحة المصدر 10](assets/complex-numbers-page-10.jpg)

## 10. تساوي عددين مركبين

لدينا:

$$
z=z'
$$

إذا وفقط إذا كان:

$$
\operatorname{Re}(z)=\operatorname{Re}(z')
$$

و:

$$
\operatorname{Im}(z)=\operatorname{Im}(z')
$$

ويستعمل المصدر كذلك الطويلة عند التحقق في بعض الصيغ:

$$
|z|=|z'|
$$

## 11. الجذران التربيعيان لعدد مركب

ليكن `w` عددا مركبا. حلول المعادلة:

$$
z^2=w
$$

تسمى الجذرين التربيعيين للعدد المركب `w`.

مثال: حل في `\mathbb{C}`:

$$
z^2=3-4i
$$

نضع:

$$
z=x+iy
$$

فنجد:

$$
z^2=x^2-y^2+2xyi
$$

كما أن:

$$
|z^2|=x^2+y^2
$$

إذن نحصل على الجملة:

$$
\begin{cases}
x^2-y^2=3 \\
2xy=-4 \\
x^2+y^2=5
\end{cases}
$$

من المعادلتين الأولى والثالثة:

$$
2x^2=8
$$

إذن:

$$
x=2\quad \text{أو}\quad x=-2
$$

وبالتعويض في:

$$
2xy=-4
$$

نجد:

$$
y=-1\quad \text{أو}\quad y=1
$$

وعليه:

$$
z_1=2-i,\qquad z_2=-2+i
$$

ومجموعة الحلول:

$$
S=\{2-i,\,-2+i\}
$$

### تطبيق

1. حل في `\mathbb{C}`:

$$
z^2-2z+2=0
$$

$$
z^2-(2\sin\theta)z+1=0,\qquad \theta\in\mathbb{R}
$$

$$
z^2-(2\cos\theta)z+1=0,\qquad \theta\in\mathbb{R}
$$

2. نعتبر كثير الحدود:

$$
p(z)=z^3-3z^2+3z+7
$$

احسب `p(-1)` ثم حل المعادلة:

$$
p(z)=0
$$

الحل:

بالنسبة إلى:

$$
z^2-2z+2=0
$$

لدينا:

$$
\Delta=4-8=-4=4i^2
$$

إذن:

$$
\sqrt{\Delta}=2i
$$

ومنه:

$$
z_1=1-i,\qquad z_2=1+i
$$

بالنسبة إلى:

$$
z^2-(2\sin\theta)z+1=0
$$

لدينا:

$$
\Delta=4\sin^2\theta-4
=4(\sin^2\theta-1)
=-4\cos^2\theta
=4i^2\cos^2\theta
$$

إذن:

$$
\sqrt{\Delta}=2i\cos\theta
$$

ومنه:

$$
z_1=\sin\theta-i\cos\theta,\qquad
z_2=\sin\theta+i\cos\theta
$$

بالنسبة إلى:

$$
z^2-(2\cos\theta)z+1=0
$$

لدينا:

$$
\Delta=4\cos^2\theta-4
=4(\cos^2\theta-1)
=-4\sin^2\theta
=4i^2\sin^2\theta
$$

إذن:

$$
\sqrt{\Delta}=2i\sin\theta
$$

ومنه:

$$
z_1=\cos\theta-i\sin\theta=e^{-i\theta}
$$

و:

$$
z_2=\cos\theta+i\sin\theta=e^{i\theta}
$$

بالنسبة إلى:

$$
p(z)=z^3-3z^2+3z+7
$$

نحسب:

$$
p(-1)=-1-3-3+7=0
$$

إذن `-1` جذر للمعادلة. بالقسمة على `z+1`:

$$
p(z)=(z+1)(z^2-4z+7)
$$

نحل:

$$
z^2-4z+7=0
$$

لدينا:

$$
\Delta=16-28=-12=12i^2
$$

إذن:

$$
\sqrt{\Delta}=2\sqrt{3}i
$$

ومنه حلول المعادلة:

$$
S=\{-1,\ 2-\sqrt{3}i,\ 2+\sqrt{3}i\}
$$

## صفحة المصدر 11

<!-- source-page: 11 -->

![صفحة المصدر 11](assets/complex-numbers-page-11.jpg)

## 12. ملخص التحويلات النقطية

يعرض المصدر ملخصا بصريا للتحويلات النقطية في المستوي المركب.

![ملخص التحويلات النقطية في الأعداد المركبة](assets/complex-numbers-transformations-summary.jpg)

التحويلات التي تظهر في الجدول:

| التحويل | العبارة المركبة النموذجية | العناصر المميزة |
| --- | --- | --- |
| انسحاب | `z'=z+b` | شعاع الانسحاب لاحقته `b` |
| تحاك | `z'-\omega=k(z-\omega)` | المركز `\Omega(\omega)` والنسبة `k` |
| دوران | `z'-\omega=e^{i\theta}(z-\omega)` | المركز `\Omega(\omega)` والزاوية `\theta` |
| تشابه مباشر | `z'-\omega=ke^{i\theta}(z-\omega)` | المركز `\Omega(\omega)` والنسبة `k` والزاوية `\theta` |

## صفحة المصدر 12

<!-- source-page: 12 -->

![صفحة المصدر 12](assets/complex-numbers-page-12.jpg)

## 13. حل المعادلات في الأعداد المركبة

### تمرين تمهيدي

أ) حل في مجموعة الأعداد المركبة `\mathbb{C}` المعادلة:

$$
z^2-4z+5=0
$$

ب) استنتج حلول المعادلة ذات المجهول المركب `z`:

$$
\left(z+1+i(1-\sqrt{3})\right)^2-4z+1-4i(1-\sqrt{3})=0
$$

الحل:

نحل أولا:

$$
z^2-4z+5=0
$$

لدينا:

$$
\Delta=16-4(1)(5)=-4=4i^2
$$

إذن:

$$
\sqrt{\Delta}=2i
$$

وعليه:

$$
z_1=2-i,\qquad z_2=2+i
$$

نضع:

$$
Z=z+1+i(1-\sqrt{3})
$$

فتصبح المعادلة من الشكل:

$$
Z^2-4Z+5=0
$$

ولها نفس حلول المعادلة الأولى:

$$
Z_1=2-i,\qquad Z_2=2+i
$$

ومنه:

$$
z_1=1-i(2-\sqrt{3})
$$

و:

$$
z_2=1+i\sqrt{3}
$$

إذن:

$$
S'=\{1-i(2-\sqrt{3}),\ 1+i\sqrt{3}\}
$$

## 14. المعادلات من الدرجة الثانية

<!-- source-pages: 12-15 -->

اليوتيوب: المعادلات من الدرجة الثانية في الأعداد المركبة.

### التمرين 01

حل في `\mathbb{C}` كلا من المعادلات ذات المجهول `z`:

$$
z^2-\sqrt{3}z+1=0
$$

$$
2z^2-6z+5=0
$$

$$
z^2-5z+9=0
$$

$$
z^2+z+1=0
$$

$$
z^2-2z+3=0
$$

$$
z^2=z+1
$$

$$
z^2+3=0
$$

$$
z^2-2z+2=0
$$

ثم استنتج في `\mathbb{C}` حلول المعادلة:

$$
(-iz+3i+3)^2-2(-iz+3i+3)+2=0
$$

#### حلول التمرين 01

1. بالنسبة إلى:

$$
z^2-\sqrt{3}z+1=0
$$

لدينا:

$$
\Delta=(-\sqrt{3})^2-4(1)(1)=3-4=-1=i^2
$$

إذن:

$$
\sqrt{\Delta}=i
$$

ومنه:

$$
z_1=\frac{\sqrt{3}-i}{2},\qquad
z_2=\frac{\sqrt{3}+i}{2}
$$

## صفحة المصدر 13

<!-- source-page: 13 -->

![صفحة المصدر 13](assets/complex-numbers-page-13.jpg)

2. بالنسبة إلى:

$$
2z^2-6z+5=0
$$

لدينا:

$$
\Delta=(-6)^2-4(2)(5)=36-40=-4=4i^2
$$

إذن:

$$
\sqrt{\Delta}=2i
$$

ومنه:

$$
z_1=\frac{3-i}{2},\qquad z_2=\frac{3+i}{2}
$$

3. بالنسبة إلى:

$$
z^2-5z+9=0
$$

لدينا:

$$
\Delta=(-5)^2-4(1)(9)=25-36=-11
$$

إذن:

$$
\sqrt{\Delta}=i\sqrt{11}
$$

ومنه:

$$
z_1=\frac{5-i\sqrt{11}}{2},\qquad
z_2=\frac{5+i\sqrt{11}}{2}
$$

4. بالنسبة إلى:

$$
z^2+z+1=0
$$

لدينا:

$$
\Delta=1-4=-3=3i^2
$$

إذن:

$$
\sqrt{\Delta}=i\sqrt{3}
$$

ومنه:

$$
z_1=\frac{-1-i\sqrt{3}}{2},\qquad
z_2=\frac{-1+i\sqrt{3}}{2}
$$

5. بالنسبة إلى:

$$
z^2-2z+3=0
$$

لدينا:

$$
\Delta=4-12=-8=8i^2
$$

إذن:

$$
\sqrt{\Delta}=2i\sqrt{2}
$$

ومنه:

$$
z_1=1-i\sqrt{2},\qquad
z_2=1+i\sqrt{2}
$$

6. بالنسبة إلى:

$$
z^2=z+1
$$

أي:

$$
z^2-z-1=0
$$

لدينا:

$$
\Delta=1+4=5
$$

ومنه:

$$
z_1=\frac{1-\sqrt{5}}{2},\qquad
z_2=\frac{1+\sqrt{5}}{2}
$$

7. بالنسبة إلى:

$$
z^2+3=0
$$

أي:

$$
z^2=-3=3i^2
$$

ومنه:

$$
z_1=-i\sqrt{3},\qquad z_2=i\sqrt{3}
$$

8. بالنسبة إلى:

$$
z^2-2z+2=0
$$

لدينا:

$$
\Delta=4-8=-4=4i^2
$$

ومنه:

$$
z_1=1-i,\qquad z_2=1+i
$$

الاستنتاج:

نضع:

$$
Z=-iz+3i+3
$$

فتصبح المعادلة:

$$
Z^2-2Z+2=0
$$

وحلولها:

$$
Z_1=1-i,\qquad Z_2=1+i
$$

إذا كان:

$$
-iz+3i+3=1-i
$$

فإن:

$$
-iz=-2-4i
$$

وبالضرب في `i`:

$$
z=4-2i
$$

وإذا كان:

$$
-iz+3i+3=1+i
$$

فإن:

$$
-iz=-2-2i
$$

وبالضرب في `i`:

$$
z=2-2i
$$

إذن:

$$
S=\{4-2i,\ 2-2i\}
$$

## صفحة المصدر 14

<!-- source-page: 14 -->

![صفحة المصدر 14](assets/complex-numbers-page-14.jpg)

### التمرين 02

نعتبر في مجموعة الأعداد المركبة `\mathbb{C}` المعادلة ذات المجهول `z`:

$$
z^2+4z+13=0\qquad (E)
$$

تحقق أن العدد المركب:

$$
-2-3i
$$

حل للمعادلة `(E)` ثم جد الحل الآخر.

الحل:

$$
(-2-3i)^2+4(-2-3i)+13=0
$$

إذن `-2-3i` حل للمعادلة.

لحساب الحل الآخر:

$$
\Delta=16-4(1)(13)=16-52=-36=36i^2
$$

إذن:

$$
\sqrt{\Delta}=6i
$$

ومن ثم:

$$
z_1=-2-3i,\qquad z_2=-2+3i
$$

### التمرين 03

حل في `\mathbb{C}` المعادلات التالية:

$$
z^2-8\sqrt{3}z+64=0
$$

$$
z^2-2(1+\sqrt{2})z+2(\sqrt{2}+2)=0
$$

$$
z^2-2(\cos\theta)z+1=0,\qquad \theta\in\mathbb{R}
$$

$$
z^2-2(\sin\theta)z+1=0,\qquad \theta\in\mathbb{R}
$$

$$
z^2-(4\cos\alpha)z+4=0,\qquad \alpha\in\mathbb{R}
$$

$$
z^2+2(1-\cos\theta)z+2-2\cos\theta=0,\qquad \theta\in\mathbb{R}
$$

الحلول كما وردت في المصدر:

بالنسبة إلى:

$$
z^2-8\sqrt{3}z+64=0
$$

$$
\Delta=(8\sqrt{3})^2-4(1)(64)=192-256=-64=64i^2
$$

إذن:

$$
\sqrt{\Delta}=8i
$$

ومنه:

$$
z_1=4\sqrt{3}-4i,\qquad z_2=4\sqrt{3}+4i
$$

بالنسبة إلى:

$$
z^2-2(1+\sqrt{2})z+2(\sqrt{2}+2)=0
$$

$$
\Delta=[-2(1+\sqrt{2})]^2-4[2(\sqrt{2}+2)]
$$

وبعد النشر والتبسيط:

$$
\Delta=4
$$

ومنه:

$$
\sqrt{\Delta}=2
$$

وعليه:

$$
z_1=\sqrt{2},\qquad z_2=2+\sqrt{2}
$$

بالنسبة إلى:

$$
z^2-2(\cos\theta)z+1=0
$$

$$
\Delta=4\cos^2\theta-4=-4\sin^2\theta
$$

ومنه:

$$
\sqrt{\Delta}=2i\sin\theta
$$

فتكون الحلول:

$$
z_1=\cos\theta-i\sin\theta=e^{-i\theta},\qquad
z_2=\cos\theta+i\sin\theta=e^{i\theta}
$$

بالنسبة إلى:

$$
z^2-2(\sin\theta)z+1=0
$$

$$
\Delta=4\sin^2\theta-4=-4\cos^2\theta
$$

ومنه:

$$
z_1=\sin\theta-i\cos\theta,\qquad
z_2=\sin\theta+i\cos\theta
$$

بالنسبة إلى:

$$
z^2-(4\cos\alpha)z+4=0
$$

$$
\Delta=16\cos^2\alpha-16=-16\sin^2\alpha
$$

ومنه:

$$
\sqrt{\Delta}=4i\sin\alpha
$$

فتكون:

$$
z_1=2(\cos\alpha-i\sin\alpha)=2e^{-i\alpha}
$$

و:

$$
z_2=2(\cos\alpha+i\sin\alpha)=2e^{i\alpha}
$$

## صفحة المصدر 15

<!-- source-page: 15 -->

![صفحة المصدر 15](assets/complex-numbers-page-15.jpg)

بالنسبة إلى:

$$
z^2+2(1-\cos\theta)z+2-2\cos\theta=0
$$

$$
\Delta=[2(1-\cos\theta)]^2-4(2-2\cos\theta)
$$

وبعد التبسيط:

$$
\Delta=-4\sin^2\theta
$$

إذن:

$$
\sqrt{\Delta}=2i\sin\theta
$$

ومنه:

$$
z_1=-(1-\cos\theta)-i\sin\theta
$$

و:

$$
z_2=-(1-\cos\theta)+i\sin\theta
$$

## 15. المعادلات من الدرجة الثالثة

<!-- source-pages: 15-17 -->

### مثال1

حل المثال:

ليكن كثير الحدود:

$$
P(z)=z^3+2z^2-16
$$

احسب:

$$
P(2)
$$

ثم عين الأعداد الحقيقية `a,b,c` حيث:

$$
P(z)=(z-2)(az^2+bz+c)
$$

ثم حل المعادلة:

$$
P(z)=0
$$

الحل:

$$
P(2)=2^3+2(2)^2-16=8+8-16=0
$$

إذن `2` جذر للمعادلة.

بالمطابقة:

$$
P(z)=(z-2)(z^2+4z+8)
$$

ومن ثم:

$$
P(z)=0
\Longleftrightarrow
(z-2)(z^2+4z+8)=0
$$

أي:

$$
z=2
$$

أو:

$$
z^2+4z+8=0
$$

ولدينا:

$$
\Delta=16-32=-16=16i^2
$$

فتكون جذور المعادلة الثانية:

$$
z=-2-2i,\qquad z=-2+2i
$$

إذن حلول المعادلة:

$$
S=\{2,\ -2-2i,\ -2+2i\}
$$

## صفحة المصدر 16

<!-- source-page: 16 -->

![صفحة المصدر 16](assets/complex-numbers-page-16.jpg)

### مثال 2

ليكن `P(z)` كثير حدود معرفا كما يلي:

$$
P(z)=2z^3+14z^2+41z+68
$$

1. بين أن المعادلة `P(z)=0` لها حل حقيقي.
2. حل المعادلة:

$$
P(z)=0
$$

الحل:

نرمز للعدد الحقيقي بـ `a`. نبحث عن حل حقيقي للمعادلة:

$$
P(a)=0
$$

يظهر من المصدر أن:

$$
P(z)=(z+4)(2z^2+6z+17)
$$

ومن ثم:

$$
P(z)=0
\Longleftrightarrow
z+4=0
\quad \text{أو}\quad
2z^2+6z+17=0
$$

إذن:

$$
z=-4
$$

أما:

$$
2z^2+6z+17=0
$$

فلها:

$$
\Delta=36-4(2)(17)=-100=100i^2
$$

إذن:

$$
\sqrt{\Delta}=10i
$$

ومنه:

$$
z=\frac{-6-10i}{4}=\frac{-3-5i}{2}
$$

أو:

$$
z=\frac{-6+10i}{4}=\frac{-3+5i}{2}
$$

إذن:

$$
S=\left\{-4,\frac{-3-5i}{2},\frac{-3+5i}{2}\right\}
$$

### مثال 3

نعتبر كثير الحدود ذو المتغير المركب `z` التالي:

$$
P(z)=z^3-z^2-iz+3-i
$$

1. أ) بين أنه من أجل كل `z` يكون:

$$
P(z)=(z+1)(z^2-3z+3-i)
$$

ب) حل المعادلة:

$$
P(z)=0
$$

الحل:

بالنشر:

$$
(z+1)(z^2-3z+3-i)
=z^3-2z^2-iz+3-i
$$

> ملاحظة مراجعة: في الصورة تظهر صيغة كثيرة الحدود وسطر النشر باضطراب مطبعي/OCR. الصيغة المعتمدة هنا هي التي تجعل التحليل والحل الظاهرين في المصدر متسقين: `P(z)=(z+1)(z^2-3z+3-i)`.

إذن:

$$
P(z)=0
\Longleftrightarrow
z+1=0
\quad \text{أو}\quad
z^2-3z+3-i=0
$$

أي:

$$
z=-1
$$

أو:

$$
z^2-3z+3-i=0
$$

ولهذه المعادلة:

$$
\Delta=(-3)^2-4(1)(3-i)=9-12+4i=-3+4i
$$

حسب المصدر:

$$
\sqrt{\Delta}=1+2i
$$

ومن ثم:

$$
z_1=\frac{3-(1+2i)}{2}=1-i
$$

و:

$$
z_2=\frac{3+(1+2i)}{2}=2+i
$$

فتكون حلول المعادلة:

$$
S=\{-1,\ 1-i,\ 2+i\}
$$

## صفحة المصدر 17

<!-- source-page: 17 -->

![صفحة المصدر 17](assets/complex-numbers-page-17.jpg)

### مثال 4

بين أن المعادلة:

$$
z^3+iz^2+3z-3i=0
$$

تقبل حلا تخيليا صرفا.

الحل كما في المصدر:

ليكن الحل التخيلي الصرف من الشكل:

$$
z=ai,\qquad a\in\mathbb{R}
$$

بالتعويض:

$$
(ai)^3+i(ai)^2+3(ai)-3i=0
$$

وبالتبسيط نحصل على:

$$
i(-a^3+a^2+3a-3)=0
$$

أي:

$$
-a^3+a^2+3a-3=0
$$

ونلاحظ:

$$
-1+1+3-3=0
$$

إذن:

$$
a=1
$$

ومن ثم الحل التخيلي الصرف هو:

$$
z=i
$$

## 16. المعادلات من الدرجة الرابعة

<!-- source-pages: 17-24 -->

### تمرين

حل في مجموعة الأعداد المركبة المعادلة:

$$
z^4-10z^3+38z^2-90z+261=0
$$

إذا علمت أنها تقبل حلين تخيليين صرفين.

الحل:

بما أن المعادلة تقبل حلين تخيليين صرفين، فإن الحلول من الشكل:

$$
z=iy,\qquad y\in\mathbb{R}
$$

نعوض:

$$
(iy)^4-10(iy)^3+38(iy)^2-90(iy)+261=0
$$

وبالتبسيط:

$$
(y^4-38y^2+261)+i(10y^3-90y)=0
$$

ومنه قيم `y` تحقق الجملة:

$$
\begin{cases}
y^4-38y^2+261=0 \\
10y^3-90y=0
\end{cases}
$$

من:

$$
10y^3-90y=0
$$

نجد:

$$
10y(y^2-9)=0
$$

أي:

$$
y=0\quad \text{أو}\quad y=3\quad \text{أو}\quad y=-3
$$

وبالتعويض في المعادلة الأخرى، الحلان المقبولان هما:

$$
y=3,\qquad y=-3
$$

إذن الحلان التخيليان الصرفان هما:

$$
3i,\qquad -3i
$$

نكتب:

$$
z^4-10z^3+38z^2-90z+261=(z-3i)(z+3i)(az^2+bz+c)
$$

وبما أن:

$$
(z-3i)(z+3i)=z^2+9
$$

فإن:

$$
z^4-10z^3+38z^2-90z+261=(z^2+9)(z^2-10z+29)
$$

نحل:

$$
z^2-10z+29=0
$$

لدينا:

$$
\Delta=100-116=-16=(4i)^2
$$

إذن:

$$
z=\frac{10\pm 4i}{2}=5\pm 2i
$$

وعليه حلول المعادلة هي:

$$
S=\{-3i,\ 3i,\ 5-2i,\ 5+2i\}
$$

## صفحة المصدر 18

<!-- source-page: 18 -->

![صفحة المصدر 18](assets/complex-numbers-page-18.jpg)

## تمرين شامل للأعداد المركبة والتحويلات النقطية

### نص التمرين

1. بين أن المعادلة:

$$
z^3-8=0
$$

تقبل حلا حقيقيا، ثم جد حلول المعادلة واكتبها على الشكل الأسي.

2. حل في `\mathbb{C}` المعادلة:

$$
z^2-4(\cos\theta)z+4=0
$$

حيث `\theta` وسيط حقيقي، ثم اكتب الحلول على الشكل الأسي.

3. ليكن العددان المركبان `z_1` و `z_2` حيث:

$$
z_1=1+i\sqrt{3},\qquad z_2=2
$$

بين أن:

$$
z_1=2e^{i\frac{\pi}{3}}
$$

4. ليكن العددان المركبان:

$$
z_1,\qquad z_2
$$

حيث يعطي المصدر عبارتين مركبتين ثم يطلب تحديد قيم العدد الطبيعي `n` في الحالات:

$$
(z_1)^n\in\mathbb{R},\quad
(z_1)^n\in\mathbb{R}^+,\quad
(z_1)^n\in\mathbb{R}^-,\quad
(z_1)^n\in i\mathbb{R}
$$

ونفس النمط بالنسبة إلى `z_2`.

5. اكتب عددا مركبا معطى على الشكل الجبري فالشكل الأسي، واستنتج القيم المضبوطة لكل من:

$$
\cos\left(\frac{5\pi}{12}\right),\qquad
\sin\left(\frac{5\pi}{12}\right)
$$

6. في المستوي المركب المنسوب إلى معلم متعامد ومتجانس، تعطى النقط `A` و `B` و `C` بلواحقها. يطلب المصدر كتابة نسبة مركبة على الشكل الأسي، واستنتاج طبيعة المثلث `ABC`، ثم تعيين لاحقة النقطة `D` حتى يكون الرباعي `ABCD` مربعا، ثم تعيين لاحقة النقطة `G` مركز ثقل المثلث `ABC`.

7. اكتب على الشكل الأسي عددا مركبا معطى، ثم استنتج طبيعة مثلث.

8. عين مجموعة النقط `M` من المستوي في حالات تعتمد على أطوال من الشكل:

$$
\left\|\overrightarrow{MA}+\overrightarrow{MB}+\overrightarrow{MC}\right\|
$$

وعلاقات مثل:

$$
MA^2-MB^2=0
$$

و:

$$
|z-z_A|=r
$$

9. عين مجموعة النقط في حالات تعتمد على العمدة مثل:

$$
\arg(z-z_A),\qquad \arg(z),\qquad \arg(z^2)
$$

10. لتكن:

$$
L=\frac{z-z_B}{z-z_A}
$$

حيث `M` تختلف عن `A` و `B`. عين مجموعة النقط في حالات كون `L` حقيقيا، حقيقيا موجبا، حقيقيا سالبا أو تخيليا صرفا.

11. عين طبيعة تحويلات نقطية معطاة بعبارات مركبة من الشكل:

$$
z'=az+b
$$

أو:

$$
z'-\omega=ke^{i\theta}(z-\omega)
$$

12. لتكن `S` تشابها مباشرا مركزه `O` ونسبته `2` وزاويته محددة في المصدر. يطلب:

- تعيين العبارة المركبة لـ `S`.
- تعيين صورة نقطة `A`.
- استعمال العبارة المركبة لتحديد صورة أو سوابق نقط أخرى.

> ملاحظة مراجعة: نص السؤال 4 وما بعده في الصفحة 18 شديد الاكتظاظ، وبعض اللواحق غير مميزة من الصورة وحدها. أبقيت صورة الصفحة فوق هذا النص لتكون مرجع الحسم قبل استعماله كنسخة نهائية.

## صفحة المصدر 19

<!-- source-page: 19 -->

![صفحة المصدر 19](assets/complex-numbers-page-19.jpg)

### حل التمرين الشامل

#### السؤال 1

نثبت أن:

$$
z^3-8=0
$$

تقبل حلا حقيقيا. إذا كان `a` حلا حقيقيا، فإن:

$$
a^3-8=0
$$

أي:

$$
a^3=8
$$

ومنه:

$$
a=2
$$

إذن `2` حل حقيقي للمعادلة.

نكتب:

$$
z^3-8=(z-2)(z^2+2z+4)
$$

نحل:

$$
z^2+2z+4=0
$$

لدينا:

$$
\Delta=4-16=-12=12i^2
$$

إذن:

$$
\sqrt{\Delta}=2i\sqrt{3}
$$

فتكون الحلول:

$$
z=2,\qquad z=-1-i\sqrt{3},\qquad z=-1+i\sqrt{3}
$$

على الشكل الأسي:

$$
2=2e^{0i}
$$

$$
-1+i\sqrt{3}=2e^{i\frac{2\pi}{3}}
$$

$$
-1-i\sqrt{3}=2e^{i\frac{4\pi}{3}}
$$

#### السؤال 2

نحل:

$$
z^2-4(\cos\theta)z+4=0
$$

لدينا:

$$
\Delta=16\cos^2\theta-16=16(\cos^2\theta-1)=-16\sin^2\theta
$$

إذن:

$$
\sqrt{\Delta}=4i\sin\theta
$$

ومنه:

$$
z_1=2\cos\theta-2i\sin\theta
=2(\cos\theta-i\sin\theta)
=2e^{-i\theta}
$$

و:

$$
z_2=2\cos\theta+2i\sin\theta
=2(\cos\theta+i\sin\theta)
=2e^{i\theta}
$$

#### السؤال 3

بالنسبة إلى:

$$
z_1=1+i\sqrt{3}
$$

لدينا:

$$
|z_1|=\sqrt{1^2+(\sqrt{3})^2}=2
$$

و:

$$
\cos\theta=\frac{1}{2},\qquad \sin\theta=\frac{\sqrt{3}}{2}
$$

إذن:

$$
\theta=\frac{\pi}{3}
$$

وعليه:

$$
z_1=2e^{i\frac{\pi}{3}}
$$

## صفحة المصدر 20

<!-- source-page: 20 -->

![صفحة المصدر 20](assets/complex-numbers-page-20.jpg)

#### السؤال 4

يستعمل المصدر قاعدة:

$$
\arg(z^n)=n\arg(z)+2k\pi
$$

وتعيين حالات:

$$
z^n\in\mathbb{R},\qquad
z^n\in\mathbb{R}^{+},\qquad
z^n\in\mathbb{R}^{-},\qquad
z^n\in i\mathbb{R}
$$

من خلال الشروط:

$$
n\theta=k\pi,\qquad
n\theta=2k\pi,\qquad
n\theta=2k\pi+\pi,\qquad
n\theta=\frac{\pi}{2}+k\pi
$$

حل المصدر يعطي سلاسل من الشكل:

$$
n=3k,\qquad n=6k,\qquad n=6k+3,\qquad n=6k+\frac{3}{2}
$$

أو صيغ مماثلة بحسب العمدة المعطاة لكل عدد.

> ملاحظة مراجعة: أرقام هذا السؤال في صورة الصفحة 18 وامتداد حله في الصفحة 20 تحتاج مراجعة يدوية ثانية لأن بعض الأسس والعمد غير مقروءة بوضوح.

#### السؤال 5

يعتمد المصدر على كتابة حاصل جداء/نسبة مركبة بالشكلين الجبري والأسي ثم المطابقة لاستخراج:

$$
\cos\left(\frac{5\pi}{12}\right)
$$

و:

$$
\sin\left(\frac{5\pi}{12}\right)
$$

والنتيجة المعروفة المطابقة لما يظهر في المصدر:

$$
\cos\left(\frac{5\pi}{12}\right)=\frac{\sqrt{6}-\sqrt{2}}{4}
$$

$$
\sin\left(\frac{5\pi}{12}\right)=\frac{\sqrt{6}+\sqrt{2}}{4}
$$

#### السؤال 6

يعطي المصدر النقط:

$$
A,\quad B,\quad C
$$

بلواحقها، ثم يستعمل:

$$
\frac{z_C-z_A}{z_B-z_A}
$$

لاستنتاج طبيعة المثلث `ABC`.

يظهر في الحل أن النتيجة:

$$
AB=BC
$$

ووجود زاوية قائمة، ومنه المثلث `ABC` قائم ومتساوي الساقين.

لتعيين `D` حتى يكون `ABCD` مربعا، يستعمل المصدر علاقة متوازي الأضلاع:

$$
z_A+z_C=z_B+z_D
$$

أو:

$$
z_D=z_A+z_C-z_B
$$

ثم يتحقق من التقايس والتعامد.

ولاحقة مركز الثقل `G` هي:

$$
z_G=\frac{z_A+z_B+z_C}{3}
$$

## صفحة المصدر 21

<!-- source-page: 21 -->

![صفحة المصدر 21](assets/complex-numbers-page-21.jpg)

#### السؤال 8

يستعمل المصدر خاصية المرجح:

إذا كان `G` مرجح الجملة:

$$
\{(A,1),(B,1),(C,1)\}
$$

فإن:

$$
\overrightarrow{MA}+\overrightarrow{MB}+\overrightarrow{MC}=3\overrightarrow{MG}
$$

ومن ثم تتحول المعادلات الشعاعية إلى دوائر أو محاور قطع.

أمثلة من الحل:

$$
\left\|\overrightarrow{MA}+\overrightarrow{MB}+\overrightarrow{MC}\right\|=6
\Longleftrightarrow
3MG=6
\Longleftrightarrow
MG=2
$$

فتكون مجموعة النقط دائرة مركزها `G` ونصف قطرها `2`.

كما أن:

$$
MA^2-MB^2=0
\Longleftrightarrow
MA=MB
$$

فتكون مجموعة النقط محور القطعة `[AB]`.

#### السؤال 9

تستعمل حلول المصدر قواعد المجموعات النقطية:

إذا كان:

$$
|z-z_A|=r
$$

فمجموعة النقط دائرة مركزها `A` ونصف قطرها `r`.

إذا كان:

$$
\arg(z-z_A)=\alpha+2k\pi
$$

فمجموعة النقط نصف مستقيم مبدؤه `A` ويميل بزاوية `\alpha`.

إذا كان:

$$
\arg(z)=\alpha+k\pi
$$

فمجموعة النقط مستقيم مار بالمبدأ ويميل بزاوية `\alpha`.

## صفحة المصدر 22

<!-- source-page: 22 -->

![صفحة المصدر 22](assets/complex-numbers-page-22.jpg)

#### السؤال 10

لتكن:

$$
L=\frac{z-z_B}{z-z_A}
$$

إذا كان:

$$
L\in\mathbb{R}
$$

أي:

$$
\arg(L)=k\pi,\qquad k\in\mathbb{Z}
$$

ومنه:

$$
(\overrightarrow{MA};\overrightarrow{MB})=k\pi
$$

أي النقط `M` و `A` و `B` في استقامية. مجموعة النقط هي المستقيم `(AB)` ما عدا `A` و `B`:

$$
(AB)-\{A,B\}
$$

إذا كان:

$$
L\in\mathbb{R}^{+*}
$$

أي:

$$
\arg(L)=2k\pi
$$

ومنه:

$$
(\overrightarrow{MA};\overrightarrow{MB})=2k\pi
$$

وتكون مجموعة النقط حسب المصدر على المستقيم `(AB)` مع استثناء `A` و `B`:

$$
(AB)-\{A,B\}
$$

إذا كان:

$$
L\in\mathbb{R}^{-*}
$$

أي:

$$
\arg(L)=\pi+2k\pi
$$

ومنه:

$$
(\overrightarrow{MA};\overrightarrow{MB})=\pi+2k\pi
$$

فتكون مجموعة النقط هي القطعة المستقيمة المفتوحة:

$$
]AB[
$$

إذا كان:

$$
L\in i\mathbb{R}
$$

فإن:

$$
(\overrightarrow{AM};\overrightarrow{BM})=\frac{\pi}{2}+k\pi
$$

ومجموعة النقط هي الدائرة التي قطرها `[AB]`، مع استثناء النقط غير المسموحة.

كما يعالج المصدر الحالات التالية:

إذا كان:

$$
L\overline{L}=1
$$

فإن:

$$
|L|^2=1
$$

ومنه:

$$
|L|=1
$$

أي:

$$
\left|\frac{z_B-z}{z_A-z}\right|=1
$$

وبالتالي:

$$
|z_B-z|=|z_A-z|
$$

أي:

$$
MB=MA
$$

فتكون مجموعة النقط هي محور القطعة `[AB]`.

إذا كان:

$$
\arg(L)=\pi+2k\pi
$$

فإن:

$$
(\overrightarrow{MA};\overrightarrow{MB})=\pi+2k\pi
$$

ومجموعة النقط هي القطعة المستقيمة:

$$
]AB[
$$

إذا كان:

$$
\arg(L^2)=\pi+2k\pi
$$

فإن:

$$
2\arg(L)=\pi+2k\pi
$$

ومنه:

$$
\arg(L)=\frac{\pi}{2}+k\pi
$$

أي:

$$
(\overrightarrow{MA};\overrightarrow{MB})=\frac{\pi}{2}+k\pi
$$

فتكون مجموعة النقط هي الدائرة التي قطرها `[AB]` ما عدا النقطتين `A` و `B`.

إذا كان:

$$
\arg(iL)=2k\pi
$$

فإن:

$$
\arg(i)+\arg(L)=2k\pi
$$

أي:

$$
\frac{\pi}{2}+\arg(L)=2k\pi
$$

ومنه:

$$
\arg(L)=-\frac{\pi}{2}+2k\pi
$$

فتكون مجموعة النقط هي القوس `AB` في الاتجاه المباشر الموافق، أي نصف دائرة.

إذا كان:

$$
\arg(i\overline{L})=k\pi
$$

فإن:

$$
\arg(i)+\arg(\overline{L})=k\pi
$$

أي:

$$
\frac{\pi}{2}-\arg(L)=k\pi
$$

ومنه:

$$
\arg(L)=\frac{\pi}{2}-k\pi
$$

فتكون مجموعة النقط هي الدائرة التي قطرها `[AB]` باستثناء `A` و `B`.

## صفحة المصدر 23

<!-- source-page: 23 -->

![صفحة المصدر 23](assets/complex-numbers-page-23.jpg)

#### السؤال 11 والسؤال 12

يعين المصدر طبيعة تحويلات نقطية انطلاقا من العبارة المركبة:

إذا كانت:

$$
z'=az+b
$$

فيجب حساب `a`.

إذا كان:

$$
a=1,\qquad b\neq 0
$$

فالتحويل `T` انسحاب لاحقة شعاعه:

$$
z_{\vec{u}}=b
$$

إذا كانت:

$$
a\in\mathbb{R}-\{1\}
$$

فالتحويل `T` تحاك نسبته:

$$
k=a
$$

ولاحقة مركزه `W` هي:

$$
z_W=\frac{b}{1-a}
$$

إذا كان `a` عددا مركبا غير حقيقي و:

$$
|a|=1
$$

فالتحويل `T` دوران زاويته:

$$
\theta=\arg(a)
$$

ولاحقة مركزه:

$$
z_W=\frac{b}{1-a}
$$

إذا كان `a` عددا مركبا غير حقيقي و:

$$
|a|\neq 1
$$

فالتحويل `T` تشابه مباشر نسبته:

$$
k=|a|
$$

وزاويته:

$$
\theta=\arg(a)
$$

ولاحقة مركزه:

$$
z_W=\frac{b}{1-a}
$$

أمثلة المصدر:

إذا كان:

$$
z'=z+1-i
$$

فالتحويل انسحاب لاحقة شعاعه:

$$
z_{\vec{u}}=1-i
$$

إذا كان:

$$
z'=2z+1
$$

فإن:

$$
2\in\mathbb{R}^*-\{1\}
$$

فالتحويل تحاك نسبته:

$$
k=2
$$

ولاحقة مركزه:

$$
z_W=\frac{1}{1-2}=-\frac{1}{2}
$$

إذا كان:

$$
z'=\left(\frac{1}{2}+i\frac{\sqrt{3}}{2}\right)z
$$

فإن:

$$
\left|\frac{1}{2}+i\frac{\sqrt{3}}{2}\right|=1
$$

فالتحويل دوران زاويته:

$$
\theta=\arg\left(\frac{1}{2}+i\frac{\sqrt{3}}{2}\right)=\frac{\pi}{3}
$$

ومركزه:

$$
z_W=0
$$

إذا كان:

$$
z'=(1-i)z+2
$$

فإن:

$$
|1-i|=\sqrt{2}
$$

فالتحويل تشابه مباشر نسبته:

$$
k=\sqrt{2}
$$

وزاويته:

$$
\theta=-\frac{\pi}{4}
$$

ومركزه:

$$
z_W=\frac{2}{1-(1-i)}
$$

إذا كان:

$$
z'=2e^{i\frac{\pi}{3}}z
$$

فالتحويل تشابه مباشر نسبته:

$$
k=2
$$

وزاويته:

$$
\frac{\pi}{3}
$$

ومركزه المبدأ `O`.

إذا كان:

$$
z'-z_A=2(z-z_A)
$$

فالتحويل تحاك نسبته `2` ومركزه `A`.

إذا كان:

$$
z'-z_B=e^{i\frac{\pi}{3}}(z-z_B)
$$

فالتحويل دوران زاويته `\frac{\pi}{3}` ومركزه `B`.

إذا كان:

$$
z'-z_W=ke^{i\theta}(z-z_W),\qquad k>0
$$

فهذه قاعدة تشابه مباشر مركزه `W` ونسبته `k` وزاويته `\theta`.

إذا كان:

$$
z'-z_A=-2e^{i\frac{\pi}{6}}(z-z_A)
$$

فبما أن:

$$
-2=2e^{i\pi}
$$

فإن:

$$
-2e^{i\frac{\pi}{6}}=2e^{i\frac{7\pi}{6}}
$$

ومنه التحويل تشابه مباشر نسبته:

$$
k=2
$$

وزاويته:

$$
\theta=\frac{7\pi}{6}
$$

ومركزه `A`.

## صفحة المصدر 24

<!-- source-page: 24 -->

![صفحة المصدر 24](assets/complex-numbers-page-24.jpg)

### العبارة المركبة للتحويل `S`

نستعمل العبارة المختصرة:

$$
z'-z_0=ke^{i\theta}(z-z_0)
$$

في المصدر:

$$
z'=2e^{i\frac{2\pi}{3}}z
$$

إذن:

$$
z'=2\left[\cos\left(\frac{2\pi}{3}\right)+i\sin\left(\frac{2\pi}{3}\right)\right]z
$$

ومنه:

$$
z'=2\left(-\frac{1}{2}+i\frac{\sqrt{3}}{2}\right)z
$$

أي:

$$
z'=(-1+i\sqrt{3})z
$$

تعيين صورة `A`:

لدينا:

$$
z_A=-3-2i
$$

و:

$$
z'_A=(-1+i\sqrt{3})z_A
$$

إذن:

$$
\begin{aligned}
z'_A
&=(-1+i\sqrt{3})(-3-2i) \\
&=3+2i-3i\sqrt{3}+2\sqrt{3} \\
&=3+2\sqrt{3}+i(2-3\sqrt{3})
\end{aligned}
$$

## صفحات المصدر المتوفرة للمراجعة

- [ص 3](assets/complex-numbers-page-3.jpg)
- [ص 6](assets/complex-numbers-page-6.jpg)
- [ص 7](assets/complex-numbers-page-7.jpg)
- [ص 8](assets/complex-numbers-page-8.jpg)
- [ص 9](assets/complex-numbers-page-9.jpg)
- [ص 10](assets/complex-numbers-page-10.jpg)
- [ص 11](assets/complex-numbers-page-11.jpg)
- [ص 12](assets/complex-numbers-page-12.jpg)
- [ص 13](assets/complex-numbers-page-13.jpg)
- [ص 14](assets/complex-numbers-page-14.jpg)
- [ص 15](assets/complex-numbers-page-15.jpg)
- [ص 16](assets/complex-numbers-page-16.jpg)
- [ص 17](assets/complex-numbers-page-17.jpg)
- [ص 18](assets/complex-numbers-page-18.jpg)
- [ص 19](assets/complex-numbers-page-19.jpg)
- [ص 20](assets/complex-numbers-page-20.jpg)
- [ص 21](assets/complex-numbers-page-21.jpg)
- [ص 22](assets/complex-numbers-page-22.jpg)
- [ص 23](assets/complex-numbers-page-23.jpg)
- [ص 24](assets/complex-numbers-page-24.jpg)
