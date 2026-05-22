import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudyHierarchyBlocks } from "./study-content";
import type { ExamHierarchyBlock } from "@/lib/study-api";

describe("StudyHierarchyBlocks", () => {
  it("honors native table direction metadata", () => {
    const blocks: ExamHierarchyBlock[] = [
      {
        id: "table-1",
        role: "PROMPT",
        blockType: "TABLE",
        orderIndex: 1,
        textValue: "",
        data: {
          kind: "table",
          direction: "ltr",
          rows: [
            ["label", "value"],
            ["A", "1"],
          ],
        },
        media: null,
      },
    ];

    const html = renderToStaticMarkup(
      createElement(StudyHierarchyBlocks, { blocks }),
    );

    expect(html).toContain('<table class="study-table" dir="ltr">');
    expect(html).toContain("label");
  });
});
