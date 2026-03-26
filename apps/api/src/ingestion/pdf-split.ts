import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type PdfPageRange = {
  start: number;
  end: number;
};

export async function getPdfPageCount(buffer: Buffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-pdf-pages-'));
  const inputPath = path.join(tempDir, 'input.pdf');

  try {
    await fs.writeFile(inputPath, buffer);
    const { stdout } = await execFileAsync('pdfinfo', [inputPath], {
      maxBuffer: 1024 * 1024,
    });
    const match = stdout.match(/^Pages:\s+(\d+)$/m);

    if (!match) {
      throw new Error('Unable to read PDF page count.');
    }

    return Number.parseInt(match[1], 10);
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

export async function splitPdfPages(buffer: Buffer, range: PdfPageRange) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bac-pdf-split-'));
  const inputPath = path.join(tempDir, 'input.pdf');
  const outputPath = path.join(tempDir, 'output.pdf');

  try {
    await fs.writeFile(inputPath, buffer);
    await execFileAsync(
      'gs',
      [
        '-q',
        '-dBATCH',
        '-dNOPAUSE',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.7',
        `-dFirstPage=${range.start}`,
        `-dLastPage=${range.end}`,
        `-sOutputFile=${outputPath}`,
        inputPath,
      ],
      {
        maxBuffer: 1024 * 1024,
      },
    );

    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

export async function splitCombinedPdf(
  buffer: Buffer,
  subjectPageCount: number,
) {
  const totalPages = await getPdfPageCount(buffer);

  if (subjectPageCount <= 0 || subjectPageCount >= totalPages) {
    throw new Error(
      `Invalid split point ${subjectPageCount} for combined PDF with ${totalPages} pages.`,
    );
  }

  const examPageRange = {
    start: 1,
    end: subjectPageCount,
  } satisfies PdfPageRange;
  const correctionPageRange = {
    start: subjectPageCount + 1,
    end: totalPages,
  } satisfies PdfPageRange;

  const [examBuffer, correctionBuffer] = await Promise.all([
    splitPdfPages(buffer, examPageRange),
    splitPdfPages(buffer, correctionPageRange),
  ]);

  return {
    totalPages,
    examBuffer,
    correctionBuffer,
    examPageRange,
    correctionPageRange,
  };
}
