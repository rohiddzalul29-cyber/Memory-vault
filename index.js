// =========================================================
// MEMORY VAULT — index.js (halaman publik)
// =========================================================

// ---- STATE ---------------------------------------------------------------
let memoriesCache = [];

// ---- ELEMEN ---------------------------------------------------------------
const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const loginPasswordInput = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginSubmitBtn = document.getElementById("login-submit");
const appContent = document.getElementById("app-content");
const logoutBtn = document.getElementById("logout-btn");

const SESSION_KEY = "mv_unlocked";

// =========================================================
// LOGIN
// =========================================================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = loginPasswordInput.value.trim();
  if (!password) return;

  loginError.textContent = "";
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.innerHTML = '<span class="spinner"></span>Memeriksa...';

  try {
    // Password TIDAK di-hardcode di frontend — dicek lewat RPC
    // "verify_site_password" yang membandingkan hash di Supabase.
    const { data, error } = await supabaseClient.rpc("verify_site_password", {
      input_password: password,
    });

    if (error) {
      console.error(error);
      loginError.textContent = "Terjadi kesalahan. Coba lagi.";
      return;
    }

    if (data === true) {
      sessionStorage.setItem(SESSION_KEY, "true");
      unlockVault();
    } else {
      loginError.textContent = "Password salah.";
    }
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = "Buka Vault";
  }
});

function unlockVault() {
  loginScreen.classList.add("hidden");
  appContent.classList.remove("hidden");
  loadMemories();
  renderQuotes();
  renderJournal();
  loadConfessions();
  loadSongs();
  loadBooks();
  loadMovies();
  loadCountdowns();
}

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  appContent.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginPasswordInput.value = "";
});

// =========================================================
// NAVIGASI TAB
// =========================================================
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".page-section");

function goToSection(target) {
  sections.forEach((s) => s.classList.toggle("is-active", s.id === target));
  navLinks.forEach((n) =>
    n.classList.toggle("is-active", n.dataset.target === target),
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => goToSection(link.dataset.target));
});

document.querySelectorAll("[data-goto]").forEach((btn) => {
  btn.addEventListener("click", () => goToSection(btn.dataset.goto));
});

// =========================================================
// MEMORIES (SCRAPBOOK)
// =========================================================
const scrapbookEl = document.getElementById("scrapbook");
const memoriesLoadingEl = document.getElementById("memories-loading");
const memoriesEmptyEl = document.getElementById("memories-empty");
const memoriesSearchInput = document.getElementById("memories-search");
const memoriesFiltersEl = document.getElementById("memories-filters");
const memoriesSortSelect = document.getElementById("memories-sort");

// Ikon hati murni tampilan — belum tersimpan ke database, reset saat reload.
const likedMemoryIds = new Set();

let memoriesSearchTerm = "";
let memoriesActiveFilter = "all";
let memoriesSortOrder = "latest";

async function loadMemories() {
  memoriesLoadingEl.classList.remove("hidden");
  memoriesEmptyEl.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("memories")
    .select("*")
    .order("memory_date", { ascending: false });

  memoriesLoadingEl.classList.add("hidden");

  if (error) {
    console.error(error);
    memoriesEmptyEl.textContent = "Gagal memuat memories.";
    memoriesEmptyEl.classList.remove("hidden");
    return;
  }

  memoriesCache = data || [];

  if (memoriesCache.length === 0) {
    memoriesEmptyEl.classList.remove("hidden");
    return;
  }

  applyMemoriesView();
}

// Gabungkan search + filter tipe + sort tanggal, lalu render ulang grid.
function applyMemoriesView() {
  let items = memoriesCache.slice();

  if (memoriesActiveFilter !== "all") {
    items = items.filter((m) => m.media_type === memoriesActiveFilter);
  }

  if (memoriesSearchTerm) {
    const term = memoriesSearchTerm.toLowerCase();
    items = items.filter(
      (m) =>
        (m.title || "").toLowerCase().includes(term) ||
        (m.caption || "").toLowerCase().includes(term),
    );
  }

  items.sort((a, b) => {
    const da = a.memory_date ? new Date(a.memory_date).getTime() : 0;
    const db = b.memory_date ? new Date(b.memory_date).getTime() : 0;
    return memoriesSortOrder === "oldest" ? da - db : db - da;
  });

  memoriesEmptyEl.classList.toggle("hidden", items.length > 0);
  if (items.length === 0) {
    memoriesEmptyEl.textContent = "Tidak ada memory yang cocok.";
  }

  renderScrapbook(items);
}

memoriesSearchInput?.addEventListener("input", (e) => {
  memoriesSearchTerm = e.target.value.trim();
  applyMemoriesView();
});

memoriesFiltersEl?.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-pill");
  if (!btn) return;
  memoriesActiveFilter = btn.dataset.filter;
  memoriesFiltersEl
    .querySelectorAll(".filter-pill")
    .forEach((p) => p.classList.toggle("is-active", p === btn));
  applyMemoriesView();
});

memoriesSortSelect?.addEventListener("change", (e) => {
  memoriesSortOrder = e.target.value;
  applyMemoriesView();
});

function renderScrapbook(items) {
  scrapbookEl.innerHTML = "";
  items.forEach((memory, index) => {
    const rotation = ((index * 37) % 10) - 5; // variasi rotasi -5 s/d 5 derajat, konsisten per index
    const card = document.createElement("div");
    card.className = "polaroid";
    card.style.transform = `rotate(${rotation}deg)`;

    const decoration =
      index % 2 === 0
        ? '<div class="polaroid__tape"></div>'
        : '<div class="polaroid__pin"></div>';

    const mediaHtml =
      memory.media_type === "video"
        ? `<video src="${memory.media_url}" muted playsinline></video>`
        : `<img src="${memory.media_url}" alt="${escapeHtml(memory.title)}" loading="lazy">`;

    const memoryId = memory.id ?? `idx-${index}`;
    const isLiked = likedMemoryIds.has(memoryId);

    card.innerHTML = `
      ${decoration}
      <div class="polaroid__frame">${mediaHtml}</div>
      ${memory.media_type === "video" ? '<div class="polaroid__video-badge">&#9654;</div>' : ""}
      ${memory.memory_date ? `<span class="polaroid__date">${formatDate(memory.memory_date)}</span>` : ""}
      <div class="polaroid__footer">
        <div class="polaroid__caption">${escapeHtml(memory.title)}</div>
        <button type="button" class="polaroid__like${isLiked ? " is-liked" : ""}" aria-label="Suka" data-id="${memoryId}">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.8-10.1-9.4C.4 8.6 1.7 5 5.2 4.2c2-.5 4 .3 5 2 1-1.7 3-2.5 5-2C18.7 5 20 8.6 18.5 11.6 15.5 16.2 12 21 12 21z"/></svg>
        </button>
      </div>
    `;

    card.querySelector(".polaroid__like").addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      const liked = likedMemoryIds.has(memoryId);
      if (liked) {
        likedMemoryIds.delete(memoryId);
      } else {
        likedMemoryIds.add(memoryId);
      }
      btn.classList.toggle("is-liked", !liked);
    });

    card.addEventListener("click", () => playPeelAnimation(card, memory));
    scrapbookEl.appendChild(card);
  });
}

// =========================================================
// ANIMASI "CABUT DARI SELOTIP" — dipicu saat foto/video diklik
// Urutan: sudut terkelupas sebentar -> terbang ke samping ->
// terbang maju & membesar ke tengah -> baru popup dibuka.
// =========================================================
let activePeelCard = null;

function prefersReducedMotion() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getCardRotation(card) {
  const match = /rotate\(([-\d.]+)deg\)/.exec(card.style.transform || "");
  return match ? parseFloat(match[1]) : 0;
}

function playPeelAnimation(card, memory) {
  // Kalau user memilih mode "reduced motion" di sistemnya, langsung buka popup saja.
  if (prefersReducedMotion() || typeof card.animate !== "function") {
    openMemoryModal(memory);
    return;
  }

  const rect = card.getBoundingClientRect();
  const rotation = getCardRotation(card);

  // Buat salinan kartu yang akan "terbang", diposisikan tepat di atas kartu asli.
  const clone = card.cloneNode(true);
  clone.classList.add("polaroid--flying");
  Object.assign(clone.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    zIndex: "60",
    pointerEvents: "none",
    transform: `rotate(${rotation}deg)`,
  });
  document.body.appendChild(clone);

  // Sembunyikan kartu asli sejenak — terasa seperti "slot"-nya kosong karena fotonya sedang dipegang.
  card.classList.add("polaroid--peeling");
  activePeelCard = card;

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const cardCenterX = rect.left + rect.width / 2;
  const sideDir = cardCenterX < viewportW / 2 ? -1 : 1; // terbang menjauhi tengah dulu
  const sidewaysX = sideDir * (rect.width * 0.85 + 60);
  const centerX = viewportW / 2 - rect.width / 2 - rect.left;
  const centerY = viewportH / 2 - rect.height / 2 - rect.top;

  const flight = clone.animate(
    [
      {
        transform: `translate(0px, 0px) rotate(${rotation}deg) scale(1)`,
        offset: 0,
      },
      {
        transform: `translate(6px, -16px) rotate(${rotation * 2.2}deg) scale(1.02)`,
        offset: 0.18,
      }, // sudut terkelupas
      {
        transform: `translate(${sidewaysX}px, -26px) rotate(${sideDir * 12}deg) scale(1.04)`,
        offset: 0.55,
      }, // terbang ke samping
      {
        transform: `translate(${centerX}px, ${centerY}px) rotate(0deg) scale(1.4)`,
        offset: 1,
      }, // terbang maju ke tengah
    ],
    {
      duration: 750,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      fill: "forwards",
    },
  );

  flight.onfinish = () => {
    clone.remove();
    openMemoryModal(memory);
  };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// =========================================================
// MODAL DETAIL
// =========================================================
const modal = document.getElementById("memory-modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalClose = document.getElementById("modal-close");
const modalMedia = document.getElementById("modal-media");
const modalTitle = document.getElementById("modal-title");
const modalCaption = document.getElementById("modal-caption");
const modalDescription = document.getElementById("modal-description");
const modalDate = document.getElementById("modal-date");

function openMemoryModal(memory) {
  modalMedia.innerHTML =
    memory.media_type === "video"
      ? `<video src="${memory.media_url}" controls autoplay></video>`
      : `<img src="${memory.media_url}" alt="${escapeHtml(memory.title)}">`;

  modalTitle.textContent = memory.title || "";
  modalCaption.textContent = memory.caption || "";
  modalDescription.textContent = memory.description || "";
  modalDate.textContent = formatDate(memory.memory_date);

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeMemoryModal() {
  modal.classList.add("hidden");
  modalMedia.innerHTML = "";
  document.body.style.overflow = "";

  if (activePeelCard) {
    activePeelCard.classList.remove("polaroid--peeling");
    activePeelCard = null;
  }
}

modalClose.addEventListener("click", closeMemoryModal);
modalBackdrop.addEventListener("click", closeMemoryModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMemoryModal();
});

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// =========================================================
// QUOTES — diambil dari Supabase
// =========================================================
async function renderQuotes() {
  const container = document.getElementById("quotes-list");
  container.innerHTML = `<p class="state-message">Memuat quotes...</p>`;

  const { data, error } = await supabaseClient
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = `<p class="state-message">Gagal memuat quotes.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p class="state-message">Belum ada quote. Tambahkan lewat dashboard.</p>`;
    return;
  }

  container.innerHTML = data
    .map(
      (q) => `
        <div class="quote-card">
          <p class="quote-card__text">&ldquo;${escapeHtml(q.quote_text)}&rdquo;</p>
          <p class="quote-card__author">&mdash; ${escapeHtml(q.author || "Anonim")}</p>
        </div>
      `,
    )
    .join("");
}

// =========================================================
// POPUP ISI LENGKAP — dipakai bersama oleh Journal & Curhat
// =========================================================
let journalCache = [];
let confessionsCache = [];

const textModal = document.getElementById("text-modal");
const textModalBackdrop = document.getElementById("text-modal-backdrop");
const textModalClose = document.getElementById("text-modal-close");
const textModalDate = document.getElementById("text-modal-date");
const textModalTitle = document.getElementById("text-modal-title");
const textModalContent = document.getElementById("text-modal-content");

// ---- Blok "Kirim pesan untuk Rohid" di dalam popup curhat ----------------
const textModalMessageBlock = document.getElementById("text-modal-message");
const curhatMessageForm = document.getElementById("curhat-message-form");
const curhatMessageNameInput = document.getElementById("curhat-message-name");
const curhatMessageTextInput = document.getElementById("curhat-message-text");
const curhatMessageError = document.getElementById("curhat-message-error");
const curhatMessageSuccess = document.getElementById("curhat-message-success");
const curhatMessageSubmitBtn = document.getElementById("curhat-message-submit");

// Menyimpan curhatan mana yang sedang dibuka, supaya saat form pesan
// dikirim kita tahu harus melampirkan judul curhatan yang mana.
// Bernilai null saat popup dibuka dari Journal (bukan Curhat).
let currentCurhatContext = null;

function resetCurhatMessageForm() {
  curhatMessageForm.reset();
  curhatMessageError.textContent = "";
  curhatMessageSuccess.classList.add("hidden");
  curhatMessageSubmitBtn.disabled = false;
  curhatMessageSubmitBtn.textContent = "Kirim Pesan";
}

function openTextModal(entry, type) {
  textModalDate.textContent = formatDate(entry.entry_date);
  textModalTitle.textContent = entry.title || "";
  textModalContent.textContent = entry.content || "";

  // Form pesan hanya ditampilkan kalau popup ini dibuka dari Curhat.
  if (type === "confession") {
    currentCurhatContext = { id: entry.id, title: entry.title || "" };
    textModalMessageBlock.classList.remove("hidden");
  } else {
    currentCurhatContext = null;
    textModalMessageBlock.classList.add("hidden");
  }
  resetCurhatMessageForm();

  textModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeTextModal() {
  textModal.classList.add("hidden");
  document.body.style.overflow = "";
}

curhatMessageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  curhatMessageError.textContent = "";
  curhatMessageSuccess.classList.add("hidden");

  const senderName = curhatMessageNameInput.value.trim();
  const messageText = curhatMessageTextInput.value.trim();

  if (!senderName) {
    curhatMessageError.textContent = "Nama wajib diisi.";
    return;
  }
  if (!messageText) {
    curhatMessageError.textContent = "Pesan tidak boleh kosong.";
    return;
  }

  curhatMessageSubmitBtn.disabled = true;
  curhatMessageSubmitBtn.innerHTML = '<span class="spinner"></span>Mengirim...';

  const { error } = await supabaseClient.from("messages").insert({
    sender_name: senderName,
    message: messageText,
    confession_id: currentCurhatContext ? currentCurhatContext.id : null,
    confession_title: currentCurhatContext ? currentCurhatContext.title : null,
  });

  curhatMessageSubmitBtn.disabled = false;
  curhatMessageSubmitBtn.textContent = "Kirim Pesan";

  if (error) {
    console.error(error);
    curhatMessageError.textContent = "Gagal mengirim pesan. Coba lagi.";
    return;
  }

  curhatMessageForm.reset();
  curhatMessageSuccess.classList.remove("hidden");
});

textModalClose.addEventListener("click", closeTextModal);
textModalBackdrop.addEventListener("click", closeTextModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !textModal.classList.contains("hidden"))
    closeTextModal();
});

// Ambil potongan singkat dari isi tulisan, untuk ditampilkan di card.
function makeExcerpt(text, maxLength = 110) {
  const clean = (text || "").trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trim() + "…";
}

// Render satu kelompok entri (journal / curhat) jadi kartu ringkas yang bisa diklik.
// `type` dipakai openTextModal untuk tahu apakah harus menampilkan form
// "Kirim pesan untuk Rohid" (hanya untuk type === "confession").
function renderTextEntryCards(container, entries, cache, type) {
  cache.length = 0;
  cache.push(...entries);

  container.innerHTML = entries
    .map(
      (entry, index) => `
        <div class="journal-entry" data-index="${index}" tabindex="0" role="button" aria-label="Buka ${escapeHtml(entry.title)}">
          <span class="journal-entry__date">${formatDate(entry.entry_date)}</span>
          <h4 class="journal-entry__title">${escapeHtml(entry.title)}</h4>
          <p class="journal-entry__text">${escapeHtml(makeExcerpt(entry.content))}</p>
          <span class="journal-entry__more">Baca selengkapnya</span>
        </div>
      `,
    )
    .join("");

  container.querySelectorAll(".journal-entry").forEach((card) => {
    const open = () => openTextModal(cache[Number(card.dataset.index)], type);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

// =========================================================
// JOURNAL — diambil dari Supabase
// =========================================================
async function renderJournal() {
  const container = document.getElementById("journal-list");
  container.innerHTML = `<p class="state-message">Memuat journal...</p>`;

  const { data, error } = await supabaseClient
    .from("journal_entries")
    .select("*")
    .order("entry_date", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = `<p class="state-message">Gagal memuat journal.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p class="state-message">Belum ada tulisan. Tambahkan lewat dashboard.</p>`;
    return;
  }

  renderTextEntryCards(container, data, journalCache, "journal");
}

// =========================================================
// CURHAT
// =========================================================
async function loadConfessions() {
  const container = document.getElementById("confessions-list");
  const loadingEl = document.getElementById("confessions-loading");
  const emptyEl = document.getElementById("confessions-empty");

  loadingEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("confessions")
    .select("*")
    .order("entry_date", { ascending: false });

  loadingEl.classList.add("hidden");

  if (error) {
    console.error(error);
    emptyEl.textContent = "Gagal memuat curhatan.";
    emptyEl.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    emptyEl.classList.remove("hidden");
    container.innerHTML = "";
    return;
  }

  renderTextEntryCards(container, data, confessionsCache, "confession");
}

// =========================================================
// PESAN — form umum di halaman "Pesan" (bukan dari curhatan tertentu)
// =========================================================
const generalMessageForm = document.getElementById("general-message-form");
const generalMessageNameInput = document.getElementById("general-message-name");
const generalMessageTextInput = document.getElementById("general-message-text");
const generalMessageError = document.getElementById("general-message-error");
const generalMessageSuccess = document.getElementById(
  "general-message-success",
);
const generalMessageSubmitBtn = document.getElementById(
  "general-message-submit",
);

generalMessageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  generalMessageError.textContent = "";
  generalMessageSuccess.classList.add("hidden");

  const senderName = generalMessageNameInput.value.trim();
  const messageText = generalMessageTextInput.value.trim();

  if (!senderName) {
    generalMessageError.textContent = "Nama wajib diisi.";
    return;
  }
  if (!messageText) {
    generalMessageError.textContent = "Pesan tidak boleh kosong.";
    return;
  }

  generalMessageSubmitBtn.disabled = true;
  generalMessageSubmitBtn.innerHTML =
    '<span class="spinner"></span>Mengirim...';

  // confession_id & confession_title sengaja dikosongkan (null) karena
  // pesan ini dikirim dari halaman "Pesan" umum, bukan dari curhatan
  // tertentu — di dashboard nanti tidak akan tampil keterangan asal
  // curhatan untuk pesan jenis ini.
  const { error } = await supabaseClient.from("messages").insert({
    sender_name: senderName,
    message: messageText,
    confession_id: null,
    confession_title: null,
  });

  generalMessageSubmitBtn.disabled = false;
  generalMessageSubmitBtn.textContent = "Kirim Pesan";

  if (error) {
    console.error(error);
    generalMessageError.textContent = "Gagal mengirim pesan. Coba lagi.";
    return;
  }

  generalMessageForm.reset();
  generalMessageSuccess.classList.remove("hidden");
});

// =========================================================
// LAGU FAVORIT — grid + popup player ala Spotify
// =========================================================
let songsCache = [];

async function loadSongs() {
  const grid = document.getElementById("songs-grid");
  const loadingEl = document.getElementById("songs-loading");
  const emptyEl = document.getElementById("songs-empty");

  loadingEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false });

  loadingEl.classList.add("hidden");

  if (error) {
    console.error(error);
    emptyEl.textContent = "Gagal memuat lagu.";
    emptyEl.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    emptyEl.classList.remove("hidden");
    grid.innerHTML = "";
    return;
  }

  songsCache = data;
  grid.innerHTML = data
    .map(
      (song, index) => `
        <div class="song-card" data-index="${index}">
          <div class="song-card__cover">
            ${song.cover_url ? `<img src="${song.cover_url}" alt="${escapeHtml(song.title)}" loading="lazy">` : ""}
            <div class="song-card__play-badge">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <div class="song-card__title">${escapeHtml(song.title)}</div>
          <div class="song-card__artist">${escapeHtml(song.artist || "")}</div>
        </div>
      `,
    )
    .join("");

  grid.querySelectorAll(".song-card").forEach((card) => {
    card.addEventListener("click", () =>
      openSongModal(songsCache[Number(card.dataset.index)]),
    );
  });
}

const songModal = document.getElementById("song-modal");
const songModalBackdrop = document.getElementById("song-modal-backdrop");
const songModalClose = document.getElementById("song-modal-close");
const songCoverImg = document.getElementById("song-cover-img");
const songArtSpin = document.getElementById("song-art-spin");
const songTitleEl = document.getElementById("song-title-el");
const songArtistEl = document.getElementById("song-artist-el");
const songNoteEl = document.getElementById("song-note-el");
const songPlayBtn = document.getElementById("song-play-btn");
const songIconPlay = document.getElementById("song-icon-play");
const songIconPause = document.getElementById("song-icon-pause");
const songAudioEl = document.getElementById("song-audio-el");
const songProgress = document.getElementById("song-progress");
const songTimeCurrent = document.getElementById("song-time-current");
const songTimeRemaining = document.getElementById("song-time-remaining");
const songBackBtn = document.getElementById("song-back-btn");
const songForwardBtn = document.getElementById("song-forward-btn");
const songVolume = document.getElementById("song-volume");

function openSongModal(song) {
  songCoverImg.src = song.cover_url || "";
  songTitleEl.textContent = song.title || "";
  songArtistEl.textContent = song.artist || "";
  songNoteEl.textContent = song.memory_note || "";
  songAudioEl.src = song.audio_url;

  songProgress.value = 0;
  songProgress.style.setProperty("--song-progress", "0%");
  songTimeCurrent.textContent = "0:00";
  songTimeRemaining.textContent = "-0:00";

  setSongPlayingState(false);
  songModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // Coba putar otomatis begitu popup terbuka.
  songAudioEl.play().catch(() => {
    /* Sebagian browser memblokir autoplay — user tinggal klik tombol play */
  });
}

function setSongPlayingState(isPlaying) {
  songArtSpin.classList.toggle("is-spinning", isPlaying);
  songIconPlay.classList.toggle("hidden", isPlaying);
  songIconPause.classList.toggle("hidden", !isPlaying);
}

function formatSongTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

songAudioEl.addEventListener("play", () => setSongPlayingState(true));
songAudioEl.addEventListener("pause", () => setSongPlayingState(false));
songAudioEl.addEventListener("ended", () => setSongPlayingState(false));

// Update progress bar & label waktu selagi lagu berjalan.
songAudioEl.addEventListener("timeupdate", () => {
  if (!songAudioEl.duration) return;
  const percent = (songAudioEl.currentTime / songAudioEl.duration) * 100;
  songProgress.value = percent;
  songProgress.style.setProperty("--song-progress", `${percent}%`);
  songTimeCurrent.textContent = formatSongTime(songAudioEl.currentTime);
  songTimeRemaining.textContent = `-${formatSongTime(
    songAudioEl.duration - songAudioEl.currentTime,
  )}`;
});

// User menggeser progress bar secara manual.
songProgress.addEventListener("input", () => {
  if (!songAudioEl.duration) return;
  const newTime = (Number(songProgress.value) / 100) * songAudioEl.duration;
  songAudioEl.currentTime = newTime;
  songProgress.style.setProperty("--song-progress", `${songProgress.value}%`);
});

songPlayBtn.addEventListener("click", () => {
  if (songAudioEl.paused) {
    songAudioEl.play();
  } else {
    songAudioEl.pause();
  }
});

songBackBtn.addEventListener("click", () => {
  songAudioEl.currentTime = Math.max(0, songAudioEl.currentTime - 10);
});

songForwardBtn.addEventListener("click", () => {
  songAudioEl.currentTime = Math.min(
    songAudioEl.duration || Infinity,
    songAudioEl.currentTime + 10,
  );
});

songVolume.addEventListener("input", () => {
  songAudioEl.volume = Number(songVolume.value);
});

function closeSongModal() {
  songAudioEl.pause();
  songAudioEl.currentTime = 0;
  songModal.classList.add("hidden");
  document.body.style.overflow = "";
}

songModalClose.addEventListener("click", closeSongModal);
songModalBackdrop.addEventListener("click", closeSongModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !songModal.classList.contains("hidden"))
    closeSongModal();
});

// =========================================================
// BOOK SHELF
// =========================================================
function starDisplay(rating) {
  const r = Number(rating) || 0;
  return "★".repeat(r) + "☆".repeat(5 - r);
}

async function loadBooks() {
  const grid = document.getElementById("books-grid");
  const loadingEl = document.getElementById("books-loading");
  const emptyEl = document.getElementById("books-empty");

  loadingEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  loadingEl.classList.add("hidden");

  if (error) {
    console.error(error);
    emptyEl.textContent = "Gagal memuat buku.";
    emptyEl.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    emptyEl.classList.remove("hidden");
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = data
    .map(
      (b) => `
        <div class="log-card">
          <div class="log-card__title">${escapeHtml(b.title)}</div>
          <div class="log-card__meta">${escapeHtml(b.author || "Penulis tidak diketahui")}${b.finished_date ? ` &middot; Selesai ${formatDate(b.finished_date)}` : ""}</div>
          <span class="log-card__stars">${starDisplay(b.rating)}</span>
          ${b.lesson ? `<div class="log-card__lesson"><span class="log-card__lesson-label">Pelajaran</span>${escapeHtml(b.lesson)}</div>` : ""}
        </div>
      `,
    )
    .join("");
}

// =========================================================
// MOVIE LOG
// =========================================================
async function loadMovies() {
  const grid = document.getElementById("movies-grid");
  const loadingEl = document.getElementById("movies-loading");
  const emptyEl = document.getElementById("movies-empty");

  loadingEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });

  loadingEl.classList.add("hidden");

  if (error) {
    console.error(error);
    emptyEl.textContent = "Gagal memuat film.";
    emptyEl.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    emptyEl.classList.remove("hidden");
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = data
    .map(
      (m) => `
        <div class="log-card">
          <div class="log-card__title">${escapeHtml(m.title)}</div>
          <div class="log-card__meta">${m.watched_date ? `Ditonton ${formatDate(m.watched_date)}` : ""}</div>
          <span class="log-card__stars">${starDisplay(m.rating)}</span>
          ${m.lesson ? `<div class="log-card__lesson"><span class="log-card__lesson-label">Pelajaran</span>${escapeHtml(m.lesson)}</div>` : ""}
        </div>
      `,
    )
    .join("");
}

// =========================================================
// BOM WAKTU (countdown)
// =========================================================
function computeCountdown(targetDateStr, isRecurring) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const original = new Date(targetDateStr + "T00:00:00");

  let target = original;
  if (isRecurring) {
    target = new Date(
      startOfToday.getFullYear(),
      original.getMonth(),
      original.getDate(),
    );
    if (target < startOfToday) {
      target = new Date(
        startOfToday.getFullYear() + 1,
        original.getMonth(),
        original.getDate(),
      );
    }
  }

  const diffMs = target - startOfToday;
  const totalDays = Math.round(diffMs / 86400000);

  if (totalDays === 0) return { isToday: true };

  const months = Math.floor(totalDays / 30);
  const remDays = totalDays % 30;
  return { isToday: false, totalDays, months, remDays };
}

async function loadCountdowns() {
  const grid = document.getElementById("countdowns-grid");
  const loadingEl = document.getElementById("countdowns-loading");
  const emptyEl = document.getElementById("countdowns-empty");

  loadingEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("countdowns")
    .select("*")
    .order("target_date", { ascending: true });

  loadingEl.classList.add("hidden");

  if (error) {
    console.error(error);
    emptyEl.textContent = "Gagal memuat hitung mundur.";
    emptyEl.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    emptyEl.classList.remove("hidden");
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = data
    .map((c) => {
      const result = computeCountdown(c.target_date, c.is_recurring);
      if (result.isToday) {
        return `
          <div class="countdown-card">
            <div class="countdown-card__title">${escapeHtml(c.title)}</div>
            <div class="countdown-card__today">Hari ini! 🎉</div>
          </div>
        `;
      }
      return `
        <div class="countdown-card">
          <div class="countdown-card__title">${escapeHtml(c.title)}</div>
          <span class="countdown-card__days-label">Hari lagi</span>
          <div class="countdown-card__days">${result.totalDays}</div>
          <div class="countdown-card__approx">&asymp; ${result.months} bulan ${result.remDays} hari lagi</div>
        </div>
      `;
    })
    .join("");
}

// =========================================================
// AUTO-LOGIN — dijalankan PALING TERAKHIR, setelah semua elemen
// di atas (Memories/Quotes/Journal) sudah didefinisikan, supaya
// tidak error saat halaman di-refresh dalam kondisi sudah login.
// =========================================================
if (sessionStorage.getItem(SESSION_KEY) === "true") {
  unlockVault();
}
