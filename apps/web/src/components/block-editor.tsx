'use client';

import katex from 'katex';
import { ChangeEvent, useMemo, useState } from 'react';
import { ContentBlock, makeEmptyBlock } from '@/lib/admin';

type BlockEditorProps = {
  title: string;
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  onUploadImage?: (file: File) => Promise<string>;
};

const blockTypes: Array<ContentBlock['type']> = [
  'paragraph',
  'heading',
  'latex',
  'image',
  'code',
];

export function BlockEditor({
  title,
  blocks,
  onChange,
  onUploadImage,
}: BlockEditorProps) {
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  const normalizedBlocks = useMemo(
    () => (blocks.length ? blocks : [makeEmptyBlock('paragraph')]),
    [blocks],
  );

  function updateBlock(blockId: string, patch: Partial<ContentBlock>) {
    onChange(
      normalizedBlocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...patch,
            }
          : block,
      ),
    );
  }

  function updateBlockMeta(
    blockId: string,
    patch: NonNullable<ContentBlock['meta']>,
  ) {
    onChange(
      normalizedBlocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        return {
          ...block,
          meta: {
            ...(block.meta ?? {}),
            ...patch,
          },
        };
      }),
    );
  }

  function addBlock(type: ContentBlock['type']) {
    onChange([...normalizedBlocks, makeEmptyBlock(type)]);
  }

  function removeBlock(blockId: string) {
    const nextBlocks = normalizedBlocks.filter((block) => block.id !== blockId);
    onChange(nextBlocks.length ? nextBlocks : [makeEmptyBlock('paragraph')]);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    const sourceIndex = normalizedBlocks.findIndex((block) => block.id === blockId);

    if (sourceIndex < 0) {
      return;
    }

    const targetIndex = sourceIndex + direction;

    if (targetIndex < 0 || targetIndex >= normalizedBlocks.length) {
      return;
    }

    const nextBlocks = [...normalizedBlocks];
    [nextBlocks[sourceIndex], nextBlocks[targetIndex]] = [
      nextBlocks[targetIndex],
      nextBlocks[sourceIndex],
    ];

    onChange(nextBlocks);
  }

  async function handleImageUpload(
    blockId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file || !onUploadImage) {
      return;
    }

    try {
      setUploadingBlockId(blockId);
      const imageUrl = await onUploadImage(file);
      updateBlock(blockId, { value: imageUrl });
    } finally {
      setUploadingBlockId(null);
      event.target.value = '';
    }
  }

  return (
    <section className="block-editor">
      <header>
        <h3>{title}</h3>
        <div className="chip-grid">
          {blockTypes.map((type) => (
            <button
              key={type}
              type="button"
              className="choice-chip"
              onClick={() => addBlock(type)}
            >
              + {type}
            </button>
          ))}
        </div>
      </header>

      <div className="block-editor-list">
        {normalizedBlocks.map((block, index) => (
          <article key={block.id} className="block-item">
            <div className="block-item-head">
              <strong>Block {index + 1}</strong>
              <div className="block-item-actions">
                <select
                  value={block.type}
                  onChange={(event) => {
                    updateBlock(block.id, {
                      type: event.target.value as ContentBlock['type'],
                    });
                  }}
                >
                  {blockTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => moveBlock(block.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => moveBlock(block.id, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => removeBlock(block.id)}
                >
                  Remove
                </button>
              </div>
            </div>

            {block.type === 'heading' ? (
              <label className="field">
                <span>Heading level</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={block.meta?.level ?? 2}
                  onChange={(event) => {
                    updateBlockMeta(block.id, {
                      level: Number.parseInt(event.target.value, 10) || 2,
                    });
                  }}
                />
              </label>
            ) : null}

            {block.type === 'code' ? (
              <label className="field">
                <span>Language</span>
                <input
                  type="text"
                  value={block.meta?.language ?? ''}
                  onChange={(event) => {
                    updateBlockMeta(block.id, {
                      language: event.target.value,
                    });
                  }}
                />
              </label>
            ) : null}

            {block.type === 'image' ? (
              <label className="field">
                <span>Caption</span>
                <input
                  type="text"
                  value={block.meta?.caption ?? ''}
                  onChange={(event) => {
                    updateBlockMeta(block.id, {
                      caption: event.target.value,
                    });
                  }}
                />
              </label>
            ) : null}

            <label className="field">
              <span>
                {block.type === 'image' ? 'Image URL' : 'Content'}
              </span>
              <textarea
                rows={block.type === 'code' ? 7 : 4}
                value={block.value}
                onChange={(event) => {
                  updateBlock(block.id, {
                    value: event.target.value,
                  });
                }}
              />
            </label>

            {block.type === 'image' && onUploadImage ? (
              <label className="field">
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    void handleImageUpload(block.id, event);
                  }}
                />
                {uploadingBlockId === block.id ? (
                  <small className="muted-text">Uploading…</small>
                ) : null}
              </label>
            ) : null}

            {block.type === 'latex' ? (
              <div className="latex-preview">
                <p className="page-kicker">Preview</p>
                <div
                  dangerouslySetInnerHTML={{
                    __html: katex.renderToString(block.value || ' ', {
                      throwOnError: false,
                      displayMode: true,
                    }),
                  }}
                />
              </div>
            ) : null}

            {block.type === 'image' && block.value ? (
              <div className="block-image-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.value} alt={block.meta?.caption ?? 'Uploaded asset'} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
