import type { TopicOption } from "@bac-bank/contracts/admin";
export type { TopicOption } from "@bac-bank/contracts/admin";

export type TopicTreeNode<T extends TopicOption = TopicOption> = T & {
  children: TopicTreeNode<T>[];
};

export function sortTopics<T extends TopicOption>(topics: T[]) {
  return [...topics].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

export function buildTopicTree<T extends TopicOption>(
  topics: T[],
): TopicTreeNode<T>[] {
  const topicByCode = new Map(
    topics.map((topic) => [
      topic.code,
      {
        ...topic,
        children: [] as TopicTreeNode<T>[],
      },
    ]),
  );
  const roots: TopicTreeNode<T>[] = [];

  for (const topic of sortTopics(topics)) {
    const node = topicByCode.get(topic.code);

    if (!node) {
      continue;
    }

    if (topic.parentCode) {
      const parent = topicByCode.get(topic.parentCode);

      if (parent) {
        parent.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  function sortTree(nodes: TopicTreeNode<T>[]) {
    nodes.sort((left, right) => {
      if (left.displayOrder !== right.displayOrder) {
        return left.displayOrder - right.displayOrder;
      }

      return left.name.localeCompare(right.name);
    });

    for (const node of nodes) {
      sortTree(node.children);
    }
  }

  sortTree(roots);
  return roots;
}

export function countSelectableTopics<T extends TopicOption>(
  nodes: TopicTreeNode<T>[],
): number {
  return nodes.reduce(
    (total, node) =>
      total +
      (node.isSelectable ? 1 : 0) +
      countSelectableTopics(node.children),
    0,
  );
}

export function collectSelectableTopics<T extends TopicOption>(
  nodes: TopicTreeNode<T>[],
): TopicTreeNode<T>[] {
  return nodes.flatMap((node) => [
    ...(node.isSelectable ? [node] : []),
    ...collectSelectableTopics(node.children),
  ]);
}

export function buildTopicDescendantsByCode<T extends TopicOption>(
  topicTree: TopicTreeNode<T>[],
) {
  const descendantsByCode = new Map<string, string[]>();

  function walk(node: TopicTreeNode<T>): string[] {
    const childCodes = node.children.flatMap((child) => [
      child.code,
      ...walk(child),
    ]);
    descendantsByCode.set(node.code, childCodes);
    return childCodes;
  }

  for (const node of topicTree) {
    walk(node);
  }

  return descendantsByCode;
}

export function buildTopicAncestorsByCode<T extends TopicOption>(
  topicTree: TopicTreeNode<T>[],
) {
  const ancestorsByCode = new Map<string, string[]>();

  function walk(node: TopicTreeNode<T>, ancestors: string[]) {
    ancestorsByCode.set(node.code, ancestors);

    for (const child of node.children) {
      walk(child, [...ancestors, node.code]);
    }
  }

  for (const node of topicTree) {
    walk(node, []);
  }

  return ancestorsByCode;
}

export function toggleExclusiveTopicSelection(
  currentCodes: string[],
  topicCode: string,
  topicDescendantsByCode: Map<string, string[]>,
  topicAncestorsByCode: Map<string, string[]>,
) {
  const isSelected = currentCodes.includes(topicCode);

  if (isSelected) {
    return currentCodes.filter((code) => code !== topicCode);
  }

  const blockedCodes = new Set<string>([
    ...(topicDescendantsByCode.get(topicCode) ?? []),
    ...(topicAncestorsByCode.get(topicCode) ?? []),
  ]);

  return [...currentCodes.filter((code) => !blockedCodes.has(code)), topicCode];
}
