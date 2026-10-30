import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged,
  RecaptchaVerifier, signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyApwjzgVtKnP258TDJxDwnyNAAZGWeXpXM",
  authDomain: "vocalearn-2e7b5.firebaseapp.com",
  projectId: "vocalearn-2e7b5",
  storageBucket: "vocalearn-2e7b5.firebasestorage.app",
  messagingSenderId: "706553554359",
  appId: "1:706553554359:web:f63df69b367c1aa9983432",
  measurementId: "G-9CDWK528RX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

let user = null;
let words = [];
let quizWord = null;
let quizIndex = 0;
let quizActive = false;
let answered = false;
let isRegistering = false;

function setStatus(id, message, type = "") {
  $(id).textContent = message;
  $(id).className = "status " + type;
}

function showError(id, error) {
  console.error(error);
  const messages = {
    "auth/email-already-in-use": "Diese E-Mail-Adresse wird bereits verwendet.",
    "auth/invalid-email": "Bitte gib eine gültige E-Mail-Adresse ein.",
    "auth/weak-password": "Das Passwort muss mindestens 6 Zeichen haben.",
    "auth/invalid-credential": "E-Mail-Adresse oder Passwort ist falsch.",
    "auth/too-many-requests": "Zu viele Versuche. Bitte probiere es später erneut.",
    "auth/invalid-phone-number": "Bitte gib eine gültige Telefonnummer im internationalen Format ein, z. B. +49...",
    "auth/missing-phone-number": "Bitte gib deine Handynummer ein.",
    "auth/invalid-verification-code": "Der SMS-Code ist falsch.",
    "auth/code-expired": "Der SMS-Code ist abgelaufen. Bitte fordere einen neuen an.",
    "auth/captcha-check-failed": "Die Sicherheitsprüfung ist fehlgeschlagen.",
    "auth/operation-not-allowed": "Die Telefon-Anmeldung ist in Firebase nicht aktiviert.",
    "permission-denied": "Zugriff verweigert. Bitte überprüfe deine Firestore-Regeln."
  };
  setStatus(id, messages[error.code] || "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.", "error");
}

// Anmeldung / Registrierung
function setAuthMode(registering) {
  isRegistering = registering;
  $("loginTab").classList.toggle("active", !registering);
  $("registerTab").classList.toggle("active", registering);
  $("authSubmit").textContent = registering ? "Konto erstellen" : "Anmelden";
  $("resetBtn").hidden = registering;
  setStatus("authStatus", "");
}

$("loginTab").addEventListener("click", () => setAuthMode(false));
$("registerTab").addEventListener("click", () => setAuthMode(true));

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("authSubmit").disabled = true;
  setStatus("authStatus", "");

  try {
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;

    if (isRegistering) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showError("authStatus", error);
  } finally {
    $("authSubmit").disabled = false;
  }
});

$("resetBtn").addEventListener("click", async () => {
  const email = $("authEmail").value.trim();

  if (!email) {
    setStatus("authStatus", "Bitte gib zuerst deine E-Mail-Adresse ein.", "error");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    setStatus("authStatus", "Falls ein Konto existiert, wurde eine E-Mail zum Zurücksetzen gesendet.", "success");
  } catch (error) {
    showError("authStatus", error);
  }
});

// Anmeldung mit Handynummer per SMS-Code
let phoneConfirmationResult = null;
let phoneRecaptchaVerifier = null;

$("sendPhoneCode").addEventListener("click", async () => {
  const phoneNumber = $("phoneNumber").value.trim();

  setStatus("phoneStatus", "");

  if (!phoneNumber) {
    setStatus("phoneStatus", "Bitte gib deine Handynummer ein.", "error");
    $("phoneNumber").focus();
    return;
  }

  $("sendPhoneCode").disabled = true;

  try {
    if (!phoneRecaptchaVerifier) {
      phoneRecaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "normal" }
      );
    }

    phoneConfirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      phoneRecaptchaVerifier
    );

    $("phoneCodeArea").hidden = false;
    setStatus("phoneStatus", "Der SMS-Code wurde gesendet.", "success");

  } catch (error) {
    showError("phoneStatus", error);

    if (phoneRecaptchaVerifier) {
      phoneRecaptchaVerifier.clear();
      phoneRecaptchaVerifier = null;
    }
  } finally {
    $("sendPhoneCode").disabled = false;
  }
});

$("verifyPhoneCode").addEventListener("click", async () => {
  if (!phoneConfirmationResult) {
    setStatus("phoneStatus", "Bitte fordere zuerst einen SMS-Code an.", "error");
    return;
  }

  const code = $("phoneCode").value.trim();

  if (!code) {
    setStatus("phoneStatus", "Bitte gib den SMS-Code ein.", "error");
    $("phoneCode").focus();
    return;
  }

  $("verifyPhoneCode").disabled = true;

  try {
    await phoneConfirmationResult.confirm(code);
    phoneConfirmationResult = null;
    $("phoneCode").value = "";
    setStatus("phoneStatus", "Du bist erfolgreich mit deiner Handynummer angemeldet.", "success");
  } catch (error) {
    showError("phoneStatus", error);
  } finally {
    $("verifyPhoneCode").disabled = false;
  }
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

function userWords() {
  return collection(db, "users", user.uid, "words");
}

// Verstecken / Anzeigen
function setWordsVisible(visible) {
  $("wordsContent").hidden = !visible;
  $("wordsHiddenMessage").hidden = visible;

  $("toggleWordsBtn").textContent = visible
    ? "🙈 Vokabeln ausblenden"
    : "👁 Vokabeln anzeigen";

  $("toggleWordsBtn").setAttribute("aria-expanded", String(visible));
}

$("toggleWordsBtn").addEventListener("click", () => {
  setWordsVisible($("wordsContent").hidden);
});

// Liste zeichnen. Jede Übersetzung lässt sich einzeln aufklappen.
function renderWords() {
  const list = $("wordList");
  list.replaceChildren();

  if (words.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Du hast noch keine Vokabeln gespeichert.";
    list.appendChild(empty);
    return;
  }

  words.forEach(word => {
    const card = document.createElement("div");
    card.className = "word-card";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "word-toggle";
    toggle.setAttribute("aria-expanded", "false");

    const german = document.createElement("span");
    german.textContent = word.german;

    const arrow = document.createElement("span");
    arrow.textContent = "＋";
    toggle.append(german, arrow);

    const details = document.createElement("div");
    details.className = "word-details";
    details.hidden = true;

    const translation = document.createElement("p");
    translation.textContent = "Englisch: " + word.english;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "Vokabel löschen";

    toggle.addEventListener("click", () => {
      details.hidden = !details.hidden;
      toggle.setAttribute("aria-expanded", String(!details.hidden));
      arrow.textContent = details.hidden ? "＋" : "−";
    });

    remove.addEventListener("click", async () => {
      if (!confirm(`Möchtest du „${word.german}“ wirklich löschen?`)) return;

      remove.disabled = true;

      try {
        await deleteDoc(doc(db, "users", user.uid, "words", word.id));
        words = words.filter(item => item.id !== word.id);
        renderWords();

        if (quizWord?.id === word.id) resetQuiz();

        setStatus("wordStatus", "Vokabel gelöscht.", "success");
      } catch (error) {
        showError("wordStatus", error);
        remove.disabled = false;
      }
    });

    details.append(translation, remove);
    card.append(toggle, details);
    list.appendChild(card);
  });
}

async function loadWords() {
  if (!user) return;

  setStatus("wordStatus", "Vokabeln werden geladen …");

  try {
    const snapshot = await getDocs(userWords());
    words = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));

    renderWords();
    setStatus("wordStatus", "");
    setWordsVisible(false);
    resetQuiz();

  } catch (error) {
    showError("wordStatus", error);
  }
}

// Vokabel speichern
$("wordForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!user) return;

  const german = $("german").value.trim();
  const english = $("english").value.trim();

  if (!german || !english) return;

  $("saveBtn").disabled = true;
  setStatus("wordStatus", "Vokabel wird gespeichert …");

  try {
    const data = {
      german,
      english,
      createdAt: new Date().toISOString()
    };

    const saved = await addDoc(userWords(), data);
    words.push({ id: saved.id, ...data });

    renderWords();
    $("wordForm").reset();
    setWordsVisible(false);

    setStatus(
      "wordStatus",
      words.length === 1
        ? "Du hast eine Vokabel gespeichert."
        : `Du hast ${words.length} Vokabeln gespeichert.`,
      "success"
    );

    if (quizActive) resetQuiz();

  } catch (error) {
    showError("wordStatus", error);
  } finally {
    $("saveBtn").disabled = false;
  }
});

// Quiz: Start, Antwort prüfen und Weiter
function resetQuiz() {
  quizActive = false;
  answered = false;
  quizWord = null;
  quizIndex = 0;

  $("quizPrompt").textContent = "Drücke auf „Lernen starten“, um zu beginnen.";
  $("quizAnswer").value = "";
  $("quizAnswer").disabled = true;
  $("checkBtn").disabled = true;
  $("nextBtn").textContent = "▶ Lernen starten";
  $("nextBtn").disabled = false;
  $("quizFeedback").textContent = "";
  $("quizFeedback").className = "feedback";
}

function showQuizWord() {
  if (words.length === 0) {
    resetQuiz();
    $("quizPrompt").textContent = "Speichere zuerst mindestens eine Vokabel.";
    return;
  }

  // Beim Weiterklicken wird die nächste Vokabel genommen.
  quizIndex = quizIndex % words.length;
  quizWord = words[quizIndex];
  quizActive = true;
  answered = false;

  $("quizPrompt").replaceChildren();

  const instruction = document.createElement("p");
  instruction.textContent = "Wie heißt dieses Wort auf Englisch?";

  const word = document.createElement("div");
  word.className = "quiz-word";
  word.textContent = quizWord.german;

  $("quizPrompt").append(instruction, word);

  $("quizAnswer").value = "";
  $("quizAnswer").disabled = false;
  $("checkBtn").disabled = false;
  $("nextBtn").textContent = "Weiter";
  $("quizFeedback").textContent = "";
  $("quizFeedback").className = "feedback";
  $("quizAnswer").focus();
}

$("nextBtn").addEventListener("click", () => {
  if (!quizActive) {
    showQuizWord();
    return;
  }

  // Nach der letzten Vokabel beginnt die Runde wieder von vorne.
  quizIndex = (quizIndex + 1) % words.length;
  showQuizWord();
});

$("quizForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!quizWord || answered) return;

  const answer = $("quizAnswer").value.trim().toLocaleLowerCase();
  const correct = quizWord.english.trim().toLocaleLowerCase();

  answered = true;

  if (answer === correct) {
    $("quizFeedback").textContent = "Richtig! Sehr gut! 🎉";
    $("quizFeedback").className = "feedback success";
  } else {
    $("quizFeedback").textContent = `Noch nicht ganz. Die richtige Antwort ist: ${quizWord.english}`;
    $("quizFeedback").className = "feedback error";
  }

  $("quizAnswer").disabled = true;
  $("checkBtn").disabled = true;

  // Bei nur einer Vokabel kann man direkt wieder lernen.
  $("nextBtn").textContent = words.length === 1
    ? "Nochmal lernen"
    : "Weiter zur nächsten Vokabel";
});

// Loginstatus
onAuthStateChanged(auth, async signedInUser => {
  user = signedInUser;

  if (user) {
    $("authView").hidden = true;
    $("appView").hidden = false;
    $("logoutBtn").hidden = false;
    $("userEmail").textContent = user.email || "";

    setWordsVisible(false);
    await loadWords();

  } else {
    $("authView").hidden = false;
    $("appView").hidden = true;
    $("logoutBtn").hidden = true;

    words = [];
    resetQuiz();
    setWordsVisible(false);
  }
});
