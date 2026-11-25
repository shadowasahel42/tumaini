const $ = (id) => document.getElementById(id);
const guests = [];
let current = -1;
let posterDataUrl = "";

const designationInput = $("designation");
const nameInput = $("guestName");
const guestList = $("guestList");
const poster = $("poster");
const printRoot = document.createElement("div");
printRoot.id = "printRoot";
document.body.appendChild(printRoot);

// Load poster.png automatically when it exists beside index.html.
const defaultPoster = new Image();
defaultPoster.onload = () => {
  posterDataUrl = "poster.png";
  poster.style.backgroundImage = 'url("poster.png")';
  $("posterMissing").style.display = "none";
  renderPreview();
};
defaultPoster.onerror = () => {}; // The owner can upload the artwork from the page instead.
defaultPoster.src = "poster.png";

function setStatus(message, isError = false) {
  $("status").textContent = message;
  $("status").style.color = isError ? "#a33b2e" : "#315c4b";
}
function clean(value) { return String(value ?? "").trim(); }
function currentGuest() { return guests[current] || null; }
function recipientLine(guest) {
  return [clean(guest.designation), clean(guest.name)].filter(Boolean).join(" ");
}
function fitPreviewRecipient() {
  const box = $("recipient");
  const text = $("previewRecipientText");
  if (!box || !text || !text.textContent) return;
  let size = Math.min(30, Math.max(12, window.innerWidth * 0.025));
  text.style.fontSize = `${size}px`;
  while (size > 9 && text.scrollWidth > box.clientWidth - 10) {
    size -= 1;
    text.style.fontSize = `${size}px`;
  }
}

function renderPreview() {
  const guest = currentGuest();
  $("previewRecipientText").textContent = guest
    ? recipientLine(guest)
    : "Your guest's name will appear here";
  $("currentPosition").textContent = guests.length ? `${current + 1} / ${guests.length}` : "0 / 0";
  $("prevGuest").disabled = current <= 0;
  $("nextGuest").disabled = current < 0 || current >= guests.length - 1;
  $("printCurrent").disabled = !guest || !posterDataUrl;
  $("downloadCurrentJpg").disabled = !guest || !posterDataUrl;
  $("updateGuest").disabled = !guest;
  if (guest) {
    designationInput.value = guest.designation;
    nameInput.value = guest.name;
  }
  renderList();
  requestAnimationFrame(fitPreviewRecipient);
}
function renderList() {
  $("guestCount").textContent = `${guests.length} guest${guests.length === 1 ? "" : "s"}`;
  $("printAll").disabled = !guests.length || !posterDataUrl;
  $("downloadAllJpg").disabled = !guests.length || !posterDataUrl;
  $("clearAll").disabled = !guests.length;
  if (!guests.length) {
    guestList.innerHTML = '<p class="empty-state">No guests added yet.</p>';
    return;
  }
  guestList.innerHTML = guests.map((g, i) => `
    <div class="guest-item ${i === current ? "active" : ""}">
      <button class="guest-select" data-select="${i}">
        <strong>${escapeHtml(recipientLine(g))}</strong>
        <small>Invitation ${i + 1}</small>
      </button>
      <button class="remove-guest" data-remove="${i}" aria-label="Remove guest ${i + 1}">×</button>
    </div>`).join("");
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function addGuest(designation, name) {
  designation = clean(designation); name = clean(name);
  if (!name) { setStatus("Enter an attendee name first.", true); return; }
  guests.push({designation, name});
  current = guests.length - 1;
  nameInput.value = ""; designationInput.value = "";
  renderPreview();
  setStatus(`Invitation added for ${name}.`);
}
$("addGuest").addEventListener("click", () => addGuest(designationInput.value, nameInput.value));
$("updateGuest").addEventListener("click", () => {
  if (current < 0 || !clean(nameInput.value)) return;
  guests[current] = {designation: clean(designationInput.value), name: clean(nameInput.value)};
  renderPreview(); setStatus("Current invitation updated.");
});
$("prevGuest").addEventListener("click", () => { if (current > 0) { current--; renderPreview(); } });
$("nextGuest").addEventListener("click", () => { if (current < guests.length - 1) { current++; renderPreview(); } });
guestList.addEventListener("click", e => {
  const select = e.target.closest("[data-select]");
  const remove = e.target.closest("[data-remove]");
  if (select) { current = Number(select.dataset.select); renderPreview(); }
  if (remove) {
    const index = Number(remove.dataset.remove);
    guests.splice(index, 1);
    current = guests.length ? Math.min(index, guests.length - 1) : -1;
    renderPreview(); setStatus("Invitation removed.");
  }
});
$("clearAll").addEventListener("click", () => {
  guests.length = 0; current = -1; designationInput.value = ""; nameInput.value = "";
  renderPreview(); setStatus("Invitation queue cleared.");
});

$("posterFile").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    posterDataUrl = reader.result;
    poster.style.backgroundImage = `url("${posterDataUrl}")`;
    $("posterMissing").style.display = "none";
    renderPreview(); setStatus("Poster image loaded. The original artwork is being used as the invitation background.");
  };
  reader.readAsDataURL(file);
});

function parseCsv(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && quoted && n === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && n === "\n") i++;
      row.push(cell); if (row.some(v => v.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += c;
  }
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
function importRows(rows) {
  if (!rows.length) throw new Error("The uploaded file is empty.");
  const headers = rows[0].map(v => clean(v).toLowerCase());
  const nameIndex = headers.findIndex(h => ["name","attendee","attendee name","full name","guest"].includes(h));
  const titleIndex = headers.findIndex(h => ["designation","title","honourific","honorific","salutation"].includes(h));
  if (nameIndex < 0) throw new Error('Could not find a "Name" column. Use the sample CSV headings.');
  let added = 0;
  rows.slice(1).forEach(row => {
    const name = clean(row[nameIndex]);
    if (name) { guests.push({name, designation: titleIndex >= 0 ? clean(row[titleIndex]) : ""}); added++; }
  });
  if (!added) throw new Error("No attendee names were found in the file.");
  current = guests.length - 1; renderPreview();
  setStatus(`${added} invitation${added === 1 ? "" : "s"} imported successfully.`);
}
$("listFile").addEventListener("change", async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") importRows(parseCsv(await file.text()));
    else if (["xlsx","xls"].includes(ext)) {
      if (!window.XLSX) throw new Error("Excel reader did not load. Try CSV instead.");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, {type:"array"});
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      importRows(XLSX.utils.sheet_to_json(sheet, {header:1, defval:""}));
    } else throw new Error("Please upload a CSV or Excel file.");
  } catch (err) { setStatus(err.message, true); }
  e.target.value = "";
});

function loadPosterImage() {
  return new Promise((resolve, reject) => {
    if (!posterDataUrl) return reject(new Error("Upload the final Canva poster image first."));
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The poster image could not be loaded."));
    img.src = posterDataUrl;
  });
}
function safeFileName(value) {
  return clean(value).normalize("NFKD").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "guest";
}
async function createInvitationJpg(guest, image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || 1920;
  canvas.height = image.naturalHeight || 1080;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Recipient overlay is kept in the same proportional position as the poster preview/print.
  const box = {
    x: canvas.width * 0.0718,
    y: canvas.height * 0.1875,
    width: canvas.width * 0.3558,
    height: canvas.height * 0.104
  };
  const text = recipientLine(guest);
  let fontSize = canvas.width * 0.042;
  const minFontSize = Math.max(12, canvas.width * 0.012);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f0e2c8";
  ctx.font = `700 ${fontSize}px Georgia, serif`;
  while (fontSize > minFontSize && ctx.measureText(text).width > box.width - 16) {
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px Georgia, serif`;
  }
  ctx.fillText(text, box.x + box.width / 2, box.y + box.height / 2, box.width - 12);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("JPG export failed. Try a smaller poster image.")), "image/jpeg", 0.94);
  });
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
async function downloadCurrentJpg() {
  const guest = currentGuest(); if (!guest) return;
  try {
    setStatus("Creating JPG image...");
    const image = await loadPosterImage();
    const blob = await createInvitationJpg(guest, image);
    downloadBlob(blob, `tumaini-invitation-${safeFileName(recipientLine(guest))}.jpg`);
    setStatus("Personalized JPG downloaded successfully.");
  } catch (err) { setStatus(err.message, true); }
}
async function downloadAllJpgs() {
  if (!guests.length) return;
  if (!window.JSZip) { setStatus("JPG ZIP tool did not load. Refresh the page and try again.", true); return; }
  try {
    setStatus(`Creating ${guests.length} JPG invitations... Please keep this tab open.`);
    $("downloadAllJpg").disabled = true;
    const image = await loadPosterImage();
    const zip = new JSZip();
    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      const blob = await createInvitationJpg(guest, image);
      const number = String(i + 1).padStart(3, "0");
      zip.file(`${number}-tumaini-invitation-${safeFileName(recipientLine(guest))}.jpg`, blob);
    }
    const zipBlob = await zip.generateAsync({type:"blob"});
    downloadBlob(zipBlob, "tumaini-personalized-invitations-jpg.zip");
    setStatus(`Downloaded ${guests.length} personalized JPG invitations in one ZIP file.`);
  } catch (err) { setStatus(err.message, true); }
  finally { $("downloadAllJpg").disabled = !guests.length || !posterDataUrl; }
}
$("downloadCurrentJpg").addEventListener("click", downloadCurrentJpg);
$("downloadAllJpg").addEventListener("click", downloadAllJpgs);

function printPages(items, all) {
  if (!posterDataUrl) { setStatus("Upload the final Canva poster image before printing.", true); return; }
  if (!items.length) return;
  printRoot.innerHTML = items.map(g => `
    <section class="print-page">
      <img src="${posterDataUrl}" alt="Tumaini Group invitation">
      <div class="print-recipient"><span>${escapeHtml(recipientLine(g))}</span></div>
    </section>`).join("");
  document.body.classList.toggle("print-all", all);
  document.body.classList.toggle("print-current", !all);
  window.print();
}
$("printCurrent").addEventListener("click", () => {
  if (currentGuest()) printPages([currentGuest()], false);
});
$("printAll").addEventListener("click", () => printPages(guests, true));
window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-all", "print-current");
  printRoot.innerHTML = "";
});
window.addEventListener("resize", fitPreviewRecipient);
renderPreview();
