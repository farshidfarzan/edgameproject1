// ======= Memory Game + Quiz with Move Credits =======
window.addEventListener('DOMContentLoaded', () => {
  // ---------- Session ----------
  let studentId = '';
  let playCount = 1;
  const maxPlays = 1;

  // Qualtrics Response ID from the URL
  const responseId =
    new URLSearchParams(window.location.search).get('responseId') || '';

  const filenameResponseId =
    responseId.replace(/[^a-zA-Z0-9_-]/g, '') || 'noResponseID';

  // ---------- Game state ----------
  let cards = [];
  let flipped = [];
  let matchedPairs = 0;
  let moves = 0;
  let moveCredits = 0;
  let resolving = false;
  let gameFinished = false;
  let roundToken = 0;

  // ---------- Questions ----------
  const QUESTIONS = [
    {
      q: "Which country is associated with Barreado?",
      options: ["Brazil", "Argentina", "Spain", "Italy"],
      answer: 0,
      explain: "Correct answer: Brazil"
    },
    {
      q: "Which country is associated with Locro?",
      options: ["Spain", "Italy", "Argentina", "Brazil"],
      answer: 2,
      explain: "Correct answer: Argentina"
    },
    {
      q: "Which country is associated with Hōtō?",
      options: ["India", "Japan", "Germany", "Italy"],
      answer: 1,
      explain: "Correct answer: Japan"
    },
    {
      q: "Which country is associated with Dhokla?",
      options: ["India", "Argentina", "Italy", "Japan"],
      answer: 0,
      explain: "Correct answer: India"
    },
    {
      q: "Which country is associated with Cjarsons?",
      options: ["Australia", "Spain", "Italy", "Germany"],
      answer: 2,
      explain: "Correct answer: Italy"
    },
    {
      q: "Which country is associated with Migas?",
      options: ["Germany", "Spain", "India", "Australia"],
      answer: 1,
      explain: "Correct answer: Spain"
    },
    {
      q: "Which country is associated with Maultaschen?",
      options: ["Japan", "Australia", "Germany", "India"],
      answer: 2,
      explain: "Correct answer: Germany"
    },
    {
      q: "Which country is associated with Lamington?",
      options: ["Brazil", "Australia", "Germany", "Japan"],
      answer: 1,
      explain: "Correct answer: Australia"
    }
  ];

  let qIndex = 0;
  let correctCount = 0;
  let lastChoiceIndex = null;
  const answers = [];

  // ---------- DOM ----------
  const statusEl = document.getElementById('status');
  const uidPill = document.getElementById('uid-pill');
  const movesEl = document.getElementById('moves');
  const creditsPill = document.getElementById('credits-pill');
  const bar = document.getElementById('bar');
  const startSec = document.getElementById('start');
  const splitSec = document.getElementById('split-wrap');
  const endSec = document.getElementById('end');
  const roundPill = document.getElementById('round-pill');
  const scorePill = document.getElementById('score-pill');
  const idInput = document.getElementById('studentId');
  const beginBtn = document.getElementById('begin');
  const playAgainBtn = document.getElementById('playAgain');
  const restartGameBtn = document.getElementById('restartGame');

  const qtext = document.getElementById('qtext');
  const optionsUl = document.getElementById('options');
  const feedback = document.getElementById('feedback');
  const nextQ = document.getElementById('nextQ');
  const skipQ = document.getElementById('skip');
  const qidxSpan = document.getElementById('qidx');
  const qtotalSpan = document.getElementById('qtotal');
  const quizDone = document.getElementById('quiz-done');
  const finalScore = document.getElementById('finalScore');
  const finalTotal = document.getElementById('finalTotal');
  const downloadAnswers = document.getElementById('downloadAnswers');

  if (qtotalSpan) {
    qtotalSpan.textContent = String(QUESTIONS.length);
  }

  if (roundPill) {
    roundPill.textContent = `Round: ${playCount} of ${maxPlays}`;
  }

  if (scorePill) {
    scorePill.textContent = 'Quiz: 0 correct';
  }

  function updateCredits() {
    if (creditsPill) {
      creditsPill.textContent = `Remaining Moves: ${moveCredits}`;
    }
  }

  // ---------- Create shuffled deck ----------
  function newDeck() {
    const PAIRS = [
      ["img1.png", "img2.png"],
      ["img3.png", "img4.png"],
      ["img5.png", "img6.png"],
      ["img7.png", "img8.png"],
      ["img9.png", "img10.png"],
      ["img11.png", "img12.png"],
      ["img13.png", "img14.png"],
      ["img15.png", "img16.png"]
    ];

    const deck = [];

    PAIRS.forEach((pair, pairId) => {
      pair.forEach((src, side) => {
        deck.push({
          id: `pair${pairId}-card${side}`,
          src,
          pairId,
          matched: false
        });
      });
    });

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  // ---------- Render cards ----------
  function renderBoard() {
    const wrap = document.getElementById('game-board');
    if (!wrap) return;

    wrap.innerHTML = '';

    cards.forEach(card => {
      const el = document.createElement('div');
      const faceUp = card.matched || flipped.includes(card.id);

      // Avoid CSS classes that rotate or hide matched cards.
      el.className = 'card';
      el.dataset.matched = String(card.matched);

      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('animation', 'none', 'important');
      el.style.setProperty('transition', 'none', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('visibility', 'visible', 'important');

      if (card.matched) {
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
      }

      if (faceUp) {
        el.style.setProperty(
          'background-image',
          'none',
          'important'
        );

        const img = document.createElement('img');
        img.src = `imagesext/${card.src}`;
        img.alt = card.src;

        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '12px';
        img.style.display = 'block';
        img.style.setProperty('transform', 'none', 'important');
        img.style.setProperty('animation', 'none', 'important');

        el.appendChild(img);
      } else {
        el.style.backgroundImage = "url('imagesext/back.png')";
        el.style.backgroundPosition = 'center';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
      }

      el.addEventListener('click', () => onCardClick(card.id));
      wrap.appendChild(el);
    });
  }

  // ---------- Card selection ----------
  function onCardClick(id) {
    if (gameFinished || resolving) return;

    const card = cards.find(item => item.id === id);

    if (!card || card.matched || flipped.includes(id)) return;

    if (flipped.length === 0 && moveCredits < 2) {
      alert(
        'You need at least 2 move credits to start matching cards. ' +
        'Each correct answer earns 2 move credits.'
      );
      return;
    }

    if (flipped.length === 1 && moveCredits < 1) {
      alert('You need at least 1 move credit for the second card.');
      return;
    }

    moveCredits--;
    moves++;
    updateCredits();

    if (movesEl) {
      movesEl.textContent = `Moves: ${moves}`;
    }

    flipped.push(id);
    renderBoard();

    if (flipped.length !== 2) return;

    const [a, b] = flipped.map(cardId =>
      cards.find(item => item.id === cardId)
    );

    if (a && b && a.pairId === b.pairId) {
      a.matched = true;
      b.matched = true;
      matchedPairs++;
      flipped = [];

      // Keep matched cards face up.
      renderBoard();

      if (bar) {
        bar.style.width = `${(matchedPairs / 8) * 100}%`;
      }

      if (matchedPairs === 8) {
        endGame();
      }
    } else {
      resolving = true;
      const currentToken = roundToken;

      setTimeout(() => {
        // Ignore callbacks from a previous board after restart.
        if (currentToken !== roundToken) return;

        flipped = [];
        resolving = false;
        renderBoard();
      }, 700);
    }
  }

  // ---------- Start/reset board ----------
  function startGame() {
    roundToken++;
    moves = 0;
    matchedPairs = 0;
    flipped = [];
    resolving = false;
    gameFinished = false;
    moveCredits = 0;

    if (movesEl) movesEl.textContent = 'Moves: 0';
    if (statusEl) statusEl.textContent = 'In progress';
    if (endSec) endSec.style.display = 'none';
    if (bar) bar.style.width = '0%';
    if (quizDone) quizDone.style.display = 'none';

    const summary = document.getElementById('summary');
    if (summary) summary.textContent = '';

    cards = newDeck();
    updateCredits();
    renderBoard();
  }

  // ---------- CSV ----------
  function downloadAnswersCSV() {
    const headers = [
      'studentId',
      'round',
      'qIndex',
      'question',
      'chosen',
      'correct',
      'isCorrect',
      'timestamp',
      'movesOnFinish'
    ];

    const escapeCSV = value =>
      '"' + String(value ?? '').replaceAll('"', '""') + '"';

    const rows = answers.map(answer => [
      answer.studentId,
      answer.round,
      answer.qIndex,
      answer.question,
      answer.chosen,
      answer.correct,
      answer.isCorrect,
      answer.ts,
      moves
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob(
      ['\uFEFF' + csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestamp =
      new Date().toISOString().replace(/[:.]/g, '-');

    const filenameId =
      studentId.replace(/[^a-zA-Z0-9_-]/g, '');

    link.href = url;

    // Include the Qualtrics Response ID in the output filename.
    link.download =
      `memory_log_ext_wr_r1_${filenameId || 'anon'}_` +
      `${filenameResponseId}_round${playCount}_${timestamp}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Render quiz ----------
  function renderQuestion() {
    if (quizDone) quizDone.style.display = 'none';
    if (nextQ) nextQ.disabled = gameFinished;
    if (skipQ) skipQ.disabled = gameFinished;

    const idx = qIndex % QUESTIONS.length;
    const item = QUESTIONS[idx];

    if (qidxSpan) qidxSpan.textContent = String(idx + 1);
    if (qtext) qtext.textContent = item.q;
    if (optionsUl) optionsUl.innerHTML = '';
    if (feedback) feedback.style.display = 'none';

    lastChoiceIndex = null;

    item.options.forEach((option, choiceIdx) => {
      const li = document.createElement('li');
      const button = document.createElement('button');

      button.type = 'button';
      button.textContent = option;
      button.disabled = gameFinished;

      button.addEventListener('click', () =>
        chooseAnswer(choiceIdx, idx)
      );

      li.appendChild(button);
      if (optionsUl) optionsUl.appendChild(li);
    });
  }

  function recordAnswer(idx, chosen, isCorrect) {
    const item = QUESTIONS[idx];

    answers.push({
      studentId,
      round: playCount,
      qIndex: idx,
      question: item.q,
      chosen,
      correct: item.options[item.answer],
      isCorrect,
      ts: new Date().toISOString()
    });
  }

  function chooseAnswer(choiceIdx, idx) {
    if (gameFinished || lastChoiceIndex !== null) return;

    lastChoiceIndex = choiceIdx;

    const item = QUESTIONS[idx];
    const isCorrect = choiceIdx === item.answer;

    if (isCorrect) {
      correctCount++;
      moveCredits += 2;
      updateCredits();
    }

    if (feedback) {
      feedback.style.display = 'inline-block';
      feedback.textContent = isCorrect ? 'Correct ✅' : item.explain;
    }

    recordAnswer(idx, item.options[choiceIdx], isCorrect);

    if (scorePill) {
      scorePill.textContent = `Quiz: ${correctCount} correct`;
    }
  }

  if (nextQ) {
    nextQ.addEventListener('click', () => {
      if (gameFinished) return;

      const idx = qIndex % QUESTIONS.length;

      if (lastChoiceIndex === null) {
        recordAnswer(idx, '—', false);
      }

      qIndex++;
      renderQuestion();
    });
  }

  if (skipQ) {
    skipQ.addEventListener('click', () => {
      if (gameFinished) return;

      const idx = qIndex % QUESTIONS.length;

      if (lastChoiceIndex === null) {
        recordAnswer(idx, "I don't know", false);
      }

      qIndex++;
      renderQuestion();
    });
  }

  // ---------- Finish ----------
  function endGame() {
    gameFinished = true;

    if (bar) bar.style.width = '100%';
    if (statusEl) statusEl.textContent = 'Completed';
    if (endSec) endSec.style.display = 'block';

    const summary = document.getElementById('summary');

    if (summary) {
      summary.textContent = `Number of moves: ${moves}`;
    }

    if (nextQ) nextQ.disabled = true;
    if (skipQ) skipQ.disabled = true;

    if (optionsUl) {
      optionsUl.querySelectorAll('button').forEach(button => {
        button.disabled = true;
      });
    }

    renderBoard();

    if (finalScore && finalTotal && quizDone) {
      finalScore.textContent = String(correctCount);
      finalTotal.textContent = String(answers.length);
      quizDone.style.display = 'block';
    }

    downloadAnswersCSV();
  }

  // ---------- Begin ----------
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      const value = (idInput?.value || '').trim();

      if (!/^[0-9]{3}$/.test(value)) {
        alert('The ID must be three digits.');
        return;
      }

      studentId = value;

      if (uidPill) uidPill.textContent = `ID: ${studentId}`;
      if (startSec) startSec.style.display = 'none';
      if (splitSec) splitSec.style.display = 'block';

      qIndex = 0;
      correctCount = 0;
      answers.length = 0;

      if (scorePill) {
        scorePill.textContent = 'Quiz: 0 correct';
      }

      startGame();
      renderQuestion();
    });
  }

  // ---------- Restart ----------
  if (restartGameBtn) {
    restartGameBtn.addEventListener('click', () => {
      startGame();
      renderQuestion();
    });
  }

  // ---------- Additional round ----------
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      if (playCount >= maxPlays) {
        alert('Only one round is allowed.');
        return;
      }

      playCount++;

      if (roundPill) {
        roundPill.textContent =
          `Round: ${playCount} of ${maxPlays}`;
      }

      startGame();
      renderQuestion();
    });
  }

  // ---------- Manual download ----------
  if (downloadAnswers) {
    downloadAnswers.addEventListener('click', downloadAnswersCSV);
  }
});