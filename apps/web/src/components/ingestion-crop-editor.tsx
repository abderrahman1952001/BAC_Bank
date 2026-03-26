'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { useMemo, useRef, useState } from 'react';

export type CropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

export function IngestionCropEditor({
  imageUrl,
  cropBox,
  naturalWidth,
  naturalHeight,
  alt,
  onChange,
  onPreviewChange,
}: {
  imageUrl: string;
  cropBox: CropBox;
  naturalWidth: number;
  naturalHeight: number;
  alt: string;
  onChange: (nextCropBox: CropBox) => void;
  onPreviewChange?: (nextCropBox: CropBox | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const safeNaturalWidth = Math.max(1, naturalWidth);
  const safeNaturalHeight = Math.max(1, naturalHeight);
  const activeCrop = useMemo(
    () =>
      dragState
        ? toNaturalCropBox(dragState, safeNaturalWidth, safeNaturalHeight)
        : clampCropBox(cropBox, safeNaturalWidth, safeNaturalHeight),
    [cropBox, dragState, safeNaturalHeight, safeNaturalWidth],
  );

  function readPointerPosition(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;

    if (!svg) {
      return null;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const matrix = svg.getScreenCTM();

    if (!matrix) {
      return null;
    }

    const transformed = point.matrixTransform(matrix.inverse());

    return {
      x: clamp(transformed.x, 0, safeNaturalWidth),
      y: clamp(transformed.y, 0, safeNaturalHeight),
    };
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const point = readPointerPosition(event);

    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState) {
      return;
    }

    const point = readPointerPosition(event);

    if (!point) {
      return;
    }

    const nextDragState = {
      ...dragState,
      currentX: point.x,
      currentY: point.y,
    };

    onPreviewChange?.(
      toNaturalCropBox(nextDragState, safeNaturalWidth, safeNaturalHeight),
    );
    setDragState(nextDragState);
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragState) {
      return;
    }

    const point = readPointerPosition(event);

    if (point) {
      const nextCropBox = toNaturalCropBox(
        {
          ...dragState,
          currentX: point.x,
          currentY: point.y,
        },
        safeNaturalWidth,
        safeNaturalHeight,
      );

      onPreviewChange?.(nextCropBox);
      onChange(nextCropBox);
    }

    setDragState(null);
  }

  return (
    <div className="ingestion-crop-editor">
      <p className="muted-text">
        Draw directly on the source page. The crop uses the image&apos;s own
        coordinate system, so the saved rectangle matches the selected area more
        closely.
      </p>
      <div className="ingestion-crop-stage">
        <svg
          ref={svgRef}
          className="ingestion-crop-svg"
          viewBox={`0 0 ${safeNaturalWidth} ${safeNaturalHeight}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={alt}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            setDragState(null);
            onPreviewChange?.(null);
          }}
        >
          <image
            href={imageUrl}
            x="0"
            y="0"
            width={safeNaturalWidth}
            height={safeNaturalHeight}
            preserveAspectRatio="none"
          />
          <rect
            x="0"
            y="0"
            width={safeNaturalWidth}
            height={safeNaturalHeight}
            fill="rgba(12, 18, 31, 0.14)"
          />
          <rect
            x={activeCrop.x}
            y={activeCrop.y}
            width={activeCrop.width}
            height={activeCrop.height}
            fill="rgba(2, 71, 217, 0.14)"
            stroke="rgba(2, 71, 217, 0.92)"
            strokeWidth="3"
          />
          <text
            x={activeCrop.x + 12}
            y={Math.max(20, activeCrop.y + 22)}
            fill="#ffffff"
            fontSize="18"
            fontWeight="700"
          >
            {Math.round(activeCrop.width)} × {Math.round(activeCrop.height)}
          </text>
        </svg>
      </div>
    </div>
  );
}

export function IngestionCropPreview({
  imageUrl,
  cropBox,
  naturalWidth,
  naturalHeight,
  alt,
}: {
  imageUrl: string;
  cropBox: CropBox;
  naturalWidth: number;
  naturalHeight: number;
  alt: string;
}) {
  const width = Math.max(1, cropBox.width);
  const height = Math.max(1, cropBox.height);

  return (
    <div
      className="ingestion-live-crop-preview"
      role="img"
      aria-label={alt}
      style={{
        overflow: 'hidden',
        borderRadius: '1rem',
        background: 'rgba(148, 163, 184, 0.12)',
      }}
    >
      <svg
        viewBox={`${cropBox.x} ${cropBox.y} ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <image
          href={imageUrl}
          x="0"
          y="0"
          width={naturalWidth}
          height={naturalHeight}
          preserveAspectRatio="none"
        />
      </svg>
    </div>
  );
}

function toNaturalCropBox(
  dragState: DragState,
  naturalWidth: number,
  naturalHeight: number,
) {
  const minX = Math.min(dragState.startX, dragState.currentX);
  const minY = Math.min(dragState.startY, dragState.currentY);
  const maxX = Math.max(dragState.startX, dragState.currentX);
  const maxY = Math.max(dragState.startY, dragState.currentY);

  return clampCropBox(
    {
      x: Math.round(minX),
      y: Math.round(minY),
      width: Math.max(1, Math.round(maxX - minX)),
      height: Math.max(1, Math.round(maxY - minY)),
    },
    naturalWidth,
    naturalHeight,
  );
}

function clampCropBox(
  cropBox: CropBox,
  naturalWidth: number,
  naturalHeight: number,
) {
  const x = clamp(cropBox.x, 0, Math.max(0, naturalWidth - 1));
  const y = clamp(cropBox.y, 0, Math.max(0, naturalHeight - 1));
  const width = clamp(cropBox.width, 1, Math.max(1, naturalWidth - x));
  const height = clamp(cropBox.height, 1, Math.max(1, naturalHeight - y));

  return {
    x,
    y,
    width,
    height,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
