"use client";

import type {
  ChemistryStructureFormat,
  ChemistryStructureRenderData,
  ChemistryStructureRenderItem,
} from "@bac-bank/contracts/ingestion";
import type { RDKitLoader, RDKitModule } from "@rdkit/rdkit";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

export type {
  ChemistryStructureRenderData,
  ChemistryStructureRenderItem,
} from "@bac-bank/contracts/ingestion";

type ChemistryStructureRendererProps = {
  data: ChemistryStructureRenderData;
  fallback?: ReactNode;
  compact?: boolean;
};

type RenderedMolecule = ChemistryStructureRenderItem & {
  svg: string;
  width: number;
  height: number;
};

type RenderState =
  | {
      status: "loading";
      molecules: null;
      error: null;
    }
  | {
      status: "ready";
      molecules: RenderedMolecule[];
      error: null;
    }
  | {
      status: "error";
      molecules: null;
      error: string;
    };

let rdkitPromise: Promise<RDKitModule> | null = null;
let rdkitScriptPromise: Promise<void> | null = null;

type OptionalRdkitWindow = Window & {
  initRDKitModule?: RDKitLoader;
};

function loadRdkitScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("RDKit can only load in the browser."));
  }

  const rdkitWindow = window as OptionalRdkitWindow;

  if (typeof rdkitWindow.initRDKitModule === "function") {
    return Promise.resolve();
  }

  rdkitScriptPromise ??= new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-rdkit-loader="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load RDKit script.")),
        {
          once: true,
        },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "/vendor/rdkit/RDKit_minimal.js";
    script.async = true;
    script.dataset.rdkitLoader = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load RDKit script.")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return rdkitScriptPromise;
}

function loadRdkit() {
  rdkitPromise ??= loadRdkitScript().then(() => {
    const loader = (window as OptionalRdkitWindow).initRDKitModule;

    if (typeof loader !== "function") {
      throw new Error("RDKit loader is unavailable.");
    }

    return loader({
      locateFile: () => "/vendor/rdkit/RDKit_minimal.wasm",
    });
  });

  return rdkitPromise;
}

function cleanRdkitSvg(svg: string) {
  return svg.replace(/^\s*<\?xml[^>]*>\s*/i, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(value: unknown, field: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = value[field];
  return typeof candidate === "string" ? candidate : null;
}

function asChemistryFormat(
  value: unknown,
): ChemistryStructureFormat | undefined {
  return value === "molblock" || value === "smiles" ? value : undefined;
}

function asChemistryStructureItem(
  value: unknown,
  options: { allowGenericSource?: boolean } = {},
): ChemistryStructureRenderItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const source =
    readStringField(value, "smiles") ??
    readStringField(value, "molblock") ??
    (options.allowGenericSource ? readStringField(value, "source") : null);

  if (!source?.trim()) {
    return null;
  }

  return {
    format:
      asChemistryFormat(readStringField(value, "format")) ??
      (readStringField(value, "molblock") ? "molblock" : "smiles"),
    source,
    title: readStringField(value, "title") ?? undefined,
    width: typeof value.width === "number" ? value.width : undefined,
    height: typeof value.height === "number" ? value.height : undefined,
    caption: readStringField(value, "caption") ?? undefined,
  };
}

export function extractChemistryStructureRenderData(
  value: unknown,
): ChemistryStructureRenderData | null {
  if (!isRecord(value)) {
    return null;
  }

  const rootKind = readStringField(value, "kind");
  const candidates: unknown[] = [
    value,
    value.chemistryStructure,
    value.molecule,
    value.payload,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const kind = readStringField(candidate, "kind") ?? rootKind;
    const allowGenericSource = kind === "chemistry_structure";
    const singleItem = asChemistryStructureItem(candidate, {
      allowGenericSource,
    });
    const items = Array.isArray(candidate.items)
      ? candidate.items
          .map((item) => asChemistryStructureItem(item, { allowGenericSource }))
          .filter((item): item is ChemistryStructureRenderItem => item !== null)
      : [];

    if (kind !== "chemistry_structure" && !singleItem && !items.length) {
      continue;
    }

    if (!singleItem && !items.length) {
      continue;
    }

    const layout = readStringField(candidate, "layout");

    return {
      kind: "chemistry_structure",
      format: singleItem?.format,
      source: singleItem?.source,
      title: readStringField(candidate, "title") ?? undefined,
      width: singleItem?.width,
      height: singleItem?.height,
      caption: readStringField(candidate, "caption") ?? undefined,
      reviewStatus:
        readStringField(candidate, "reviewStatus") === "visual_checked"
          ? "visual_checked"
          : "candidate",
      layout:
        layout === "row" || layout === "grid" || layout === "stack"
          ? layout
          : undefined,
      items: items.length ? items : undefined,
      notes: Array.isArray(candidate.notes)
        ? candidate.notes.filter(
            (note): note is string => typeof note === "string",
          )
        : undefined,
    };
  }

  return null;
}

function resolveMolecules(data: ChemistryStructureRenderData) {
  const items = Array.isArray(data.items)
    ? data.items
        .map((item) => ({
          ...item,
          source: item.source.trim(),
        }))
        .filter((item) => item.source.length > 0)
    : [];

  if (items.length) {
    return items;
  }

  const source = data.source?.trim();

  if (!source) {
    return [];
  }

  return [
    {
      format: data.format,
      source,
      title: data.title,
      width: data.width,
      height: data.height,
      caption: data.caption,
    },
  ];
}

export function ChemistryStructureRenderer({
  data,
  fallback,
  compact = false,
}: ChemistryStructureRendererProps) {
  const molecules = useMemo(() => resolveMolecules(data), [data]);
  const moleculeSignature = useMemo(
    () =>
      JSON.stringify(
        molecules.map((molecule) => ({
          source: molecule.source,
          width: molecule.width,
          height: molecule.height,
        })),
      ),
    [molecules],
  );
  const [state, setState] = useState<RenderState>({
    status: "loading",
    molecules: null,
    error: null,
  });
  const className = useMemo(
    () =>
      ["study-chemistry-block", compact ? "study-block-compact" : null]
        .filter(Boolean)
        .join(" "),
    [compact],
  );

  useEffect(() => {
    let cancelled = false;

    if (!molecules.length) {
      setState({
        status: "error",
        molecules: null,
        error: "Missing chemistry source.",
      });
      return () => {
        cancelled = true;
      };
    }

    setState({
      status: "loading",
      molecules: null,
      error: null,
    });

    loadRdkit()
      .then((rdkit) => {
        rdkit.prefer_coordgen(true);

        const rendered = molecules.map((molecule) => {
          const width =
            molecule.width ??
            (compact ? 320 : molecules.length > 1 ? 300 : 680);
          const height =
            molecule.height ??
            (compact ? 180 : molecules.length > 1 ? 210 : 300);
          const mol = rdkit.get_mol(molecule.source);

          if (!mol) {
            throw new Error("RDKit could not parse the chemistry source.");
          }

          try {
            return {
              ...molecule,
              width,
              height,
              svg: cleanRdkitSvg(mol.get_svg(width, height)),
            };
          } finally {
            mol.delete();
          }
        });

        if (!cancelled) {
          setState({
            status: "ready",
            molecules: rendered,
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          molecules: null,
          error: error instanceof Error ? error.message : "Render failed.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [compact, moleculeSignature, molecules]);

  if (state.status === "ready") {
    const isMultiMolecule = state.molecules.length > 1;
    const layout = data.layout ?? (isMultiMolecule ? "grid" : "stack");

    return (
      <figure className={className}>
        {data.title && isMultiMolecule ? (
          <figcaption className="study-chemistry-title">
            {data.title}
          </figcaption>
        ) : null}
        <div
          className={[
            "study-chemistry-grid",
            `study-chemistry-layout-${layout}`,
          ].join(" ")}
        >
          {state.molecules.map((molecule, index) => (
            <div
              key={`${molecule.source}-${index}`}
              className="study-chemistry-card"
            >
              {isMultiMolecule && molecule.title ? (
                <div className="study-chemistry-card-title">
                  {molecule.title}
                </div>
              ) : null}
              <div
                aria-label={
                  molecule.title ?? data.title ?? "Chemical structure"
                }
                className="study-chemistry-frame"
                role="img"
                dangerouslySetInnerHTML={{
                  __html: molecule.svg,
                }}
              />
              {isMultiMolecule && molecule.caption ? (
                <div className="study-chemistry-card-caption">
                  {molecule.caption}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {data.caption ? <figcaption>{data.caption}</figcaption> : null}
      </figure>
    );
  }

  if (fallback) {
    return (
      <figure className={className}>
        <div className="study-chemistry-fallback">{fallback}</div>
        {data.caption ? <figcaption>{data.caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className={className}>
      <div className="study-chemistry-frame study-chemistry-state">
        {state.error ?? "Loading structure..."}
      </div>
    </figure>
  );
}
