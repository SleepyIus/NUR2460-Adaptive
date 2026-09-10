export type Confidence = "sure" | "unsure" | "guess";
export type Question = {
  id: string;
  revision?: string;
  topic: string;
  area: string;
  difficulty: number;
  kind: string;
  skills: string[];
  stem: string;
  clue: string;
  rationale: string;
  options: { id: string; text: string; correct: boolean; reason: string }[];
  refs: { label: string; url?: string }[];
  origin: string;
  objective?: string;
  difficultyReason?: string;
  reviewStatus?: string;
};
export type Bank = {
  version: string;
  areas: Record<string, string>;
  topics: Record<string, { label: string; count: number; sata: number; skills: string[] }>;
  questions: Question[];
  reviewed: string;
  archive?: Question[];
  legacyVersion?: string;
};
export type Attempt = {
  id: string;
  questionRevision?: string;
  order: string[];
  selected: string[];
  confidence: Confidence;
  at: string;
  fresh: boolean;
};
export type Current = {
  id: string;
  questionRevision?: string;
  order: string[];
  selected: string[];
  confidence: Confidence | null;
  submitted: boolean;
  reason: string;
};
export type Mode = "study" | "exam";
export type State = {
  schema: 3;
  bankVersion: string;
  history: Attempt[];
  session: {
    start: number;
    limit: number;
    mode: Mode;
    done: boolean;
    current: Current | null;
    bankVersion?: string;
  };
  revision: number;
};
export const STORAGE_KEY = "nur2460-exam2-v3";
export const LEGACY_STORAGE_KEY = "nur2460-exam2-expanded-v2";
export const LEVELS: Record<number, string> = {
  1: "Foundational",
  2: "Intermediate",
  3: "Advanced",
};
const revisionLookups = new WeakMap<Bank, Map<string, Question>>();
export function questionFor(
  record: { id: string; questionRevision?: string },
  bank: Bank,
): Question {
  let lookup = revisionLookups.get(bank);
  if (!lookup) {
    lookup = new Map();
    for (const q of [...bank.questions, ...(bank.archive ?? [])]) {
      lookup.set(`${q.id}@${q.revision}`, q);
      if (!lookup.has(q.id)) lookup.set(q.id, q);
    }
    revisionLookups.set(bank, lookup);
  }
  const q = lookup.get(
    record.questionRevision ? `${record.id}@${record.questionRevision}` : record.id,
  );
  if (!q)
    throw Error(
      "This saved question revision is not available. Keep the backup; no data was replaced.",
    );
  return q;
}
function selectionBank(state: State, bank: Bank): Bank {
  return state.session.mode === "exam" &&
    state.session.bankVersion === bank.legacyVersion &&
    bank.archive?.length
    ? { ...bank, questions: bank.archive }
    : bank;
}
export function random() {
  const x = new Uint32Array(1);
  globalThis.crypto.getRandomValues(x);
  return x[0] / 4294967296;
}
export function shuffle<T>(values: T[], rng: () => number = random) {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function grade(q: Question, selected: string[]) {
  const correct = q.options.filter((o) => o.correct).map((o) => o.id),
    picked = new Set(selected);
  const missed = correct.filter((id) => !picked.has(id)),
    extra = selected.filter((id) => !correct.includes(id));
  const exact = missed.length === 0 && extra.length === 0;
  return {
    exact,
    missed,
    extra,
    hits: correct.length - missed.length,
    total: correct.length,
    label: exact
      ? "Correct"
      : q.kind === "SATA" && correct.length > missed.length
        ? "Partially correct"
        : "Incorrect",
  };
}
export function skillSignals(state: State, bank: Bank) {
  const skills: Record<string, { answered: number; correct: number }> = {};
  for (const a of state.history) {
    const q = questionFor(a, bank);
    for (const skill of q.skills) {
      const s = (skills[skill] ??= { answered: 0, correct: 0 });
      s.answered++;
      if (grade(q, a.selected).exact) s.correct++;
    }
  }
  return skills;
}
export function areaSignals(state: State, bank: Bank) {
  const signals = Object.fromEntries(
    Object.keys(bank.areas).map((area) => [
      area,
      {
        level: 2,
        last: -1,
        lastMiss: -1,
        answered: 0,
        correct: 0,
        uncertainty: 0,
        freshRight: 0,
        missedChoices: 0,
        extraChoices: 0,
        laterReviews: 0,
        evidence: [] as string[],
        missEvidence: [] as string[],
        label: "Not practiced",
      },
    ]),
  );
  const seen = new Map<string, { index: number; at: number }>();
  state.history.forEach((a, index) => {
    const q = questionFor(a, bank),
      s = signals[q.area];
    if (!s) return;
    const g = grade(q, a.selected),
      previous = seen.get(q.id),
      at = Date.parse(a.at);
    const later = !!previous && at - previous.at >= 24 * 60 * 60 * 1000;
    const spaced = (s.last < 0 || index - s.last >= 3 || later) && (!previous || later);
    const currentRevision = bank.questions.find((x) => x.id === a.id)?.revision === q.revision;
    s.answered++;
    if (g.exact) s.correct++;
    if (q.kind === "SATA") {
      s.missedChoices += g.missed.length;
      s.extraChoices += g.extra.length;
    }
    if (later) s.laterReviews++;
    if (currentRevision) {
      if (!g.exact) {
        s.lastMiss = index;
        s.uncertainty = 0;
        s.freshRight = 0;
        s.evidence = [];
        // A single miss requests another check. Two distinct, spaced misses at or
        // below the target justify a more supportive level; a harder miss does not.
        if (spaced && q.difficulty <= s.level && !s.missEvidence.includes(q.id))
          s.missEvidence.push(q.id);
        if (s.missEvidence.length >= 2) {
          s.level = Math.max(1, s.level - 1);
          s.missEvidence = [];
        }
      } else {
        s.uncertainty = a.confidence === "sure" ? 0 : s.uncertainty + 1;
        if (spaced && q.difficulty >= s.level) {
          if (!s.evidence.includes(q.id)) s.evidence.push(q.id);
          s.freshRight++;
          s.missEvidence = [];
          // Confidence guides review selection, never vetoes demonstrated success.
          if (s.evidence.length >= 2) {
            s.level = Math.min(3, s.level + 1);
            s.evidence = [];
          }
        }
      }
    }
    s.last = index;
    seen.set(q.id, { index, at });
  });
  for (const s of Object.values(signals))
    s.label =
      s.answered === 0
        ? "Not practiced"
        : s.lastMiss === s.last
          ? "Needs another check"
          : s.uncertainty > 0
            ? "Check your reasoning"
            : s.freshRight >= 3
              ? "Repeated success"
              : "Building evidence";
  return signals;
}
export function chooseNext(state: State, bank: Bank, rng: () => number = random): Current | null {
  bank = selectionBank(state, bank);
  const session = state.history.slice(state.session.start);
  if (session.length >= state.session.limit) return null;
  const asked = new Set(session.map((a) => a.id));
  const seen = new Set(state.history.map((a) => a.id));
  let pool = bank.questions.filter((q) => !asked.has(q.id));
  if (!pool.length) return null;
  if (state.session.mode === "exam") {
    pool = pool.filter(
      (q) =>
        q.difficulty >= 2 &&
        session.filter(
          (a) =>
            bank.questions.find((x) => x.id === a.id)!.topic === q.topic &&
            bank.questions.find((x) => x.id === a.id)!.kind === q.kind,
        ).length <
          (q.kind === "SATA"
            ? bank.topics[q.topic].sata
            : bank.topics[q.topic].count - bank.topics[q.topic].sata),
    );
    const candidates = pool.map((q) => {
      const practiced = new Set(
        session.flatMap((a) => {
          const x = bank.questions.find((x) => x.id === a.id)!;
          return x.topic === q.topic ? x.skills : [];
        }),
      );
      return {
        q,
        score:
          q.skills.filter((x) => bank.topics[q.topic].skills.includes(x) && !practiced.has(x))
            .length *
            10000 +
          (seen.has(q.id) ? 0 : 100) +
          (q.difficulty === 3 ? 1 : 0),
      };
    });
    if (!candidates.length) throw Error("The bank cannot complete the exam blueprint.");
    const best = Math.max(...candidates.map((x) => x.score)),
      choices = candidates.filter((x) => x.score === best),
      q = choices[Math.floor(rng() * choices.length)].q;
    return {
      id: q.id,
      questionRevision: q.revision,
      order: shuffle(
        q.options.map((o) => o.id),
        rng,
      ),
      selected: [],
      confidence: null,
      submitted: false,
      reason:
        "Blueprint exam: fixed topic and format quotas; difficulty does not adapt during this session.",
    };
  }
  const remaining = state.session.limit - session.length;
  const sataNeeded = Math.max(
    0,
    3 - session.filter((a) => bank.questions.find((q) => q.id === a.id)!.kind === "SATA").length,
  );
  const mcNeeded = Math.max(
    0,
    6 - session.filter((a) => bank.questions.find((q) => q.id === a.id)!.kind === "MC").length,
  );
  if (remaining <= sataNeeded) {
    const items = pool.filter((q) => q.kind === "SATA");
    if (items.length) pool = items;
  } else if (remaining <= mcNeeded) {
    const items = pool.filter((q) => q.kind === "MC");
    if (items.length) pool = items;
  }
  const topicsSeen = new Set(session.map((a) => bank.questions.find((q) => q.id === a.id)!.topic));
  const missingTopics = Object.keys(bank.topics).filter((t) => !topicsSeen.has(t));
  if (remaining <= missingTopics.length) pool = pool.filter((q) => missingTopics.includes(q.topic));
  const signals = areaSignals(state, bank);
  const count = state.history.length;
  // Keep two intervening questions between cases from the same area whenever possible.
  const spaced = pool.filter((q) => signals[q.area].last < 0 || count - signals[q.area].last >= 3);
  if (spaced.length) pool = spaced;
  const sessionCount = (area: string) =>
    session.filter((a) => bank.questions.find((q) => q.id === a.id)!.area === area).length;
  const scored = pool.map((q) => {
    const s = signals[q.area],
      coverage = sessionCount(q.area);
    const due = s.lastMiss >= 0 && count - s.last >= 3 && s.label === "Needs another check";
    const score =
      (!topicsSeen.has(q.topic) ? 6 : 0) +
      (coverage === 0 ? 2 : 0) +
      (due ? 4 : 0) +
      (s.uncertainty > 0 && s.freshRight < 2 ? 1 : 0) -
      coverage * 0.9 -
      (seen.has(q.id) ? 20 : 0) -
      Math.abs(q.difficulty - s.level) * 1.6;
    return { q, score };
  });
  const max = Math.max(...scored.map((x) => x.score));
  const choices = scored.filter((x) => Math.abs(x.score - max) < 0.001);
  const q = choices[Math.floor(rng() * choices.length)].q;
  const s = signals[q.area];
  const reason = seen.has(q.id)
    ? "Previously seen case. A later-day response can support retention evidence, but it is never labeled fresh."
    : s.lastMiss >= 0 && s.label === "Needs another check"
      ? "A different case after a missed decision, with other questions in between."
      : Math.abs(q.difficulty - s.level) > 0
        ? "The closest available fresh case for your current practice level."
        : s.last >= 0
          ? "A fresh case selected from your recent practice pattern."
          : "An initial intermediate check to sample this practice area.";
  return {
    id: q.id,
    questionRevision: q.revision,
    order: shuffle(
      q.options.map((o) => o.id),
      rng,
    ),
    selected: [],
    confidence: null,
    submitted: false,
    reason,
  };
}
export function initialState(bank: Bank, rng: () => number = random, mode: Mode = "study"): State {
  const s: State = {
    schema: 3,
    bankVersion: bank.version,
    history: [],
    session: {
      start: 0,
      limit: mode === "exam" ? 80 : 15,
      mode,
      done: false,
      current: null,
      bankVersion: bank.version,
    },
    revision: 0,
  };
  s.session.current = chooseNext(s, bank, rng);
  return s;
}
export function submit(
  state: State,
  bank: Bank,
  selected: string[],
  confidence: Confidence,
  at = new Date().toISOString(),
): State {
  const c = state.session.current;
  if (!c || c.submitted || state.session.done)
    throw Error("This question has already been submitted or the session is complete.");
  const q = questionFor(c, bank);
  if (!["sure", "unsure", "guess"].includes(confidence)) throw Error("Choose a confidence level.");
  if (
    selected.length < 1 ||
    (q.kind === "MC" && selected.length !== 1) ||
    new Set(selected).size !== selected.length ||
    selected.some((id) => !q.options.some((o) => o.id === id))
  )
    throw Error("Choose a valid answer.");
  if (!Number.isFinite(Date.parse(at))) throw Error("Invalid response time.");
  const a: Attempt = {
    id: c.id,
    questionRevision: q.revision,
    order: [...c.order],
    selected: [...selected],
    confidence,
    at,
    fresh: !state.history.some((a) => a.id === c.id),
  };
  return {
    ...state,
    revision: state.revision + 1,
    history: [...state.history, a],
    session: {
      ...state.session,
      current: { ...c, selected: [...selected], confidence, submitted: true },
    },
  };
}
export function next(state: State, bank: Bank, rng: () => number = random): State {
  if (!state.session.current?.submitted || state.session.done)
    throw Error("Submit the current question before continuing.");
  const current = chooseNext(state, bank, rng);
  return {
    ...state,
    revision: state.revision + 1,
    session: { ...state.session, current, done: current === null },
  };
}
export function newSession(
  state: State,
  bank: Bank,
  rng: () => number = random,
  mode: Mode = state.session.mode,
): State {
  if (!state.session.done) throw Error("Finish the current session first.");
  const s: State = {
    ...state,
    bankVersion: bank.version,
    revision: state.revision + 1,
    session: {
      start: state.history.length,
      limit: mode === "exam" ? 80 : 15,
      mode,
      done: false,
      current: null,
      bankVersion: bank.version,
    },
  };
  return { ...s, session: { ...s.session, current: chooseNext(s, bank, rng) } };
}
export function validateState(raw: unknown, bank: Bank): State {
  if (!raw || typeof raw !== "object") throw Error("This is not a quiz progress file.");
  const candidate = raw as State & { schema: number };
  const legacy = (candidate.schema as number) === 2 && candidate.bankVersion === bank.legacyVersion;
  if (!legacy && (candidate.schema !== 3 || candidate.bankVersion !== bank.version))
    throw Error(
      "This progress file belongs to an unsupported quiz version. Keep the backup with its original HTML.",
    );
  const migrate = (a: Attempt | Current) => ({
    ...a,
    questionRevision: bank.archive?.find((q) => q.id === a?.id)?.revision,
  });
  const s: State = legacy
    ? {
        ...candidate,
        schema: 3,
        bankVersion: bank.version,
        history: Array.isArray(candidate.history)
          ? (candidate.history.map(migrate) as Attempt[])
          : candidate.history,
        session: {
          ...candidate.session,
          bankVersion: bank.legacyVersion,
          current: candidate.session?.current
            ? (migrate(candidate.session.current) as Current)
            : null,
        },
      }
    : candidate;
  if (
    !Array.isArray(s.history) ||
    s.history.length > 10000 ||
    !s.session ||
    !["study", "exam"].includes(s.session.mode) ||
    s.session.limit !== (s.session.mode === "exam" ? 80 : 15) ||
    !Number.isInteger(s.session.start) ||
    s.session.start < 0 ||
    s.session.start > s.history.length ||
    s.history.length - s.session.start > s.session.limit ||
    typeof s.session.done !== "boolean"
  )
    throw Error("The progress file has invalid session data.");
  const used = new Set<string>();
  if (s.session.bankVersion !== bank.version && s.session.bankVersion !== bank.legacyVersion)
    throw Error("Unsupported session version.");
  function validChoice(
    a: { id: string; questionRevision?: string; order: string[]; selected: string[] },
    allowEmpty = false,
  ) {
    if (typeof a.questionRevision !== "string") throw Error("Missing question revision.");
    const q = questionFor(a, bank);
    const ids = q.options.map((o) => o.id);
    if (
      !Array.isArray(a.order) ||
      a.order.length !== ids.length ||
      new Set(a.order).size !== ids.length ||
      a.order.some((id) => !ids.includes(id))
    )
      throw Error("The saved answer order is invalid.");
    if (
      !Array.isArray(a.selected) ||
      (!allowEmpty && !a.selected.length) ||
      new Set(a.selected).size !== a.selected.length ||
      a.selected.some((id) => !ids.includes(id)) ||
      (q.kind === "MC" && a.selected.length > 1)
    )
      throw Error("The saved selections are invalid.");
  }
  const history = s.history.map((a) => {
    if (!a || typeof a !== "object") throw Error("Invalid history.");
    validChoice(a);
    if (
      !["sure", "unsure", "guess"].includes(a.confidence) ||
      typeof a.at !== "string" ||
      !Number.isFinite(Date.parse(a.at))
    )
      throw Error("Invalid response record.");
    const clean = {
      id: a.id,
      questionRevision: a.questionRevision,
      order: [...a.order],
      selected: [...a.selected],
      confidence: a.confidence,
      at: a.at,
      fresh: !used.has(a.id),
    };
    used.add(a.id);
    return clean;
  });
  if (
    new Set(history.slice(s.session.start).map((a) => a.id)).size !==
    history.length - s.session.start
  )
    throw Error("Duplicate question in one session.");
  let current: Current | null = null;
  if (s.session.current) {
    const c = s.session.current;
    validChoice(c, true);
    if (
      typeof c.submitted !== "boolean" ||
      (c.confidence !== null && !["sure", "unsure", "guess"].includes(c.confidence))
    )
      throw Error("Invalid current question.");
    if (c.submitted) {
      const a = history.at(-1);
      if (
        !a ||
        history.length <= s.session.start ||
        a.id !== c.id ||
        a.questionRevision !== c.questionRevision ||
        JSON.stringify(a.order) !== JSON.stringify(c.order) ||
        JSON.stringify([...a.selected].sort()) !== JSON.stringify([...c.selected].sort()) ||
        a.confidence !== c.confidence
      )
        throw Error("Current feedback does not match the submitted response.");
    } else if (
      history.slice(s.session.start).some((a) => a.id === c.id) ||
      history.length - s.session.start >= s.session.limit
    )
      throw Error("Current question was already answered or exceeds the session limit.");
    current = {
      id: c.id,
      questionRevision: c.questionRevision,
      order: [...c.order],
      selected: [...c.selected],
      confidence: c.confidence,
      submitted: c.submitted,
      reason: typeof c.reason === "string" ? c.reason.slice(0, 250) : "Resumed question.",
    };
  }
  if (s.session.done ? current !== null : current === null)
    throw Error("Invalid session completion state.");
  if (s.session.done && history.length - s.session.start !== s.session.limit)
    throw Error("Incomplete session marked complete.");
  if (s.session.mode === "exam") {
    const items = history.slice(s.session.start).map((a) => questionFor(a, bank));
    if (current && !current.submitted) items.push(questionFor(current, bank));
    for (const [topic, quota] of Object.entries(bank.topics))
      for (const kind of ["MC", "SATA"]) {
        const n = items.filter((q) => q.topic === topic && q.kind === kind).length,
          max = kind === "SATA" ? quota.sata : quota.count - quota.sata;
        if (n > max || (s.session.done && n !== max))
          throw Error("The saved exam does not match the blueprint.");
      }
    if (items.some((q) => q.difficulty < 2))
      throw Error("The saved exam contains a study-only foundational item.");
  }
  return {
    schema: 3,
    bankVersion: bank.version,
    history,
    session: {
      start: s.session.start,
      limit: s.session.limit,
      mode: s.session.mode,
      done: s.session.done,
      current,
      bankVersion: s.session.bankVersion,
    },
    revision: Number.isSafeInteger(s.revision) ? s.revision : 0,
  };
}
