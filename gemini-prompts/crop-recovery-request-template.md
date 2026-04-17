# Crop Recovery Prompt Template

Shared prefix:

```text
Label: {{label}}
Recovery mode: {{mode}}
```

## `text` mode

```text
Recover the visible snippet as faithful readable text. Preserve formulas and scientific notation accurately. Use type "paragraph" for prose, short labels, and mixed text, and use type "latex" when the crop is best represented as a standalone formula, equation, reaction, or formula-heavy line. Keep inline math inside $...$ when practical, prefer valid LaTeX for subscripts, superscripts, charges, exponents, scientific notation, indexed variables, pH expressions, chemical formulas, and units with powers, and clean obvious OCR spacing or punctuation issues without changing meaning. Do not force plain numbers or plain scientific names into LaTeX when ordinary text is clearer.
```

## `table` mode

```text
Recover the crop as a native table. Return type "table" and put structured rows in data.rows as a 2D array of strings. Use value for any short fallback text or title.
```

## `tree` mode

```text
Recover the crop as a native probability tree. Return type "tree" and put data.kind = "probability_tree" plus data.probabilityTree with direction and a recursive root/children structure.
```

## `graph` mode

```text
Recover the crop as a native formula graph when possible. Return type "graph" and put data.kind = "formula_graph" plus data.formulaGraph with any identifiable title, domains, and curves.
```

Optional lines:

```text
Existing caption hint: {{caption}}
Reviewer notes: {{notes}}
```

Shared suffix:

```text
Only describe what is visible in the crop. If the crop is incomplete, keep the best faithful result and mention the uncertainty in notes.
```
