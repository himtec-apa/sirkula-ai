import { getRoute, navigate } from "./router.js";
import { DEMO_PASSWORD, ROLES } from "./data.js";
import {
  advanceSimulationClock, cancelBatch, checkConnectionStatus, claimBatch, confirmHandover, createBatch, getCurrentActor,
  getState, getStateWarning, loginAccount, loginDemo, logoutDemo, markNotificationsRead,
  registerAccount, registerDemo, resetDemo, setActiveRole, setSession, setTierReview,
  simulateTransition, syncBackendData, updateBatch, updateProfile, updateSimulationTemperature
} from "./store.js";
import { getApiSession } from "./api.js";
import { initSocket } from "./socket.js";
import { analyzeFoodPhoto, validatePhoto } from "./services.js";
import { render } from "./views.js";
import { initSirkulaMap, updateMapData, destroyMap } from "./map.js";

const app = document.querySelector("#app");
const dialog = document.querySelector("#app-dialog");
const toastRoot = document.querySelector("#toast-root");
let confirmAction = null;
let aiSuggestion = null;
let uploadedPhoto = "";

function renderApp() {
  const route = getRoute();
  const state = getState();

  // Route Guards:
  // 1. Authenticated: wajib logout terlebih dahulu sebelum bisa kembali ke landing page (/) atau auth (/login, /register)
  if (state.activeRole && ["/", "/login", "/register"].includes(route.name)) {
    navigate("/dashboard", true);
    return;
  }

  // 2. Unauthenticated: wajib masuk sebelum mengakses dashboard dan menu internal
  const isProtected = route.name.startsWith("/dashboard") ||
                      route.name.startsWith("/batches") ||
                      ["/missions", "/profile", "/simulation", "/legal-vault", "batch-detail", "batch-edit"].includes(route.name);
  if (!state.activeRole && isProtected) {
    navigate("/login", true);
    return;
  }

  app.innerHTML = render(route, state);

  // Mount interactive Leaflet map if canvas element exists in view
  const mapCanvas = document.getElementById("sirkula-map-canvas");
  if (mapCanvas) {
    const actor = getCurrentActor();
    const activeBatches = state.batches.filter((b) => !["CANCELLED_BY_DONOR"].includes(b.state));
    initSirkulaMap("sirkula-map-canvas", activeBatches, state.activeRole, actor);
  } else {
    destroyMap();
  }

  const email = sessionStorage.getItem("sirkula.email") || sessionStorage.getItem("sirkula.demo.email");
  const emailInput = app.querySelector('[data-form="login"] [name="email"]');
  if (emailInput && email) emailInput.value = email;
  if (getStateWarning()) toast(getStateWarning(), "info");
}

function toast(message, kind) {
  const item = document.createElement("div");
  item.className = "toast" + (kind ? " toast--" + kind : "");
  const text = document.createElement("span");
  text.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Tutup notifikasi");
  close.innerHTML = "<span aria-hidden='true'>×</span>";
  close.addEventListener("click", () => item.remove());
  item.append(text, close);
  toastRoot.append(item);
  window.setTimeout(() => item.remove(), 5000);
}

function showDialog(title, body, confirmLabel, action) {
  confirmAction = action || null;
  dialog.innerHTML = "<div class='dialog-content'><span class='section-index'>KONFIRMASI DEMO</span><h2 id='dialog-title'>" +
    escapeHtml(title) + "</h2><div class='dialog-body'>" + body +
    "</div><div class='dialog-actions'><button class='button button--outline' type='button' data-action='close-dialog'>Kembali</button>" +
    (confirmLabel ? "<button class='button button--primary' type='submit' form='dialog-form'>" + escapeHtml(confirmLabel) + "</button>" : "") +
    "</div></div>" + (confirmLabel ? "<form id='dialog-form' data-form='confirm' method='dialog' hidden></form>" : "");
  if (confirmLabel) dialog.querySelector("#dialog-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const run = confirmAction;
    confirmAction = null;
    dialog.close();
    if (run) run();
  });
  dialog.showModal();
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[char]));
}

function showRoleDialog() {
  const actor = getCurrentActor();
  const roles = actor?.roles || [];
  const choices = roles.map((role) => "<button type='button' data-action='choose-role' data-role='" +
    escapeHtml(role) + "'><span>" + escapeHtml(ROLES[role].label) + "</span><span>" +
    escapeHtml(role === getState().activeRole ? "Aktif" : "Pilih") + "</span></button>").join("");
  dialog.innerHTML = "<div class='dialog-content'><span class='section-index'>ROLE TERDAFTAR</span><h2 id='dialog-title'>Ganti ruang kerja</h2><p>Hanya role yang tercatat pada akun ini dapat dipilih.</p><div class='dialog-role-list'>" + choices + "</div></div>";
  dialog.showModal();
}

function confirmRoleChange(role) {
  const actor = getCurrentActor();
  const nextRole = actor?.roles.includes(role) ? role : null;
  if (!nextRole) return toast("Role ini tidak terdaftar pada akun.", "error");
  if (nextRole === getState().activeRole) {
    dialog.close();
    return toast("Role ini sudah aktif.", "info");
  }
  dialog.close();
  window.setTimeout(() => showDialog(
    "Ganti ruang kerja?",
    "<p>Dashboard dan menu akan beralih ke <strong>" + escapeHtml(ROLES[nextRole].label) + "</strong>. Identitas akun tetap sama.</p>",
    "Ganti role",
    () => {
      if (setActiveRole(nextRole)) {
        navigate("/dashboard");
        toast("Ruang kerja demo diperbarui.", "success");
      } else toast("Role ini tidak lagi tersedia pada akun.", "error");
    }
  ), 0);
}

function showNotifications() {
  const state = getState();
  markNotificationsRead();
  const notices = state.notifications.length
    ? "<div class='notification-list'>" + state.notifications.map((item) =>
        "<article class='notification-item'><strong>" + escapeHtml(item.title) + "</strong><span>" +
        escapeHtml(item.body) + "</span><small>" + escapeHtml(new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))) +
        "</small></article>").join("") + "</div>"
    : "<p>Belum ada notifikasi.</p>";
  dialog.innerHTML = "<div class='dialog-content'><span class='section-index'>AKUN DEMO</span><h2 id='dialog-title'>Notifikasi</h2>" +
    notices + "<div class='dialog-actions'><button class='button button--primary' type='button' data-action='close-dialog'>Selesai</button></div></div>";
  dialog.showModal();
}

function setFormError(form, message) {
  const target = form.querySelector("[data-form-error]");
  if (target) {
    target.hidden = false;
    target.textContent = message;
    target.focus?.();
  } else toast(message, "error");
}

function valid(form) {
  const error = form.querySelector("[data-form-error]");
  if (error) error.hidden = true;
  if (form.checkValidity()) return true;
  form.reportValidity();
  setFormError(form, "Periksa kembali kolom yang wajib diisi.");
  return false;
}

function readFoodPhoto(file) {
  return new Promise((resolve, reject) => {
    const problem = validatePhoto(file);
    if (problem) return reject(new Error(problem));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("File foto tidak valid."));
      image.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Browser tidak dapat memproses foto."));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL("image/webp", 0.68);
        if (result.length > 520000) return reject(new Error("Foto terlalu besar setelah diproses. Gunakan foto yang lebih kecil."));
        resolve(result);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function startDemo(email) {
  if (!loginDemo(email, DEMO_PASSWORD)) {
    toast("Akun demo tidak ditemukan.", "error");
    return;
  }
  const actor = getCurrentActor();
  navigate(actor.roles.length > 1 ? "/select-role" : "/dashboard");
}

function handleAction(actionButton) {
  const action = actionButton.dataset.action;
  const id = actionButton.dataset.id;
  if (action === "demo-login") startDemo(actionButton.dataset.email);
  if (action === "go-login") navigate("/login");
  if (action === "close-dialog") dialog.close();
  if (action === "choose-role") {
    confirmRoleChange(actionButton.dataset.role);
  }
  if (action === "select-role") {
    const role = actionButton.dataset.role;
    const actor = getCurrentActor();
    if (actor && setSession(actor.id, role)) {
      navigate("/dashboard");
      toast("Ruang kerja dibuka.");
    } else toast("Role ini tidak tersedia untuk akun.", "error");
  }
  if (action === "toggle-password") {
    const input = actionButton.closest("label")?.querySelector("input");
    if (input) input.type = input.type === "password" ? "text" : "password";
  }
  if (action === "analyze-photo") analyzePhoto(actionButton);
  if (action === "apply-suggestion") applySuggestion();
  if (action === "claim-batch") {
    showDialog("Ambil misi penyelamatan?", "<p>Alamat presisi loading dock dibuka setelah konfirmasi. Siapkan armada penjemputan.</p>", "Klaim batch", async () => {
      try {
        const claimResult = await claimBatch(id);
        if (claimResult) {
          toast("Klaim berhasil! Token HMAC & lokasi loading dock diterbitkan.", "success");
          navigate("/missions");
        } else {
          toast("Batch tidak tersedia, kedaluwarsa, atau tidak sesuai role.", "error");
        }
      } catch (err) {
        toast(err.message || "Gagal mengklaim batch", "error");
      }
    });
  }
  if (action === "handover") {
    const item = getState().batches.find((batch) => batch.id === id);
    if (!item?.claim) return toast("Belum ada klaim aktif untuk batch ini.", "error");
    dialog.innerHTML = "<div class='dialog-content'><span class='section-index'>VERIFIKASI SERAH-TERIMA</span><h2 id='dialog-title'>Handover Handshake</h2><p>Masukkan kode token HMAC yang ditunjukkan oleh kurir/penerima batch.</p><form data-form='handover' data-id='" + escapeHtml(id) + "'><label>Token HMAC (Kriptografis)<input name='token' required autocomplete='off' autocapitalize='characters' placeholder='Contoh: HM-...' aria-describedby='handover-hint'></label><small id='handover-hint'>Kode ini tercantum pada panel misi akun penerima.</small><label class='check-label' style='margin-top:12px; display:flex; align-items:center; gap:8px;'><input type='checkbox' name='waiver' checked required><span>Saya menyetujui Digital Liability Waiver (Good Samaritan Protection).</span></label><p class='form-error' data-form-error hidden></p><div class='dialog-actions'><button class='button button--outline' type='button' data-action='close-dialog'>Batal</button><button class='button button--primary' type='submit'>Verifikasi & Terbitkan Sertifikat</button></div></form></div>";
    dialog.showModal();
  }
  if (action === "cancel-batch") {
    showDialog("Batalkan batch ini?", "<p>Batch tetap ada dalam histori dan tidak dapat diklaim lagi.</p>", "Batalkan batch", () => {
      toast(cancelBatch(id) ? "Batch dibatalkan dan dicatat di histori." : "Batch tidak dapat dibatalkan pada status ini.", "info");
    });
  }
  if (action === "advance-tier") {
    const target = actionButton.dataset.target;
    showDialog("Uji perpindahan tier?", "<p>Instruksi ini akan memicu degradasi instan via <code>POST /api/v1/simulation/time-warp</code> pada backend engine.</p>", "Jalankan simulasi", async () => {
      try {
        await simulateTransition(id, target);
        toast("God-Mode Time-Warp berhasil: batch dialihkan ke " + target, "success");
      } catch (err) {
        toast("Gagal mutasi: " + err.message, "error");
      }
    });
  }
  if (action === "advance-clock") {
    const ok = advanceSimulationClock(id, 60);
    toast(ok ? "Waktu demo maju 60 menit. Kelayakan tidak dinilai otomatis." : "Waktu hanya dapat dimajukan pada batch simulasi oleh admin.", ok ? "success" : "error");
  }
  if (action === "review-tier2" || action === "review-tier3") {
    const tier = action === "review-tier2" ? "TIER_2" : "TIER_3";
    const item = getState().batches.find((batch) => batch.id === id);
    const key = tier === "TIER_2" ? "tier2Reviewed" : "tier3Reviewed";
    const next = !item?.[key];
    showDialog(next ? "Catat penilaian demo?" : "Hapus catatan demo?", "<p>Catatan ini hanya membuka simulasi alur berikutnya. Penilaian nyata tetap menjadi tanggung jawab petugas yang berwenang.</p>", next ? "Catat penilaian" : "Hapus catatan", () => {
      const ok = setTierReview(id, tier, next);
      toast(ok ? "Catatan demo diperbarui." : "Perubahan tidak dapat disimpan.", ok ? "success" : "error");
    });
  }
  if (action === "switch-role") showRoleDialog();
  if (action === "logout") showDialog("Keluar dari akun demo?", "<p>Batch lokal tetap tersimpan di browser. Password tidak pernah disimpan.</p>", "Keluar", () => {
    logoutDemo();
    navigate("/login");
  });
  if (action === "reset-demo") showDialog("Reset semua data demo?", "<p>Batch, akun lokal, dan histori simulasi akan kembali ke data contoh awal. Tindakan ini tidak dapat dibatalkan.</p>", "Reset demo", () => {
    resetDemo();
    navigate("/");
    toast("Data simulasi direset.");
  });
  if (action === "open-batch") navigate("/batches/" + encodeURIComponent(id));
  if (action === "notifications") showNotifications();
  if (action === "copy-token") {
    const token = actionButton.dataset.token;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(token).then(() => toast("Kode demo disalin.", "success")).catch(() => toast("Salin kode secara manual: " + token, "info"));
    else toast("Salin kode secara manual: " + token, "info");
  }
  if (action === "print-report") window.print();
}

function simulateTransitionResultKind(batchId, target) {
  const item = getState().batches.find((batch) => batch.id === batchId);
  const reviewed = target === "TIER_2_ANIMAL_ACTIVE" ? item?.tier2Reviewed : item?.tier3Reviewed;
  return reviewed ? "success" : "error";
}

async function analyzePhoto(button) {
  const form = button.closest("form");
  const file = form?.elements.photoFile?.files?.[0];
  const message = form?.querySelector("[data-ai-suggestion]");
  if (!form || !message) return;
  const error = validatePhoto(file);
  if (error) return toast(error, "error");
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "Menyiapkan contoh respons…";
  try {
    aiSuggestion = analyzeFoodPhoto(file.name);
    message.hidden = false;
    message.innerHTML = "<strong>" + escapeHtml(aiSuggestion.title) + " · " + escapeHtml(aiSuggestion.category) + "</strong><p>Contoh taksiran: " + aiSuggestion.portions + " porsi, " + aiSuggestion.weightKg + " kg. Confidence " + Math.round(aiSuggestion.confidence * 100) + "%.</p><small>" + escapeHtml(aiSuggestion.note) + "</small><button class='button button--outline button--small' type='button' data-action='apply-suggestion'>Gunakan saran contoh</button>";
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.innerHTML = "Minta saran kategori demo";
  }
}

function applySuggestion() {
  if (!aiSuggestion) return;
  const form = app.querySelector('[data-form="new-batch"]');
  if (!form) return;
  form.elements.title.value = aiSuggestion.title;
  form.elements.category.value = aiSuggestion.category;
  form.elements.portions.value = aiSuggestion.portions;
  form.elements.weightKg.value = aiSuggestion.weightKg;
  toast("Contoh saran dimasukkan. Periksa dan koreksi sebelum menyimpan.", "info");
}

function previewPhoto(input) {
  const file = input.files?.[0];
  if (!file) return;
  const error = validatePhoto(file);
  if (error) {
    input.value = "";
    uploadedPhoto = "";
    return toast(error, "error");
  }
  const reader = new FileReader();
  reader.onerror = () => toast("Pratinjau foto gagal dibuka.", "error");
  reader.onload = () => {
    const target = app.querySelector("[data-photo-preview]");
    if (!target) return;
    uploadedPhoto = String(reader.result);
    target.hidden = false;
    target.innerHTML = "<img src='" + escapeHtml(uploadedPhoto) + "' alt='Pratinjau foto makanan yang dipilih'>";
  };
  reader.readAsDataURL(file);
}

async function handleSubmit(event) {
  const form = event.target;
  const kind = form.dataset.form;
  if (!kind) return;
  event.preventDefault();
  if (kind === "confirm") return;
  if (!valid(form)) return;
  const data = new FormData(form);
  const values = Object.fromEntries(data.entries());

  if (kind === "login") {
    if (values.remember) sessionStorage.setItem("sirkula.email", values.email);
    else sessionStorage.removeItem("sirkula.email");
    const result = await loginAccount(values.email, values.password);
    if (result.success) {
      const actor = getCurrentActor();
      navigate(actor.roles.length > 1 ? "/select-role" : "/dashboard");
      toast("Berhasil masuk ke SIRKULA-AI.", "success");
    } else {
      setFormError(form, result.message || "Email akun tidak terdaftar atau password salah.");
    }
  }
  if (kind === "register") {
    if (values.password !== values.confirmPassword) return setFormError(form, "Password dan konfirmasi password harus sama.");
    if (String(values.password || "").length < 6) return setFormError(form, "Password minimal 6 karakter.");
    const activeRole = values.activeRole || "DONOR";
    const selectedRoles = data.getAll("roles");
    const roles = selectedRoles.length ? selectedRoles : [activeRole];
    if (!roles.includes(activeRole)) roles.unshift(activeRole);
    const result = registerAccount({ ...values, activeRole, roles });
    if (result.success) {
      if (form.elements.password) form.elements.password.value = "";
      if (form.elements.confirmPassword) form.elements.confirmPassword.value = "";
      navigate("/dashboard");
      toast("Pendaftaran berhasil! Akun langsung aktif di SIRKULA-AI.", "success");
    } else {
      setFormError(form, result.message || "Email sudah dipakai atau informasi belum lengkap.");
    }
  }
  if (kind === "new-batch") saveNewBatch(form, values);
  if (kind === "edit-batch") {
    const payload = {
      title: values.title, category: values.category, portions: Number(values.portions),
      weightKg: Number(values.weightKg), storageCondition: values.storageCondition,
      allergenNotes: values.allergenNotes, claimDeadline: new Date(values.claimDeadline).toISOString(),
      donorReviewed: data.get("donorReviewed") === "on"
    };
    if (payload.claimDeadline <= new Date().toISOString()) return setFormError(form, "Batas klaim harus di masa mendatang.");
    if (updateBatch(form.dataset.id, payload)) {
      navigate("/batches/" + encodeURIComponent(form.dataset.id));
      toast("Informasi batch demo diperbarui.", "success");
    } else setFormError(form, "Batch tidak dapat diperbarui pada status ini.");
  }
  if (kind === "filters") {
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) if (String(value).trim()) params.set(key, String(value).trim());
    const query = params.toString();
    navigate("/dashboard/food-batches" + (query ? "?" + query : ""));
  }
  if (kind === "profile") {
    if (updateProfile(values)) toast("Profil demo disimpan.", "success");
    else setFormError(form, "Profil tidak dapat diperbarui.");
  }
  if (kind === "temperature") {
    try {
      await updateSimulationTemperature(form.dataset.id, values.temperature);
      toast("Suhu berhasil disetel ke " + values.temperature + "°C via Time-Warp engine.", "success");
    } catch (err) {
      toast("Gagal mengubah suhu: " + err.message, "error");
    }
  }
  if (kind === "handover") {
    try {
      const res = await confirmHandover(form.dataset.id, values.token);
      dialog.close();
      toast("Handover terverifikasi! Sertifikat " + (res.waiver_certificate_no || "SRK-ESG") + " diterbitkan.", "success");
      navigate("/legal-vault");
    } catch (err) {
      if (err.status === 422 || String(err.message).toLowerCase().includes("expired") || String(err.message).toLowerCase().includes("tier1")) {
        setFormError(form, "SAFETY INVARIANT ENFORCED: Batas waktu aman konsumsi manusia terlampaui (tier1_expires_at). Verifikasi ditolak (422) & batch otomatis dialihkan ke TIER_2_ANIMAL_ACTIVE.");
        toast("Safety Invariant: Verifikasi ditolak demi keselamatan pangan (HTTP 422).", "error");
      } else {
        setFormError(form, err.message || "Kode token tidak cocok atau kedaluwarsa.");
      }
    }
  }
}

async function saveNewBatch(form, values) {
  const submit = form.querySelector("[type='submit']");
  const oldLabel = submit.textContent;
  const file = form.elements.photoFile?.files?.[0];
  if (!file) return setFormError(form, "Pilih foto makanan sebelum membuat batch.");
  submit.disabled = true;
  form.setAttribute("aria-busy", "true");
  submit.textContent = "Menganalisis Vision & Telemetri Cuaca…";
  try {
    const item = await createBatch(values, file);
    if (!item) return setFormError(form, "Gagal membuat batch. Pastikan Anda masuk sebagai DONOR.");
    uploadedPhoto = "";
    aiSuggestion = null;
    navigate("/batches/" + encodeURIComponent(item.batch_id || item.id));
    toast("Batch berhasil dibuat melalui AI Vision & telemetri cuaca!", "success");
  } catch (error) {
    setFormError(form, error.message || "Batch tidak dapat disimpan.");
  } finally {
    form.removeAttribute("aria-busy");
    submit.disabled = false;
    submit.textContent = oldLabel;
  }
}

function dataFlag(form, name) {
  return form.elements[name]?.checked === true;
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  event.preventDefault();
  handleAction(target);
});
app.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches('[name="photoFile"]')) previewPhoto(target);
  if (target.matches('[data-form="simulation-select"] [name="batch"]')) {
    navigate("/simulation?batch=" + encodeURIComponent(target.value));
  }
});
app.addEventListener("input", (event) => {
  if (event.target.matches('[data-form="temperature"] [name="temperature"]')) {
    const output = event.target.form.querySelector("[data-temperature-output]");
    if (output) output.value = event.target.value + "°C";
  }
});
app.addEventListener("submit", handleSubmit);
dialog.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  event.preventDefault();
  handleAction(target);
});
dialog.addEventListener("submit", handleSubmit);
dialog.addEventListener("close", () => { confirmAction = null; });
window.addEventListener("popstate", renderApp);
window.addEventListener("sirkula:statechange", renderApp);

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link || link.target || link.hasAttribute("download") || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const href = link.getAttribute("href");
  if (href && href.startsWith("/") && !href.startsWith("//")) {
    event.preventDefault();
    navigate(href);
  }
});

const session = getApiSession();
if (session?.token || session?.actorId) {
  initSocket(session.token, session.role);
}

renderApp();
syncBackendData();
checkConnectionStatus();
