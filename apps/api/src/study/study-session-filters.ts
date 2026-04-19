import { BadRequestException } from '@nestjs/common';
import { SessionType, StudySessionKind } from '@prisma/client';
import { CreateStudySessionDto } from './dto/create-study-session.dto';

export type StudySessionSubjectScope = {
  subjectId: string;
  subjectCode: string;
  allowedStreamCodes: string[];
  curriculumIds: string[];
};

export type StudySessionTopicTreeNode = {
  code: string;
  parentCode: string | null;
};

export type NormalizedStudySessionFilterRequest = {
  years: number[];
  subjectCode: string;
  streamCodes: string[];
  topicCodes: string[];
  topicMatchCodes: string[];
  sessionTypes: SessionType[];
  search?: string;
  exerciseCount: number;
  exerciseNodeIds: string[];
};

export type ResolvedStudySessionFilters = {
  years: number[];
  streamCodes: string[];
  subjectCode: string;
  topicCodes: string[];
  topicMatchCodes: string[];
  sessionTypes: SessionType[];
  search?: string;
  exerciseCount: number;
  exerciseNodeIds: string[];
};

export function normalizeRequestedStudySessionFilters(
  payload: CreateStudySessionDto,
  yearRange: {
    min: number;
    max: number;
  },
): NormalizedStudySessionFilterRequest {
  const years = uniqueNumbers(payload.years).filter(
    (year) => year >= yearRange.min && year <= yearRange.max,
  );
  const subjectCode = payload.subjectCode.trim().toUpperCase();
  const streamCodes = uniqueCodes([
    ...(payload.streamCodes ?? []),
    ...(payload.streamCode ? [payload.streamCode] : []),
  ]);
  const topicCodes = uniqueCodes(payload.topicCodes);
  const exerciseNodeIds = Array.from(new Set(payload.exerciseNodeIds ?? []));
  const sessionTypes = uniqueSessionTypes(payload.sessionTypes);
  const search = payload.search?.trim() || undefined;
  const exerciseCount =
    exerciseNodeIds.length > 0
      ? exerciseNodeIds.length
      : (payload.exerciseCount ?? 6);

  return {
    years,
    subjectCode,
    streamCodes,
    topicCodes,
    topicMatchCodes: topicCodes,
    sessionTypes,
    search,
    exerciseCount,
    exerciseNodeIds,
  };
}

export function applyWeakPointTopicCodes(
  filters: NormalizedStudySessionFilterRequest,
  weakPointTopicCodes: string[],
) {
  if (!weakPointTopicCodes.length) {
    return filters;
  }

  return {
    ...filters,
    topicCodes: weakPointTopicCodes,
    topicMatchCodes: weakPointTopicCodes,
  };
}

export function assertValidStudySessionStreamCodes(
  requestedStreamCodes: string[],
  allowedStreamCodes: string[],
) {
  const allowedCodes = Array.from(new Set(allowedStreamCodes));
  const invalidStreamCodes = requestedStreamCodes.filter(
    (streamCode) => !allowedCodes.includes(streamCode),
  );

  if (invalidStreamCodes.length) {
    throw new BadRequestException(
      'The selected stream is not available for this subject.',
    );
  }
}

export function resolveStudySessionTopicMatchCodes(input: {
  topicCodes: string[];
  subjectTopicCodes: string[];
  topicTree: StudySessionTopicTreeNode[];
}) {
  if (!input.topicCodes.length) {
    return [];
  }

  const validTopicCodes = new Set(input.subjectTopicCodes);

  if (!input.topicCodes.every((code) => validTopicCodes.has(code))) {
    throw new BadRequestException(
      'One or more selected topics are invalid for this subject.',
    );
  }

  return expandTopicCodesToDescendants(input.topicTree, input.topicCodes);
}

export function buildResolvedStudySessionFilters(input: {
  normalizedRequest: NormalizedStudySessionFilterRequest;
  subjectScope: StudySessionSubjectScope;
  topicCodes: string[];
  topicMatchCodes: string[];
}): ResolvedStudySessionFilters {
  return {
    years: input.normalizedRequest.years,
    streamCodes: input.normalizedRequest.streamCodes,
    subjectCode: input.subjectScope.subjectCode,
    topicCodes: input.topicCodes,
    topicMatchCodes: input.topicMatchCodes,
    sessionTypes: input.normalizedRequest.sessionTypes,
    search: input.normalizedRequest.search,
    exerciseCount: input.normalizedRequest.exerciseCount,
    exerciseNodeIds: input.normalizedRequest.exerciseNodeIds,
  };
}

export function inferStudySessionKindFromTopicCodes(topicCodes: string[]) {
  return topicCodes.length > 0
    ? StudySessionKind.TOPIC_DRILL
    : StudySessionKind.MIXED_DRILL;
}

export function expandTopicCodesToDescendants(
  topics: StudySessionTopicTreeNode[],
  selectedCodes: string[],
): string[] {
  if (!selectedCodes.length) {
    return [];
  }

  const childrenByParent = new Map<string | null, string[]>();

  for (const topic of topics) {
    const bucket = childrenByParent.get(topic.parentCode) ?? [];
    bucket.push(topic.code);
    childrenByParent.set(topic.parentCode, bucket);
  }

  const expanded = new Set<string>(selectedCodes);
  const queue = [...selectedCodes];

  while (queue.length) {
    const currentCode = queue.shift();

    if (!currentCode) {
      continue;
    }

    for (const childCode of childrenByParent.get(currentCode) ?? []) {
      if (expanded.has(childCode)) {
        continue;
      }

      expanded.add(childCode);
      queue.push(childCode);
    }
  }

  return Array.from(expanded);
}

function uniqueCodes(input?: string[]): string[] {
  if (!input?.length) {
    return [];
  }

  return Array.from(new Set(input.map((item) => item.trim().toUpperCase())));
}

function uniqueNumbers(input?: number[]): number[] {
  if (!input?.length) {
    return [];
  }

  return Array.from(
    new Set(input.filter((item) => Number.isInteger(item))),
  ).sort((a, b) => b - a);
}

function uniqueSessionTypes(input?: SessionType[]): SessionType[] {
  if (!input?.length) {
    return [];
  }

  return Array.from(new Set(input));
}
