export type AlternatePdfSource = {
  provider: string;
  url: string;
  split?: {
    subjectPageCount: number;
  };
};

export const ALTERNATE_PDF_SOURCES: Record<string, AlternatePdfSource> = {
  'eddirasa-bac-li-his-geo-2008': {
    provider: 'dzexams',
    url: 'https://www.dzexams.com/uploads/sujets/officiels/bac/2008/dzexams-bac-histoire-geographie-765828.pdf',
    split: {
      subjectPageCount: 4,
    },
  },
  'eddirasa-bac-ge-his-geo-2008': {
    provider: 'dzexams',
    url: 'https://www.dzexams.com/uploads/sujets/officiels/bac/2008/dzexams-bac-histoire-geographie-816449.pdf',
    split: {
      subjectPageCount: 5,
    },
  },
  'eddirasa-bac-ge-his-geo-2009': {
    provider: 'dzexams',
    url: 'https://www.dzexams.com/uploads/sujets/officiels/bac/2009/dzexams-bac-histoire-geographie-2309637.pdf',
    split: {
      subjectPageCount: 3,
    },
  },
  'eddirasa-com-bac-tech-genie-civil-2011': {
    provider: 'dzexams',
    url: 'https://www.dzexams.com/uploads/sujets/officiels/bac/2011/dzexams-bac-genie-civil-2354913.pdf',
    split: {
      subjectPageCount: 8,
    },
  },
};

export function resolveAlternatePdfSource(slug: string | null) {
  if (!slug) {
    return null;
  }

  return ALTERNATE_PDF_SOURCES[slug] ?? null;
}
