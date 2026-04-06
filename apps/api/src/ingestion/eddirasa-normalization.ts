import { SessionType, SourceDocumentKind } from '@prisma/client';
import {
  buildCanonicalDocumentFileName,
  buildCanonicalDocumentStorageKey,
  buildCanonicalPageStorageKey,
  fileNameFromUrl,
  normalizeLookup,
  stripPdfExtension,
} from './storage-naming';

export {
  fileNameFromUrl,
  normalizeLookup,
  slugifySegment,
  stripPdfExtension,
} from './storage-naming';

export type EddirasaSlugMetadata = {
  sourceSlug: string;
  coreSlug: string;
  streamCode: string | null;
  subjectCode: string | null;
  qualifierKey: string | null;
  storageStreamKey: string | null;
  storageSubjectKey: string | null;
};

export type EddirasaDerivedMetadata = {
  streamCode: string | null;
  subjectCode: string | null;
  qualifierKey: string | null;
  sourceSlug: string | null;
  sessionType: SessionType;
};

export type EddirasaStorageContext = {
  year: number;
  streamCode: string | null;
  subjectCode: string | null;
  sessionType: SessionType;
  slug?: string | null;
};

type SubjectDescriptor = {
  subjectCode: string;
  qualifierKey: string | null;
  storageSubjectKey: string | null;
};

const SUBJECT_DESCRIPTOR_MAP: Record<string, SubjectDescriptor> = {
  ara: {
    subjectCode: 'ARABIC',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  arabic: {
    subjectCode: 'ARABIC',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  math: {
    subjectCode: 'MATHEMATICS',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  maths: {
    subjectCode: 'MATHEMATICS',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  mathematics: {
    subjectCode: 'MATHEMATICS',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  physique: {
    subjectCode: 'PHYSICS',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  phy: {
    subjectCode: 'PHYSICS',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  science: {
    subjectCode: 'NATURAL_SCIENCES',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  'his-geo': {
    subjectCode: 'HISTORY_GEOGRAPHY',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  islamic: {
    subjectCode: 'ISLAMIC_STUDIES',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  philo: {
    subjectCode: 'PHILOSOPHY',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  fra: {
    subjectCode: 'FRENCH',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  eng: {
    subjectCode: 'ENGLISH',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  english: {
    subjectCode: 'ENGLISH',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  tam: {
    subjectCode: 'AMAZIGH',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  droit: {
    subjectCode: 'LAW',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  law: {
    subjectCode: 'LAW',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  eco: {
    subjectCode: 'ECONOMICS_MANAGEMENT',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  economie: {
    subjectCode: 'ECONOMICS_MANAGEMENT',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  management: {
    subjectCode: 'ECONOMICS_MANAGEMENT',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  gestion: {
    subjectCode: 'ACCOUNTING_FINANCE',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  compta: {
    subjectCode: 'ACCOUNTING_FINANCE',
    qualifierKey: null,
    storageSubjectKey: null,
  },
  ger: {
    subjectCode: 'GERMAN',
    qualifierKey: 'german',
    storageSubjectKey: 'GERMAN',
  },
  deutsch: {
    subjectCode: 'GERMAN',
    qualifierKey: 'german',
    storageSubjectKey: 'GERMAN',
  },
  esp: {
    subjectCode: 'SPANISH',
    qualifierKey: 'spanish',
    storageSubjectKey: 'SPANISH',
  },
  espalol: {
    subjectCode: 'SPANISH',
    qualifierKey: 'spanish',
    storageSubjectKey: 'SPANISH',
  },
  espanol: {
    subjectCode: 'SPANISH',
    qualifierKey: 'spanish',
    storageSubjectKey: 'SPANISH',
  },
  ita: {
    subjectCode: 'ITALIAN',
    qualifierKey: 'italian',
    storageSubjectKey: 'ITALIAN',
  },
  italien: {
    subjectCode: 'ITALIAN',
    qualifierKey: 'italian',
    storageSubjectKey: 'ITALIAN',
  },
  italian: {
    subjectCode: 'ITALIAN',
    qualifierKey: 'italian',
    storageSubjectKey: 'ITALIAN',
  },
};

const SUBJECT_ALIASES: Record<string, string> = {
  'his-geo': 'HISTORY_GEOGRAPHY',
  'histoire-geographie': 'HISTORY_GEOGRAPHY',
  histoir: 'HISTORY_GEOGRAPHY',
  histoire: 'HISTORY_GEOGRAPHY',
  geography: 'HISTORY_GEOGRAPHY',
  islamique: 'ISLAMIC_STUDIES',
  islamic: 'ISLAMIC_STUDIES',
  philosophie: 'PHILOSOPHY',
  philosophy: 'PHILOSOPHY',
  phylosofie: 'PHILOSOPHY',
  philo: 'PHILOSOPHY',
  francais: 'FRENCH',
  french: 'FRENCH',
  english: 'ENGLISH',
  anglais: 'ENGLISH',
  arabe: 'ARABIC',
  arabic: 'ARABIC',
  amazigh: 'AMAZIGH',
  tamazighte: 'AMAZIGH',
  tamazight: 'AMAZIGH',
  mathematiques: 'MATHEMATICS',
  mathematics: 'MATHEMATICS',
  maths: 'MATHEMATICS',
  physique: 'PHYSICS',
  physics: 'PHYSICS',
  'science-naturelle': 'NATURAL_SCIENCES',
  'science-naturelles': 'NATURAL_SCIENCES',
  'sciences-naturelles': 'NATURAL_SCIENCES',
  'natural-sciences': 'NATURAL_SCIENCES',
  sciences: 'NATURAL_SCIENCES',
  svt: 'NATURAL_SCIENCES',
  economie: 'ECONOMICS_MANAGEMENT',
  economique: 'ECONOMICS_MANAGEMENT',
  management: 'ECONOMICS_MANAGEMENT',
  comptabilite: 'ACCOUNTING_FINANCE',
  accounting: 'ACCOUNTING_FINANCE',
  droit: 'LAW',
  drois: 'LAW',
  law: 'LAW',
  allemand: 'GERMAN',
  german: 'GERMAN',
  espagnol: 'SPANISH',
  espalol: 'SPANISH',
  spanish: 'SPANISH',
  italien: 'ITALIAN',
  italian: 'ITALIAN',
};

const STREAM_ALIASES: Record<string, string> = {
  'science-experimentale': 'SE',
  'sciences-experimentales': 'SE',
  'science-experimentales': 'SE',
  sci: 'SE',
  math: 'M',
  mathematiques: 'M',
  'gestion-economie': 'GE',
  'eco-gestion': 'GE',
  ge: 'GE',
  eco: 'GE',
  li: 'LP',
  lp: 'LP',
  let: 'LP',
  lt: 'LP',
  'lettres-philo': 'LP',
  lang: 'LE',
  le: 'LE',
  'langues-etrangeres': 'LE',
  arts: 'ARTS',
  art: 'ARTS',
};

const TECH_STREAM_MAP: Record<
  string,
  {
    streamCode: string;
    subjectCode: string;
  }
> = {
  'genie-civil': {
    streamCode: 'MT_CIVIL',
    subjectCode: 'TECHNOLOGY_CIVIL',
  },
  gcivil: {
    streamCode: 'MT_CIVIL',
    subjectCode: 'TECHNOLOGY_CIVIL',
  },
  'g-civil': {
    streamCode: 'MT_CIVIL',
    subjectCode: 'TECHNOLOGY_CIVIL',
  },
  'genie-electrique': {
    streamCode: 'MT_ELEC',
    subjectCode: 'TECHNOLOGY_ELECTRICAL',
  },
  gelectrique: {
    streamCode: 'MT_ELEC',
    subjectCode: 'TECHNOLOGY_ELECTRICAL',
  },
  'g-electrique': {
    streamCode: 'MT_ELEC',
    subjectCode: 'TECHNOLOGY_ELECTRICAL',
  },
  'g-electric': {
    streamCode: 'MT_ELEC',
    subjectCode: 'TECHNOLOGY_ELECTRICAL',
  },
  'genie-mecanique': {
    streamCode: 'MT_MECH',
    subjectCode: 'TECHNOLOGY_MECHANICAL',
  },
  gmecanique: {
    streamCode: 'MT_MECH',
    subjectCode: 'TECHNOLOGY_MECHANICAL',
  },
  'g-mecanique': {
    streamCode: 'MT_MECH',
    subjectCode: 'TECHNOLOGY_MECHANICAL',
  },
  'g-mechanical': {
    streamCode: 'MT_MECH',
    subjectCode: 'TECHNOLOGY_MECHANICAL',
  },
  'genie-procedes': {
    streamCode: 'MT_PROC',
    subjectCode: 'TECHNOLOGY_PROCESS',
  },
  'g-procedes': {
    streamCode: 'MT_PROC',
    subjectCode: 'TECHNOLOGY_PROCESS',
  },
  procede: {
    streamCode: 'MT_PROC',
    subjectCode: 'TECHNOLOGY_PROCESS',
  },
  procedes: {
    streamCode: 'MT_PROC',
    subjectCode: 'TECHNOLOGY_PROCESS',
  },
  'g-procede': {
    streamCode: 'MT_PROC',
    subjectCode: 'TECHNOLOGY_PROCESS',
  },
};

export function deriveEddirasaMetadata(
  values: Array<string | null | undefined>,
): EddirasaDerivedMetadata {
  const parsed = values
    .map((value) => parseEddirasaSlug(value))
    .find((entry) => entry !== null);
  const joinedRaw = values
    .filter((value): value is string => Boolean(value))
    .join(' ');
  const normalizedJoined = values
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeLookup(value))
    .filter((value) => value.length > 0)
    .join('-');

  return {
    streamCode:
      parsed?.streamCode ??
      resolveAlias(normalizedJoined, STREAM_ALIASES) ??
      null,
    subjectCode:
      parsed?.subjectCode ??
      resolveAlias(normalizedJoined, SUBJECT_ALIASES) ??
      null,
    qualifierKey: parsed?.qualifierKey ?? null,
    sourceSlug: parsed?.sourceSlug ?? null,
    sessionType: /rattrapage|remplacement|makeup|istidrak|استدراك/i.test(
      joinedRaw,
    )
      ? SessionType.MAKEUP
      : SessionType.NORMAL,
  };
}

export function parseEddirasaSlug(
  value: string | null | undefined,
): EddirasaSlugMetadata | null {
  const sourceSlug = extractSourceSlug(value);

  if (!sourceSlug) {
    return null;
  }

  const tokens = sourceSlug.split('-').filter(Boolean);

  while (
    tokens[0] === 'eddirasa' ||
    tokens[0] === 'com' ||
    tokens[0] === 'correction' ||
    tokens[0] === 'corrige' ||
    tokens[0] === 'corr'
  ) {
    tokens.shift();
  }

  if (tokens[0] === 'bac') {
    tokens.shift();
  }

  const lastToken = tokens[tokens.length - 1];

  if (/^(19|20)\d{2}$/.test(lastToken ?? '')) {
    tokens.pop();
  }

  while (/^\d+$/.test(tokens[tokens.length - 1] ?? '') && tokens.length > 1) {
    tokens.pop();
  }

  if (tokens.length === 0) {
    return null;
  }

  const coreSlug = tokens.join('-');
  const prefix = tokens[0];
  const rest = tokens.slice(1);
  const suffix = tokens[tokens.length - 1];

  if (prefix === 'tech' || prefix === 'tch') {
    const restKey = rest.join('-');
    const technicalMatch = TECH_STREAM_MAP[restKey];

    if (technicalMatch) {
      return {
        sourceSlug,
        coreSlug,
        streamCode: technicalMatch.streamCode,
        subjectCode: technicalMatch.subjectCode,
        qualifierKey: null,
        storageStreamKey: technicalMatch.streamCode,
        storageSubjectKey: technicalMatch.subjectCode,
      };
    }

    const descriptor = resolveSubjectDescriptor(rest);

    return {
      sourceSlug,
      coreSlug,
      streamCode: null,
      subjectCode: descriptor?.subjectCode ?? null,
      qualifierKey: descriptor?.qualifierKey ?? 'tech-common',
      storageStreamKey: 'tech-common',
      storageSubjectKey:
        descriptor?.storageSubjectKey ?? descriptor?.subjectCode ?? restKey,
    };
  }

  const suffixStreamCode =
    tokens.length > 1 ? resolveStreamPrefix(suffix ?? '') : null;

  if (suffixStreamCode) {
    const descriptor = resolveSubjectDescriptor(tokens.slice(0, -1));

    if (descriptor) {
      return {
        sourceSlug,
        coreSlug,
        streamCode: suffixStreamCode,
        subjectCode: descriptor.subjectCode,
        qualifierKey: descriptor.qualifierKey ?? null,
        storageStreamKey: suffixStreamCode,
        storageSubjectKey:
          descriptor.storageSubjectKey ?? descriptor.subjectCode,
      };
    }
  }

  const streamCode = resolveStreamPrefix(prefix);
  const descriptor = resolveSubjectDescriptor(streamCode ? rest : tokens);

  return {
    sourceSlug,
    coreSlug,
    streamCode,
    subjectCode: descriptor?.subjectCode ?? null,
    qualifierKey: descriptor?.qualifierKey ?? null,
    storageStreamKey: streamCode,
    storageSubjectKey:
      descriptor?.storageSubjectKey ??
      descriptor?.subjectCode ??
      (streamCode ? rest.join('-') : coreSlug),
  };
}

export function buildCanonicalEddirasaDocumentFileName(
  context: EddirasaStorageContext,
  kind: SourceDocumentKind,
) {
  const parsed = parseEddirasaSlug(context.slug ?? null);
  return buildCanonicalDocumentFileName(
    {
      year: context.year,
      streamCode: context.streamCode ?? parsed?.storageStreamKey ?? null,
      subjectCode: context.subjectCode ?? parsed?.storageSubjectKey ?? null,
      sessionType: context.sessionType,
      qualifierKey: parsed?.qualifierKey ?? null,
    },
    kind,
  );
}

export function buildEddirasaDocumentStorageKey(
  context: EddirasaStorageContext,
  fileName: string,
) {
  return buildCanonicalDocumentStorageKey(context, fileName);
}

export function buildEddirasaPageStorageKey(
  context: EddirasaStorageContext,
  documentFileName: string,
  pageNumber: number,
) {
  return buildCanonicalPageStorageKey(context, documentFileName, pageNumber);
}

function resolveStreamPrefix(prefix: string) {
  switch (prefix) {
    case 'se':
    case 'sci':
      return 'SE';
    case 'm':
    case 'math':
      return 'M';
    case 'ge':
      return 'GE';
    case 'lp':
    case 'li':
    case 'lt':
    case 'let':
      return 'LP';
    case 'le':
    case 'lang':
      return 'LE';
    default:
      return null;
  }
}

function resolveSubjectDescriptor(tokens: string[]) {
  if (!tokens.length) {
    return null;
  }

  const candidates = Array.from(
    new Set([
      tokens.join('-'),
      ...tokens.map((_, index) => tokens.slice(index).join('-')),
      ...tokens,
    ]),
  ).filter((candidate) => candidate.length > 0);

  for (const candidate of candidates) {
    if (SUBJECT_DESCRIPTOR_MAP[candidate]) {
      return SUBJECT_DESCRIPTOR_MAP[candidate];
    }

    if (SUBJECT_ALIASES[candidate]) {
      return {
        subjectCode: SUBJECT_ALIASES[candidate],
        qualifierKey: null,
        storageSubjectKey: SUBJECT_ALIASES[candidate],
      };
    }
  }

  return null;
}

function extractSourceSlug(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const baseName = fileNameFromUrl(value) ?? value;
  const normalized = normalizeLookup(stripPdfExtension(baseName));
  return normalized.length > 0 ? normalized : null;
}

function resolveAlias(
  value: string,
  aliases: Record<string, string>,
): string | null {
  if (!value) {
    return null;
  }

  const patterns = Object.keys(aliases).sort((left, right) => {
    return right.length - left.length;
  });

  for (const pattern of patterns) {
    if (
      value === pattern ||
      value.startsWith(`${pattern}-`) ||
      value.endsWith(`-${pattern}`) ||
      value.includes(`-${pattern}-`)
    ) {
      return aliases[pattern];
    }
  }

  return null;
}
