const $ = (id) => document.getElementById(id);
const guests = [];
let current = -1;
let posterDataUrl = "";

const designationInput = $("designation");
const nameInput = $("guestName");
const guestList = $("guestList");
const poster = $("poster");
const recipient = $("recipient");
const printRoot = document.createElement("div");
// If poster.png is committed beside index.html, load it automatically.
const defaultPoster = new Image();
defaultPoster.onload = () => {
  posterDataUrl = "poster.png";
  poster.style.backgroundImage = 'url("poster.png")';
  $("posterMissing").style.display = "none";
  renderPreview();
};
defaultPoster.onerror = () => {}; // The owner can upload the artwork from the page instead.
defaultPoster.src = "poster.png";

printRoot.id = "printRoot";
document.body.appendChild(printRoot);

function setStatus(message, isError = false) {
  $("status").textContent = message;
  $("status").style.color = isError ? "#a33b2e" : "#315c4b";
}
function clean(value) { return String(value ?? "").trim(); }
function currentGuest() { return guests[current] || null; }

function renderPreview() {
  const guest = currentGuest();
  $("previewDesignation").textContent = guest ? guest.designation : "";
  $("previewName").textContent = guest ? guest.name : "Your guest's name will appear here";
  $("currentPosition").textContent = guests.length ? `${current + 1} / ${guests.length}` : "0 / 0";
  $("prevGuest").disabled = current <= 0;
  $("nextGuest").disabled = current < 0 || current >= guests.length - 1;
  $("printCurrent").disabled = !guest || !posterDataUrl;
  $("updateGuest").disabled = !guest;
  if (guest) {
    designationInput.value = guest.designation;
    nameInput.value = guest.name;
  }
  renderList();
}
function renderList() {
  $("guestCount").textContent = `${guests.length} guest${guests.length === 1 ? "" : "s"}`;
  $("printAll").disabled = !guests.length || !posterDataUrl;
  $("clearAll").disabled = !guests.length;
  if (!guests.length) {
    guestList.innerHTML = '<p class="empty-state">No guests added yet.</p>';
    return;
  }
  guestList.innerHTML = guests.map((g, i) => `
    <div class="guest-item ${i === current ? "active" : ""}">
      <button class="guest-select" data-select="${i}">
        <strong>${escapeHtml([g.designation, g.name].filter(Boolean).join(" "))}</strong>
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

function printPages(items, all) {
  if (!posterDataUrl) { setStatus("Upload the final Canva poster image before printing.", true); return; }
  if (!items.length) return;
  printRoot.innerHTML = items.map(g => `
    <section class="print-page">
      <img src="${posterDataUrl}" alt="Tumaini Group invitation">
      <div class="print-recipient">
        <span class="designation">${escapeHtml(g.designation)}</span>
        <span>${escapeHtml(g.name)}</span>
      </div>
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
renderPreview();
