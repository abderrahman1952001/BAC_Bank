# Scientific Math Sequences golden unit

Status: `GOLDEN_UNIT_DESIGN_V0`

This is the first full unit design note for canonical Math. It defines the
student journey before we write `course.json`.

Subject-level rules live in:

- `bac_theory_content/canonical/README.md`
- `bac_theory_content/canonical/math/README.md`

This file is platform-authored. It uses source extractions as private scope and
quality evidence, but it must not copy teacher-source wording, examples,
solution chains, diagrams, or layouts.

## Unit Identity

Course subject code: `MATHEMATICS`

Programme/source subject code: `MATH`

Programme: scientific Math, `SE`, `M`, `MT`

Unit code: `SEQUENCES`

Canonical promise:

> By the end of this unit, the student should feel that a sequence is not a
> dry list of formulas. It is a machine that produces future values, and every
> BAC question is asking one of four things: read the machine, predict its
> direction, prove its destination, or unlock it with a transformation.

Student-facing feeling:

- precise, serious, and exam-trustworthy;
- cinematic enough to pull the student forward;
- calm enough that formulas feel controlled rather than dumped;
- repeatedly rewarding: every node gives the student a new "power" they can
  use immediately in BAC-style questions.

## Alignment

Programme evidence:

- `bac_theory_content/programmes/math/SE-M-MT.yml`
- Unit: `SEQUENCES`
- Streams: `SE`, `M`, `MT`

Internal source intelligence:

- `bac_theory_content/sources/math/SE-M-MT/source 1 (الأستاذ نور الدين - رياضيات)/sequences/extracted.md`
- Source pages available for this unit: index page `3`, theory/training pages
  `6-39`
- Current source caveat: pages after `39` are mentioned by the source index but
  are not in the local scan bundle.

Current evidence level:

- Good enough for canonical roadmap and lesson skeletons:
  `SOURCE_EXTRACTED + STRUCTURE_VERIFIED`
- Needs visual/line audit before production formulas or dense visual recreation:
  recurrence transformations, sum/product banks, graphical recurrence, and any
  comprehensive solution chain used as an internal check.

## Engagement Standard

This unit should feel habit-forming through mastery, not through shallow
gamification.

Use these devices throughout:

- Start with mystery: show the student a machine and ask what it will do after
  `1000` turns before revealing the formal method.
- Give every node a named power, such as "direction sensor", "bounded rail",
  "domino proof", or "staircase vision".
- Put a fast interaction before the full rule when possible.
- Use original examples that look BAC-realistic but are not copied from any
  source.
- End nodes with a tiny win: one BAC move the student can now execute alone.
- Keep optional portals exciting but clearly outside required progress.
- Make the student choose tools often: difference, ratio, function method,
  induction, squeeze, fixed point, or transformation.

Avoid:

- long formula dumps before intuition;
- copied source ordering as the visible lesson order;
- fake hype that weakens authority;
- optional depth that blocks mainline completion.

## Authority Standard

Every lesson must teach confidence with legal conditions. A student should trust
BAC Bank because it says not only what works, but when it is allowed.

Every production node must include:

- an official-scope anchor;
- a short rule ledger;
- legality checks, especially for domains, starting index, positivity, and
  monotonicity assumptions;
- at least one common trap;
- at least one BAC lens;
- at least one micro-quiz;
- one optional portal when deeper context would help curious students.

High-authority warnings for this unit:

- `n` is an index, not always the rank of the term.
- Ratio method requires positive terms or a controlled sign argument.
- The converse "if `(u_n)` is monotone then its function `f` is monotone" is
  false in general.
- Monotone and bounded gives convergence, but it does not automatically give
  the value of the limit.
- A recurrence limit must satisfy the fixed-point equation only after
  convergence is justified.
- For geometric sequences, the behavior depends strongly on `q`: `q > 1`,
  `q = 1`, `0 < q < 1`, `q = 0`, `-1 < q < 0`, `q <= -1`.
- Induction needs initialization, heredity, and exact quantifier control.
- Sum/product questions often hide a known arithmetic or geometric structure in
  the last term.

## Visual Direction

Working visual theme: `precision-motion-math`

Use original visual assets or interactive canvases. Do not recreate source page
layouts.

Visual asset status:

- `course.json` has pending asset metadata for every planned visual.
- The generated-asset manifest lives at
  `assets/generated/visual-assets.json`.
- Actual image files are not generated yet. Generate them through the existing
  `prepare:course-visual-assets` workflow with explicit generation enabled, then
  review each image before marking it approved.
- Do not generate visuals from source page layouts; use the authored prompts.

Visual language:

- dark ink workspace with white mathematical notation;
- teal for active motion;
- amber for destination or fixed point;
- red only for traps or illegal moves;
- crisp graphs, cards, sliders, and highlighted formula chips;
- no decorative blobs, no scanned-textbook look, no cluttered full-page
  formulas inside images.

Core visual motifs:

- sequence as a machine: input `n`, output `u_n`;
- recurrence as a feedback loop;
- monotonicity as a direction arrow;
- boundedness as rails;
- convergence as a target zone;
- induction as locked dominoes;
- adjacent sequences as two walls closing on the same point;
- recurrence graph as a staircase between `C_f` and `y=x`;
- arithmetic/geometric sequences as constant-step versus constant-multiplier
  motion;
- transformation as changing lenses so a hidden simple sequence appears.

## Unit Structure

The unit is not a list of rules. It is a journey in five acts.

| Act | Purpose | Student Feeling |
| --- | --- | --- |
| 0. Immersion | Make sequences feel like prediction machines. | "I want to know where this goes." |
| 1. Reading | Control notation, index, rank, explicit form, recurrence. | "I can read the object without panic." |
| 2. Behavior | Study monotonicity, bounds, limits, convergence. | "I can predict motion and destination." |
| 3. Proof | Use induction, adjacency, and graphical recurrence. | "I can justify, not just guess." |
| 4. Families | Master arithmetic/geometric sequences and transformations. | "I can recognize hidden structure." |
| 5. BAC Engine | Solve comprehensive problems with sums, products, and mixed tools. | "I can survive a full BAC sequence exercise." |

## Node Map

| Code | Role | Roadmap Title | In-Node Title | Power |
| --- | --- | --- | --- | --- |
| `SEQ_FIELD_GATE` | `FIELD_INTRO` | مدخل المتتاليات | آلة تتنبأ بالمستقبل | See a sequence as motion, not a list. |
| `SEQ_UNIT_MAP` | `UNIT_INTRO` | خريطة الرحلة | القوى الست قبل القوانين | See the unit path before formal rules arrive. |
| `SEQ_INDEX_LANGUAGE` | `LESSON` | لغة الحدود | العنوان والرتبة والحد الأول | Decode index, rank, first term, and notation. |
| `SEQ_BUILDERS` | `LESSON` | كيف تولد المتتالية؟ | ثلاث طرق لبناء نفس العالم | Recognize explicit, recurrence, and pattern definitions. |
| `SEQ_DIRECTION` | `LESSON` | اتجاه الحركة | مستشعر الصعود والنزول | Choose difference, function, or ratio method safely. |
| `SEQ_RAILS_LIMITS` | `LESSON` | القضبان والنهاية | عندما تقترب الحدود من مصيرها | Link boundedness, limits, convergence, and divergence. |
| `SEQ_INDUCTION_LOCK` | `LESSON` | البرهان بالتراجع | سلسلة لا تنكسر | Prove statements for every rank. |
| `SEQ_ADJACENT_WALLS` | `LESSON` | التجاور | جداران يلتقيان في نفس النقطة | Prove shared convergence with adjacent sequences. |
| `SEQ_STAIRCASE` | `LESSON` | السلم البياني | عندما ترسم المتتالية طريقها | Read recurrence behavior through `C_f` and `y=x`. |
| `SEQ_FAMILIES` | `LESSON` | حسابية وهندسية | خطوتان مشهورتان | Master constant step and constant multiplier sequences. |
| `SEQ_TRANSFORM_LENS` | `LESSON` | تحويل المتتاليات | العدسة التي تكشف السر | Build auxiliary sequences and choose alpha/beta. |
| `SEQ_SUM_PRODUCT_ENGINE` | `LESSON` | المجاميع والجداءات | فك الشفرة المخفية | Reduce sums/products to known families. |
| `SEQ_BAC_BOSS` | `FIELD_SYNTHESIS` | مسألة شاملة | تشغيل كل الأدوات في معركة واحدة | Solve a full BAC-style sequence problem. |

## Introductory Experience

The opening should not begin with a definition.

### Opening Scene

Show three machines side by side:

1. A machine that adds `3` each time.
2. A machine that multiplies by `1.5` each time.
3. A machine that feeds the previous output into a function.

Ask:

> Which machine will cross `1000` first? Which one may never cross it? Which
> one cannot be judged until we understand its graph?

The student guesses, then the unit reveals the core promise:

- arithmetic motion: constant step;
- geometric motion: constant multiplier;
- recurrence motion: feedback;
- BAC questions are about reading, proving, transforming, and summing this
  motion.

### Unit Map Moment

Before rules, show the student the six powers they will unlock:

1. Read the machine.
2. Detect direction.
3. Trap the sequence between rails.
4. Prove with domino logic.
5. Reveal hidden arithmetic/geometric structure.
6. Finish a comprehensive BAC problem.

This becomes the unit progress spine.

## Node Designs

### `SEQ_FIELD_GATE`

Roadmap title: `مدخل المتتاليات`

Title: `آلة تتنبأ بالمستقبل`

Learning objective:

The student understands that a sequence is a discrete process and that the unit
is about prediction, proof, and transformation.

Core intuition:

Functions describe motion over a continuum. Sequences describe motion by
steps: day `0`, day `1`, day `2`, and so on. BAC asks whether the motion rises,
falls, gets trapped, approaches a destination, or hides a famous pattern.

Interaction:

- `PREDICT_THE_MACHINE`: show three original machines and ask which crosses a
  threshold first.
- Reveal: the answer depends on structure, not on instinct.

BAC lens:

Most sequence exercises are not random. They usually combine a recurrence,
a bound, a monotonicity proof, a limit, then an auxiliary sequence or a sum.

Trap:

Trying to memorize formulas before knowing what kind of motion is happening.

Optional portal:

Sequences in real models: savings, cooling, population, repeated algorithms.
Keep it short and clearly optional.

### `SEQ_UNIT_MAP`

Roadmap title: `خريطة الرحلة`

Title: `القوى الست قبل القوانين`

Learning objective:

The student sees the whole unit path before entering formulas, so every later
rule has a clear job.

Core intuition:

Sequences become easier when the student knows the mission order: read the
object, detect direction, trap it, prove claims, reveal known families, then
solve the full BAC architecture.

Interaction:

- `POWER_MAP`: show six locked powers. Each power previews a future BAC move
  with one tiny animated example.
- `WHAT_COMES_FIRST`: student orders the usual BAC chain: bound, monotonicity,
  convergence, fixed-point limit, transformation, sum.

BAC lens:

A comprehensive exercise is usually a route, not a pile of unrelated questions.

Trap:

Jumping directly to the final limit or sum before earning the earlier proof
steps.

Optional portal:

"How BAC exercises are engineered": a short meta-view of how exam writers layer
questions to guide the solver.

### `SEQ_INDEX_LANGUAGE`

Roadmap title: `لغة الحدود`

Title: `العنوان والرتبة والحد الأول`

Learning objective:

The student can read `u_n`, `u_0`, `u_1`, `(u_n)_{n >= n_0}`, index versus
rank, and the first valid value of `n`.

Mental model:

An index is the address printed on the term. A rank is the position in the
queue. They match only when the sequence starts at `0` in the usual way.

Authoritative core:

- Define a sequence as a function from a subset of natural numbers into real
  numbers.
- Clarify starting index.
- Clarify term, general term, first term, and rank.

Interaction:

- `ADDRESS_OR_POSITION`: present terms like `u_6`, `v_1`, `w_8` with different
  starting indices. Student classifies index, rank, and first term.

BAC lens:

Rank mistakes break sum limits and term membership questions.

Trap:

Assuming `u_5` is always the fifth term.

Micro-quiz:

Given a sequence starting at `n = 3`, what rank is `u_9`?

### `SEQ_BUILDERS`

Roadmap title: `كيف تولد المتتالية؟`

Title: `ثلاث طرق لبناء نفس العالم`

Learning objective:

The student distinguishes explicit formulas, recurrence definitions, and
pattern/list definitions, and knows what each one makes easy or hard.

Mental model:

An explicit formula is a direct address. A recurrence is a machine that needs
the previous output. A pattern is a clue that must be translated into a formula.

Authoritative core:

- Explicit form: `u_n = f(n)`.
- First-order recurrence: `u_{n+1} = f(u_n)` with an initial term.
- Higher-order recurrence as awareness, not mainline depth.
- Pattern/list form as a discovery route.

Interaction:

- `BUILD_TYPE_SORT`: classify original examples into explicit, recurrence, and
  pattern.
- `NEXT_THREE_TERMS`: compute the next terms for a recurrence and feel the
  machine.

BAC lens:

If the sequence is explicit, function tools may help. If it is recursive, graph,
induction, fixed point, and auxiliary sequence tools become more important.

Trap:

Treating a recurrence as if it immediately gave `u_n` without work.

Optional portal:

Why repeated algorithms in computing are often recurrence sequences.

### `SEQ_DIRECTION`

Roadmap title: `اتجاه الحركة`

Title: `مستشعر الصعود والنزول`

Learning objective:

The student can prove whether a sequence is increasing, decreasing, constant,
or not monotone, while choosing the safest method.

Mental model:

Monotonicity is a direction sensor. The sensor can read a difference, a
function, or a ratio, but each sensor has conditions.

Authoritative core:

- Difference method: study the sign of `u_{n+1} - u_n`.
- Function method: if `u_n = f(n)` and `f` is monotone on the relevant interval,
  then the sequence follows that direction.
- Ratio method: use `u_{n+1} / u_n` only when terms are positive or sign is
  controlled.
- Strict versus non-strict monotonicity.

Interaction:

- `CHOOSE_THE_SENSOR`: student chooses difference, function, or ratio before
  solving.
- `ILLEGAL_SENSOR_ALERT`: ratio method appears tempting but terms may be
  negative.

BAC lens:

Monotonicity is often the key before proving convergence.

Trap:

Using ratio method without checking positivity.

Optional portal:

Construct a sequence where `u_n = f(n)` is monotone even though the function is
not monotone everywhere.

### `SEQ_RAILS_LIMITS`

Roadmap title: `القضبان والنهاية`

Title: `عندما تقترب الحدود من مصيرها`

Learning objective:

The student understands boundedness, convergence, divergence, finite and
infinite limits, and how monotone bounded sequences are used in BAC reasoning.

Mental model:

Bounds are rails. A limit is the destination. Monotonicity tells the direction.
When a sequence moves in one direction and stays trapped, it must settle
somewhere.

Authoritative core:

- Upper bound, lower bound, bounded sequence.
- Finite limit and infinite divergence.
- Relationship between function limits and explicit sequences.
- Comparison and squeeze thinking.
- Monotone bounded convergence.
- Fixed-point equation for recurrence limits only after convergence is proved.

Interaction:

- `RAIL_BUILDER`: drag upper/lower rails around a sequence plot.
- `LIMIT_OR_DIVERGE`: classify short original cases.
- `FIXED_POINT_GUARD`: block the student from solving `l = f(l)` until they
  select a convergence justification.

BAC lens:

The classic BAC chain is: prove bound by induction, prove monotonicity, conclude
convergence, then find the limit.

Trap:

Solving a fixed-point equation before proving the limit exists.

Optional portal:

Why some bounded sequences still do not converge.

### `SEQ_INDUCTION_LOCK`

Roadmap title: `البرهان بالتراجع`

Title: `سلسلة لا تنكسر`

Learning objective:

The student can build an induction proof with initialization, heredity, and
conclusion, especially for bounds, formulas, sums, and inequalities.

Mental model:

Induction is not "checking many cases". It is a locked chain: first link, then
if one link holds the next one locks automatically.

Authoritative core:

- Define property `P(n)`.
- Initialization at the correct starting index.
- Heredity: assume `P(n)`, prove `P(n+1)`.
- Conclusion with exact quantifier.
- Common use cases: bounds, explicit formulas, inequalities, sums/products.

Interaction:

- `PROOF_REPAIR`: student fixes a broken induction proof by adding the missing
  initialization, assumption, or conclusion.
- `START_INDEX_CHECK`: choose the correct first rank.

BAC lens:

Induction is the standard shield for proving recurrence bounds like
`a <= u_n <= b`.

Trap:

Using the desired result for `n+1` inside the heredity step.

Optional portal:

Strong induction as a preview, explicitly outside the required BAC path unless
needed by a later source/programme check.

### `SEQ_ADJACENT_WALLS`

Roadmap title: `التجاور`

Title: `جداران يلتقيان في نفس النقطة`

Learning objective:

The student proves two sequences are adjacent and concludes shared convergence.

Mental model:

Two walls close in: one rises, one falls, and the distance between them becomes
zero. The trapped destination is the same.

Authoritative core:

- One sequence increasing, the other decreasing.
- Correct order or interval relation when needed by the problem.
- Difference tends to `0`.
- Conclusion: both converge to the same limit.

Interaction:

- `TWO_WALLS_SIMULATOR`: move two plotted sequences and test the three adjacent
  conditions.
- `MISSING_CONDITION`: show a false adjacency claim and ask which condition is
  missing.

BAC lens:

Adjacent sequences often appear when a direct limit is hard but two companion
sequences squeeze the answer.

Trap:

Showing the difference tends to `0` but forgetting monotonicity.

Optional portal:

Connection to nested intervals and numerical approximation.

### `SEQ_STAIRCASE`

Roadmap title: `السلم البياني`

Title: `عندما ترسم المتتالية طريقها`

Learning objective:

The student reads a recurrence `u_{n+1} = f(u_n)` through the graph of `f` and
the line `y = x`.

Mental model:

The graph is a staircase: move from the current value to the curve, then to the
line `y = x`, then repeat. Fixed points are possible destinations.

Authoritative core:

- Plot `C_f` and `y = x`.
- Start from `u_0`.
- Iterate the staircase construction.
- Relate graphical behavior to monotonicity and convergence guesses.
- Confirm guesses algebraically before final BAC conclusions.

Interaction:

- `STAIRCASE_CANVAS`: student drags `u_0`, then watches the recurrence steps.
- `FIXED_POINT_MARKER`: identify intersections of `C_f` and `y = x`.

BAC lens:

Graphical recurrence often prepares an induction proof or a limit argument in a
comprehensive exercise.

Trap:

Treating the graph as proof when the question asks for algebraic justification.

Optional portal:

Stability: why some fixed points attract and others repel. Keep it marked as
curiosity depth.

### `SEQ_FAMILIES`

Roadmap title: `حسابية وهندسية`

Title: `خطوتان مشهورتان`

Learning objective:

The student masters arithmetic and geometric sequences: recognition, general
term, sum, monotonicity, and limit behavior.

Mental model:

Arithmetic sequences move with a constant step. Geometric sequences move with a
constant multiplier.

Authoritative core:

- Arithmetic recognition: constant difference.
- Arithmetic term formula from any known starting index.
- Arithmetic sum as number of terms times average of first and last.
- Arithmetic monotonicity and limit by sign of the common difference.
- Geometric recognition: constant ratio.
- Geometric term formula from any known starting index.
- Geometric sum with `q != 1`.
- Geometric monotonicity and limit cases by `q`.

Interaction:

- `STEP_OR_MULTIPLIER`: student classifies sequences from sparse terms.
- `FORMULA_BUILDER`: choose start index, first term, common difference/ratio,
  then assemble the formula.
- `Q_CASE_SWITCHBOARD`: slider for `q` showing limit behavior.

BAC lens:

Many difficult recurrence exercises become easy only after transforming them
into arithmetic or geometric sequences.

Trap:

Using a geometric sum formula when `q = 1`, or forgetting the number of terms.

Optional portal:

Compound growth and decay as a geometric mental model.

### `SEQ_TRANSFORM_LENS`

Roadmap title: `تحويل المتتاليات`

Title: `العدسة التي تكشف السر`

Learning objective:

The student learns to create an auxiliary sequence, especially one of the form
`v_n = u_n - alpha` or `v_n = alpha u_n + beta`, so a hidden arithmetic or
geometric structure appears.

Mental model:

Some sequences look complicated because we are using the wrong coordinate
system. A transformation changes the lens until the hidden simple motion
appears.

Authoritative core:

- Identify the fixed point or target value.
- Try `v_n = u_n - alpha` for affine recurrences.
- Solve for `alpha` or `alpha, beta` so the recurrence becomes geometric or
  arithmetic.
- Express `v_n`, then return to `u_n`.
- Use the transformed form for limits and sums.

Interaction:

- `FIND_ALPHA`: student adjusts `alpha` until extra constants disappear.
- `LENS_BEFORE_AFTER`: same recurrence before and after transformation.

BAC lens:

This is one of the highest-yield BAC moves in sequences. It turns a long
recurrence into a known family.

Trap:

Finding `v_n` correctly but forgetting to convert back to `u_n`.

Optional portal:

Affine recurrence formula and fixed-point viewpoint, as a powerful shortcut for
strong students.

### `SEQ_SUM_PRODUCT_ENGINE`

Roadmap title: `المجاميع والجداءات`

Title: `فك الشفرة المخفية`

Learning objective:

The student can decode BAC sums and products by identifying the hidden sequence
inside the terms.

Mental model:

A strange sum is often just a famous sequence wearing a mask. Look at the last
term, identify the moving part, then decide whether it is arithmetic,
geometric, constant, or mixed.

Authoritative core:

- Count the number of terms using end index minus start index plus one.
- Detect arithmetic blocks.
- Detect geometric blocks.
- Split mixed sums when legal.
- Convert products with powers when a geometric pattern is hidden.
- Keep index shifts explicit.

Interaction:

- `LAST_TERM_DECODER`: student taps the moving part of a sum.
- `TERM_COUNTER`: practice counting terms from nonzero starting indices.
- `SUM_ROUTE_PICKER`: choose split, arithmetic formula, geometric formula, or
  transform first.

BAC lens:

Dense sums/products are often where students lose marks despite understanding
the recurrence. This node should train calm index control.

Trap:

Wrong term count, especially when the sum starts at `1`, `2`, or another
nonzero index.

Optional portal:

Telescoping sums as an optional high-power technique only if confirmed useful
for current BAC scope.

### `SEQ_BAC_BOSS`

Roadmap title: `مسألة شاملة`

Title: `تشغيل كل الأدوات في معركة واحدة`

Learning objective:

The student solves a full original BAC-style sequence problem that combines
function study, recurrence, induction, monotonicity, convergence, transform,
limit, and sum/product reasoning.

Structure:

1. Study an associated function and fixed point.
2. Generate early sequence terms and form a conjecture.
3. Prove bounds by induction.
4. Prove monotonicity.
5. Conclude convergence.
6. Find the limit.
7. Define an auxiliary sequence.
8. Prove the auxiliary sequence is geometric or arithmetic.
9. Return to `u_n`.
10. Compute a sum or product.

Interaction:

- `TOOLBELT_MODE`: before each part, the student chooses the tool they expect
  to use.
- `BAC_GRADER_FEEDBACK`: the answer is graded by mathematical move, not only
  final result.

BAC lens:

This node becomes the template for real exam sequence exercises.

Trap:

Trying to solve the whole problem linearly without recognizing the repeated
BAC architecture.

Optional portal:

"Can you design your own sequence exercise?" The student chooses a fixed point,
ratio, and transformation, then the platform generates a mini problem.

## Required Formula Ledger

The production course should contain a compact formula ledger, unlocked only
after intuition nodes have introduced the ideas.

Must include:

- index/rank relationship when first index is not `0`;
- monotonicity via `u_{n+1} - u_n`;
- ratio method with positivity condition;
- boundedness definitions;
- finite and infinite sequence limits;
- convergence of monotone bounded sequences;
- induction proof skeleton;
- adjacent sequence conditions;
- arithmetic sequence recognition, term formula, sum formula, monotonicity,
  and limit behavior;
- geometric sequence recognition, term formula, sum formula, monotonicity, and
  all main `q` limit cases;
- auxiliary sequence transformation patterns;
- term-count formula for sums.

## Micro-Quiz Pattern

Each node should use short quizzes that test a single decision:

- Which starting index is valid?
- Is this definition explicit or recurrence?
- Which monotonicity method is legal?
- Which condition is missing for convergence?
- What is the induction property?
- Are these two sequences adjacent?
- Where is the fixed point on the graph?
- Is the sequence arithmetic, geometric, or neither?
- What alpha removes the constant?
- How many terms are in this sum?

Quizzes should avoid long computation unless the node is explicitly a BAC
training node.

## Original Example Policy

Use original examples. They should be BAC-shaped, not source-shaped.

Good examples:

- short artificial sequences for first intuition;
- recurrence examples with clean fixed points;
- arithmetic/geometric examples with meaningful index shifts;
- full synthetic BAC-style exercises that mix standard moves without copying
  source statements.

Avoid:

- reproducing teacher-source exercise wording;
- preserving source order as a visible student path;
- using the same constants and chains from source comprehensive examples unless
  we explicitly rewrite them into a new problem and verify no close copying.

## Source Audit Targets Before `PUBLISHED`

The following need additional visual/line audit before final production:

- graphical recurrence visuals, especially any staircase construction;
- exact statements of adjacent sequence conditions;
- geometric limit cases for negative `q`;
- arithmetic/geometric sum formulas with shifted starting indices;
- alpha/beta transformation derivations;
- dense sums and products;
- comprehensive problem architecture for expected BAC density.

This audit is for scope and correctness, not for public reuse.

## Course JSON Draft Shape

The next artifact should be:

`bac_theory_content/canonical/math/SE-M-MT/sequences/course.json`

Expected top-level fields:

- `id`: `math-scientific-sequences`
- `status`: `draft`
- `title`: `Sequences: Predicting Discrete Motion`
- `subjectCode`: `MATHEMATICS`
- `stream`: `SE-M-MT`
- `fieldCode`: `SEQUENCES`
- `requiredUnitCodes`: `["SEQUENCES"]`
- projection note: this authoring blueprint feeds the leaf stream roadmaps for
  `SE`, `M`, and `MT`
- `visualStyle`: `precision-motion-math`
- `topicCode`: `SEQUENCES`
- `topicSlug`: `sequences`
- `sourceIntelligence`: private evidence paths and notes
- `concepts`: the node map above

Expected concept fields should follow the current course blueprint validator:

- `conceptCode`
- `unitCode`
- `role`
- `quality`
- `slug`
- `roadmapTitle`
- `title`
- `summary`
- `learningObjective`
- `estimatedMinutes`
- `steps`
- `depthPortals`
- `quiz`

Design-only notes in this README, such as traps, authority warnings, and
internal evidence, should be translated into step bodies, `examLens` fields,
`depthPortals`, `quiz`, and top-level `sourceIntelligence` rather than added as
unsupported JSON fields.

Quality target for the first JSON pass:

- All concepts: at least `SKELETON`
- Intro, index language, direction, rails/limits, transform lens, and BAC boss:
  aim for `POLISHED`
- Every concept: at least one interaction, one BAC lens, and one trap
- No public source citations or copied source examples

## Success Criteria

This unit design is acceptable when:

- a student would understand why sequences matter before seeing formulas;
- the mainline covers the expected scientific BAC sequence scope;
- every dry concept has a mental model and an interaction;
- authority is visible through legal conditions and traps;
- optional portals deepen curiosity without expanding the required exam scope;
- internal source evidence remains private QA evidence;
- the path can become a validated `course.json` without changing the unit
  philosophy.
