import { describe, expect, it } from "vitest";
import {
  analyzeDnaSequence,
  buildMutatedDnaSequence,
  compareDnaAnalyses,
  dnaToProteinPresets,
} from "./lab-dna-to-protein";

describe("DNA to Protein helpers", () => {
  it("transcribes coding DNA and translates codons", () => {
    const analysis = analyzeDnaSequence("ATGTTTGGGTAA");

    expect(analysis.dnaCodons.map((codon) => codon.value)).toEqual([
      "ATG",
      "TTT",
      "GGG",
      "TAA",
    ]);
    expect(analysis.mrnaCodons.map((codon) => codon.value)).toEqual([
      "AUG",
      "UUU",
      "GGG",
      "UAA",
    ]);
    expect(analysis.aminoAcids.map((aminoAcid) => aminoAcid.shortCode)).toEqual(
      ["Met", "Phe", "Gly", "Stop"],
    );
  });

  it("applies substitution mutations by base index", () => {
    const mutation = buildMutatedDnaSequence("ATGTTTGGGTAA", {
      kind: "substitution",
      index: 4,
      base: "C",
    });

    expect(mutation.sequence).toBe("ATGTCTGGGTAA");
  });

  it("classifies amino-acid changes and frameshifts", () => {
    const original = analyzeDnaSequence("ATGTTTGGGTAA");
    const substituted = analyzeDnaSequence("ATGTCTGGGTAA");
    const inserted = analyzeDnaSequence("ATGATTTGGGTAA");

    expect(compareDnaAnalyses(original, substituted, "substitution").kind).toBe(
      "AMINO_ACID_CHANGE",
    );
    expect(compareDnaAnalyses(original, inserted, "insertion").kind).toBe(
      "FRAMESHIFT",
    );
  });

  it("normalizes invalid characters without losing warnings", () => {
    const analysis = analyzeDnaSequence("atg-ttt");

    expect(analysis.normalizedSequence).toBe("ATGTTT");
    expect(analysis.warnings).toContain("أزيلت رموز غير صالحة: -");
  });

  it("ships with stable presets", () => {
    expect(dnaToProteinPresets[0]).toMatchObject({
      id: "normal-stop",
      sequence: "ATGTTTGGGTAA",
    });
  });
});
