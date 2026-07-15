// =========================================================
// MEMORY VAULT — dashboard.js
// =========================================================

// ---- ELEMEN LOGIN ----------------------------------------------------
const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const loginPasswordInput = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginSubmitBtn = document.getElementById("login-submit");
const appContent = document.getElementById("app-content");
const logoutBtn = document.getElementById("logout-btn");

// ---- ELEMEN FORM ----------------------------------------------------
const memoryForm = document.getElementById("memory-form");
const formHeading = document.getElementById("form-heading");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const memoryIdInput = document.getElementById("memory-id");
const fieldTitle = document.getElementById("field-title");
const fieldCaption = document.getElementById("field-caption");
const fieldDescription = document.getElementById("field-description");
const fieldDate = document.getElementById("field-date");
const fieldMediaType = document.getElementById("field-media-type");
const fieldFile = document.getElementById("field-file");
const existingFileHint = document.getElementById("existing-file-hint");
const formError = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");

// ---- ELEMEN LIST ----------------------------------------------------
const listLoading = document.getElementById("list-loading");
const listEmpty = document.getElementById("list-empty");
const memoryListEl = document.getElementById("memory-list");

let editingMemory = null; // menyimpan data memory yang sedang diedit

// =========================================================
// AUTH — menggunakan Supabase Auth (email + password)
// Email sudah ditentukan di ADMIN_EMAIL (supabase-config.js),
// user hanya perlu memasukkan password.
// =========================================================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = loginPasswordInput.value.trim();
  if (!password) return;

  loginError.textContent = "";
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.innerHTML = '<span class="spinner"></span>Memeriksa...';

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password,
  });

  loginSubmitBtn.disabled = false;
  loginSubmitBtn.textContent = "Masuk";

  if (error) {
    loginError.textContent = "Password salah atau akun belum diatur.";
    return;
  }

  showDashboard();
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  appContent.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginPasswordInput.value = "";
});

async function showDashboard() {
  loginScreen.classList.add("hidden");
  appContent.classList.remove("hidden");
  loadMemories();
  loadQuotes();
  loadJournalEntries();
  loadConfessions();
  loadSongs();
  loadBooks();
  loadMovies();
  loadCountdowns();
}

// =========================================================
// TAB NAVIGATION (Memories / Quotes / Journal)
// =========================================================
const dashTabButtons = document.querySelectorAll("#dash-tabs .nav-link");
const dashTabPanels = document.querySelectorAll(".dash-tab");

dashTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    dashTabButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
    dashTabPanels.forEach((panel) =>
      panel.classList.toggle("is-active", panel.id === btn.dataset.tab),
    );
  });
});

// Jika sudah ada sesi login aktif (refresh halaman), langsung masuk.
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showDashboard();
  }
})();

// =========================================================
// MEMUAT DAFTAR MEMORY
// =========================================================
async function loadMemories() {
  listLoading.classList.remove("hidden");
  listEmpty.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("memories")
    .select("*")
    .order("memory_date", { ascending: false });

  listLoading.classList.add("hidden");

  if (error) {
    console.error(error);
    listEmpty.textContent = "Gagal memuat data.";
    listEmpty.classList.remove("hidden");
    return;
  }

  if (!data || data.length === 0) {
    listEmpty.classList.remove("hidden");
    memoryListEl.innerHTML = "";
    return;
  }

  renderMemoryList(data);
}

function renderMemoryList(items) {
  memoryListEl.innerHTML = items
    .map((m) => {
      const thumb =
        m.media_type === "video"
          ? `<video class="memory-row__thumb" src="${m.media_url}" muted></video>`
          : `<img class="memory-row__thumb" src="${m.media_url}" alt="">`;
      return `
        <div class="memory-row" data-id="${m.id}">
          ${thumb}
          <div class="memory-row__info">
            <div class="memory-row__title">${escapeHtml(m.title)}</div>
            <div class="memory-row__meta">${formatDate(m.memory_date)} &middot; ${m.media_type === "video" ? "Video" : "Foto"}</div>
          </div>
          <div class="memory-row__actions">
            <button class="btn-edit" data-action="edit" data-id="${m.id}">Edit</button>
            <button class="btn-danger" data-action="delete" data-id="${m.id}">Hapus</button>
          </div>
        </div>
      `;
    })
    .join("");

  memoryListEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.dataset.id, items));
  });
  memoryListEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteMemory(btn.dataset.id, items));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// =========================================================
// EDIT
// =========================================================
function startEdit(id, items) {
  const memory = items.find((m) => String(m.id) === String(id));
  if (!memory) return;

  editingMemory = memory;
  memoryIdInput.value = memory.id;
  fieldTitle.value = memory.title || "";
  fieldCaption.value = memory.caption || "";
  fieldDescription.value = memory.description || "";
  fieldDate.value = memory.memory_date || "";
  fieldMediaType.value = memory.media_type || "image";
  fieldFile.value = "";
  existingFileHint.textContent =
    "Biarkan kosong jika tidak ingin mengganti file.";

  formHeading.textContent = "Edit Memory";
  cancelEditBtn.classList.remove("hidden");
  submitBtn.textContent = "Simpan Perubahan";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

cancelEditBtn.addEventListener("click", resetForm);

function resetForm() {
  editingMemory = null;
  memoryForm.reset();
  memoryIdInput.value = "";
  existingFileHint.textContent = "";
  formHeading.textContent = "Tambah Memory Baru";
  cancelEditBtn.classList.add("hidden");
  submitBtn.textContent = "Simpan Memory";
  formError.textContent = "";
}

// =========================================================
// SIMPAN (TAMBAH / UPDATE)
// =========================================================
memoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const isEdit = Boolean(memoryIdInput.value);
  const file = fieldFile.files[0];

  if (!isEdit && !file) {
    formError.textContent = "Pilih foto atau video untuk memory baru.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try {
    let mediaUrl = editingMemory ? editingMemory.media_url : null;

    if (file) {
      const uploadedUrl = await uploadMediaFile(file);
      if (!uploadedUrl) {
        formError.textContent = "Gagal mengunggah file.";
        return;
      }
      mediaUrl = uploadedUrl;
    }

    const payload = {
      title: fieldTitle.value.trim(),
      caption: fieldCaption.value.trim(),
      description: fieldDescription.value.trim(),
      memory_date: fieldDate.value,
      media_type: fieldMediaType.value,
      media_url: mediaUrl,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabaseClient
        .from("memories")
        .update(payload)
        .eq("id", memoryIdInput.value));
    } else {
      ({ error } = await supabaseClient.from("memories").insert(payload));
    }

    if (error) {
      console.error(error);
      formError.textContent = "Gagal menyimpan ke database.";
      return;
    }

    resetForm();
    loadMemories();
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = memoryIdInput.value
      ? "Simpan Perubahan"
      : "Simpan Memory";
  }
});

async function uploadMediaFile(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}_${safeName}`;

  const { error } = await supabaseClient.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error(error);
    return null;
  }

  const { data } = supabaseClient.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// =========================================================
// HAPUS
// =========================================================
async function deleteMemory(id, items) {
  const memory = items.find((m) => String(m.id) === String(id));
  if (!memory) return;

  const confirmed = confirm(
    `Hapus memory "${memory.title}"? Tindakan ini tidak bisa dibatalkan.`,
  );
  if (!confirmed) return;

  // Hapus file di storage (jika ada) berdasarkan nama file di media_url.
  try {
    const fileName = memory.media_url.split("/").pop();
    await supabaseClient.storage.from(MEDIA_BUCKET).remove([fileName]);
  } catch (err) {
    console.warn("Gagal menghapus file storage, melanjutkan hapus data:", err);
  }

  const { error } = await supabaseClient.from("memories").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Gagal menghapus memory.");
    return;
  }

  if (editingMemory && String(editingMemory.id) === String(id)) {
    resetForm();
  }
  loadMemories();
}

// =========================================================
// QUOTES — elemen
// =========================================================
const quoteForm = document.getElementById("quote-form");
const quoteFormHeading = document.getElementById("quote-form-heading");
const quoteCancelEditBtn = document.getElementById("quote-cancel-edit-btn");
const quoteIdInput = document.getElementById("quote-id");
const quoteTextInput = document.getElementById("quote-text");
const quoteAuthorInput = document.getElementById("quote-author");
const quoteFormError = document.getElementById("quote-form-error");
const quoteSubmitBtn = document.getElementById("quote-submit-btn");
const quoteListLoading = document.getElementById("quote-list-loading");
const quoteListEmpty = document.getElementById("quote-list-empty");
const quoteListEl = document.getElementById("quote-list");

let editingQuote = null;

async function loadQuotes() {
  quoteListLoading.classList.remove("hidden");
  quoteListEmpty.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  quoteListLoading.classList.add("hidden");

  if (error) {
    console.error(error);
    quoteListEmpty.textContent = "Gagal memuat data.";
    quoteListEmpty.classList.remove("hidden");
    return;
  }

  if (!data || data.length === 0) {
    quoteListEmpty.classList.remove("hidden");
    quoteListEl.innerHTML = "";
    return;
  }

  renderQuoteList(data);
}

function renderQuoteList(items) {
  quoteListEl.innerHTML = items
    .map(
      (q) => `
        <div class="memory-row" data-id="${q.id}">
          <div class="memory-row__info">
            <div class="memory-row__title">&ldquo;${escapeHtml(q.quote_text)}&rdquo;</div>
            <div class="memory-row__meta">${escapeHtml(q.author || "Anonim")}</div>
          </div>
          <div class="memory-row__actions">
            <button class="btn-edit" data-action="edit" data-id="${q.id}">Edit</button>
            <button class="btn-danger" data-action="delete" data-id="${q.id}">Hapus</button>
          </div>
        </div>
      `,
    )
    .join("");

  quoteListEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => startEditQuote(btn.dataset.id, items));
  });
  quoteListEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteQuote(btn.dataset.id));
  });
}

function startEditQuote(id, items) {
  const quote = items.find((q) => String(q.id) === String(id));
  if (!quote) return;

  editingQuote = quote;
  quoteIdInput.value = quote.id;
  quoteTextInput.value = quote.quote_text || "";
  quoteAuthorInput.value = quote.author || "";

  quoteFormHeading.textContent = "Edit Quote";
  quoteCancelEditBtn.classList.remove("hidden");
  quoteSubmitBtn.textContent = "Simpan Perubahan";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

quoteCancelEditBtn.addEventListener("click", resetQuoteForm);

function resetQuoteForm() {
  editingQuote = null;
  quoteForm.reset();
  quoteIdInput.value = "";
  quoteFormHeading.textContent = "Tambah Quote Baru";
  quoteCancelEditBtn.classList.add("hidden");
  quoteSubmitBtn.textContent = "Simpan Quote";
  quoteFormError.textContent = "";
}

quoteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  quoteFormError.textContent = "";

  const isEdit = Boolean(quoteIdInput.value);
  const payload = {
    quote_text: quoteTextInput.value.trim(),
    author: quoteAuthorInput.value.trim(),
  };

  quoteSubmitBtn.disabled = true;
  quoteSubmitBtn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try {
    let error;
    if (isEdit) {
      ({ error } = await supabaseClient
        .from("quotes")
        .update(payload)
        .eq("id", quoteIdInput.value));
    } else {
      ({ error } = await supabaseClient.from("quotes").insert(payload));
    }

    if (error) {
      console.error(error);
      quoteFormError.textContent = "Gagal menyimpan ke database.";
      return;
    }

    resetQuoteForm();
    loadQuotes();
  } finally {
    quoteSubmitBtn.disabled = false;
    quoteSubmitBtn.textContent = quoteIdInput.value
      ? "Simpan Perubahan"
      : "Simpan Quote";
  }
});

async function deleteQuote(id) {
  const confirmed = confirm(
    "Hapus quote ini? Tindakan ini tidak bisa dibatalkan.",
  );
  if (!confirmed) return;

  const { error } = await supabaseClient.from("quotes").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Gagal menghapus quote.");
    return;
  }

  if (editingQuote && String(editingQuote.id) === String(id)) {
    resetQuoteForm();
  }
  loadQuotes();
}

// =========================================================
// JOURNAL — elemen
// =========================================================
const journalForm = document.getElementById("journal-form");
const journalFormHeading = document.getElementById("journal-form-heading");
const journalCancelEditBtn = document.getElementById("journal-cancel-edit-btn");
const journalIdInput = document.getElementById("journal-id");
const journalTitleInput = document.getElementById("journal-title");
const journalDateInput = document.getElementById("journal-date");
const journalContentInput = document.getElementById("journal-content");
const journalFormError = document.getElementById("journal-form-error");
const journalSubmitBtn = document.getElementById("journal-submit-btn");
const journalListLoading = document.getElementById("journal-list-loading");
const journalListEmpty = document.getElementById("journal-list-empty");
const journalListEl = document.getElementById("journal-list");

let editingJournalEntry = null;

async function loadJournalEntries() {
  journalListLoading.classList.remove("hidden");
  journalListEmpty.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("journal_entries")
    .select("*")
    .order("entry_date", { ascending: false });

  journalListLoading.classList.add("hidden");

  if (error) {
    console.error(error);
    journalListEmpty.textContent = "Gagal memuat data.";
    journalListEmpty.classList.remove("hidden");
    return;
  }

  if (!data || data.length === 0) {
    journalListEmpty.classList.remove("hidden");
    journalListEl.innerHTML = "";
    return;
  }

  renderJournalList(data);
}

function renderJournalList(items) {
  journalListEl.innerHTML = items
    .map(
      (j) => `
        <div class="memory-row" data-id="${j.id}">
          <div class="memory-row__info">
            <div class="memory-row__title">${escapeHtml(j.title)}</div>
            <div class="memory-row__meta">${formatDate(j.entry_date)}</div>
          </div>
          <div class="memory-row__actions">
            <button class="btn-edit" data-action="edit" data-id="${j.id}">Edit</button>
            <button class="btn-danger" data-action="delete" data-id="${j.id}">Hapus</button>
          </div>
        </div>
      `,
    )
    .join("");

  journalListEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () =>
      startEditJournalEntry(btn.dataset.id, items),
    );
  });
  journalListEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteJournalEntry(btn.dataset.id));
  });
}

function startEditJournalEntry(id, items) {
  const entry = items.find((j) => String(j.id) === String(id));
  if (!entry) return;

  editingJournalEntry = entry;
  journalIdInput.value = entry.id;
  journalTitleInput.value = entry.title || "";
  journalDateInput.value = entry.entry_date || "";
  journalContentInput.value = entry.content || "";

  journalFormHeading.textContent = "Edit Entri Journal";
  journalCancelEditBtn.classList.remove("hidden");
  journalSubmitBtn.textContent = "Simpan Perubahan";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

journalCancelEditBtn.addEventListener("click", resetJournalForm);

function resetJournalForm() {
  editingJournalEntry = null;
  journalForm.reset();
  journalIdInput.value = "";
  journalFormHeading.textContent = "Tambah Entri Journal";
  journalCancelEditBtn.classList.add("hidden");
  journalSubmitBtn.textContent = "Simpan Entri";
  journalFormError.textContent = "";
}

journalForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  journalFormError.textContent = "";

  const isEdit = Boolean(journalIdInput.value);
  const payload = {
    title: journalTitleInput.value.trim(),
    entry_date: journalDateInput.value,
    content: journalContentInput.value.trim(),
  };

  journalSubmitBtn.disabled = true;
  journalSubmitBtn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try {
    let error;
    if (isEdit) {
      ({ error } = await supabaseClient
        .from("journal_entries")
        .update(payload)
        .eq("id", journalIdInput.value));
    } else {
      ({ error } = await supabaseClient
        .from("journal_entries")
        .insert(payload));
    }

    if (error) {
      console.error(error);
      journalFormError.textContent = "Gagal menyimpan ke database.";
      return;
    }

    resetJournalForm();
    loadJournalEntries();
  } finally {
    journalSubmitBtn.disabled = false;
    journalSubmitBtn.textContent = journalIdInput.value
      ? "Simpan Perubahan"
      : "Simpan Entri";
  }
});

async function deleteJournalEntry(id) {
  const confirmed = confirm(
    "Hapus entri journal ini? Tindakan ini tidak bisa dibatalkan.",
  );
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("journal_entries")
    .delete()
    .eq("id", id);
  if (error) {
    console.error(error);
    alert("Gagal menghapus entri.");
    return;
  }

  if (editingJournalEntry && String(editingJournalEntry.id) === String(id)) {
    resetJournalForm();
  }
  loadJournalEntries();
}

// =========================================================
// CURHAT (confessions) — elemen
// =========================================================
const confessionForm = document.getElementById("confession-form");
const confessionFormHeading = document.getElementById(
  "confession-form-heading",
);
const confessionCancelEditBtn = document.getElementById(
  "confession-cancel-edit-btn",
);
const confessionIdInput = document.getElementById("confession-id");
const confessionTitleInput = document.getElementById("confession-title");
const confessionDateInput = document.getElementById("confession-date");
const confessionContentInput = document.getElementById("confession-content");
const confessionFormError = document.getElementById("confession-form-error");
const confessionSubmitBtn = document.getElementById("confession-submit-btn");
const confessionListLoading = document.getElementById(
  "confession-list-loading",
);
const confessionListEmpty = document.getElementById("confession-list-empty");
const confessionListEl = document.getElementById("confession-list");

let editingConfession = null;

async function loadConfessions() {
  confessionListLoading.classList.remove("hidden");
  confessionListEmpty.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("confessions")
    .select("*")
    .order("entry_date", { ascending: false });
  confessionListLoading.classList.add("hidden");

  if (error) {
    console.error(error);
    confessionListEmpty.textContent = "Gagal memuat data.";
    confessionListEmpty.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    confessionListEmpty.classList.remove("hidden");
    confessionListEl.innerHTML = "";
    return;
  }
  renderConfessionList(data);
}

function renderConfessionList(items) {
  confessionListEl.innerHTML = items
    .map(
      (c) => `
    <div class="memory-row" data-id="${c.id}">
      <div class="memory-row__info">
        <div class="memory-row__title">${escapeHtml(c.title)}</div>
        <div class="memory-row__meta">${formatDate(c.entry_date)}</div>
      </div>
      <div class="memory-row__actions">
        <button class="btn-edit" data-action="edit" data-id="${c.id}">Edit</button>
        <button class="btn-danger" data-action="delete" data-id="${c.id}">Hapus</button>
      </div>
    </div>
  `,
    )
    .join("");

  confessionListEl
    .querySelectorAll('[data-action="edit"]')
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        startEditConfession(btn.dataset.id, items),
      ),
    );
  confessionListEl
    .querySelectorAll('[data-action="delete"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteConfession(btn.dataset.id)),
    );
}

function startEditConfession(id, items) {
  const item = items.find((c) => String(c.id) === String(id));
  if (!item) return;
  editingConfession = item;
  confessionIdInput.value = item.id;
  confessionTitleInput.value = item.title || "";
  confessionDateInput.value = item.entry_date || "";
  confessionContentInput.value = item.content || "";
  confessionFormHeading.textContent = "Edit Curhatan";
  confessionCancelEditBtn.classList.remove("hidden");
  confessionSubmitBtn.textContent = "Simpan Perubahan";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

confessionCancelEditBtn.addEventListener("click", resetConfessionForm);

function resetConfessionForm() {
  editingConfession = null;
  confessionForm.reset();
  confessionIdInput.value = "";
  confessionFormHeading.textContent = "Tambah Curhatan";
  confessionCancelEditBtn.classList.add("hidden");
  confessionSubmitBtn.textContent = "Simpan Curhatan";
  confessionFormError.textContent = "";
}

confessionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  confessionFormError.textContent = "";
  const isEdit = Boolean(confessionIdInput.value);
  const payload = {
    title: confessionTitleInput.value.trim(),
    entry_date: confessionDateInput.value,
    content: confessionContentInput.value.trim(),
  };

  confessionSubmitBtn.disabled = true;
  confessionSubmitBtn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try {
    let error;
    if (isEdit) {
      ({ error } = await supabaseClient
        .from("confessions")
        .update(payload)
        .eq("id", confessionIdInput.value));
    } else {
      ({ error } = await supabaseClient.from("confessions").insert(payload));
    }
    if (error) {
      console.error(error);
      confessionFormError.textContent = "Gagal menyimpan ke database.";
      return;
    }
    resetConfessionForm();
    loadConfessions();
  } finally {
    confessionSubmitBtn.disabled = false;
    confessionSubmitBtn.textContent = confessionIdInput.value
      ? "Simpan Perubahan"
      : "Simpan Curhatan";
  }
});

async function deleteConfession(id) {
  if (!confirm("Hapus curhatan ini? Tindakan ini tidak bisa dibatalkan."))
    return;
  const { error } = await supabaseClient
    .from("confessions")
    .delete()
    .eq("id", id);
  if (error) {
    console.error(error);
    alert("Gagal menghapus curhatan.");
    return;
  }
  if (editingConfession && String(editingConfession.id) === String(id))
    resetConfessionForm();
  loadConfessions();
}

// =========================================================
// LAGU FAVORIT (songs) — elemen
// =========================================================
const songForm = document.getElementById("song-form");
const songFormHeading = document.getElementById("song-form-heading");
const songCancelEditBtn = document.getElementById("song-cancel-edit-btn");
const songIdInput = document.getElementById("song-id");
const songTitleInput = document.getElementById("song-title");
const songArtistInput = document.getElementById("song-artist");
const songNoteInput = document.getElementById("song-note");
const songCoverInput = document.getElementById("song-cover");
const songAudioInput = document.getElementById("song-audio");
const songExistingCoverHint = document.getElementById(
  "song-existing-cover-hint",
);
const songExistingAudioHint = document.getElementById(
  "song-existing-audio-hint",
);
const songFormError = document.getElementById("song-form-error");
const songSubmitBtn = document.getElementById("song-submit-btn");
const songListLoading = document.getElementById("song-list-loading");
const songListEmpty = document.getElementById("song-list-empty");
const songListEl = document.getElementById("song-list");

let editingSong = null;

async function loadSongs() {
  songListLoading.classList.remove("hidden");
  songListEmpty.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false });
  songListLoading.classList.add("hidden");

  if (error) {
    console.error(error);
    songListEmpty.textContent = "Gagal memuat data.";
    songListEmpty.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    songListEmpty.classList.remove("hidden");
    songListEl.innerHTML = "";
    return;
  }
  renderSongList(data);
}

function renderSongList(items) {
  songListEl.innerHTML = items
    .map(
      (s) => `
    <div class="memory-row" data-id="${s.id}">
      ${s.cover_url ? `<img class="memory-row__thumb" src="${s.cover_url}" alt="">` : ""}
      <div class="memory-row__info">
        <div class="memory-row__title">${escapeHtml(s.title)}</div>
        <div class="memory-row__meta">${escapeHtml(s.artist || "Tidak diketahui")}</div>
      </div>
      <div class="memory-row__actions">
        <button class="btn-edit" data-action="edit" data-id="${s.id}">Edit</button>
        <button class="btn-danger" data-action="delete" data-id="${s.id}">Hapus</button>
      </div>
    </div>
  `,
    )
    .join("");

  songListEl
    .querySelectorAll('[data-action="edit"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => startEditSong(btn.dataset.id, items)),
    );
  songListEl
    .querySelectorAll('[data-action="delete"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteSong(btn.dataset.id)),
    );
}

function startEditSong(id, items) {
  const item = items.find((s) => String(s.id) === String(id));
  if (!item) return;
  editingSong = item;
  songIdInput.value = item.id;
  songTitleInput.value = item.title || "";
  songArtistInput.value = item.artist || "";
  songNoteInput.value = item.memory_note || "";
  songCoverInput.value = "";
  songAudioInput.value = "";
  songExistingCoverHint.textContent = item.cover_url
    ? "Biarkan kosong jika tidak ingin mengganti cover."
    : "";
  songExistingAudioHint.textContent =
    "Biarkan kosong jika tidak ingin mengganti file lagu.";
  songFormHeading.textContent = "Edit Lagu";
  songCancelEditBtn.classList.remove("hidden");
  songSubmitBtn.textContent = "Simpan Perubahan";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

songCancelEditBtn.addEventListener("click", resetSongForm);

function resetSongForm() {
  editingSong = null;
  songForm.reset();
  songIdInput.value = "";
  songExistingCoverHint.textContent = "";
  songExistingAudioHint.textContent = "";
  songFormHeading.textContent = "Tambah Lagu Favorit";
  songCancelEditBtn.classList.add("hidden");
  songSubmitBtn.textContent = "Simpan Lagu";
  songFormError.textContent = "";
}

songForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  songFormError.textContent = "";
  const isEdit = Boolean(songIdInput.value);
  const coverFile = songCoverInput.files[0];
  const audioFile = songAudioInput.files[0];

  if (!isEdit && !audioFile) {
    songFormError.textContent = "Pilih file mp3 untuk lagu baru.";
    return;
  }

  songSubmitBtn.disabled = true;
  songSubmitBtn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try {
    let coverUrl = editingSong ? editingSong.cover_url : null;
    let audioUrl = editingSong ? editingSong.audio_url : null;

    if (coverFile) {
      const uploaded = await uploadMediaFile(coverFile);
      if (!uploaded) {
        songFormError.textContent = "Gagal mengunggah cover.";
        return;
      }
      coverUrl = uploaded;
    }
    if (audioFile) {
      const uploaded = await uploadMediaFile(audioFile);
      if (!uploaded) {
        songFormError.textContent = "Gagal mengunggah file lagu.";
        return;
      }
      audioUrl = uploaded;
    }

    const payload = {
      title: songTitleInput.value.trim(),
      artist: songArtistInput.value.trim(),
      memory_note: songNoteInput.value.trim(),
      cover_url: coverUrl,
      audio_url: audioUrl,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabaseClient
        .from("songs")
        .update(payload)
        .eq("id", songIdInput.value));
    } else {
      ({ error } = await supabaseClient.from("songs").insert(payload));
    }
    if (error) {
      console.error(error);
      songFormError.textContent = "Gagal menyimpan ke database.";
      return;
    }
    resetSongForm();
    loadSongs();
  } finally {
    songSubmitBtn.disabled = false;
    songSubmitBtn.textContent = songIdInput.value
      ? "Simpan Perubahan"
      : "Simpan Lagu";
  }
});

async function deleteSong(id) {
  if (!confirm("Hapus lagu ini? Tindakan ini tidak bisa dibatalkan.")) return;
  const { error } = await supabaseClient.from("songs").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Gagal menghapus lagu.");
    return;
  }
  if (editingSong && String(editingSong.id) === String(id)) resetSongForm();
  loadSongs();
}

// =========================================================
// BOOK SHELF (books) — elemen
// =========================================================
const bookForm = document.getElementById("book-form");
const bookFormHeading = document.getElementById("book-form-heading");
const bookCancelEditBtn = document.getElementById("book-cancel-edit-btn");
const bookIdInput = document.getElementById("book-id");
const bookTitleInput = document.getElementById("book-title");
const bookAuthorInput = document.getElementById("book-author");
const bookRatingInput = document.getElementById("book-rating");
const bookFinishedDateInput = document.getElementById("book-finished-date");
const bookLessonInput = document.getElementById("book-lesson");
const bookFormError = document.getElementById("book-form-error");
const bookSubmitBtn = document.getElementById("book-submit-btn");
const bookListLoading = document.getElementById("book-list-loading");
const bookListEmpty = document.getElementById("book-list-empty");
const bookListEl = document.getElementById("book-list");

let editingBook = null;

function starString(rating) {
  const r = Number(rating) || 0;
  return "★".repeat(r) + "☆".repeat(5 - r);
}

async function loadBooks() {
  bookListLoading.classList.remove("hidden");
  bookListEmpty.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });
  bookListLoading.classList.add("hidden");

  if (error) {
    console.error(error);
    bookListEmpty.textContent = "Gagal memuat data.";
    bookListEmpty.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    bookListEmpty.classList.remove("hidden");
    bookListEl.innerHTML = "";
    return;
  }
  renderBookList(data);
}

function renderBookList(items) {
  bookListEl.innerHTML = items
    .map(
      (b) => `
    <div class="memory-row" data-id="${b.id}">
      <div class="memory-row__info">
        <div class="memory-row__title">${escapeHtml(b.title)}</div>
        <div class="memory-row__meta"><span class="memory-row__stars">${starString(b.rating)}</span> &middot; ${escapeHtml(b.author || "")}</div>
      </div>
      <div class="memory-row__actions">
        <button class="btn-edit" data-action="edit" data-id="${b.id}">Edit</button>
        <button class="btn-danger" data-action="delete" data-id="${b.id}">Hapus</button>
      </div>
    </div>
  `,
    )
    .join("");

  bookListEl
    .querySelectorAll('[data-action="edit"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => startEditBook(btn.dataset.id, items)),
    );
  bookListEl
    .querySelectorAll('[data-action="delete"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteBook(btn.dataset.id)),
    );
}

function startEditBook(id, items) {
  const item = items.find((b) => String(b.id) === String(id));
  if (!item) return;
  editingBook = item;
  bookIdInput.value = item.id;
  bookTitleInput.value = item.title || "";
  bookAuthorInput.value = item.author || "";
  bookRatingInput.value = String(item.rating || 5);
  bookFinishedDateInput.value = item.finished_date || "";
  bookLessonInput.value = item.lesson || "";
  bookFormHeading.textContent = "Edit Buku";
  bookCancelEditBtn.classList.remove("hidden");
  bookSubmitBtn.textContent = "Simpan Perubahan";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

bookCancelEditBtn.addEventListener("click", resetBookForm);

function resetBookForm() {
  editingBook = null;
  bookForm.reset();
  bookIdInput.value = "";
  bookFormHeading.textContent = "Tambah Buku";
  bookCancelEditBtn.classList.add("hidden");
  bookSubmitBtn.textContent = "Simpan Buku";
  bookFormError.textContent = "";
}

bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  bookFormError.textContent = "";
  const isEdit = Boolean(bookIdInput.value);
  const payload = {
    title: bookTitleInput.value.trim(),
    author: bookAuthorInput.value.trim(),
    rating: Number(bookRatingInput.value),
    finished_date: bookFinishedDateInput.value || null,
    lesson: bookLessonInput.value.trim(),
  };

  bookSubmitBtn.disabled = true;
  bookSubmitBtn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try {
    let error;
    if (isEdit) {
      ({ error } = await supabaseClient
        .from("books")
        .update(payload)
        .eq("id", bookIdInput.value));
    } else {
      ({ error } = await supabaseClient.from("books").insert(payload));
    }
    if (error) {
      console.error(error);
      bookFormError.textContent = "Gagal menyimpan ke database.";
      return;
    }
    resetBookForm();
    loadBooks();
  } finally {
    bookSubmitBtn.disabled = false;
    bookSubmitBtn.textContent = bookIdInput.value
      ? "Simpan Perubahan"
      : "Simpan Buku";
  }
});

async function deleteBook(id) {
  if (!confirm("Hapus buku ini? Tindakan ini tidak bisa dibatalkan.")) return;
  const { error } = await supabaseClient.from("books").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Gagal menghapus buku.");
    return;
  }
  if (editingBook && String(editingBook.id) === String(id)) resetBookForm();
  loadBooks();
}

// =========================================================
// MOVIE LOG (movies) — elemen
// =========================================================
const movieForm = document.getElementById("movie-form");
const movieFormHeading = document.getElementById("movie-form-heading");
const movieCancelEditBtn = document.getElementById("movie-cancel-edit-btn");
const movieIdInput = document.getElementById("movie-id");
const movieTitleInput = document.getElementById("movie-title");
const movieRatingInput = document.getElementById("movie-rating");
const movieWatchedDateInput = document.getElementById("movie-watched-date");
const movieLessonInput = document.getElementById("movie-lesson");
const movieFormError = document.getElementById("movie-form-error");
const movieSubmitBtn = document.getElementById("movie-submit-btn");
const movieListLoading = document.getElementById("movie-list-loading");
const movieListEmpty = document.getElementById("movie-list-empty");
const movieListEl = document.getElementById("movie-list");

let editingMovie = null;

async function loadMovies() {
  movieListLoading.classList.remove("hidden");
  movieListEmpty.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });
  movieListLoading.classList.add("hidden");

  if (error) {
    console.error(error);
    movieListEmpty.textContent = "Gagal memuat data.";
    movieListEmpty.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    movieListEmpty.classList.remove("hidden");
    movieListEl.innerHTML = "";
    return;
  }
  renderMovieList(data);
}

function renderMovieList(items) {
  movieListEl.innerHTML = items
    .map(
      (m) => `
    <div class="memory-row" data-id="${m.id}">
      <div class="memory-row__info">
        <div class="memory-row__title">${escapeHtml(m.title)}</div>
        <div class="memory-row__meta"><span class="memory-row__stars">${starString(m.rating)}</span></div>
      </div>
      <div class="memory-row__actions">
        <button class="btn-edit" data-action="edit" data-id="${m.id}">Edit</button>
        <button class="btn-danger" data-action="delete" data-id="${m.id}">Hapus</button>
      </div>
    </div>
  `,
    )
    .join("");

  movieListEl
    .querySelectorAll('[data-action="edit"]')
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        startEditMovie(btn.dataset.id, items),
      ),
    );
  movieListEl
    .querySelectorAll('[data-action="delete"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteMovie(btn.dataset.id)),
    );
}

function startEditMovie(id, items) {
  const item = items.find((m) => String(m.id) === String(id));
  if (!item) return;
  editingMovie = item;
  movieIdInput.value = item.id;
  movieTitleInput.value = item.title || "";
  movieRatingInput.value = String(item.rating || 5);
  movieWatchedDateInput.value = item.watched_date || "";
  movieLessonInput.value = item.lesson || "";
  movieFormHeading.textContent = "Edit Film";
  movieCancelEditBtn.classList.remove("hidden");
  movieSubmitBtn.textContent = "Simpan Perubahan";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

movieCancelEditBtn.addEventListener("click", resetMovieForm);

function resetMovieForm() {
  editingMovie = null;
  movieForm.reset();
  movieIdInput.value = "";
  movieFormHeading.textContent = "Tambah Film";
  movieCancelEditBtn.classList.add("hidden");
  movieSubmitBtn.textContent = "Simpan Film";
  movieFormError.textContent = "";
}

movieForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  movieFormError.textContent = "";
  const isEdit = Boolean(movieIdInput.value);
  const payload = {
    title: movieTitleInput.value.trim(),
    rating: Number(movieRatingInput.value),
    watched_date: movieWatchedDateInput.value || null,
    lesson: movieLessonInput.value.trim(),
  };

  movieSubmitBtn.disabled = true;
  movieSubmitBtn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try {
    let error;
    if (isEdit) {
      ({ error } = await supabaseClient
        .from("movies")
        .update(payload)
        .eq("id", movieIdInput.value));
    } else {
      ({ error } = await supabaseClient.from("movies").insert(payload));
    }
    if (error) {
      console.error(error);
      movieFormError.textContent = "Gagal menyimpan ke database.";
      return;
    }
    resetMovieForm();
    loadMovies();
  } finally {
    movieSubmitBtn.disabled = false;
    movieSubmitBtn.textContent = movieIdInput.value
      ? "Simpan Perubahan"
      : "Simpan Film";
  }
});

async function deleteMovie(id) {
  if (!confirm("Hapus film ini? Tindakan ini tidak bisa dibatalkan.")) return;
  const { error } = await supabaseClient.from("movies").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Gagal menghapus film.");
    return;
  }
  if (editingMovie && String(editingMovie.id) === String(id)) resetMovieForm();
  loadMovies();
}

// =========================================================
// BOM WAKTU (countdowns) — elemen
// =========================================================
const countdownForm = document.getElementById("countdown-form");
const countdownFormHeading = document.getElementById("countdown-form-heading");
const countdownCancelEditBtn = document.getElementById(
  "countdown-cancel-edit-btn",
);
const countdownIdInput = document.getElementById("countdown-id");
const countdownTitleInput = document.getElementById("countdown-title");
const countdownDateInput = document.getElementById("countdown-date");
const countdownRecurringInput = document.getElementById("countdown-recurring");
const countdownFormError = document.getElementById("countdown-form-error");
const countdownSubmitBtn = document.getElementById("countdown-submit-btn");
const countdownListLoading = document.getElementById("countdown-list-loading");
const countdownListEmpty = document.getElementById("countdown-list-empty");
const countdownListEl = document.getElementById("countdown-list");

let editingCountdown = null;

async function loadCountdowns() {
  countdownListLoading.classList.remove("hidden");
  countdownListEmpty.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("countdowns")
    .select("*")
    .order("target_date", { ascending: true });
  countdownListLoading.classList.add("hidden");

  if (error) {
    console.error(error);
    countdownListEmpty.textContent = "Gagal memuat data.";
    countdownListEmpty.classList.remove("hidden");
    return;
  }
  if (!data || data.length === 0) {
    countdownListEmpty.classList.remove("hidden");
    countdownListEl.innerHTML = "";
    return;
  }
  renderCountdownList(data);
}

function renderCountdownList(items) {
  countdownListEl.innerHTML = items
    .map(
      (c) => `
    <div class="memory-row" data-id="${c.id}">
      <div class="memory-row__info">
        <div class="memory-row__title">${escapeHtml(c.title)}</div>
        <div class="memory-row__meta">${formatDate(c.target_date)} ${c.is_recurring ? "&middot; Berulang tiap tahun" : ""}</div>
      </div>
      <div class="memory-row__actions">
        <button class="btn-edit" data-action="edit" data-id="${c.id}">Edit</button>
        <button class="btn-danger" data-action="delete" data-id="${c.id}">Hapus</button>
      </div>
    </div>
  `,
    )
    .join("");

  countdownListEl
    .querySelectorAll('[data-action="edit"]')
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        startEditCountdown(btn.dataset.id, items),
      ),
    );
  countdownListEl
    .querySelectorAll('[data-action="delete"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteCountdown(btn.dataset.id)),
    );
}

function startEditCountdown(id, items) {
  const item = items.find((c) => String(c.id) === String(id));
  if (!item) return;
  editingCountdown = item;
  countdownIdInput.value = item.id;
  countdownTitleInput.value = item.title || "";
  countdownDateInput.value = item.target_date || "";
  countdownRecurringInput.checked = Boolean(item.is_recurring);
  countdownFormHeading.textContent = "Edit Hitung Mundur";
  countdownCancelEditBtn.classList.remove("hidden");
  countdownSubmitBtn.textContent = "Simpan Perubahan";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

countdownCancelEditBtn.addEventListener("click", resetCountdownForm);

function resetCountdownForm() {
  editingCountdown = null;
  countdownForm.reset();
  countdownIdInput.value = "";
  countdownFormHeading.textContent = "Tambah Hitung Mundur";
  countdownCancelEditBtn.classList.add("hidden");
  countdownSubmitBtn.textContent = "Simpan Hitung Mundur";
  countdownFormError.textContent = "";
}

countdownForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  countdownFormError.textContent = "";
  const isEdit = Boolean(countdownIdInput.value);
  const payload = {
    title: countdownTitleInput.value.trim(),
    target_date: countdownDateInput.value,
    is_recurring: countdownRecurringInput.checked,
  };

  countdownSubmitBtn.disabled = true;
  countdownSubmitBtn.innerHTML = '<span class="spinner"></span>Menyimpan...';

  try {
    let error;
    if (isEdit) {
      ({ error } = await supabaseClient
        .from("countdowns")
        .update(payload)
        .eq("id", countdownIdInput.value));
    } else {
      ({ error } = await supabaseClient.from("countdowns").insert(payload));
    }
    if (error) {
      console.error(error);
      countdownFormError.textContent = "Gagal menyimpan ke database.";
      return;
    }
    resetCountdownForm();
    loadCountdowns();
  } finally {
    countdownSubmitBtn.disabled = false;
    countdownSubmitBtn.textContent = countdownIdInput.value
      ? "Simpan Perubahan"
      : "Simpan Hitung Mundur";
  }
});

async function deleteCountdown(id) {
  if (!confirm("Hapus hitung mundur ini? Tindakan ini tidak bisa dibatalkan."))
    return;
  const { error } = await supabaseClient
    .from("countdowns")
    .delete()
    .eq("id", id);
  if (error) {
    console.error(error);
    alert("Gagal menghapus hitung mundur.");
    return;
  }
  if (editingCountdown && String(editingCountdown.id) === String(id))
    resetCountdownForm();
  loadCountdowns();
}
