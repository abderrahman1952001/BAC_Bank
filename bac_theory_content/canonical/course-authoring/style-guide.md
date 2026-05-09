# BAC Bank Course Authoring Style Guide

Status: `AUTHORING_STANDARD_V0`

## Voice

BAC Bank lessons should feel serious, clear, and exam-trustworthy. Motivation
comes from mastery: the student sees exactly what a concept unlocks in BAC
questions.

Use student-facing Arabic naturally. Keep mathematical notation precise:
`u_n`, `(u_n)`, `n >= 0`, `q`, `f(x)`, `lim`, and similar notation should stay
compact and unambiguous.

## Tone Rules

Prefer:

- calm confidence;
- short explanations before formulas;
- exact conditions before applying a method;
- original BAC-style examples;
- direct warnings for common traps;
- one useful image or analogy when it clarifies a hard idea.

Avoid:

- fake hype;
- cinematic language;
- repeated metaphors;
- SaaS-style slogans;
- source-like phrasing;
- long formula dumps before intuition.

## Titles

Good titles name the learning work:

- `مدخل إلى المتتاليات`
- `الترميز والرتبة`
- `طرق تعريف المتتالية`
- `رتابة متتالية`
- `الحصر والتقارب`
- `البرهان بالتراجع`
- `المتتاليات الحسابية والهندسية`
- `التحويل إلى متتالية مساعدة`
- `المجاميع والجداءات`
- `مسألة BAC شاملة`

Rejected or heavily discouraged titles:

- `آلة تتنبأ بالمستقبل`
- `القوى الست`
- `تشغيل كل الأدوات في معركة واحدة`
- `مستشعر الصعود والنزول`
- `العدسة التي تكشف السر`

## Legal And Originality Boundary

Trusted sources are private evidence. They help identify scope, terminology,
exercise patterns, traps, visual needs, and expected BAC density.

Public lessons must not copy:

- wording;
- examples;
- page order;
- tables;
- diagrams;
- image assets;
- solution chains.

If a source example is important, rewrite it into a new BAC Bank example with
different numbers, structure, and explanation. Then check that it is still
mathematically valid and in scope.

## Math And Science Authority

Every formula must carry its conditions. Examples:

- A ratio method for monotonicity needs positive terms or a controlled sign
  argument.
- A recurrence fixed point is usable only after convergence is justified.
- A geometric-sequence limit depends on the full case for `q`.
- A domain restriction is part of the statement, not a note after the answer.

Do not smooth over uncertain source extraction. Mark the uncertainty in
internal review notes and keep the student-facing lesson within verified scope.

## Student-Facing Shape

A good node usually follows this rhythm:

1. Hook: the BAC reason this node matters.
2. Intuition: a plain mental model.
3. Formal rule: definition, formula, theorem, or method with conditions.
4. Worked example: original, short, exact.
5. Interaction: classify, choose, reveal, calculate, drag, graph, or compare.
6. Trap: the mistake and the correction.
7. BAC lens: where this appears in exam exercises.
8. Micro-quiz: one retrieval check or one-step transfer.
9. Optional portal: deeper context only when useful.
