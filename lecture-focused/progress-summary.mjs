import { validateAdaptiveState } from './adaptive-selector.mjs';
import { TOPIC_TO_WEEK } from './study-filter.mjs';

export const PROGRESS_SUMMARY_SCHEMA = 'nur2460-c32-catalog242-transparent-progress-summary-1';
export const PROGRESS_STATUS = Object.freeze({
  UNATTEMPTED: 'UNATTEMPTED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  PRACTICE_EVIDENCE: 'PRACTICE_EVIDENCE',
});

const TOPIC_ORDER = Object.freeze(['Pregnancy', 'Labor', 'Newborn', 'GYN', 'Growth', 'Skin', 'GI']);
const WEEK_TOPICS = Object.freeze({
  4: Object.freeze(['Pregnancy']),
  5: Object.freeze(['Labor', 'Newborn']),
  6: Object.freeze(['GYN', 'Growth']),
  7: Object.freeze(['Skin', 'GI']),
});

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function statusFor({ firstAttempts, distinctUnhinted, correctUnhinted }) {
  if (firstAttempts === 0) return PROGRESS_STATUS.UNATTEMPTED;
  if (distinctUnhinted >= 2 && correctUnhinted >= 2) return PROGRESS_STATUS.PRACTICE_EVIDENCE;
  return PROGRESS_STATUS.INSUFFICIENT_EVIDENCE;
}

function nextNeedForTopic(topic, metrics) {
  if (metrics.status === PROGRESS_STATUS.UNATTEMPTED) return `Begin with one unattempted ${topic} question.`;
  if (metrics.distinctUnhinted < 2) {
    const needed = 2 - metrics.distinctUnhinted;
    return `Complete ${needed} more distinct ${topic} question${needed === 1 ? '' : 's'} without a clue; repeats do not count.`;
  }
  if (metrics.correctUnhinted < 2) {
    return `Use an unattempted ${topic} question to build additional correct practice evidence; this is not a pass or mastery threshold.`;
  }
  if (metrics.unattemptedQuestions > 0) return `Continue with ${metrics.unattemptedQuestions} unattempted ${topic} question${metrics.unattemptedQuestions === 1 ? '' : 's'}; current evidence is practice-only.`;
  return `The accepted ${topic} bank is exhausted; practice evidence does not certify mastery.`;
}

export function summarizeProgress(history, catalog) {
  const validated = validateAdaptiveState(history, catalog);
  const identities = catalog.list();
  const attemptByKey = new Map(validated.attempts.map(attempt => [`${attempt.id}@${attempt.revision}`, attempt]));

  const trackGroups = new Map();
  for (const identity of identities) {
    if (!trackGroups.has(identity.track)) trackGroups.set(identity.track, []);
    trackGroups.get(identity.track).push(identity);
  }
  const tracks = [...trackGroups].map(([track, members]) => {
    const attempts = members.map(identity => attemptByKey.get(`${identity.id}@${identity.revision}`)).filter(Boolean);
    const unhinted = attempts.filter(attempt => !attempt.hinted);
    const correct = unhinted.filter(attempt => attempt.correct);
    const status = statusFor({
      firstAttempts: attempts.length,
      distinctUnhinted: unhinted.length,
      correctUnhinted: correct.length,
    });
    const oneItemTrack = members.length === 1;
    return freeze({
      track,
      topic: members[0].topic,
      acceptedQuestions: members.length,
      firstAttempts: attempts.length,
      distinctUnhinted: unhinted.length,
      correctUnhinted: correct.length,
      evidenceFraction: { numerator: unhinted.length, denominator: members.length },
      status,
      practiceEvidence: !oneItemTrack && status === PROGRESS_STATUS.PRACTICE_EVIDENCE,
      masteryCertified: false,
      oneItemTrack,
      sparseBankLimit: oneItemTrack
        ? 'One accepted question cannot establish track mastery or repeated practice evidence.'
        : null,
    });
  });

  const topics = TOPIC_ORDER.map(topic => {
    const members = identities.filter(identity => identity.topic === topic);
    const attempts = members.map(identity => attemptByKey.get(`${identity.id}@${identity.revision}`)).filter(Boolean);
    const unhinted = attempts.filter(attempt => !attempt.hinted);
    const correct = unhinted.filter(attempt => attempt.correct);
    const topicTracks = tracks.filter(track => track.topic === topic);
    const status = statusFor({
      firstAttempts: attempts.length,
      distinctUnhinted: unhinted.length,
      correctUnhinted: correct.length,
    });
    const metrics = {
      topic,
      week: TOPIC_TO_WEEK[topic],
      acceptedQuestions: members.length,
      firstAttempts: attempts.length,
      distinctUnhinted: unhinted.length,
      correctUnhinted: correct.length,
      hintedFirstAttempts: attempts.filter(attempt => attempt.hinted).length,
      unattemptedQuestions: members.length - attempts.length,
      evidenceFraction: { numerator: unhinted.length, denominator: members.length },
      correctEvidenceFraction: { numerator: correct.length, denominator: unhinted.length },
      status,
      practiceEvidence: status === PROGRESS_STATUS.PRACTICE_EVIDENCE,
      masteryCertified: false,
      tracks: topicTracks.length,
      oneItemTracks: topicTracks.filter(track => track.oneItemTrack).length,
      practiceEvidenceTracks: topicTracks.filter(track => track.practiceEvidence).length,
      exhaustedTracks: topicTracks.filter(track => track.firstAttempts === track.acceptedQuestions).length,
    };
    return freeze({ ...metrics, nextStudyNeed: nextNeedForTopic(topic, metrics) });
  });

  const weeks = [4, 5, 6, 7].map(week => {
    const weekTopics = WEEK_TOPICS[week].map(topic => topics.find(summary => summary.topic === topic));
    const acceptedQuestions = weekTopics.reduce((sum, topic) => sum + topic.acceptedQuestions, 0);
    const firstAttempts = weekTopics.reduce((sum, topic) => sum + topic.firstAttempts, 0);
    const distinctUnhinted = weekTopics.reduce((sum, topic) => sum + topic.distinctUnhinted, 0);
    const correctUnhinted = weekTopics.reduce((sum, topic) => sum + topic.correctUnhinted, 0);
    const unattemptedTopics = weekTopics.filter(topic => topic.status === PROGRESS_STATUS.UNATTEMPTED).map(topic => topic.topic);
    const insufficientEvidenceTopics = weekTopics.filter(topic => topic.status === PROGRESS_STATUS.INSUFFICIENT_EVIDENCE).map(topic => topic.topic);
    const practiceEvidenceTopics = weekTopics.filter(topic => topic.status === PROGRESS_STATUS.PRACTICE_EVIDENCE).map(topic => topic.topic);
    const nextTopic = unattemptedTopics[0] ?? insufficientEvidenceTopics[0]
      ?? [...weekTopics].sort((left, right) => right.unattemptedQuestions - left.unattemptedQuestions)[0].topic;
    return freeze({
      week,
      topics: weekTopics.map(topic => topic.topic),
      acceptedQuestions,
      firstAttempts,
      distinctUnhinted,
      correctUnhinted,
      evidenceFraction: { numerator: distinctUnhinted, denominator: acceptedQuestions },
      correctEvidenceFraction: { numerator: correctUnhinted, denominator: distinctUnhinted },
      unattemptedTopics,
      insufficientEvidenceTopics,
      practiceEvidenceTopics,
      nextStudyNeed: `Next topic need: ${nextTopic}. Week totals aggregate question counts; they are not averages of topic percentages.`,
      masteryCertified: false,
    });
  });

  return freeze({
    schema: PROGRESS_SUMMARY_SCHEMA,
    policy: {
      statuses: Object.values(PROGRESS_STATUS),
      practiceEvidenceRule: 'At least two correct distinct unhinted first attempts within the topic.',
      denominatorRule: 'Accepted question revisions in the topic or week; week totals are sums, never averaged topic percentages.',
      oneItemTrackRule: 'A one-item track cannot be mastered.',
      calibration: 'No psychometric calibration, pass prediction, or mastery certification.',
    },
    history: {
      firstAttempts: validated.attempts.length,
      distinctUnhinted: validated.attempts.filter(attempt => !attempt.hinted).length,
      hintedFirstAttempts: validated.attempts.filter(attempt => attempt.hinted).length,
    },
    topics,
    weeks,
    tracks,
  });
}
