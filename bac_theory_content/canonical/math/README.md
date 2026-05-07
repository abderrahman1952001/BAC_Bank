# Math canonical curriculum blueprint

Status: `BLUEPRINT_V0`

This is the first whole-subject map for the platform-authored Math curriculum.
It is not a lesson file and it is not a source extraction. It defines the route
we will use before creating unit-level `course.json` journeys.

Subject-agnostic curriculum rules live in `../README.md`.

Canonical Math should be aligned to:

- `bac_theory_content/programmes/math/SE-M-MT.yml`
- `bac_theory_content/programmes/math/LP-LE.yml`

Canonical Math uses these source folders as internal curriculum intelligence:

- `bac_theory_content/sources/math/SE-M-MT/source 1 (الأستاذ نور الدين - رياضيات)`
- `bac_theory_content/sources/math/LP-LE/source 1 (الأستاذ نور الدين - رياضيات الشعب الأدبية)`

Source extractions inform scope, order, terminology, exercise density, common
traps, and visual needs. Canonical lessons must remain platform-authored:
clearer explanations, original visuals, interactive checkpoints, BAC lenses,
micro-quizzes, and optional depth portals. Do not publicly cite these teacher
sources or reuse their wording, page order, tables, diagrams, worked-solution
chains, or assets unless the material is explicitly licensed or owned.

## Stream Families

| Family | Streams | Canonical Route |
| --- | --- | --- |
| Scientific | `SE`, `M`, `MT` | Shared core with stream portals for `SE` probability details and `M/MT` arithmetic / advanced function content. |
| Literary | `LP`, `LE` | Smaller applied route focused on functions, sequences, and Euclidean division in `Z`. |

Current exclusions and caveats:

- `GE` is not modeled yet.
- `SPACE_GEOMETRY` is recorded for old BAC coverage, but should stay archived or optional until the user confirms current support.
- Teacher-source scope is strong enough for canonical mapping, but source
  references are internal QA evidence. Public canonical examples should be
  original by default.

## Product Shape

The student should experience Math as a guided journey for their own stream,
not as a copied table of contents. The canonical layer should use four levels:

1. `roadmap`: the visible subject journey for the student's leaf stream.
2. `station`: a coherent unit or phase of the journey.
3. `node`: a student-recognizable learning chunk.
4. `step`: the interactive lesson material inside a node.

Every node should eventually carry:

- `roadmapTitle`: short label for the map.
- `title`: fuller in-node title.
- `streamScope`: `ALL_SCIENTIFIC`, `SE_ONLY`, `M_MT_ONLY`, `ALL_LITERARY`, or `SHARED_WITH_VARIANTS`.
- `internalEvidence`: source paths, page ranges, and audit notes for private QA.
- `programmeEvidence`: programme file and unit code.
- `quality`: `SKELETON`, `POLISHED`, or `PUBLISHED`.
- `verification`: `SOURCE_EXTRACTED`, `STRUCTURE_VERIFIED`, `COVERAGE_VERIFIED`, or `LINE_VERIFIED` for internal source confidence.

## Canonical Lesson Rhythm

Each production node should follow this rhythm unless the concept demands a
different shape:

1. Hook: why this node matters in BAC terms.
2. Intuition: a plain mental model before formalism.
3. Formal rule: definition, theorem, formula, or method.
4. Worked example: short, exact, and visually segmented.
5. Interaction: choose, drag, reveal, graph, classify, or calculate.
6. Trap: the common mistake and how to avoid it.
7. BAC lens: how the idea appears in real exercises.
8. Micro-quiz: immediate retrieval or one-step transfer.
9. Optional portal: deeper context for strong students.

## Evidence Gates

Use these gates to avoid blocking canonical work on unnecessary perfection while
still preventing weak evidence from entering production.

| Gate | Meaning | Required For |
| --- | --- | --- |
| `SOURCE_EXTRACTED` | The source is captured enough to understand scope and order. | Roadmap design, concept inventory, lesson skeletons. |
| `STRUCTURE_VERIFIED` | Page markers, assets, and page order are valid. | Internal source references in canonical planning. |
| `COVERAGE_VERIFIED` | A page or range has been visually checked for missing major items. | Polished node scope and BAC trap extraction. |
| `LINE_VERIFIED` | The relevant formula, table, statement, or solution step was compared line by line against the scan. | High-risk formulas, dense tables, ambiguous visual structures, and rare exact internal claims. |

Canonical authoring can start at `SOURCE_EXTRACTED + STRUCTURE_VERIFIED`.
`LINE_VERIFIED` is only mandatory when exact source fidelity matters. Public
lessons should still be original, source-grounded authored work.

## Scientific Route: SE / M / MT

### Station S1: Functions As The Main Language

Unit code: `FUNCTIONS`

Stream scope: shared scientific core, with `M/MT` portals for radical,
trigonometric, and parametric functions where the programme marks them as
stream-specific.

Canonical nodes:

| Node Code | Roadmap Title | Core Idea | Stream Scope |
| --- | --- | --- | --- |
| `FUNC_TOOLBOX` | أدوات الحساب | Algebra, signs, absolute value, factoring, and expression control before limits. | `ALL_SCIENTIFIC` |
| `FUNC_LANGUAGE` | لغة الدالة | Domain, image/preimage, graph, table, equation, inequality. | `ALL_SCIENTIFIC` |
| `LIMITS_ENGINE` | محرك النهايات | Matching, dominant terms, conjugates, undefined forms, geometric meaning. | `ALL_SCIENTIFIC` |
| `CONTINUITY_IVT` | الاستمرارية والحلول | Continuity and intermediate value theorem as existence/uniqueness tools. | `ALL_SCIENTIFIC` |
| `DERIVATIVE_MEANING` | معنى المشتقة | Rate of change, tangent, local behavior, differentiability traps. | `ALL_SCIENTIFIC` |
| `VARIATION_GRAPH` | جدول التغيرات | Derivative sign, extrema, monotonicity, asymptotes, graph construction. | `ALL_SCIENTIFIC` |
| `GRAPH_ARGUMENTS` | القراءة البيانية | Intersections, relative position, tangents, graphical discussion with parameters. | `ALL_SCIENTIFIC` |
| `SPECIAL_FUNCTIONS` | دوال خاصة | Polynomial, rational, exponential, logarithmic; radical/trig/parametric as portals. | `SHARED_WITH_VARIANTS` |
| `DIFFERENTIAL_EQUATIONS` | معادلات تفاضلية | First-order BAC-style differential equations tied to exponentials. | `ALL_SCIENTIFIC` |
| `PRIMITIVES_INTEGRALS` | الأصلية والتكامل | Primitives, area, volumes, and choosing the right integration route. | `ALL_SCIENTIFIC` |

Internal source intelligence:

- Scientific source pages: functions `5-6`, `9-132`.
- Programme caveat: radical, parametric, and trigonometric functions are `M/MT`.

High-risk audit targets:

- Limit banks, variation/sign tables, parameter discussions, integration examples,
  and any visual graph recreated digitally.

### Station S2: Sequences As Discrete Motion

Unit code: `SEQUENCES`

Stream scope: shared scientific core.

Canonical nodes:

| Node Code | Roadmap Title | Core Idea | Stream Scope |
| --- | --- | --- | --- |
| `SEQ_LANGUAGE` | لغة المتتالية | Index, rank, first term, general term, recurrence. | `ALL_SCIENTIFIC` |
| `SEQ_MONOTONE_BOUNDED` | الرتابة والمحدودية | Difference, function method, ratio method, upper/lower bounds. | `ALL_SCIENTIFIC` |
| `SEQ_LIMITS` | نهايات المتتاليات | Finite/infinite limits, comparison, squeeze, convergence/divergence. | `ALL_SCIENTIFIC` |
| `SEQ_ADJACENT_INDUCTION` | التجاور والتراجع | Adjacent sequences and induction as proof tools. | `ALL_SCIENTIFIC` |
| `SEQ_GRAPHICAL_RECURRENCE` | السلم البياني | Recurrence visualization with `C_f` and `y=x`. | `ALL_SCIENTIFIC` |
| `SEQ_ARITH_GEOM` | حسابية وهندسية | Recognition, general term, sums, limits, and BAC transformations. | `ALL_SCIENTIFIC` |
| `SEQ_TRANSFORMS` | تحويل المتتاليات | Choosing alpha/beta or auxiliary sequences to unlock arithmetic/geometric form. | `ALL_SCIENTIFIC` |
| `SEQ_SUMS_PRODUCTS` | مجاميع وجداءات | Turning strange sums/products into known structures. | `ALL_SCIENTIFIC` |
| `SEQ_COMPREHENSIVE` | مسألة شاملة | Full BAC-style sequence problems with function, proof, limit, and sums. | `ALL_SCIENTIFIC` |

Internal source intelligence:

- Scientific source pages: sequences `3`, `6-39`.
- Literary source pages: sequences `61-68`.

Recommended golden unit:

- This should be the first fully designed canonical unit because it is rich
  enough to test the journey model, but smaller and safer than functions.

High-risk audit targets:

- Recurrence transformations, sum/product formulas, graphical recurrence pages,
  and comprehensive exercises.

### Station S3: Probability As Modeling

Unit code: `PROBABILITY`

Stream scope: shared scientific core with `SE_ONLY` conditional-probability
emphasis per programme notes.

Canonical nodes:

| Node Code | Roadmap Title | Core Idea | Stream Scope |
| --- | --- | --- | --- |
| `PROB_LANGUAGE` | لغة الاحتمال | Universe, events, complement, union, intersection. | `ALL_SCIENTIFIC` |
| `PROB_LAWS` | قوانين الحساب | Addition/product rules and event properties. | `ALL_SCIENTIFIC` |
| `PROB_INDEPENDENCE_TREE` | الاستقلال والشجرة | Independence, probability trees, and reading paths. | `ALL_SCIENTIFIC` |
| `PROB_CONDITIONAL` | الاحتمال الشرطي | Conditional probability and tree updates. | `SE_ONLY` |
| `RANDOM_VARIABLES` | المتغير العشوائي | Probability law, expectation, variance-style reasoning when present. | `ALL_SCIENTIFIC` |
| `COUNTING_METHODS` | طرق العد | Arrangements, combinations, and selecting the right counting model. | `ALL_SCIENTIFIC` |
| `BINOMIAL_FORMULA` | ثنائي الحد | Binomial theorem as a counting/probability tool. | `ALL_SCIENTIFIC` |
| `PROB_BAC_MODELS` | نماذج BAC | Urns, committees, repeated trials, law construction. | `ALL_SCIENTIFIC` |

Internal source intelligence:

- Scientific source pages: probability `3`, `5-36`.

High-risk audit targets:

- Probability trees, conditional-probability formulas, counting expressions,
  and random-variable law tables.

### Station S4: Complex Numbers As Geometry Algebra

Unit code: `COMPLEX_NUMBERS`

Stream scope: shared scientific core.

Canonical nodes:

| Node Code | Roadmap Title | Core Idea | Stream Scope |
| --- | --- | --- | --- |
| `COMPLEX_ALGEBRA` | الكتابة الجبرية | Real/imaginary parts, conjugate, algebraic simplification. | `ALL_SCIENTIFIC` |
| `MOD_ARG` | الطويلة والعمدة | Modulus, argument, trig values, locus meaning. | `ALL_SCIENTIFIC` |
| `TRIG_EXP_FORMS` | المثلثي والأسي | Moving between algebraic, trigonometric, and exponential forms. | `ALL_SCIENTIFIC` |
| `DE_MOIVRE_POWERS` | دستور موافر | Powers, roots, and recognizing real/imaginary cases. | `ALL_SCIENTIFIC` |
| `COMPLEX_LOCUS` | مجموعات النقط | Circles, lines, segments, perpendicularity, and argument loci. | `ALL_SCIENTIFIC` |
| `TRIANGLE_QUAD` | طبيعة الأشكال | Using complex ratios to classify triangles and quadrilaterals. | `ALL_SCIENTIFIC` |
| `COMPLEX_EQUATIONS` | معادلات مركبة | Quadratic, cubic, fourth-degree patterns and factorization. | `ALL_SCIENTIFIC` |
| `COMPLEX_TRANSFORMS` | التحويلات النقطية | Translation, homothety, rotation, direct similarity. | `ALL_SCIENTIFIC` |

Internal source intelligence:

- Scientific source pages: complex numbers `3`, `6-24`.

High-risk audit targets:

- Geometry classification tables, locus statements, transformation formulas,
  and dense comprehensive exercises.

### Station S5: Arithmetic And Congruences

Unit code: `ARITHMETIC`

Stream scope: `M_MT_ONLY`.

Canonical nodes:

| Node Code | Roadmap Title | Core Idea | Stream Scope |
| --- | --- | --- | --- |
| `DIVISIBILITY_Z` | القسمة في Z | Divisibility, Euclidean division, remainders. | `M_MT_ONLY` |
| `CONGRUENCES` | الموافقات | Modular equivalence, operations, powers, systems. | `M_MT_ONLY` |
| `NUMERATION` | نظام التعداد | Base representation and conversion by Euclidean division. | `M_MT_ONLY` |
| `GCD_LCM` | PGCD و PPCM | Divisors, multiples, Euclidean algorithm, prime factorization. | `M_MT_ONLY` |
| `PRIMES_THEOREMS` | أولية ومبرهنات | Primality, Bezout, Gauss, Fermat-style uses. | `M_MT_ONLY` |
| `DIOPHANTINE_BAC` | معادلات وحالات | Diophantine equations, congruence systems, BAC applications. | `M_MT_ONLY` |

Internal source intelligence:

- Scientific source pages: arithmetic `0-1`, `8-51`.

High-risk audit targets:

- Congruence tables, theorem statements, Diophantine solution chains, and base
  representation exercises.

### Station S6: Archived Space Geometry

Unit code: `SPACE_GEOMETRY`

Stream scope: `ARCHIVED_OR_OPTIONAL`.

Policy:

- Do not build a mainline canonical unit until the user confirms current
  support.
- Keep old-BAC references as an optional archive or diagnostic bridge if needed.

## Literary Route: LP / LE

The literary Math route should be shorter, more applied, and less abstract than
the scientific route. It should still feel premium: clear mental models, gentle
BAC framing, and repeated confidence-building checkpoints.

### Station L1: Literary Functions

Unit code: `FUNCTIONS`

Canonical nodes:

| Node Code | Roadmap Title | Core Idea | Stream Scope |
| --- | --- | --- | --- |
| `L_FUNC_SIGNS` | الإشارات والمعادلات | Sign of first/second-degree expressions as the gateway to functions. | `ALL_LITERARY` |
| `L_FUNC_LANGUAGE` | لغة الدالة | Domain, equality, operations, reference limits. | `ALL_LITERARY` |
| `L_LIMITS_ASYMPTOTES` | النهايات والمقاربات | Polynomial/rational limits and geometric interpretation. | `ALL_LITERARY` |
| `L_DERIVATIVES_VARIATION` | المشتقة والتغير | Derivative rules, monotonicity, extrema, and variation table. | `ALL_LITERARY` |
| `L_GRAPH_TOOLS` | أدوات الرسم | Tangent, intersections, symmetry, relative position. | `ALL_LITERARY` |
| `L_FUNCTION_PROBLEMS` | مسائل الدوال | Short BAC-style studies and graph interpretation. | `ALL_LITERARY` |

Internal source intelligence:

- Literary source pages: functions `5-16`.

### Station L2: Literary Sequences

Unit code: `SEQUENCES`

Canonical nodes:

| Node Code | Roadmap Title | Core Idea | Stream Scope |
| --- | --- | --- | --- |
| `L_SEQ_LANGUAGE` | تعريف وترميز | Sequence definition, index/rank, recurrence and general term. | `ALL_LITERARY` |
| `L_SEQ_MONOTONICITY` | اتجاه التغير | Difference, function method, ratio method. | `ALL_LITERARY` |
| `L_SEQ_INDUCTION` | التراجع | Basic induction as a proof pattern. | `ALL_LITERARY` |
| `L_SEQ_ARITH_GEOM` | حسابية وهندسية | General terms, sums, means, monotonicity, limits. | `ALL_LITERARY` |
| `L_SEQ_PROBLEMS` | مسائل المتتاليات | Applied BAC-style sequence exercises. | `ALL_LITERARY` |

Internal source intelligence:

- Literary source pages: sequences `61-68`.

### Station L3: Euclidean Division In Z

Unit code: `EUCLIDEAN_DIVISION_IN_Z`

Canonical nodes:

| Node Code | Roadmap Title | Core Idea | Stream Scope |
| --- | --- | --- | --- |
| `L_DIVISIBILITY_Z` | قابلية القسمة | Divisibility and Euclidean division in integers. | `ALL_LITERARY` |
| `L_CONGRUENCE_BASICS` | الموافقات | Modular equivalence and basic properties. | `ALL_LITERARY` |
| `L_CONGRUENCE_OPERATIONS` | خواص الموافقات | Addition, multiplication, transitivity, powers. | `ALL_LITERARY` |
| `L_DIVISION_PROBLEMS` | مسائل مقترحة | BAC-style proposed exercises and solution methods. | `ALL_LITERARY` |

Internal source intelligence:

- Literary source pages: Euclidean division `99-104`.

## Dependency Rules

- Algebra/sign control comes before function behavior.
- Limits come before continuity, asymptotes, and advanced graph interpretation.
- Derivatives come before variation tables, extrema, tangents, and most graph construction.
- Exponential functions should precede differential equations and help prepare logarithms.
- Logarithms should precede many integral/primitives patterns involving `u'/u`.
- Sequences need basic function intuition but can become their own discrete journey after function foundations.
- Probability needs counting before dense random-variable and binomial models.
- Arithmetic needs divisibility and Euclidean division before congruences and Diophantine equations.
- Complex geometry needs modulus/argument before locus, shape classification, and transformations.

## BAC Skill Families

Canonical Math should teach not only topics but reusable BAC actions:

| Skill Family | Description |
| --- | --- |
| `READ_THE_OBJECT` | Identify the mathematical object: function, sequence, event, complex number, congruence. |
| `CHOOSE_REPRESENTATION` | Move between formula, table, graph, tree, modular class, geometric figure. |
| `TRANSFORM_EXPRESSION` | Factor, rationalize, substitute, normalize, or introduce an auxiliary object. |
| `PROVE_SAFELY` | Use induction, IVT, monotonicity, bounds, Bezout/Gauss, or geometric argument. |
| `BUILD_MODEL` | Turn a BAC story into probability law, recurrence, equation, or transformation. |
| `CONTROL_EDGE_CASES` | Domain restrictions, excluded points, zero denominators, invalid bases, stream-specific caveats. |
| `INTERPRET_RESULT` | Explain graph behavior, probability meaning, geometric nature, or final BAC conclusion. |

## Suggested Build Order

1. Create a full concept inventory for scientific and literary Math from this blueprint.
2. Build the golden unit: scientific `SEQUENCES`.
3. Convert its nodes into a production-quality `course.json` pattern.
4. Reuse the pattern for literary `SEQUENCES` with simpler scope.
5. Build scientific `FUNCTIONS` in phases because it is the largest unit.
6. Build `PROBABILITY`, `COMPLEX_NUMBERS`, and `ARITHMETIC`.
7. Build literary `FUNCTIONS` and `EUCLIDEAN_DIVISION_IN_Z`.

## Modeling Decisions

- Student-facing Math should resolve to one roadmap per leaf stream: `SE`, `M`,
  `MT`, `LP`, or `LE`.
- Authoring may use stream-family files such as `SE-M-MT` and `LP-LE` to avoid
  duplicating shared modules.
- Shared concept IDs are allowed when the pedagogy truly overlaps, but each
  stream roadmap should project only the nodes, depth, and portals valid for
  that stream.
- Old `SPACE_GEOMETRY` should remain deferred until we decide whether it needs
  an archive journey.
- Exact teacher-source examples should not appear inside public canonical
  lessons unless explicitly licensed or rewritten into original BAC Bank
  examples. Line-verification is for understanding, not for public copying.
- Whether to include official national programme PDFs as an additional evidence
  layer. Recommendation: yes, before `PUBLISHED` quality.

## Next Artifact

The golden unit design note now lives at:

`bac_theory_content/canonical/math/SE-M-MT/sequences/README.md`

The next artifact should be:

`bac_theory_content/canonical/math/SE-M-MT/sequences/course.json`
