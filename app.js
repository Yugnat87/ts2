document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     STATE
  ========================= */

  window.rows = [];              // 👈 exposed for console debugging
  let uiTranslations = {};
  let currentLang = "en";
  let currentSymptomId = null;
  let escalationIndex = 0;       // index in availableLevels[]

  const OBS_ORDER = [
    "Field observable",
    "Requires inspection / measurement",
    "Internal / inferred"
  ];

  /* =========================
     ELEMENTS
  ========================= */

  const symptomList   = document.getElementById("symptomList");
  const result        = document.getElementById("result");
  const backBtn       = document.getElementById("backBtn");
  const searchInput   = document.getElementById("searchInput");
  const languageSelect= document.getElementById("languageSelect");
  const titleEl       = document.getElementById("title");

  /* =========================
     TRANSLATION
  ========================= */

  function t(key) {
    return uiTranslations[key] || key;
  }

  function loadLanguage(lang) {
    fetch(`${lang}.json`)
      .then(r => r.json())
      .then(json => {
        uiTranslations = json;
        applyTranslations();
        refreshView();
      })
      .catch(() => {
        uiTranslations = {};
        applyTranslations();
        refreshView();
      });
  }

  function applyTranslations() {
    titleEl.textContent = t("title");
    searchInput.placeholder = t("search");
    backBtn.textContent = "← " + t("back");
  }

  /* =========================
     DATA LOAD
  ========================= */

  fetch("data.json")
    .then(r => r.json())
    .then(json => {
      window.rows = json;   // 👈 make data visible everywhere
      renderSymptoms();
    })
    .catch(err => {
      console.error("Failed to load data.json", err);
    });

  /* =========================
     VIEW MANAGEMENT
  ========================= */

  function refreshView() {
    if (currentSymptomId) {
      renderSymptom();
    } else {
      renderSymptoms(searchInput.value);
    }
  }

  function renderSymptoms(filter = "") {
    currentSymptomId = null;
    symptomList.innerHTML = "";
    result.innerHTML = "";
    backBtn.style.display = "none";
    symptomList.style.display = "block";

    // Build symptom list from IDs (NOT rows)
    const symptomMap = {};

    window.rows.forEach(r => {
      const id = r["Symptom ID"];
      if (!symptomMap[id]) {
        symptomMap[id] = r["Symptom on Field"];
      }
    });

    Object.keys(symptomMap)
      .sort()
      .forEach(id => {
        const label = `${id} — ${symptomMap[id]}`;

        if (filter && !label.toLowerCase().includes(filter.toLowerCase())) return;

        const li = document.createElement("li");
        li.textContent = label;
        li.onclick = () => {
          currentSymptomId = id;
          escalationIndex = 0;
          renderSymptom();
        };
        symptomList.appendChild(li);
      });
  }

  /* =========================
     SYMPTOM VIEW (SOFT ESCALATION)
  ========================= */

  function renderSymptom() {
    symptomList.style.display = "none";
    backBtn.style.display = "block";
    result.innerHTML = "";

    const matches = window.rows.filter(r => r["Symptom ID"] === currentSymptomId);
    if (!matches.length) return;

    const h2 = document.createElement("h2");
    h2.textContent = currentSymptomId;
    result.appendChild(h2);

    const h3 = document.createElement("h3");
    h3.textContent = matches[0]["Symptom on Field"];
    result.appendChild(h3);

    // Determine which observability levels exist for this symptom
    const availableLevels = OBS_ORDER.filter(level =>
      matches.some(m => m["Observability Level"] === level)
    );

    availableLevels.forEach((level, idx) => {
      const steps = matches.filter(m => m["Observability Level"] === level);
      if (!steps.length) return;

      const section = document.createElement("div");
      section.className = "section";

      const title = document.createElement("h3");
      title.textContent =
        level === OBS_ORDER[0] ? t("field") :
        level === OBS_ORDER[1] ? t("inspection") :
        t("internal");

      section.appendChild(title);

      let hasValidSOP = false;

      steps.forEach(s => {
        if (!s["SOP"] || s["SOP"].toLowerCase().includes("missing")) {
          section.innerHTML += `<p>${t("sop_missing")}</p>`;
        } else {
          hasValidSOP = true;
          s["SOP"].split("\n").forEach(line => {
            section.innerHTML += `
              <div class="step">
                <input type="checkbox">
                <span>${line}</span>
              </div>
            `;
          });
        }
      });

      // Soft escalation guidance
      if (idx === escalationIndex && idx < availableLevels.length - 1) {
        const decision = document.createElement("div");
        decision.className = "decision";
        decision.innerHTML = `
          <p>${t("resolved")}</p>
          <button class="yesBtn">${t("yes")}</button>
          <button class="noBtn">${t("no")}</button>
        `;
        section.appendChild(decision);

        decision.querySelector(".yesBtn").onclick = () => {
          alert("Issue resolved");
        };

        decision.querySelector(".noBtn").onclick = () => {
          escalationIndex++;
          renderSymptom();
        };
      }

      result.appendChild(section);
    });
  }

  /* =========================
     EVENTS
  ========================= */

  backBtn.onclick = () => renderSymptoms(searchInput.value);
  searchInput.oninput = () => renderSymptoms(searchInput.value);

  languageSelect.onchange = e => {
    currentLang = e.target.value;
    loadLanguage(currentLang);
  };

  /* =========================
     INIT
  ========================= */

  loadLanguage("en");

});
