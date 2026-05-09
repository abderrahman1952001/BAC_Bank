---
node_code: SEQ_INDEX_LANGUAGE
curriculum_node_code: SEQ_LANGUAGE
subject_code: MATHEMATICS
unit_code: SEQUENCES
stream_scope: ALL_SCIENTIFIC
status: REVIEWED_EXAMPLE
evidence_level: SOURCE_EXTRACTED
programme_evidence:
  - bac_theory_content/programmes/math/SE-M-MT.yml#SEQUENCES
source_evidence:
  - path: bac_theory_content/sources/math/SE-M-MT/source 1 (الأستاذ نور الدين - رياضيات)/sequences/extracted.md
    note: Internal scope evidence for notation, first term, and definitions.
review:
  math: APPROVED_EXAMPLE
  style: APPROVED_EXAMPLE
  originality: APPROVED_EXAMPLE
  json_ready: false
---

# العنوان والرتبة والحد الأول

## Node Brief

Objective:
يفرق الطالب بين المتتالية `(u_n)` والحد `u_n`، ويحدد بداية التعريف والحد الأول
قبل استعمال أي صيغة.

BAC move unlocked:
قراءة معطيات تمرين المتتاليات دون خطأ في الرتبة أو بداية الفهرسة.

Allowed formulas or methods:
حساب حد من صيغة صريحة، وقراءة مجال الفهرسة مثل `n >= 0` أو `n >= 1`.

Conditions that must be stated:
مجموعة قيم `n`، والحد الأول حسب بداية التعريف، وليس حسب العادة.

Common traps to handle:
اعتبار `u_1` هو الحد الأول دائما، أو استعمال صيغة `u_n` خارج مجالها.

Out-of-scope drift to avoid:
لا تدخل بعد في الرتابة، النهايات، أو البرهان بالتراجع.

## Lesson Draft

### Hook

في تمرين BAC، قد تخسر السؤال الأول فقط لأنك بدأت من الحد الخطأ. قبل أن ندرس
اتجاه المتتالية أو نهايتها، يجب أن نعرف: من أين يبدأ `n`؟ وما هو الحد الذي
نحسبه فعلا؟

### Intuition

المتتالية تشبه قائمة مرتبة من القيم، لكن العناوين ليست دائما `1, 2, 3`.
أحيانا تبدأ من `0`، وأحيانا من `1`، وأحيانا من رتبة أخرى يحددها التمرين.

الرمز `(u_n)` يعني المتتالية كاملة. أما `u_n` فهو حد واحد منها عند رتبة
معينة.

### Formal Rule

إذا عرفت متتالية بصيغة `u_n = 2n + 3` من أجل `n >= 0`، فالقيم المسموحة لـ
`n` هي `0, 1, 2, ...`.

إذن:

- الحد الأول هو `u_0`.
- `u_0 = 3`.
- `u_1 = 5` هو الحد الثاني، لا الحد الأول.

أما إذا قال التمرين `n >= 1`، فالحد الأول يصبح `u_1`.

القاعدة العملية: قبل الحساب، اقرأ مجال الفهرسة.

### Worked Example

لتكن `(u_n)` معرفة بـ:

`u_n = n^2 - 4n + 1` من أجل كل `n >= 1`.

المطلوب: احسب الحدود الثلاثة الأولى.

الحل:

- بما أن `n >= 1`، فالحد الأول هو `u_1`.
- `u_1 = 1 - 4 + 1 = -2`.
- `u_2 = 4 - 8 + 1 = -3`.
- `u_3 = 9 - 12 + 1 = -2`.

إذن الحدود الثلاثة الأولى هي: `-2, -3, -2`.

### Interaction

Interaction type:
تصنيف سريع.

Prompt:
اعرض ثلاث بطاقات:

1. `(u_n)` معرفة بـ `u_n = 3n - 1` من أجل `n >= 0`.
2. `(v_n)` معرفة بـ `v_n = 3n - 1` من أجل `n >= 1`.
3. `(w_n)` معرفة بـ `w_0 = 2` و `w_{n+1} = w_n + 3`.

اسأل الطالب: ما الحد الأول في كل بطاقة؟

Expected answer:

1. `u_0 = -1`
2. `v_1 = 2`
3. `w_0 = 2`

Feedback:
نفس الصيغة قد تعطي بداية مختلفة إذا تغير مجال الفهرسة. لا تفترض البداية؛
اقرأها.

### Common Trap

الخطأ: `u_1` هو دائما الحد الأول.

التصحيح: الحد الأول هو الحد الموافق لأول قيمة مسموحة لـ `n`. إذا بدأ التمرين
من `n = 0` فالحد الأول هو `u_0`.

### BAC Lens

في أسئلة المتتاليات، غالبا يبدأ التمرين بطلب حساب حدود أولى أو إثبات خاصية
ابتداء من رتبة معينة. التحكم في البداية يمنع خطأ متسلسلا في باقي الحل:
الرتابة، الحصر، والتراجع كلها تعتمد على الرتب المسموحة.

### Micro-Quiz

Question:
لتكن `(u_n)` معرفة بـ `u_n = 5 - 2n` من أجل `n >= 0`. ما الحد الأول؟

Options:

- A. `u_0 = 5`
- B. `u_1 = 3`
- C. `u_5 = -5`

Correct answer:
A

Feedback:
لأن التعريف يبدأ من `n = 0`، فالحد الأول هو `u_0 = 5`.

### Optional Portal

عندما تبدأ متتالية من `n >= 3`، يمكن أحيانا إعادة فهرستها بمتتالية جديدة
تبدأ من `0` لتسهيل القراءة. هذا مفيد في بعض التحويلات، لكنه ليس ضروريا الآن.

## Review Notes

Math review:
الشروط الأساسية موجودة: مجال الفهرسة، الفرق بين `(u_n)` و `u_n`، وتحديد الحد
الأول حسب البداية.

Style review:
النبرة هادئة ومباشرة، ولا توجد استعارات زائدة.

Originality review:
الأمثلة أصلية وبسيطة، ولا تعتمد على صياغة مصدر خارجي.

JSON mapping notes:
يمكن تحويل الأقسام إلى خطوات: hook, intuition, formal_rule, worked_example,
interaction, trap, bac_lens, quiz, portal.
