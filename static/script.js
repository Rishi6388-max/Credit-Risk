// Same-origin by default. Change this if the frontend and API are deployed separately.
const API_BASE_URL = window.location.origin;

const form = document.getElementById("loanForm");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");
const errorMsg = document.getElementById("errorMsg");
const resultCard = document.getElementById("resultCard");

const incomeEl = document.getElementById("person_income");
const amntEl = document.getElementById("loan_amnt");
const percentIncomeEl = document.getElementById("loan_percent_income");

const gaugeFill = document.getElementById("gaugeFill");
const probValueEl = document.getElementById("probValue");
const riskBadge = document.getElementById("riskBadge");
const statProb = document.getElementById("statProb");
const statThreshold = document.getElementById("statThreshold");
const statVerdict = document.getElementById("statVerdict");

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 50; // r = 50

function recalcPercentIncome() {
  const income = parseFloat(incomeEl.value);
  const amnt = parseFloat(amntEl.value);
  if (income > 0 && amnt >= 0) {
    percentIncomeEl.value = (amnt / income).toFixed(2);
  } else {
    percentIncomeEl.value = "";
  }
}
incomeEl.addEventListener("input", recalcPercentIncome);
amntEl.addEventListener("input", recalcPercentIncome);
recalcPercentIncome();

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.add("visible");
}
function clearError() {
  errorMsg.textContent = "";
  errorMsg.classList.remove("visible");
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("loading", isLoading);
}

function animateCount(el, from, to, duration = 800) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = from + (to - from) * eased;
    el.textContent = value.toFixed(1);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderResult(data) {
  const probabilityPct = data.probability * 100;
  const isHighRisk = data.prediction === 1;

  // gauge color + fill
  gaugeFill.style.stroke = isHighRisk ? "var(--bad)" : "var(--good)";
  const offset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * probabilityPct) / 100;
  // reset first so the transition always animates from 0 on a fresh prediction
  gaugeFill.style.transition = "none";
  gaugeFill.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
  requestAnimationFrame(() => {
    gaugeFill.style.transition = "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1), stroke 0.4s ease";
    gaugeFill.style.strokeDashoffset = offset;
  });

  animateCount(probValueEl, 0, probabilityPct);

  riskBadge.textContent = data.Result;
  riskBadge.className = "badge " + (isHighRisk ? "high" : "low");

  statProb.textContent = probabilityPct.toFixed(2) + "%";
  statThreshold.textContent = (data.thresold * 100).toFixed(1) + "%";
  statVerdict.textContent = data.Result;

  resultCard.classList.add("visible");
  resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const payload = {
    person_age: parseInt(document.getElementById("person_age").value, 10),
    person_income: parseFloat(incomeEl.value),
    person_home_ownership: document.getElementById("person_home_ownership").value,
    person_emp_length: parseFloat(document.getElementById("person_emp_length").value),
    loan_intent: document.getElementById("loan_intent").value,
    loan_grade: document.getElementById("loan_grade").value,
    loan_amnt: parseFloat(amntEl.value),
    loan_int_rate: parseFloat(document.getElementById("loan_int_rate").value),
    loan_percent_income: parseFloat(percentIncomeEl.value),
    cb_person_default_on_file: document.getElementById("cb_person_default_on_file").value,
    cb_person_cred_hist_length: parseInt(document.getElementById("cb_person_cred_hist_length").value, 10),
  };

  for (const [key, value] of Object.entries(payload)) {
    if (value === "" || value === null || (typeof value === "number" && Number.isNaN(value))) {
      showError(`Please provide a valid value for "${key.replaceAll("_", " ")}".`);
      return;
    }
  }

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server responded with ${res.status}: ${text}`);
    }

    const data = await res.json();
    renderResult(data);
  } catch (err) {
    console.error(err);
    showError("Couldn't get a prediction. Please check your inputs and try again.");
  } finally {
    setLoading(false);
  }
});

resetBtn.addEventListener("click", () => {
  clearError();
  resultCard.classList.remove("visible");
  setTimeout(recalcPercentIncome, 0);
});
