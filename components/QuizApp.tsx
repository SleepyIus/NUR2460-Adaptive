"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { BookOpen, Download, Upload, ArrowRight, Check, X, ChevronRight } from "lucide-react";
import source from "@/data/bank.json";
import {
  areaSignals,
  grade,
  initialState,
  LEGACY_STORAGE_KEY,
  LEVELS,
  newSession,
  next,
  questionFor,
  skillSignals,
  STORAGE_KEY,
  submit,
  validateState,
} from "@/lib/quiz-engine";
import type { Attempt, Bank, Confidence, Current, Mode, Question, State } from "@/lib/quiz-engine";

const bank = source as Bank;
const confidenceLabels = { sure: "Confident", unsure: "Unsure", guess: "Guessing" };
const actionClass = "h-auto min-h-11 px-4 py-2 text-base whitespace-normal";

function Sources({ q }: { q: Question }) {
  return (
    <details className="source-details">
      <summary>
        <BookOpen size={16} aria-hidden="true" /> Sources for this question
      </summary>
      <ul>
        {q.refs.map((r, i) => (
          <li key={i}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.label}
              </a>
            ) : (
              r.label
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
function Rationale({
  q,
  response,
  reason,
}: {
  q: Question;
  response: Attempt | Current;
  reason?: string;
}) {
  const result = grade(q, response.selected);
  const labels = (ids: string[]) =>
    response.order
      .filter((id) => ids.includes(id))
      .map((id) => String.fromCharCode(65 + response.order.indexOf(id)))
      .join(", ");
  return (
    <section className="feedback">
      {q.revision?.startsWith("v2-") && (
        <p className="notice">
          Archived version 2 question: this review preserves your original wording and score.
          Current practice uses revised difficulty ratings and source notes.
          {q.id === "q47" &&
            " This older emergency-contraception item was ambiguous about the product. Its current revision explicitly specifies levonorgestrel; ulipristal has different hormonal-restart instructions."}
        </p>
      )}
      <div className="feedback-title">
        <span
          className={`result-icon ${result.exact ? "is-correct" : "is-review"}`}
          aria-hidden="true"
        >
          {result.exact ? <Check size={20} /> : <X size={20} />}
        </span>
        <h3>{result.label}</h3>
      </div>
      <p className="answer-line">
        Your answer: <strong>{labels(response.selected)}</strong>
        <span>
          Correct: <strong>{labels(q.options.filter((o) => o.correct).map((o) => o.id))}</strong>
        </span>
      </p>
      {!result.exact && q.kind === "SATA" && (
        <p className="small">
          {result.missed.length > 0 ? `Missed correct choice(s): ${labels(result.missed)}. ` : ""}
          {result.extra.length > 0 ? `Incorrect choice(s) selected: ${labels(result.extra)}. ` : ""}
          This item earns 0 of 1 study points; partial feedback is for learning.
        </p>
      )}
      <div className="reasoning">
        <h4>The key clue</h4>
        <p>{q.clue}</p>
        <h4>Why this is the best decision</h4>
        <p>{q.rationale}</p>
      </div>
      <details className="option-details">
        <summary>Explain every option</summary>
        <div>
          {response.order.map((id, i) => {
            const o = q.options.find((o) => o.id === id)!;
            const picked = response.selected.includes(id);
            return (
              <div className="option-rationale" key={id}>
                <p className="explanation-label">
                  <strong>
                    {String.fromCharCode(65 + i)}.{" "}
                    {o.correct ? "Correct choice" : "Not a correct choice"}
                  </strong>
                  {picked && <span>You selected this</span>}
                </p>
                <p>{o.text}</p>
                <p className="muted">{o.reason}</p>
              </div>
            );
          })}
        </div>
      </details>
      <Sources q={q} />
      <details className="source-details">
        <summary>Practice details</summary>
        <p>
          {bank.areas[q.area]} · Estimated difficulty: {LEVELS[q.difficulty]}
        </p>
        <p className="small">
          Item {q.id} · Revision {q.revision} · Skills: {q.skills.join(", ")}.
        </p>
        {q.objective && <p className="small">{q.objective}</p>}
        {q.difficultyReason && <p className="small">Why this rating: {q.difficultyReason}</p>}
        {reason && <p className="small">{reason}</p>}
        <p className="small">
          {q.reviewStatus ??
            "Archived version 2 item; original wording, rating, and answer key preserved."}{" "}
          Difficulty is not calibrated, and this is not a pass prediction.
        </p>
      </details>
    </section>
  );
}

export default function QuizApp() {
  const [state, setState] = useState<State | null>(null);
  const [saveStatus, setSaveStatus] = useState("Opening saved progress…");
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [notice, setNotice] = useState("");
  const [pendingImport, setPendingImport] = useState<State | null>(null);
  const [replaceCorrupt, setReplaceCorrupt] = useState(false);
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<State | null>(null);
  const loadedRef = useRef(false);
  const focusNext = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const current = localStorage.getItem(STORAGE_KEY),
        legacy = current ? null : localStorage.getItem(LEGACY_STORAGE_KEY),
        raw = current ?? legacy;
      setState(raw ? validateState(JSON.parse(raw), bank) : initialState(bank));
      setSaveStatus(raw ? "Progress restored on this browser" : "Saves on this browser");
      if (legacy)
        setNotice(
          "Your version 2 progress was upgraded. The original save is retained. An unfinished question keeps its original order and answer key; an unfinished exam completes with its original bank.",
        );
    } catch {
      setState(initialState(bank));
      setStorageBlocked(true);
      setSaveStatus("Auto-save unavailable");
      setNotice(
        "Existing saved data could not be loaded, or this browser blocks storage. Nothing has been overwritten. You can keep practicing and export a backup.",
      );
    }
  }, []);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setStorageBlocked(true);
        setSaveStatus("Saving paused — another tab changed progress");
        setNotice(
          "Another tab changed this quiz save. To avoid overwriting it, saving here is paused. Export this session if needed, then reload to use the other tab’s progress.",
        );
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  useEffect(() => {
    stateRef.current = state;
    if (!state || storageBlocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveStatus("Saved on this browser");
    } catch {
      setSaveStatus("Auto-save unavailable — export before closing");
    }
  }, [state, storageBlocked]);
  useEffect(() => {
    if (focusNext.current && state) {
      focusNext.current = false;
      requestAnimationFrame(() => {
        if (state.session.current?.submitted) {
          feedbackRef.current?.focus({ preventScroll: true });
          feedbackRef.current?.scrollIntoView({ block: "start" });
        } else {
          headingRef.current?.focus({ preventScroll: true });
          headingRef.current?.scrollIntoView({ block: "start" });
        }
      });
    }
  }, [state]);

  function commitAnswer(selected?: string[], confidence?: Confidence) {
    const current = stateRef.current;
    if (!current?.session.current) throw Error("No active question.");
    const c = current.session.current;
    const conf = confidence ?? c.confidence;
    if (!conf) throw Error("Choose how confident you feel before submitting.");
    const updated = submit(current, bank, selected ?? c.selected, conf);
    stateRef.current = updated;
    setState(updated);
    focusNext.current = true;
    setNotice("");
    return updated;
  }
  function advance() {
    const current = stateRef.current;
    if (!current) throw Error("No active session.");
    const updated = next(current, bank);
    stateRef.current = updated;
    setState(updated);
    focusNext.current = true;
    return updated;
  }
  // Optional WebMCP surface. No answer key is returned before submission.
  useEffect(() => {
    type ModelContext = {
      registerTool: (tool: unknown, options: { signal: AbortSignal }) => unknown;
    };
    const ctx = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => {
      try {
        Promise.resolve(ctx.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
      } catch {
        /* Ordinary quiz remains available. */
      }
    };
    register({
      name: "get_quiz_question",
      title: "Read current quiz question",
      description:
        "Read the active nursing practice question and response state without revealing the answer key.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        const s = stateRef.current;
        if (!s) return { status: "loading" };
        const c = s.session.current;
        if (!c) return { status: "session_complete", answered: s.history.length - s.session.start };
        const q = questionFor(c, bank);
        return {
          id: q.id,
          stem: q.stem,
          format: q.kind,
          options: c.order.map((id, i) => ({
            id,
            label: String.fromCharCode(65 + i),
            text: q.options.find((o) => o.id === id)!.text,
          })),
          selected: c.selected,
          submitted: c.submitted,
        };
      },
    });
    register({
      name: "submit_quiz_answer",
      title: "Submit the learner’s answer",
      description:
        "Submit only choices and confidence explicitly supplied by the learner. Study mode reveals a rationale; exam mode records the response without revealing correctness.",
      inputSchema: {
        type: "object",
        properties: {
          questionId: { type: "string" },
          selectedIds: { type: "array", items: { type: "string" }, minItems: 1, uniqueItems: true },
          confidence: { type: "string", enum: ["sure", "unsure", "guess"] },
        },
        required: ["questionId", "selectedIds", "confidence"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: unknown) => {
        const x = input as { questionId: string; selectedIds: string[]; confidence: Confidence };
        if (
          !x ||
          x.questionId !== stateRef.current?.session.current?.id ||
          !Array.isArray(x.selectedIds)
        )
          throw Error("Input does not match the active question.");
        const s = commitAnswer(x.selectedIds, x.confidence);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const q = questionFor(s.session.current!, bank);
        return s.session.mode === "exam"
          ? { status: "recorded", submitted: true }
          : {
              status: grade(q, x.selectedIds).label,
              rationale: q.rationale,
              submitted: s.session.current?.submitted,
            };
      },
    });
    register({
      name: "continue_quiz",
      title: "Continue after reviewing the rationale",
      description:
        "Advance from submitted feedback to the next practice question, or finish the session.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async () => {
        const s = advance();
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        return {
          status: s.session.done ? "session_complete" : "next_question",
          questionId: s.session.current?.id ?? null,
        };
      },
    });
    return () => lifecycle.abort();
    // Registry functions use stateRef so they remain current without re-registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function editCurrent(edit: Partial<Current>) {
    setState((s) =>
      s && !s.session.current?.submitted && s.session.current
        ? {
            ...s,
            revision: s.revision + 1,
            session: { ...s.session, current: { ...s.session.current, ...edit } },
          }
        : s,
    );
  }
  function download() {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NUR2460-study-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Progress backup exported. Keep it with your HTML quiz to restore later.");
  }
  async function readImport(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw Error("Choose a quiz backup smaller than 8 MB.");
      const imported = validateState(JSON.parse(await file.text()), bank);
      setPendingImport(imported);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read this progress file.");
    } finally {
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }
  const c = state?.session.current;
  const q = c ? questionFor(c, bank) : null;
  const signals = state ? areaSignals(state, bank) : null;
  const sessionAttempts = state ? state.history.slice(state.session.start) : [];
  const sessionRight = sessionAttempts.filter(
    (a) => grade(questionFor(a, bank), a.selected).exact,
  ).length;
  const result = c?.submitted && q ? grade(q, c.selected) : null;
  const skills = state ? skillSignals(state, bank) : {};
  const limit = state?.session.limit ?? 15,
    exam = state?.session.mode === "exam",
    showSignals = !exam || state?.session.done;
  function beginSession(mode: Mode) {
    if (!state) return;
    const s = newSession(
      { ...state, session: { ...state.session, done: true } },
      bank,
      undefined,
      mode,
    );
    stateRef.current = s;
    setState(s);
    focusNext.current = true;
    setPendingMode(null);
  }
  return (
    <div className="quiz-shell">
      <a href="#quiz-main" className="skip-link">
        Skip to question
      </a>
      <header className="masthead">
        <span className="wordmark">
          NUR<span>2460</span>
        </span>
        <span>Exam 2 / Adaptive study</span>
        <div className="header-actions">
          <Button variant="ghost" className={actionClass} onClick={download} disabled={!state}>
            <Download aria-hidden="true" /> Export progress
          </Button>
          <Button
            variant="ghost"
            className={actionClass}
            onClick={() => uploadRef.current?.click()}
          >
            <Upload aria-hidden="true" /> Restore
          </Button>
          <input
            ref={uploadRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Restore quiz progress"
            onChange={(e) => void readImport(e.target.files?.[0])}
          />
        </div>
      </header>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <Button
            variant="ghost"
            className={actionClass}
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            Dismiss
          </Button>
        </div>
      )}
      <main id="quiz-main" className="workspace">
        <aside className="study-rail">
          <p className="eyebrow">{exam ? "Blueprint exam" : "Adaptive study"}</p>
          <h1>
            Exam 2<br />
            practice
          </h1>
          <p className="muted rail-intro">
            {bank.questions.length} prepared scenarios.
            <br />
            All seven blueprint topics.
          </p>
          <div className="mode-actions">
            <Button
              variant={!exam ? "default" : "outline"}
              className={actionClass}
              onClick={() => setPendingMode("study")}
            >
              15-question study
            </Button>
            <Button
              variant={exam ? "default" : "outline"}
              className={actionClass}
              onClick={() => setPendingMode("exam")}
            >
              80-question exam
            </Button>
          </div>
          <Progress
            value={(sessionAttempts.length / limit) * 100}
            aria-label="Questions answered in this session"
          />
          <p className="session-count">
            {sessionAttempts.length} of {limit} answered
          </p>
          <p className="save-status" role="status">
            {saveStatus}
          </p>
          <details className="rail-tools">
            <summary>Progress & quiz info</summary>
            <details className="rail-details">
              <summary>How adaptation works</summary>
              <p>
                Each area begins at intermediate level. Two spaced successes on different cases at
                or above the current target can raise it. Easier answers alone cannot. Confidence
                guides follow-up but does not block advancement.
              </p>
              <p>
                One miss requests another check. Two different, spaced misses at or below the target
                can lower it. The quiz separates related cases with other questions when possible.
              </p>
              <p>
                Same-day repeats do not advance a level. A repeat after at least 24 hours can
                support retention evidence, but it is never counted as a fresh question. Two
                distinct cases are still required.
              </p>
              <p>
                These are practice signals, not mastery certification. The selector uses the closest
                available case when a level has limited coverage.
              </p>
            </details>
            <details className="rail-details">
              <summary>Your practice areas</summary>
              {showSignals ? (
                signals &&
                Object.entries(signals).map(([key, s]) => (
                  <div className="area-signal" key={key}>
                    <span>{bank.areas[key]}</span>
                    <strong>{s.label}</strong>
                    <span>
                      {s.correct}/{s.answered} fully correct · target: {LEVELS[s.level]}
                    </span>
                    {s.missedChoices + s.extraChoices > 0 && (
                      <span>
                        SATA: {s.missedChoices} missed correct choices · {s.extraChoices} extra
                        incorrect choices
                      </span>
                    )}
                    {s.laterReviews > 0 && <span>{s.laterReviews} later-day review attempts</span>}
                  </div>
                ))
              ) : (
                <p>Results are hidden until this exam is complete.</p>
              )}
            </details>
            <details className="rail-details">
              <summary>Your nursing skills</summary>
              {!showSignals ? (
                <p>Results are hidden until this exam is complete.</p>
              ) : Object.keys(skills).length ? (
                Object.entries(skills).map(([name, s]) => (
                  <div className="area-signal" key={name}>
                    <span>{name}</span>
                    <strong>
                      {s.correct}/{s.answered} fully correct
                    </strong>
                  </div>
                ))
              ) : (
                <p>Skill totals appear after your first response.</p>
              )}
              <p>
                Questions can practice more than one skill, so these counts overlap. Totals include
                review attempts.
              </p>
            </details>
            <details className="rail-details">
              <summary>Blueprint & sources</summary>
              <p>Every 80-question exam uses these exact topic counts.</p>
              <ul>
                {Object.entries(bank.topics).map(([id, t]) => (
                  <li key={id}>
                    {t.label}: {t.count} exam questions /{" "}
                    {bank.questions.filter((q) => q.topic === id).length} in bank
                  </li>
                ))}
              </ul>
              <p>
                Instructor notes define the course emphasis. Lecture locators and selected clinical
                updates accompany the rationales. Supplemental reading is described in the
                repository’s Sources document. Image-only slide details have not all been verified.
              </p>
              <p>
                {bank.questions.length} original educational scenarios, including 12 new version 3
                cases. These are not official ATI or NCLEX items. Independent nursing-educator
                review is still needed.
              </p>
              <p>
                Exam mode uses intermediate and advanced items with 56 single-answer and 24 SATA
                questions. This format mix is a practice design choice, not a supplied instructor
                requirement. It does not adapt or show results during the exam.
              </p>
            </details>
            <details className="rail-details">
              <summary>Saving, scoring & randomization</summary>
              <p>
                Progress stays in this browser on this device. Reopen this website, or the same
                offline HTML file, in the same browser. Clearing browser data or moving an offline
                file can disconnect the save. Export backups regularly. Nothing is sent to a class
                results database.
              </p>
              <p>
                Every new question attempt shuffles its options. A resumed or submitted attempt
                keeps its exact order. Letters, answer checking, and explanations stay matched. A
                repeated order or short run of the same correct letter can occur by chance.
              </p>
              <p>
                One practice point requires the whole answer to be correct, including every required
                SATA choice and no extras. Partial feedback identifies missed and extra choices;
                this is not official NCLEX scoring.
              </p>
              <p>
                Versioned answer keys preserve older attempts. Older content revisions do not supply
                evidence for advancement in a revised area. An unfinished version 2 exam uses its
                original bank until completion.
              </p>
              <p>
                Educational practice only: no official affiliation, validated difficulty, or pass
                prediction. Follow patient-specific orders and institutional protocols in clinical
                care.
              </p>
              {storageBlocked && (
                <Button
                  variant="outline"
                  className={actionClass}
                  onClick={() => setReplaceCorrupt(true)}
                >
                  Enable saving for this session
                </Button>
              )}
            </details>
          </details>
        </aside>
        <section className="question-sheet">
          {!state && <p role="status">Opening your quiz…</p>}
          {state?.session.done && (
            <>
              <p className="eyebrow">Session complete</p>
              <h2 ref={headingRef} tabIndex={-1} className="summary-heading">
                Your review starts here.
              </h2>
              <p className="score">
                <strong>{sessionRight}</strong>
                <span>/ {limit} fully correct</span>
              </p>
              <p>
                {sessionAttempts.filter((a) => a.fresh).length} fresh questions in this session. Use
                the missed decisions to choose what to revisit; this score is not a pass prediction.
              </p>
              <div className="summary-actions">
                <Button className={actionClass} onClick={() => beginSession("study")}>
                  Start 15-question study <ArrowRight aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  className={actionClass}
                  onClick={() => beginSession("exam")}
                >
                  Start 80-question exam
                </Button>
                <Button variant="outline" className={actionClass} onClick={download}>
                  <Download aria-hidden="true" /> Export progress
                </Button>
              </div>
              {new Set(state.history.map((a) => a.id)).size === bank.questions.length && (
                <p className="notice-inline">
                  You have seen all {bank.questions.length} items. Further encounters are review,
                  not fresh-case evidence.
                </p>
              )}
              <details className="review-item">
                <summary>Results by blueprint topic</summary>
                {Object.entries(bank.topics).map(([topic, t]) => {
                  const a = sessionAttempts.filter((a) => questionFor(a, bank).topic === topic);
                  return (
                    <p key={topic}>
                      {t.label}:{" "}
                      {a.filter((x) => grade(questionFor(x, bank), x.selected).exact).length}/
                      {a.length} fully correct
                    </p>
                  );
                })}
              </details>
              <h3 className="review-title">Review your answers</h3>
              {sessionAttempts.map((a, i) => {
                const item = questionFor(a, bank);
                const g = grade(item, a.selected);
                return (
                  <details className="review-item" key={a.id}>
                    <summary>
                      <span>
                        {i + 1}. {bank.areas[item.area]}
                      </span>
                      <span>{g.label}</span>
                    </summary>
                    <p className="review-stem">{item.stem}</p>
                    <Rationale q={item} response={a} />
                  </details>
                );
              })}
            </>
          )}
          {q && c && state && !state.session.done && (
            <>
              <div className="question-top">
                <span className="eyebrow">
                  Question {String(sessionAttempts.length + (c.submitted ? 0 : 1)).padStart(2, "0")}
                </span>
                <span className="format-label">
                  {q.kind === "SATA" ? "Select all that apply" : "Single best answer"}
                </span>
              </div>
              <h2 ref={headingRef} tabIndex={-1} id="question-heading" className="stem">
                {q.stem}
              </h2>
              {q.kind === "MC" ? (
                <RadioGroup
                  value={c.selected[0] ?? ""}
                  onValueChange={(value) => editCurrent({ selected: [String(value)] })}
                  disabled={c.submitted}
                  aria-labelledby="question-heading"
                >
                  {c.order.map((id, i) => {
                    const o = q.options.find((o) => o.id === id)!;
                    return (
                      <label
                        className="answer-option"
                        key={id}
                        data-selected={c.selected.includes(id)}
                        data-locked={c.submitted}
                      >
                        <RadioGroupItem value={id} />
                        <span className="letter">{String.fromCharCode(65 + i)}</span>
                        <span>{o.text}</span>
                      </label>
                    );
                  })}
                </RadioGroup>
              ) : (
                <div role="group" aria-labelledby="question-heading" className="sata-options">
                  {c.order.map((id, i) => {
                    const o = q.options.find((o) => o.id === id)!;
                    return (
                      <label
                        className="answer-option"
                        key={id}
                        data-selected={c.selected.includes(id)}
                        data-locked={c.submitted}
                      >
                        <Checkbox
                          checked={c.selected.includes(id)}
                          onCheckedChange={(checked) =>
                            editCurrent({
                              selected: checked
                                ? [...c.selected, id]
                                : c.selected.filter((x) => x !== id),
                            })
                          }
                          disabled={c.submitted}
                        />
                        <span className="letter">{String.fromCharCode(65 + i)}</span>
                        <span>{o.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {!c.submitted ? (
                <>
                  <fieldset className="confidence">
                    <legend>How confident are you?</legend>
                    <RadioGroup
                      value={c.confidence ?? ""}
                      onValueChange={(value) => editCurrent({ confidence: value as Confidence })}
                      className="confidence-options"
                      aria-label="Answer confidence"
                    >
                      {(["sure", "unsure", "guess"] as const).map((value) => (
                        <label
                          key={value}
                          className="confidence-choice"
                          data-selected={c.confidence === value}
                        >
                          <RadioGroupItem value={value} />
                          {confidenceLabels[value]}
                        </label>
                      ))}
                    </RadioGroup>
                    <p className="small muted">
                      Confidence guides follow-up practice. It does not change your score.
                    </p>
                  </fieldset>
                  <Button
                    className={`primary-action ${actionClass}`}
                    disabled={!c.selected.length || !c.confidence}
                    onClick={() => {
                      try {
                        commitAnswer();
                      } catch (e) {
                        setNotice((e as Error).message);
                      }
                    }}
                  >
                    Submit answer <ArrowRight aria-hidden="true" />
                  </Button>
                  <p className="small muted submit-note">
                    Your choices lock when you submit.{" "}
                    {exam
                      ? "Answers and rationales appear after all 80 questions."
                      : "The rationale appears next."}
                  </p>
                </>
              ) : (
                <div
                  ref={feedbackRef}
                  tabIndex={-1}
                  role="region"
                  aria-label="Answer feedback"
                  className="feedback-wrap"
                >
                  {exam ? (
                    <p role="status">
                      Answer recorded. Correctness and rationales remain hidden until the exam is
                      complete.
                    </p>
                  ) : (
                    <>
                      <div className="sr-only" role="status">
                        {result?.label}. Your answer has been recorded. The rationale is available
                        below.
                      </div>
                      <Rationale q={q} response={c} reason={c.reason} />
                      <div className="learning-note">
                        <strong>Next in your practice</strong>
                        <p>
                          {!result?.exact
                            ? "This area needs another check. A single miss does not automatically lower its level; we look for a pattern across different, spaced cases."
                            : c.confidence !== "sure"
                              ? "This correct answer can still support advancement at the appropriate level. Your confidence response helps us choose follow-up practice."
                              : "Advancement uses repeated success at or above the current target on different, spaced cases."}
                        </p>
                      </div>
                    </>
                  )}
                  <Button
                    className={`primary-action ${actionClass}`}
                    onClick={() => {
                      try {
                        advance();
                      } catch (e) {
                        setNotice((e as Error).message);
                      }
                    }}
                  >
                    {sessionAttempts.length >= limit ? "Finish session" : "Continue"}{" "}
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <footer className="quiz-footer">
        NUR2460 · Exam 2 · {bank.questions.length}-question bank v3 · Author check: {bank.reviewed}{" "}
        · Independent clinical review pending
      </footer>
      <AlertDialog
        open={pendingMode !== null}
        onOpenChange={(open) => {
          if (!open) setPendingMode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Start a{" "}
              {pendingMode === "exam" ? "new 80-question exam" : "new 15-question study session"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMode === "exam"
                ? "Exact blueprint counts. Answers and rationales stay hidden until the end."
                : "Adaptive practice with immediate rationales."}{" "}
              This ends the current session. Submitted responses remain in practice history; any
              unsubmitted selection is discarded. Export first if you want to resume the current
              session later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={actionClass}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={actionClass}
              onClick={() => {
                if (pendingMode) beginSession(pendingMode);
              }}
            >
              Start session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this progress backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the quiz progress saved in this browser. Export your current progress
              first if you want to keep it. The backup contains {pendingImport?.history.length ?? 0}{" "}
              submitted responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={actionClass}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={actionClass}
              onClick={() => {
                if (pendingImport) {
                  stateRef.current = pendingImport;
                  setState(pendingImport);
                  setStorageBlocked(false);
                  setPendingImport(null);
                  setNotice("Progress restored from your backup.");
                  focusNext.current = true;
                }
              }}
            >
              Restore backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={replaceCorrupt} onOpenChange={setReplaceCorrupt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the previous browser save?</AlertDialogTitle>
            <AlertDialogDescription>
              This will attempt to save your current session over any unreadable older save. Keep a
              backup first if you need that older data. If this browser blocks storage, use Export
              progress instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={actionClass}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={actionClass}
              onClick={() => {
                setStorageBlocked(false);
                setReplaceCorrupt(false);
              }}
            >
              Save current session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
