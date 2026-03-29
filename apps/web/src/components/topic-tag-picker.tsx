"use client";

import { useMemo } from "react";
import {
  buildTopicAncestorsByCode,
  buildTopicDescendantsByCode,
  buildTopicTree,
  collectSelectableTopics,
  countSelectableTopics,
  sortTopics,
  toggleExclusiveTopicSelection,
  type TopicOption,
} from "@/lib/topic-taxonomy";

type TopicTagPickerProps = {
  topics: TopicOption[];
  selectedCodes: string[];
  onChange: (nextCodes: string[]) => void;
  subjectCode?: string | null;
  streamCodes?: string[];
  disabled?: boolean;
  emptyStateLabel?: string;
};

export function TopicTagPicker({
  topics,
  selectedCodes,
  onChange,
  subjectCode,
  streamCodes,
  disabled = false,
  emptyStateLabel = "No topics are available for this selection.",
}: TopicTagPickerProps) {
  const availableTopics = useMemo(() => {
    if (!subjectCode) {
      return [];
    }

    return topics.filter((topic) => {
      if (topic.subject.code !== subjectCode) {
        return false;
      }

      if (!streamCodes?.length) {
        return true;
      }

      return streamCodes.some((streamCode) => topic.streamCodes.includes(streamCode));
    });
  }, [streamCodes, subjectCode, topics]);

  const topicLookup = useMemo(
    () => new Map(availableTopics.map((topic) => [topic.code, topic])),
    [availableTopics],
  );
  const topicTree = useMemo(
    () => buildTopicTree(availableTopics),
    [availableTopics],
  );
  const chapterTopics = useMemo(
    () =>
      topicTree.filter(
        (topic) =>
          topic.isSelectable || countSelectableTopics(topic.children) > 0,
      ),
    [topicTree],
  );
  const selectableTopicsByChapter = useMemo(
    () =>
      chapterTopics.map((chapter) => ({
        chapter,
        subtopics: collectSelectableTopics(chapter.children),
      })),
    [chapterTopics],
  );
  const topicDescendantsByCode = useMemo(
    () => buildTopicDescendantsByCode(topicTree),
    [topicTree],
  );
  const topicAncestorsByCode = useMemo(
    () => buildTopicAncestorsByCode(topicTree),
    [topicTree],
  );
  const selectedTopics = useMemo(
    () =>
      sortTopics(
        selectedCodes
          .map((code) => topicLookup.get(code) ?? null)
          .filter((topic): topic is TopicOption => Boolean(topic)),
      ),
    [selectedCodes, topicLookup],
  );

  function toggleTopic(topicCode: string) {
    onChange(
      toggleExclusiveTopicSelection(
        selectedCodes,
        topicCode,
        topicDescendantsByCode,
        topicAncestorsByCode,
      ),
    );
  }

  if (!subjectCode) {
    return <p className="muted-text">Pick a subject first to load its topics.</p>;
  }

  if (!availableTopics.length) {
    return <p className="muted-text">{emptyStateLabel}</p>;
  }

  return (
    <div className="topic-tag-picker">
      <div className="topic-tag-picker-summary">
        {selectedTopics.length ? (
          <div className="topic-chip-row">
            {selectedTopics.map((topic) => (
              <span key={topic.code}>{topic.name}</span>
            ))}
          </div>
        ) : (
          <p className="muted-text">No topic tags selected yet.</p>
        )}
        <p className="muted-text topic-tag-picker-note">
          Pick the most specific set of topics. Parent and child tags are kept mutually
          exclusive.
        </p>
      </div>

      <div className="topic-tag-picker-groups">
        {selectableTopicsByChapter.map(({ chapter, subtopics }) => {
          const chapterSelected = selectedCodes.includes(chapter.code);

          return (
            <section key={chapter.code} className="topic-tag-picker-group">
              <div className="topic-tag-picker-head">
                {chapter.isSelectable ? (
                  <button
                    type="button"
                    className={chapterSelected ? "choice-chip active" : "choice-chip"}
                    disabled={disabled}
                    onClick={() => toggleTopic(chapter.code)}
                  >
                    {chapter.name}
                  </button>
                ) : (
                  <strong>{chapter.name}</strong>
                )}
                <span className="muted-text">
                  {subtopics.length
                    ? `${subtopics.length} subtopic${subtopics.length > 1 ? "s" : ""}`
                    : chapter.isSelectable
                      ? "Broad chapter tag"
                      : "No selectable subtopics"}
                </span>
              </div>

              {subtopics.length ? (
                <div className="chip-grid">
                  {subtopics.map((topic) => (
                    <button
                      key={topic.code}
                      type="button"
                      className={
                        selectedCodes.includes(topic.code)
                          ? "choice-chip active"
                          : "choice-chip"
                      }
                      disabled={disabled}
                      onClick={() => toggleTopic(topic.code)}
                    >
                      {topic.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
