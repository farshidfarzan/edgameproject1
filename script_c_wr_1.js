// ======= 4×4 Memory Game with CSV Output (Offline) =======
window.addEventListener('DOMContentLoaded', () => {
  // ---- Game limit: maximum 2 rounds ----
  let playCount = 0;
  const maxPlays = 2;

  // ---- Game state ----
  let studentId = '';
  let cards = [];
  let flippedCards = [];
  let matchedPairs = 0;   // Target = 8 pairs
  let moves = 0;
  let LOGS = [];          // CSV Rows

  // ---- DOM elements ----
  const statusEl     = document.getElementById('status');
  const uidPill      = document.getElementById('uid-pill');
  const movesEl      = document.getElementById('moves');
  const bar          = document.getElementById('bar');
  const start        = document.getElementById('start');
  const boardWrap    = document.getElementById('board-wrap');
  const beginBtn     = document.getElementById('begin');
  const idInput      = document.getElementById('studentId');
  const summary      = document.getElementById('summary');
  const end          = document.getElementById('end');
  const playAgainBtn = document.getElementById('playAgain');
  const downloadBtn  = document.getElementById('downloadBtn');
  const roundPill    = document.getElementById('round-pill'); // Optional

  // Some buttons/elements may not be present in the HTML; handle safely:
  if (downloadBtn) downloadBtn.disabled = true;

  // ---------- Define pairs ----------
  const PAIRS = [
    { base: "img1.png",  alts: ["img2.png",  "img22.png"] },
    { base: "img3.png",  alts: ["img4.png",  "img44.png"] },
    { base: "img5.png",  alts: ["img6.png",  "img66.png"] },
    { base: "img7.png",  alts: ["img8.png",  "img88.png"] },
    { base: "img9.png",  alts: ["img10.png", "img1010.png"] },
    { base: "img11.png", alts: ["img12.png", "img1212.png"] },
    { base: "img13.png", alts: ["img14.png", "img1414.png"] },
    { base: "img15.png", alts: ["img16.png", "img1616.png"] }
  ];

  // ---------- Helper functions ----------
  const nowISO = () => new Date().toISOString();

  function shuffle(array){
    for (let i = array.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------- Status / CSV ----------
  function resetState(){
    flippedCards = [];
    matchedPairs = 0;
    moves = 0;
    LOGS = [];

    if (statusEl) statusEl.textContent = 'Find all matching pairs';
    if (movesEl)  movesEl.textContent  = 'Moves: 0';
    if (bar)      bar.style.width      = '0%';
    if (downloadBtn) downloadBtn.disabled = true; // Keep locked until the end of the game
  }

  function downloadCSV(){
    if (!LOGS.length){
      alert('No activity has been recorded for download yet.');
      return;
    }
    const headers = ['student_id','move_index','card1_id','card1_value','card2_id','card2_value','match','timestamp_iso'];
    const esc = (v) => '"' + String(v == null ? '' : v).replaceAll('"','""') + '"';
    const lines = [headers.join(',')].concat(
      LOGS.map(r => headers.map(h => esc(r[h])).join(','))
    );
    const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memory_log_c_wr_1_${studentId || 'unknown'}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- Game logic ----------
  function handleResolve(){
    const [c1, c2] = flippedCards;
    const v1 = c1.getAttribute('data-match');
    const v2 = c2.getAttribute('data-match');
    const isMatch = v1 === v2;

    moves++;
    if (movesEl) movesEl.textContent = `Moves: ${moves}`;

    // Record each revealed pair
    LOGS.push({
      student_id: studentId,
      move_index: moves,
      card1_id: c1.id,
      card1_value: c1.getAttribute('data-image'),
      card2_id: c2.id,
      card2_value: c2.getAttribute('data-image'),
      match: isMatch ? 'TRUE' : 'FALSE',
      timestamp_iso: nowISO()
    });

    if (isMatch){
      c1.classList.add('matched'); c2.classList.add('matched');
      matchedPairs++;
      if (bar) bar.style.width = (matchedPairs / 8) * 100 + '%'; // 8 pairs total
      flippedCards = [];
      if (matchedPairs === 8){ finishGame(); }
    } else {
      setTimeout(() => {
        [c1,c2].forEach(card => {
          card.classList.remove('flipped');
          card.style.backgroundImage = "url('images/back.png')";
        });
        flippedCards = [];
      }, 800);
    }
  }

  function onCardClick(card){
    if (!boardWrap || boardWrap.style.display === 'none') return; // Not started yet
    if (card.classList.contains('matched')) return;
    if (card.classList.contains('flipped')) return;
    if (flippedCards.length === 2) return;

    card.classList.add('flipped');
    const img = card.getAttribute('data-image');
    card.style.backgroundImage = `url('images/${img}')`;
    flippedCards.push(card);

    if (flippedCards.length === 2){
      setTimeout(handleResolve, 550);
    }
  }

  // Create the card board: for each pair, use base + one of the alts, then shuffle randomly
  function setupBoard(){
    const board = document.getElementById('game-board');
    if (!board) return;

    const configs = [];
    PAIRS.forEach((pair, idx) => {
      const partner = pickOne(pair.alts);
      configs.push({ img: pair.base, match: idx });
      configs.push({ img: partner,   match: idx });
    });

    shuffle(configs);

    board.innerHTML = '';
    configs.forEach((cfg, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = `card${i+1}`;
      card.setAttribute('data-image', cfg.img);
      card.setAttribute('data-match', String(cfg.match));
      card.style.backgroundImage = "url('images/back.png')";
      card.addEventListener('click', () => onCardClick(card));
      board.appendChild(card);
    });

    cards = Array.from(board.querySelectorAll('.card'));
  }

  function finishGame(){
    if (statusEl) statusEl.textContent = 'Finished';
    if (boardWrap) boardWrap.style.display = 'none';
    if (end) end.style.display = 'block';
    if (summary) summary.textContent = `You completed the game in ${moves} moves.`;

    // Automatically download the CSV after each round is completed
    downloadCSV();

    // Enable the download button for manual download
    if (downloadBtn) downloadBtn.disabled = false;

    playCount++;

    // End of the first round: only show the "Start Second Round" button
    if (playCount === 1) {
      if (playAgainBtn){
        playAgainBtn.disabled = false;
        playAgainBtn.textContent = 'Start Second Round';
      }
      if (roundPill) roundPill.textContent = 'Round: Final';
      if (statusEl) statusEl.textContent = 'This stage has been completed successfully. Remember the code 1289 and close this window.';
    }

    // End of the second round: fully lock the game
    if (playCount >= maxPlays) {
      if (playAgainBtn) playAgainBtn.disabled = true;
      if (beginBtn)     beginBtn.disabled = true;
      if (roundPill)    roundPill.textContent = 'Round: Game Over';
      if (statusEl)     statusEl.textContent = 'The game is over — you have played twice.';
    }
  }

  // ---------- User interface ----------
  if (beginBtn){
    beginBtn.addEventListener('click', () => {
      if (playCount >= maxPlays) {
        alert('You have already played twice. No additional rounds are allowed.');
        return;
      }
      if (!idInput){
        alert('Student ID was not found.');
        return;
      }

      const id = idInput.value.trim();
      if (!id){
        idInput.focus();
        idInput.placeholder = 'Student ID is required';
        return;
      }

      studentId = id;
      if (uidPill) uidPill.textContent = `ID: ${studentId}`;

      // Current round indicator
      const currentRound = playCount + 1;
      if (roundPill) {
        roundPill.textContent = currentRound === 1 ? 'Round: First' : 'Round: Final';
      }

      // Enter the game
      if (start)    start.style.display = 'none';
      if (end)      end.style.display   = 'none';
      if (boardWrap) boardWrap.style.display = 'block';
      if (statusEl) statusEl.textContent = 'Find all matching pairs';

      resetState();
      setupBoard();
    });
  }

  // After the first round, this button is the only way to start the second round
  if (playAgainBtn){
    playAgainBtn.addEventListener('click', () => {
      if (playCount >= maxPlays) return;

      if (end)      end.style.display   = 'none';
      if (boardWrap) boardWrap.style.display = 'block';
      if (statusEl) statusEl.textContent = 'Find all matching pairs';
      if (roundPill) roundPill.textContent = 'Round: Final';

      resetState();
      setupBoard();
    });
  }

  // Manual download (protected)
  if (downloadBtn){
    downloadBtn.addEventListener('click', () => {
      if (matchedPairs < 8) {
        alert('To download, first complete all 8 pairs.');
        return;
      }
      downloadCSV();
    });
  }

  // ---------- Initial setup ----------
  resetState(); // The card board is created when the "Start" button is pressed
});
