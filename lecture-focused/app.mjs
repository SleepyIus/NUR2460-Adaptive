import { createBrowserStudyCatalog } from './catalog-runtime.mjs';
import { LocalPdfAttachmentController } from './local-pdf-controller.mjs';
import { SOURCE_DOCUMENTS, validateSameOriginBlobUrl } from './source-security.mjs';
import { TOPIC_CHOICES, WEEK_CHOICES, createStudyPool } from './study-filter.mjs';
import { createStudySession } from './study-engine.mjs';
import { createSyntheticStateStore } from './synthetic-state-store.mjs';

function element(documentRef, tag, { className, text, attributes = {} } = {}) {
  const node = documentRef.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function optionType(kind) {
  return kind === 'MC' ? 'radio' : 'checkbox';
}

function choiceInstruction(kind) {
  return kind === 'MC' ? 'Choose one answer.' : 'Select all answers that apply.';
}

export function installSkipLinkFocus({ skipLink, target, windowRef }) {
  if (!skipLink?.addEventListener || typeof target?.focus !== 'function' || !windowRef?.location) {
    throw new TypeError('Skip-link focus requires a link, focusable target, and window location.');
  }
  const activate = event => {
    event.preventDefault();
    windowRef.location.hash = target.id;
    target.focus();
  };
  skipLink.addEventListener('click', activate);
  return activate;
}

export function presentAccessibleStorageError(alertNode, message, { focus = true } = {}) {
  if (!alertNode || typeof message !== 'string' || !message) throw new TypeError('Storage error presentation requires an alert node and message.');
  alertNode.hidden = false;
  alertNode.textContent = message;
  if (focus) alertNode.focus();
}

export function presentStorageConflict(alertNode, reloadButton, message, { focus = true } = {}) {
  if (!reloadButton || typeof reloadButton.hidden !== 'boolean') throw new TypeError('Storage conflict presentation requires a reload control.');
  presentAccessibleStorageError(alertNode, message, { focus });
  reloadButton.hidden = false;
}

export function createStudyApp({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  random = Math.random,
  catalog = createBrowserStudyCatalog(),
  controller = new LocalPdfAttachmentController({ runtimeOrigin: globalThis.location?.origin }),
  stateStore,
} = {}) {
  if (!documentRef || !windowRef) throw new TypeError('A browser document and window are required.');
  const session = createStudySession({ catalog, random });
  let identities = session.list();
  const chooser = documentRef.querySelector('#question-picker');
  const questionRoot = documentRef.querySelector('#question-root');
  const attachmentRoot = documentRef.querySelector('#attachment-controls');
  const attachmentStatus = documentRef.querySelector('#attachment-status');
  const attachmentAlert = documentRef.querySelector('#attachment-alert');
  const hard80 = documentRef.querySelector('#hard80-status');
  const namespace = documentRef.querySelector('#namespace-status');
  const nextButton = documentRef.querySelector('#next-question');
  const skipLink = documentRef.querySelector('.skip-link');
  const studyMain = documentRef.querySelector('#study-main');
  const persistenceStatus = documentRef.querySelector('#persistence-status');
  const persistenceAlert = documentRef.querySelector('#persistence-alert');
  const backupText = documentRef.querySelector('#backup-text');
  const exportButton = documentRef.querySelector('#export-progress');
  const restoreButton = documentRef.querySelector('#restore-progress');
  const reloadSaved = documentRef.querySelector('#reload-saved-progress');
  const resetButton = documentRef.querySelector('#reset-progress');
  const weekFilter = documentRef.querySelector('#week-filter');
  const topicFilter = documentRef.querySelector('#topic-filter');
  const applyFilter = documentRef.querySelector('#apply-filter');
  const reviewSeen = documentRef.querySelector('#review-seen');
  const filterStatus = documentRef.querySelector('#filter-status');
  const filterAlert = documentRef.querySelector('#filter-alert');
  const adaptiveStatus = documentRef.querySelector('#adaptive-status');
  const adaptiveAlert = documentRef.querySelector('#adaptive-alert');
  const adaptiveNext = documentRef.querySelector('#adaptive-next');
  const progressStatus = documentRef.querySelector('#progress-status');
  const topicProgress = documentRef.querySelector('#topic-progress');
  const weekProgress = documentRef.querySelector('#week-progress');
  let currentIndex = 0;
  let store = stateStore;

  if (!chooser || !questionRoot || !attachmentRoot || !attachmentStatus || !attachmentAlert || !hard80 || !namespace || !nextButton
    || !skipLink || !studyMain || !persistenceStatus || !persistenceAlert || !backupText || !exportButton || !restoreButton || !reloadSaved || !resetButton
    || !weekFilter || !topicFilter || !applyFilter || !reviewSeen || !filterStatus || !filterAlert
    || !adaptiveStatus || !adaptiveAlert || !adaptiveNext || !progressStatus || !topicProgress || !weekProgress) {
    throw new TypeError('The study HTML shell is incomplete.');
  }

  namespace.textContent = `Isolated route namespace: ${catalog.namespace}. Study state and revision-keyed first-attempt history are saved only to this browser's lecture-focused catalog242 key.`;
  hard80.textContent = catalog.hard80.message;

  weekFilter.replaceChildren(...WEEK_CHOICES.map(week => element(documentRef, 'option', {
    text: week === 'All' ? 'All weeks' : `Week ${week}`,
    attributes: { value: week },
  })));
  topicFilter.replaceChildren(...TOPIC_CHOICES.map(topic => element(documentRef, 'option', {
    text: topic === 'All' ? 'All topics' : topic,
    attributes: { value: topic },
  })));

  function refreshPoolControls() {
    identities = session.list();
    const view = session.getView();
    const pool = session.getPool();
    const seen = new Set(session.exportSyntheticState().exposure.map(entry => entry.id));
    chooser.replaceChildren(...identities.map((candidate, index) => element(documentRef, 'option', {
      text: `${index + 1}. ${candidate.topic} — ${candidate.kind} · ${seen.has(candidate.id) ? 'Seen / review' : 'New'}`,
      attributes: { value: candidate.id },
    })));
    currentIndex = identities.findIndex(candidate => candidate.id === view.id && candidate.revision === view.revision);
    chooser.value = view.id;
    weekFilter.value = String(pool.week);
    topicFilter.value = pool.topic;
    const discovery = session.getNewQuestionStatus();
    filterStatus.textContent = `${discovery.unseen} unseen / ${discovery.total} questions in these filters. ${discovery.batchSize ? `Batch: ${discovery.batchSize} of up to ${discovery.requestedSize} new questions; ${discovery.batchRemaining} not yet shown.` : 'Explicit review mode; no new batch active.'} ${discovery.batchSize && discovery.batchSize < discovery.requestedSize ? 'A shorter batch was created instead of adding repeats. ' : ''}Shown questions stay seen across batches, filter switches and reloads in this browser. History is not reset.`;
  }

  function announce(message) {
    attachmentStatus.textContent = message;
  }

  function announceError(message) {
    attachmentAlert.hidden = false;
    attachmentAlert.textContent = message;
    attachmentAlert.focus();
  }

  function clearError() {
    attachmentAlert.hidden = true;
    attachmentAlert.textContent = '';
  }

  function announcePersistence(message) {
    persistenceStatus.textContent = message;
  }

  function clearPersistenceError() {
    persistenceAlert.hidden = true;
    persistenceAlert.textContent = '';
  }

  function clearFilterError() {
    filterAlert.hidden = true;
    filterAlert.textContent = '';
  }

  function announceFilterError(error) {
    filterAlert.hidden = false;
    filterAlert.textContent = error?.message ?? 'The selected filters could not create an accepted Study pool.';
    filterAlert.focus();
  }

  function clearAdaptiveError() {
    adaptiveAlert.hidden = true;
    adaptiveAlert.textContent = '';
  }

  function announceAdaptiveError(error) {
    adaptiveAlert.hidden = false;
    adaptiveAlert.textContent = error?.message ?? 'No bounded question selection is available in this clinical track.';
    adaptiveAlert.focus();
  }

  function renderAdaptiveStatus(message) {
    const status = session.getAdaptiveStatus();
    const evidence = `${status.countedEvidence} distinct unhinted response${status.countedEvidence === 1 ? '' : 's'}`;
    const hints = `${status.hintedDistinctAttempts} hinted response${status.hintedDistinctAttempts === 1 ? '' : 's'} excluded`;
    const remaining = status.unseenExhausted
      ? 'No unseen questions remain in this track. Review is optional.'
      : `${status.remainingUnseen} of ${status.totalTrackQuestions} track questions remain unseen.`;
    const summary = `Track ${status.track}; requested difficulty ${status.requestedDifficulty} on the accepted ${status.acceptedDifficultyLevels.join('–')} scale. ${evidence}; ${hints}. ${remaining}`;
    adaptiveStatus.textContent = message ? `${message} ${summary}` : summary;
    adaptiveNext.disabled = !session.getView().submitted;
  }

  function friendlyProgressStatus(status) {
    if (status === 'UNATTEMPTED') return 'Unattempted';
    if (status === 'PRACTICE_EVIDENCE') return 'Practice evidence';
    return 'Insufficient evidence';
  }

  function renderProgress() {
    const summary = session.getProgress();
    progressStatus.textContent = `${summary.history.distinctUnhinted} distinct unhinted first attempts recorded across ${catalog.size} accepted question revisions; ${summary.history.hintedFirstAttempts} hinted first attempt${summary.history.hintedFirstAttempts === 1 ? '' : 's'} excluded. No status certifies mastery or predicts passing.`;

    const topicCards = summary.topics.map(topic => {
      const card = element(documentRef, 'article', { className: `progress-card status-${topic.status.toLowerCase()}` });
      card.append(
        element(documentRef, 'h3', { text: `${topic.topic} · Week ${topic.week}` }),
        element(documentRef, 'p', { className: 'progress-label', text: friendlyProgressStatus(topic.status) }),
        element(documentRef, 'p', { text: `Distinct unhinted first-attempt evidence: ${topic.evidenceFraction.numerator}/${topic.evidenceFraction.denominator} accepted question revisions.` }),
        element(documentRef, 'p', { text: `Correct practice evidence: ${topic.correctEvidenceFraction.numerator}/${topic.correctEvidenceFraction.denominator} qualifying responses. This is not a pass threshold.` }),
        element(documentRef, 'p', { text: `${topic.unattemptedQuestions} unattempted; ${topic.hintedFirstAttempts} hinted first attempt${topic.hintedFirstAttempts === 1 ? '' : 's'} excluded; ${topic.oneItemTracks} one-item track${topic.oneItemTracks === 1 ? '' : 's'} cannot establish track mastery.` }),
        element(documentRef, 'p', { className: 'next-need', text: topic.nextStudyNeed }),
      );
      return card;
    });
    topicProgress.replaceChildren(...topicCards);

    const weekCards = summary.weeks.map(week => {
      const card = element(documentRef, 'article', { className: 'week-card' });
      const topicList = element(documentRef, 'ul', { className: 'compact-list' });
      for (const topicName of week.topics) {
        const topic = summary.topics.find(candidate => candidate.topic === topicName);
        topicList.append(element(documentRef, 'li', { text: `${topicName}: ${friendlyProgressStatus(topic.status)} (${topic.distinctUnhinted}/${topic.acceptedQuestions})` }));
      }
      card.append(
        element(documentRef, 'h3', { text: `Week ${week.week}` }),
        element(documentRef, 'p', { text: `Distinct unhinted first-attempt evidence: ${week.evidenceFraction.numerator}/${week.evidenceFraction.denominator} accepted question revisions. This raw total is not an average of topic percentages.` }),
        element(documentRef, 'p', { text: `Correct practice evidence: ${week.correctEvidenceFraction.numerator}/${week.correctEvidenceFraction.denominator} qualifying responses.` }),
        topicList,
        element(documentRef, 'p', { text: `Unattempted topics: ${week.unattemptedTopics.join(', ') || 'none'}. Insufficient-evidence topics: ${week.insufficientEvidenceTopics.join(', ') || 'none'}.` }),
        element(documentRef, 'p', { className: 'next-need', text: week.nextStudyNeed }),
      );
      return card;
    });
    weekProgress.replaceChildren(...weekCards);
  }

  function announcePersistenceError(error, { focus = true } = {}) {
    presentAccessibleStorageError(
      persistenceAlert,
      error?.message ?? 'Synthetic progress storage failed. Study may continue in this page.',
      { focus },
    );
  }

  function announceStorageConflict(error, { focus = true } = {}) {
    presentStorageConflict(
      persistenceAlert,
      reloadSaved,
      error?.message ?? 'Another tab changed this route\'s saved progress. This tab did not overwrite it. Reload newer saved progress before continuing.',
      { focus },
    );
    announcePersistence('Saving is paused in this tab until newer saved progress is reloaded.');
  }

  function disablePersistenceControls() {
    for (const control of [backupText, exportButton, restoreButton, reloadSaved, resetButton]) control.disabled = true;
  }

  function persistProgress(message = 'Synthetic progress saved in this browser.') {
    if (!store) return false;
    clearPersistenceError();
    try {
      store.save(session);
      reloadSaved.hidden = true;
      announcePersistence(message);
      return true;
    } catch (error) {
      if (error?.code === 'STORAGE_CONFLICT') announceStorageConflict(error);
      else announcePersistenceError(error);
      return false;
    }
  }

  function attachmentInputId(documentId) {
    return `attachment-${documentId}`;
  }

  function renderAttachments({ focusDocumentId } = {}) {
    const cards = Object.values(SOURCE_DOCUMENTS).map(sourceDocument => {
      const card = element(documentRef, 'div', { className: 'attachment-card' });
      const label = element(documentRef, 'label', {
        className: 'attachment-label',
        text: sourceDocument.displayName,
        attributes: { for: attachmentInputId(sourceDocument.id) },
      });
      const hint = element(documentRef, 'p', {
        className: 'small-copy',
        text: controller.isAttached(sourceDocument.id)
          ? 'Verified for this page session. The local file was not uploaded.'
          : 'Select the exact local course PDF. It is verified in your browser and is not uploaded.',
      });
      const input = element(documentRef, 'input', {
        attributes: {
          id: attachmentInputId(sourceDocument.id),
          type: 'file',
          accept: 'application/pdf,.pdf',
          'data-document-id': sourceDocument.id,
        },
      });
      input.addEventListener('change', async () => {
        const [file] = input.files ?? [];
        if (!file) return;
        clearError();
        announce(`Verifying ${sourceDocument.displayName} locally…`);
        try {
          await controller.attach(sourceDocument.id, file);
          input.value = '';
          announce(`${sourceDocument.displayName} attached for this page session. Nothing was uploaded.`);
          renderAttachments({ focusDocumentId: sourceDocument.id });
          renderQuestion();
        } catch (error) {
          input.value = '';
          announce('No source attachment changed.');
          announceError(error?.message ?? 'The local PDF could not be attached.');
        }
      });
      card.append(label, hint, input);
      if (controller.isAttached(sourceDocument.id)) {
        input.hidden = true;
        const detach = element(documentRef, 'button', {
          className: 'secondary-button',
          text: `Detach ${sourceDocument.displayName}`,
          attributes: { type: 'button', 'data-detach-document': sourceDocument.id },
        });
        detach.addEventListener('click', () => {
          controller.detach(sourceDocument.id);
          announce(`${sourceDocument.displayName} detached.`);
          renderAttachments();
          renderQuestion();
          documentRef.querySelector(`#${attachmentInputId(sourceDocument.id)}`)?.focus();
        });
        card.append(detach);
      }
      return card;
    });
    attachmentRoot.replaceChildren(...cards);
    if (focusDocumentId) {
      documentRef.querySelector(`[data-detach-document="${focusDocumentId}"]`)?.focus();
    }
  }

  function sourceList(view) {
    const section = element(documentRef, 'section', {
      className: 'review-section',
      attributes: { 'aria-labelledby': 'source-heading' },
    });
    section.append(element(documentRef, 'h3', { text: 'Lecture sources', attributes: { id: 'source-heading' } }));
    if (view.sourceWarning) {
      section.append(element(documentRef, 'p', {
        className: 'source-warning',
        text: `Source caution: ${view.sourceWarning}`,
        attributes: { role: 'note' },
      }));
    }
    const list = element(documentRef, 'ul', { className: 'source-list' });
    for (const sourceLink of view.sourceLinks) {
      const item = element(documentRef, 'li');
      if (controller.isAttached(sourceLink.documentId)) {
        try {
          const href = controller.href(sourceLink);
          validateSameOriginBlobUrl(href, windowRef.location.origin);
          item.append(element(documentRef, 'a', {
            text: sourceLink.label,
            attributes: { href, target: '_blank', rel: 'noopener' },
          }));
        } catch {
          item.append(element(documentRef, 'span', { text: `${sourceLink.label} — local link unavailable. ` }));
          item.append(reattachButton(sourceLink.documentId));
        }
      } else {
        item.append(element(documentRef, 'span', { text: `${sourceLink.label} — ` }));
        item.append(reattachButton(sourceLink.documentId));
      }
      list.append(item);
    }
    section.append(list);
    return section;
  }

  function reattachButton(documentId) {
    const sourceDocument = SOURCE_DOCUMENTS[documentId];
    const button = element(documentRef, 'button', {
      className: 'link-button',
      text: `Attach ${sourceDocument.displayName}`,
      attributes: { type: 'button' },
    });
    button.addEventListener('click', () => {
      const input = documentRef.querySelector(`#${attachmentInputId(documentId)}`);
      input?.focus();
      input?.click();
    });
    return button;
  }

  function renderQuestion() {
    const view = session.getView();
    refreshPoolControls();
    chooser.value = view.id;
    const article = element(documentRef, 'article', { className: 'question-card' });
    article.append(
      element(documentRef, 'p', { className: 'status-copy', text: view.discovery.reviewMode ? 'Reviewing a previously shown question — not a new question.' : 'New question — now recorded as seen, even if you leave without answering.' }),
      element(documentRef, 'p', { className: 'eyebrow', text: `${view.topic} · Difficulty ${view.difficulty} · ${view.kind} · ${view.track}` }),
      element(documentRef, 'h2', { text: view.objective }),
      element(documentRef, 'p', { className: 'stem', text: view.stem }),
    );

    const fieldset = element(documentRef, 'fieldset', { className: 'choice-set' });
    fieldset.append(element(documentRef, 'legend', { text: choiceInstruction(view.kind) }));
    for (const answer of view.options) {
      const row = element(documentRef, 'div', {
        className: `option-row${answer.feedbackState ? ` ${answer.feedbackState}` : ''}`,
      });
      const label = element(documentRef, 'label', { className: 'option-label' });
      const input = element(documentRef, 'input', {
        attributes: {
          type: optionType(view.kind),
          name: 'study-answer',
          value: answer.id,
          ...(answer.selected ? { checked: '' } : {}),
          ...(view.submitted ? { disabled: '' } : {}),
        },
      });
      input.checked = answer.selected;
      input.disabled = view.submitted;
      input.addEventListener('change', () => {
        session.toggleOption(answer.id);
        const persisted = persistProgress('Answer selection saved in this route\'s isolated catalog242 browser namespace.');
        renderQuestion();
        if (!persisted) persistenceAlert.focus();
      });
      label.append(input, element(documentRef, 'span', { text: answer.text }));
      row.append(label);
      if (view.submitted) {
        row.append(
          element(documentRef, 'span', { className: 'feedback-badge', text: answer.feedbackLabel }),
          element(documentRef, 'p', { className: 'answer-reason', text: answer.reason }),
        );
      }
      fieldset.append(row);
    }
    article.append(fieldset);

    if (!view.submitted) {
      if (view.hintUsed) {
        article.append(element(documentRef, 'p', {
          className: 'hint-note',
          text: `Clue: ${view.clue} This response will not count as adaptive evidence.`,
          attributes: { id: 'hint-note', tabindex: '-1' },
        }));
      } else {
        const hint = element(documentRef, 'button', { className: 'secondary-button', text: 'Show clue', attributes: { type: 'button' } });
        hint.addEventListener('click', () => {
          session.revealHint();
          const persisted = persistProgress('Hint use saved in this route\'s isolated catalog242 browser namespace. This question will not count as adaptive or progress evidence.');
          renderQuestion();
          if (persisted) documentRef.querySelector('#hint-note')?.focus();
          else persistenceAlert.focus();
        });
        article.append(hint);
      }
      const submit = element(documentRef, 'button', { className: 'primary-button', text: 'Submit answer', attributes: { type: 'button' } });
      submit.addEventListener('click', () => {
        try {
          session.submit();
          const persisted = persistProgress('Submitted response and revision-keyed first-attempt history saved in this route\'s isolated catalog242 browser namespace.');
          renderQuestion();
          if (persisted) documentRef.querySelector('#result-heading')?.focus();
          else persistenceAlert.focus();
        } catch (error) {
          const prompt = element(documentRef, 'p', { className: 'inline-error', text: error.message, attributes: { role: 'alert', tabindex: '-1' } });
          article.append(prompt);
          prompt.focus();
        }
      });
      article.append(submit);
    } else {
      const review = element(documentRef, 'section', { className: 'review-panel' });
      review.append(
        element(documentRef, 'h3', {
          className: view.correct ? 'result-correct' : 'result-incorrect',
          text: view.correct ? 'Correct' : 'Incorrect',
          attributes: { id: 'result-heading', tabindex: '-1' },
        }),
        element(documentRef, 'p', { text: `Clue: ${view.clue}` }),
        element(documentRef, 'p', { className: 'rationale', text: view.rationale }),
        element(documentRef, 'p', { className: 'small-copy', text: `Difficulty note: ${view.difficultyReason}` }),
      );
      if (view.limitations.length) {
        const limitations = element(documentRef, 'ul', { className: 'limitations' });
        view.limitations.forEach(limitation => limitations.append(element(documentRef, 'li', { text: limitation })));
        review.append(element(documentRef, 'h4', { text: 'Scope and cautions' }), limitations);
      }
      review.append(sourceList(view));
      article.append(review);
    }
    questionRoot.replaceChildren(article);
    renderAdaptiveStatus();
    renderProgress();
  }

  function selectIndex(index) {
    clearAdaptiveError();
    const chosen = identities[index];
    if (!chosen) return;
    const seen = session.exportSyntheticState().exposure.some(entry => entry.id === chosen.id);
    if (seen && !windowRef.confirm('This question has already been shown. Open it for review? Your first-attempt history will not be reset.')) { chooser.value = session.getView().id; return; }
    if (seen) session.reviewQuestion(chosen);
    else session.selectQuestion(chosen);
    currentIndex = index;
    const persisted = persistProgress('Question and shuffled option order saved in this route\'s isolated catalog242 browser namespace.');
    renderQuestion();
    if (persisted) questionRoot.focus();
    else persistenceAlert.focus();
  }

  chooser.addEventListener('change', () => selectIndex(identities.findIndex(identity => identity.id === chooser.value)));
  nextButton.addEventListener('click', () => {
    clearFilterError();
    clearAdaptiveError();
    try {
      session.nextUnseenInBatch();
      const persisted = persistProgress('Seen-question history and batch order saved.');
      renderQuestion();
      if (persisted) questionRoot.focus(); else persistenceAlert.focus();
    } catch (error) { announceFilterError(error); }
  });
  adaptiveNext.addEventListener('click', () => {
    clearAdaptiveError();
    try {
      const result = session.selectAdaptiveNext();
      currentIndex = identities.findIndex(candidate => candidate.id === result.view.id && candidate.revision === result.view.revision);
    const persisted = persistProgress('Bounded within-track selection and shuffled question order saved in this route\'s isolated catalog242 browser namespace.');
      renderQuestion();
      renderAdaptiveStatus(result.decision.message);
      if (persisted) questionRoot.focus();
      else persistenceAlert.focus();
    } catch (error) {
      renderAdaptiveStatus();
      announceAdaptiveError(error);
    }
  });
  applyFilter.addEventListener('click', () => {
    clearFilterError();
    clearAdaptiveError();
    try {
      const week = weekFilter.value === 'All' ? 'All' : Number(weekFilter.value);
      const pool = createStudyPool(catalog, { week, topic: topicFilter.value });
      session.selectPool(pool);
      refreshPoolControls();
    const persisted = persistProgress('Filtered selector pool saved in this route\'s isolated catalog242 browser namespace. Revision-keyed first-attempt history was preserved.');
      renderQuestion();
      if (persisted) questionRoot.focus();
      else persistenceAlert.focus();
    } catch (error) {
      announceFilterError(error);
    }
  });
  reviewSeen.addEventListener('click', () => {
    clearFilterError();
    clearAdaptiveError();
    try {
      const week = weekFilter.value === 'All' ? 'All' : Number(weekFilter.value);
      session.reviewPool(createStudyPool(catalog, { week, topic: topicFilter.value }));
      const persisted = persistProgress('Explicit review opened. Seen and first-attempt history are preserved.');
      renderQuestion();
      if (persisted) questionRoot.focus(); else persistenceAlert.focus();
    } catch (error) { announceFilterError(error); }
  });
  installSkipLinkFocus({ skipLink, target: studyMain, windowRef });
  exportButton.addEventListener('click', () => {
    clearPersistenceError();
    try {
      backupText.value = store.exportBackup(session);
      announcePersistence('Backup text exported. It contains Study state only—never PDFs or attachment URLs.');
      backupText.focus();
      backupText.select?.();
    } catch (error) {
      announcePersistenceError(error);
    }
  });
  restoreButton.addEventListener('click', () => {
    clearPersistenceError();
    clearAdaptiveError();
    try {
      store.restoreBackup(backupText.value, session);
      reloadSaved.hidden = true;
      refreshPoolControls();
      renderQuestion();
      announcePersistence('Validated backup restored and saved. Local PDFs are not part of backups and must be reattached after reload.');
      questionRoot.focus();
    } catch (error) {
      if (error?.code === 'STORAGE_CONFLICT') announceStorageConflict(error);
      else announcePersistenceError(error);
    }
  });
  reloadSaved.addEventListener('click', () => {
    clearPersistenceError();
    clearAdaptiveError();
    try {
      const loaded = store.load(session);
      if (!loaded.restored) {
        presentStorageConflict(
          persistenceAlert,
          reloadSaved,
          'The saved route state was removed in another tab. Use Reset this route\'s history to start over; this tab did not overwrite the removal.',
        );
        announcePersistence('No newer saved progress was available to reload.');
        return;
      }
      reloadSaved.hidden = true;
      refreshPoolControls();
      renderQuestion();
      announcePersistence('Newer saved progress reloaded. This tab may save again from that version.');
      questionRoot.focus();
    } catch (error) {
      if (error?.code === 'STORAGE_CONFLICT') announceStorageConflict(error);
      else announcePersistenceError(error);
    }
  });
  resetButton.addEventListener('click', () => {
    if (!windowRef.confirm('Reset all seen-question and answer history for this route? This is not needed to start a new batch.')) return;
    clearPersistenceError();
    clearAdaptiveError();
    try {
      store.clear();
      session.resetHistory();
      refreshPoolControls();
      store.save(session);
      reloadSaved.hidden = true;
      backupText.value = '';
      renderQuestion();
      announcePersistence('Synthetic saved progress reset to a new first-question state. Local PDF attachments were not changed.');
      questionRoot.focus();
    } catch (error) {
      if (error?.code === 'STORAGE_CONFLICT') announceStorageConflict(error);
      else announcePersistenceError(error);
    }
  });
  windowRef.addEventListener('storage', event => {
    if (!store || event.key !== store.key || typeof store.observeExternalChange !== 'function') return;
    try {
      const observed = store.observeExternalChange(event.newValue);
      if (observed.conflict) announceStorageConflict({
        code: 'STORAGE_CONFLICT',
        message: 'Another tab saved newer route progress. Saving is paused here; reload the newer saved progress before continuing.',
      }, { focus: false });
    } catch (error) {
      announceStorageConflict(error, { focus: false });
    }
  });
  windowRef.addEventListener('pagehide', () => controller.dispose(), { once: true });

  try {
    if (!store) store = createSyntheticStateStore({ catalog });
    const loaded = store.load(session);
    if (loaded.restored) {
      reloadSaved.hidden = true;
      refreshPoolControls();
      announcePersistence('Synthetic Study progress restored. Local PDFs and attachment URLs are never saved; reattach source files when needed.');
    } else {
      store.save(session);
      reloadSaved.hidden = true;
      announcePersistence('New Study state saved. Exact revision and shuffled option order will survive reload.');
    }
  } catch (error) {
    const recoverableBackupError = typeof error?.code === 'string' && error.code.startsWith('BACKUP_');
    const recoverableConflict = error?.code === 'STORAGE_CONFLICT';
    if (!recoverableBackupError && !recoverableConflict) {
      store = null;
      disablePersistenceControls();
    }
    if (recoverableConflict) announceStorageConflict(error, { focus: false });
    else {
      announcePersistence(recoverableBackupError
        ? 'Stored backup was rejected before changing this new in-page session. Paste a valid catalog242 backup or reset saved progress.'
        : 'Study is running in this page without browser persistence.');
      announcePersistenceError(error, { focus: false });
    }
  }

  refreshPoolControls();
  renderAttachments();
  renderQuestion();
  announce('No local source PDFs are attached. Nothing is uploaded. Reload never restores attachments; reattach them when needed.');

  return Object.freeze({ session, controller, stateStore: store, render: renderQuestion, dispose: () => controller.dispose() });
}

if (globalThis.document && globalThis.window) createStudyApp();
