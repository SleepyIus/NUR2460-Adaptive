import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {
  areaSignals,
  chooseNext,
  grade,
  initialState,
  newSession,
  next,
  questionFor,
  shuffle,
  submit,
  validateState,
} from "../lib/quiz-engine.ts";
const bank = JSON.parse(fs.readFileSync(new URL("../data/bank.json", import.meta.url), "utf8"));
test("secondary quiz sections stay inside one closed native disclosure", () => {
  const source = ts.createSourceFile(
    "QuizApp.tsx",
    fs.readFileSync(new URL("../components/QuizApp.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const wrappers = [];
  const visit = (node) => {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.attributes.properties.some(
        (attr) =>
          ts.isJsxAttribute(attr) &&
          attr.name.getText(source) === "className" &&
          attr.initializer &&
          ts.isStringLiteral(attr.initializer) &&
          attr.initializer.text === "rail-tools",
      )
    )
      wrappers.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(wrappers.length, 1);
  const wrapper = wrappers[0];
  assert.equal(wrapper.openingElement.tagName.getText(source), "details");
  assert.ok(
    !wrapper.openingElement.attributes.properties.some(
      (attr) => ts.isJsxAttribute(attr) && attr.name.getText(source) === "open",
    ),
  );
  const children = wrapper.children.filter(ts.isJsxElement);
  assert.equal(children[0].openingElement.tagName.getText(source), "summary");
  assert.ok(children[0].getText(source).includes("Progress & quiz info"));
  assert.equal(
    children.filter((child) => child.openingElement.tagName.getText(source) === "details").length,
    5,
  );
});
const q = (id) => bank.questions.find((q) => q.id === id);
const correct = (item) => item.options.filter((o) => o.correct).map((o) => o.id);
const wrong = (item) => [item.options.find((o) => !o.correct).id];
const clone = (x) => JSON.parse(JSON.stringify(x));
function rng(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function attempt(id, index, { right = true, confidence = "sure", at } = {}) {
  const item = q(id);
  return {
    id,
    questionRevision: item.revision,
    order: item.options.map((o) => o.id),
    selected: right ? correct(item) : wrong(item),
    confidence,
    fresh: true,
    at: at ?? new Date(1700000000000 + index * 1000).toISOString(),
  };
}
test("252 explicitly rated items, searchable sources, option rationales, and foundation coverage", () => {
  assert.equal(bank.questions.length, 252);
  assert.equal(new Set(bank.questions.map((q) => q.id)).size, 252);
  assert.equal(new Set(bank.questions.map((q) => q.stem)).size, 252);
  for (const [topic, t] of Object.entries(bank.topics)) {
    const items = bank.questions.filter((q) => q.topic === topic);
    assert.ok(items.length >= t.count * 3);
    assert.ok(items.some((q) => q.difficulty === 2));
    assert.ok(items.some((q) => q.difficulty === 3));
    for (const skill of t.skills) assert.ok(items.some((q) => q.skills.includes(skill)));
  }
  for (const area of Object.keys(bank.areas))
    assert.ok(
      bank.questions.some((q) => q.area === area && q.difficulty === 1),
      area,
    );
  for (const item of bank.questions) {
    assert.ok(item.stem.length > 60);
    assert.ok(item.clue && item.rationale && item.refs.length >= 1);
    assert.notEqual(item.clue, item.rationale);
    assert.ok(item.objective && item.difficultyReason && item.revision);
    assert.ok(item.reviewStatus.includes("pending"));
    assert.ok(item.refs[0].label.includes("Instructor Notes"));
    assert.ok(item.skills.length > 0);
    assert.ok(item.options.every((o) => o.reason && o.text));
    assert.equal(item.options.length, new Set(item.options.map((o) => o.id)).size);
    const count = correct(item).length;
    assert.ok(item.kind === "MC" ? count === 1 : count >= 2 && count < item.options.length);
    assert.ok(item.refs.every((r) => !r.url || r.url.startsWith("https://")));
  }
});
test("MC and SATA scoring stays attached to option IDs through every shuffle", () => {
  for (const item of bank.questions) {
    for (let seed = 1; seed < 101; seed++) {
      const order = shuffle(item.options, rng(seed));
      assert.equal(grade({ ...item, options: order }, correct(item)).exact, true);
      assert.equal(grade(item, wrong(item)).exact, false);
      if (item.kind === "SATA") {
        assert.equal(grade(item, correct(item).slice(1)).label, "Partially correct");
        assert.equal(grade(item, [...correct(item), ...wrong(item)]).exact, false);
        assert.equal(
          grade(
            item,
            item.options.map((o) => o.id),
          ).exact,
          false,
        );
      }
    }
  }
});
test("randomized MC positions do not favor a fixed letter", () => {
  const item = q("q1");
  const counts = [0, 0, 0, 0];
  const random = rng(2460);
  for (let i = 0; i < 12000; i++) {
    counts[shuffle(item.options, random).findIndex((o) => o.correct)]++;
  }
  assert.ok(
    counts.every((n) => n > 2700 && n < 3300),
    JSON.stringify(counts),
  );
});
test("new sessions start on application items; submit/continue are distinct and locked", () => {
  let s = initialState(bank, rng(1));
  const c = s.session.current;
  assert.equal(q(c.id).difficulty, 2);
  assert.throws(() => next(s, bank));
  assert.throws(() => submit(s, bank, [], "sure"));
  assert.throws(() => submit(s, bank, correct(q(c.id)), "invalid"));
  s = submit(s, bank, correct(q(c.id)), "unsure");
  assert.equal(s.history.length, 1);
  assert.ok(s.session.current.submitted);
  assert.throws(() => submit(s, bank, correct(q(c.id)), "sure"));
  assert.deepEqual(validateState(clone(s), bank), s);
  const nextS = next(s, bank, rng(3));
  assert.equal(nextS.history.length, 1);
  assert.equal(nextS.session.current.submitted, false);
  assert.notEqual(nextS.session.current.id, c.id);
});
test("one correct response and multiple easier responses cannot promote a practice area", () => {
  const s = initialState(bank, rng(1));
  s.history = [attempt("p101", 0)];
  assert.equal(areaSignals(s, bank).bleeding.level, 2);
  s.history = [attempt("q8", 0), attempt("p104", 1), attempt("p109", 2), attempt("p119", 3)];
  assert.equal(areaSignals(s, bank).followup.level, 2);
});
test("two spaced target-level successes promote even when unsure; adjacent recall does not", () => {
  const s = initialState(bank, rng(1));
  s.history = [
    attempt("p102", 0, { confidence: "unsure" }),
    attempt("p104", 1),
    attempt("p109", 2),
    attempt("q1", 3, { confidence: "guess" }),
  ];
  assert.equal(areaSignals(s, bank).bleeding.level, 3);
  s.history = [attempt("p102", 0), attempt("q1", 1)];
  assert.equal(areaSignals(s, bank).bleeding.level, 2);
});
test("one miss requests a check; two spaced target-level misses lower; harder misses do not", () => {
  let s = initialState(bank, rng(4));
  const area = q(s.session.current.id).area;
  s = submit(s, bank, wrong(q(s.session.current.id)), "sure");
  assert.equal(areaSignals(s, bank)[area].level, 2);
  s = next(s, bank, rng(4));
  assert.notEqual(q(s.session.current.id).area, area);
  s.history = [
    attempt("p102", 0, { right: false }),
    attempt("p104", 1),
    attempt("p109", 2),
    attempt("q1", 3, { right: false }),
  ];
  assert.equal(areaSignals(s, bank).bleeding.level, 1);
  s.history = [
    attempt("q4", 0, { right: false }),
    attempt("p104", 1),
    attempt("p109", 2),
    attempt("p103", 3, { right: false }),
  ];
  assert.equal(areaSignals(s, bank).bleeding.level, 2);
});
test("300 simulated study sessions complete 15 unique items, cover all seven topics, and can resume", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const random = rng(seed);
    let s = initialState(bank, random);
    const areas = new Set();
    for (let i = 0; i < 15; i++) {
      const c = s.session.current;
      assert.ok(c);
      const item = q(c.id);
      areas.add(item.topic);
      const answers = random() < 0.6 ? correct(item) : wrong(item);
      s = submit(s, bank, answers, random() < 0.6 ? "sure" : "guess");
      assert.deepEqual(validateState(clone(s), bank), s);
      s = next(s, bank, random);
    }
    assert.equal(s.history.length, 15);
    assert.ok(s.session.done);
    assert.equal(s.session.current, null);
    assert.equal(new Set(s.history.map((a) => a.id)).size, 15);
    assert.equal(areas.size, 7);
    assert.ok(s.history.filter((a) => q(a.id).kind === "SATA").length >= 3);
    assert.ok(s.history.filter((a) => q(a.id).kind === "MC").length >= 6);
    assert.deepEqual(validateState(clone(s), bank), s);
    s = newSession(s, bank, random);
    assert.equal(s.session.start, 15);
    assert.equal(s.session.done, false);
    assert.ok(s.session.current);
    assert.deepEqual(validateState(clone(s), bank), s);
  }
});
test("freshness is recalculated from history; prior exposure is never labeled fresh", () => {
  const random = rng(3);
  let s = initialState(bank, random);
  for (let session = 0; session < 35; session++) {
    for (let i = 0; i < 15; i++) {
      const c = s.session.current;
      s = submit(s, bank, correct(q(c.id)), "sure");
      s = next(s, bank, random);
    }
    if (session < 34) s = newSession(s, bank, random);
  }
  const ids = new Set();
  for (const a of s.history) {
    assert.equal(a.fresh, !ids.has(a.id));
    ids.add(a.id);
  }
  assert.equal(ids.size, 252);
  const tampered = clone(s);
  tampered.history.forEach((a) => (a.fresh = true));
  assert.deepEqual(validateState(tampered, bank).history, s.history);
});
test("80-question exams preserve exact topics, MC/SATA quotas, difficulty, and blueprint skills across repeated sessions", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const random = rng(seed);
    let s = initialState(bank, random, "exam");
    for (let run = 0; run < 3; run++) {
      for (let i = 0; i < 80; i++) {
        const item = q(s.session.current.id);
        s = submit(s, bank, random() < 0.6 ? correct(item) : wrong(item), "sure");
        s = next(s, bank, random);
        if (i % 20 === 0) assert.deepEqual(validateState(clone(s), bank), s);
      }
      assert.ok(s.session.done);
      const items = s.history.slice(s.session.start).map((a) => q(a.id));
      assert.equal(items.length, 80);
      assert.equal(new Set(items.map((q) => q.id)).size, 80);
      assert.ok(items.every((q) => q.difficulty >= 2));
      assert.equal(items.filter((q) => q.kind === "SATA").length, 24);
      for (const [topic, t] of Object.entries(bank.topics)) {
        const set = items.filter((q) => q.topic === topic);
        assert.equal(set.length, t.count);
        assert.equal(set.filter((q) => q.kind === "SATA").length, t.sata);
        for (const skill of t.skills)
          assert.ok(
            set.some((q) => q.skills.includes(skill)),
            `${seed}/${run}/${topic}/${skill}`,
          );
      }
      assert.deepEqual(validateState(clone(s), bank), s);
      if (run < 2) s = newSession(s, bank, random, "exam");
    }
  }
});
test("exam import rejects quota and mode tampering; legacy pilot save cannot silently overwrite", () => {
  const s = initialState(bank, rng(7), "exam");
  for (const change of [
    (x) => (x.session.mode = "bad"),
    (x) => (x.session.limit = 15),
    (x) => (x.schema = 1),
    (x) => (x.bankVersion = "pregnancy-pilot-1.0.0"),
  ]) {
    const broken = clone(s);
    change(broken);
    assert.throws(() => validateState(broken, bank));
  }
  const imported = clone(s);
  imported.session.current.id = "p101";
  imported.session.current.order = q("p101").options.map((o) => o.id);
  assert.throws(() => validateState(imported, bank));
});
test("exam order does not change with correctness or confidence for an identical random stream", () => {
  const aRandom = rng(55),
    bRandom = rng(55);
  let a = initialState(bank, aRandom, "exam"),
    b = initialState(bank, bRandom, "exam");
  for (let i = 0; i < 80; i++) {
    assert.equal(a.session.current.id, b.session.current.id);
    assert.deepEqual(a.session.current.order, b.session.current.order);
    a = next(submit(a, bank, correct(q(a.session.current.id)), "sure"), bank, aRandom);
    b = next(submit(b, bank, wrong(q(b.session.current.id)), "guess"), bank, bRandom);
  }
  assert.ok(a.session.done && b.session.done);
});
test("progress files reject corrupted keys, answers, state, versions, and replayed submissions", () => {
  let s = initialState(bank, rng(7));
  s = submit(s, bank, correct(q(s.session.current.id)), "sure");
  for (const change of [
    (x) => (x.schema = 4),
    (x) => (x.bankVersion = "other"),
    (x) => (x.session.start = -1),
    (x) => (x.history[0].id = "unknown"),
    (x) => (x.history[0].selected = ["bad"]),
    (x) => (x.history[0].order = ["o0"]),
    (x) => (x.history[0].confidence = "invalid"),
    (x) => (x.session.current.selected = []),
    (x) => (x.session.current.submitted = false),
    (x) => (x.session.done = true),
  ]) {
    const broken = clone(s);
    change(broken);
    assert.throws(() => validateState(broken, bank));
  }
});
test("mid-question selections, confidence, and answer order survive an export/restore round trip", () => {
  const s = initialState(bank, rng(17));
  s.session.current.selected = [s.session.current.order[1]];
  s.session.current.confidence = "guess";
  const r = validateState(JSON.parse(JSON.stringify(s)), bank);
  assert.deepEqual(r.session.current, s.session.current);
  assert.equal(r.history.length, 0);
});
test("a new attempt shuffles again; save and review do not shuffle; SATA mapping remains stable", () => {
  for (const kind of ["MC", "SATA"]) {
    const item = bank.questions.find((q) => q.kind === kind && q.difficulty === 2);
    const one = {
      ...bank,
      topics: { [item.topic]: bank.topics[item.topic] },
      areas: { [item.area]: bank.areas[item.area] },
      questions: [item],
    };
    const orders = new Set();
    let s = initialState(one, rng(99));
    const random = rng(732);
    for (let i = 0; i < 120; i++) {
      const current = chooseNext(
        { ...s, session: { ...s.session, start: s.history.length } },
        one,
        random,
      );
      orders.add(current.order.join(","));
      s = { ...s, session: { ...s.session, start: s.history.length, current } };
      s = submit(s, one, correct(item), "sure");
      const restored = validateState(clone(s), one);
      assert.deepEqual(restored.session.current.order, current.order);
      assert.equal(
        grade(questionFor(restored.history.at(-1), one), restored.history.at(-1).selected).exact,
        true,
      );
    }
    assert.ok(orders.size >= 18, `${kind}: ${orders.size} distinct arrangements`);
  }
});
test("later-day retention can count, but same-day repetition and one repeated case cannot promote", () => {
  const s = initialState(bank, rng(1));
  s.history = [attempt("p102", 0), attempt("p104", 1), attempt("p109", 2), attempt("p102", 3)];
  assert.equal(areaSignals(s, bank).bleeding.level, 2);
  s.history.push(attempt("p102", 4, { at: new Date(1700000000000 + 86_400_000).toISOString() }));
  assert.equal(areaSignals(s, bank).bleeding.level, 2);
  assert.equal(areaSignals(s, bank).bleeding.laterReviews, 0); // less than 24 h after the immediately preceding exposure
  s.history.at(-1).at = new Date(1700000000000 + 2 * 86_400_000).toISOString();
  assert.equal(areaSignals(s, bank).bleeding.level, 2);
  assert.equal(areaSignals(s, bank).bleeding.laterReviews, 1);
  s.history.push(attempt("p104", 5), attempt("p109", 6), attempt("q1", 7));
  assert.equal(areaSignals(s, bank).bleeding.level, 3);
});
test("SATA signals distinguish omissions from extra incorrect actions", () => {
  const s = initialState(bank, rng(1)),
    item = q("p102");
  const a = attempt(item.id, 0);
  a.selected = [...correct(item).slice(1), ...wrong(item)];
  s.history = [a];
  const signal = areaSignals(s, bank)[item.area];
  assert.equal(signal.missedChoices, 1);
  assert.equal(signal.extraChoices, 1);
  assert.equal(signal.correct, 0);
});
test("v2 progress migrates without reshuffling or regrading; an old exam finishes on the old bank", () => {
  const legacyBank = { ...bank, version: bank.legacyVersion, questions: bank.archive };
  let old = initialState(legacyBank, rng(888), "exam");
  const random = rng(666);
  for (let i = 0; i < 12; i++)
    old = next(
      submit(old, legacyBank, correct(questionFor(old.session.current, legacyBank)), "sure"),
      legacyBank,
      random,
    );
  const raw = clone(old);
  raw.schema = 2;
  delete raw.session.bankVersion;
  for (const a of [...raw.history, raw.session.current]) delete a.questionRevision;
  let migrated = validateState(raw, bank);
  assert.deepEqual(migrated.session.current.order, raw.session.current.order);
  assert.ok(migrated.history.every((a) => grade(questionFor(a, bank), a.selected).exact));
  for (let i = 12; i < 80; i++) {
    const item = questionFor(migrated.session.current, bank);
    assert.ok(item.revision.startsWith("v2-"));
    migrated = next(submit(migrated, bank, correct(item), "sure"), bank, random);
  }
  assert.ok(migrated.session.done);
  assert.deepEqual(validateState(clone(migrated), bank), migrated);
  const fresh = newSession(migrated, bank, random, "study");
  assert.equal(fresh.session.bankVersion, bank.version);
  assert.ok(!fresh.session.current.questionRevision.startsWith("v2-"));
  assert.ok(Object.values(areaSignals(migrated, bank)).every((s) => s.level === 2));
});
test("archived answers and explanations remain attached to a saved revision after current content changes", () => {
  const old = bank.archive.find((q) => q.id === "q47"),
    changed = q("q47");
  assert.notEqual(old.stem, changed.stem);
  const a = { ...attempt("q47", 0), questionRevision: old.revision, selected: correct(old) };
  assert.equal(questionFor(a, bank).stem, old.stem);
  assert.equal(grade(questionFor(a, bank), a.selected).exact, true);
  assert.throws(() => questionFor({ ...a, questionRevision: "missing" }, bank));
});
