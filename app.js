  
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// 1. Deine Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyApwjzgVtKnP258TDJxDwnyNAAZGWeXpXM",
  authDomain: "vocalearn-2e7b5.firebaseapp.com",
  projectId: "vocalearn-2e7b5",
  storageBucket: "vocalearn-2e7b5.firebasestorage.app",
  messagingSenderId: "706553554359",
  appId: "1:706553554359:web:f63df69b367c1aa9983432",
  measurementId: "G-9CDWK528RX"
};

// 2. Firebase initialisieren
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 3. HTML-Elemente finden
const authView = document.getElementById("authView");
const userView = document.getElementById("userView");

const authForm = document.getElementById("authForm");
const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const nameField = document.getElementById("nameField");
const passwordField = document.getElementById("passwordField");
const confirmField = document.getElementById("confirmField");
const loginOptions = document.getElementById("loginOptions");

const displayNameInput = document.getElementById("displayName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const rememberMeInput = document.getElementById("rememberMe");

const submitButton = document.getElementById("submitButton");
const forgotButton = document.getElementById("forgotButton");
const logoutButton = document.getElementById("logoutButton");

const message = document.getElementById("message");
const userMessage = document.getElementById("userMessage");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

// Telefonnummer-Elemente
const phoneNumberInput = document.getElementById("phoneNumber");
const sendPhoneCodeButton = document.getElementById("sendPhoneCode");
const phoneCodeInput = document.getElementById("phoneCode");
const verifyPhoneCodeButton = document.getElementById("verifyPhoneCode");

let mode = "login";
let busy = false;
let confirmationResult = null;
let recaptchaVerifier = null;

// 4. Deutsche Fehlermeldungen
function getErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "Diese E-Mail-Adresse ist bereits registriert.",
    "auth/invalid-email": "Bitte gib eine gültige E-Mail-Adresse ein.",
    "auth/weak-password": "Dein Passwort ist zu schwach. Verwende mindestens 6 Zeichen.",
    "auth/invalid-credential": "E-Mail-Adresse oder Passwort ist falsch.",
    "auth/user-not-found": "Es wurde kein Konto mit diesen Anmeldedaten gefunden.",
    "auth/wrong-password": "Das Passwort ist falsch.",
    "auth/too-many-requests": "Zu viele Versuche. Bitte warte kurz.",
    "auth/network-request-failed": "Keine Verbindung möglich. Prüfe deine Internetverbindung.",
    "auth/operation-not-allowed": "Diese Anmeldemethode ist in Firebase nicht aktiviert.",
    "auth/unauthorized-domain": "Diese Website-Domain ist in Firebase nicht autorisiert.",
    "auth/invalid-api-key": "Der Firebase-API-Schlüssel ist ungültig.",
    "auth/missing-email": "Bitte gib zuerst deine E-Mail-Adresse ein.",
    "auth/invalid-phone-number": "Bitte gib eine gültige Telefonnummer im internationalen Format ein.",
    "auth/missing-phone-number": "Bitte gib deine Handynummer ein.",
    "auth/invalid-verification-code": "Der SMS-Code ist falsch.",
    "auth/code-expired": "Der SMS-Code ist abgelaufen. Bitte fordere einen neuen an.",
    "auth/captcha-check-failed": "Die Sicherheitsprüfung ist fehlgeschlagen.",
    "auth/requires-recent-login": "Bitte melde dich erneut an."
  };

  return messages[error.code] ||
    "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.";
}

// 5. Statusmeldungen
function showMessage(text, type = "error", target = message) {
  target.textContent = text;
  target.className = `message ${type}`;
  target.hidden = false;
}

function clearMessage(target = message) {
  target.textContent = "";
  target.hidden = true;
  target.className = "message";
}

// 6. Login und Registrierung
function setMode(newMode) {
  mode = newMode;

  clearMessage();
  clearMessage(userMessage);

  const isRegister = mode === "register";

  loginTab.classList.toggle("active", mode === "login");
  registerTab.classList.toggle("active", isRegister);

  nameField.hidden = !isRegister;
  confirmField.hidden = !isRegister;
  loginOptions.hidden = isRegister;

  displayNameInput.required = isRegister;
  confirmPasswordInput.required = isRegister;

  passwordInput.autocomplete = isRegister
    ? "new-password"
    : "current-password";

  formTitle.textContent = isRegister
    ? "Konto erstellen"
    : "Willkommen zurück!";

  formSubtitle.textContent = isRegister
    ? "Starte jetzt deine Sprachlernreise."
    : "Melde dich an und lerne neue Wörter.";

  submitButton.textContent = isRegister
    ? "Konto erstellen"
    : "Anmelden";
}

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));

// 7. Buttons sperren
function setBusy(value) {
  busy = value;
  submitButton.disabled = value;
  forgotButton.disabled = value;
  loginTab.disabled = value;
  registerTab.disabled = value;

  submitButton.textContent = value
    ? "Bitte warten ..."
    : mode === "register"
      ? "Konto erstellen"
      : "Anmelden";
}

// 8. E-Mail-Anmeldung und Registrierung
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (busy) return;

  clearMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const name = displayNameInput.value.trim();

  if (mode === "register") {
    if (name.length < 2) {
      showMessage("Bitte gib einen Namen mit mindestens 2 Zeichen ein.");
      return;
    }

    if (password !== confirmPasswordInput.value) {
      showMessage("Die beiden Passwörter stimmen nicht überein.");
      return;
    }

    if (password.length < 6) {
      showMessage("Dein Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
  }

  setBusy(true);

  try {
    await setPersistence(
      auth,
      rememberMeInput.checked
        ? browserLocalPersistence
        : browserSessionPersistence
    );

    if (mode === "register") {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(credential.user, {
        displayName: name
      });

      showMessage(
        "Dein Konto wurde erstellt. Willkommen bei VocaLearn!",
        "success"
      );
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showMessage(getErrorMessage(error));
  } finally {
    setBusy(false);
  }
});

// 9. Passwort zurücksetzen
forgotButton.addEventListener("click", async () => {
  if (busy) return;

  clearMessage();

  const email = emailInput.value.trim();

  if (!email) {
    showMessage("Gib zuerst deine E-Mail-Adresse ein.");
    emailInput.focus();
    return;
  }

  forgotButton.disabled = true;

  try {
    await sendPasswordResetEmail(auth, email);

    showMessage(
      "Falls für diese Adresse ein Konto existiert, erhältst du eine E-Mail zum Zurücksetzen des Passworts.",
      "success"
    );
  } catch (error) {
    showMessage(getErrorMessage(error));
  } finally {
    forgotButton.disabled = false;
  }
});

// 10. Telefonnummer: reCAPTCHA vorbereiten
function initializeRecaptcha() {
  if (recaptchaVerifier) return;

  recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "normal"
    }
  );
}

// 11. SMS-Code senden
if (sendPhoneCodeButton) {
  sendPhoneCodeButton.addEventListener("click", async () => {
    if (busy) return;

    clearMessage();

    const phoneNumber = phoneNumberInput.value.trim();

    if (!phoneNumber) {
      showMessage("Bitte gib deine Handynummer ein.");
      return;
    }

    sendPhoneCodeButton.disabled = true;

    try {
      await setPersistence(
        auth,
        rememberMeInput.checked
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      initializeRecaptcha();

      const appVerifier = await recaptchaVerifier;

      confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier
      );

      showMessage(
        "Der SMS-Code wurde an deine Handynummer gesendet.",
        "success"
      );

      phoneCodeInput.hidden = false;
      verifyPhoneCodeButton.hidden = false;
    } catch (error) {
      showMessage(getErrorMessage(error));

      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        recaptchaVerifier = null;
      }
    } finally {
      sendPhoneCodeButton.disabled = false;
    }
  });
}

// 12. SMS-Code überprüfen und anmelden
if (verifyPhoneCodeButton) {
  verifyPhoneCodeButton.addEventListener("click", async () => {
    if (!confirmationResult) {
      showMessage("Bitte fordere zuerst einen SMS-Code an.");
      return;
    }

    const code = phoneCodeInput.value.trim();

    if (!code) {
      showMessage("Bitte gib den SMS-Code ein.");
      return;
    }

    verifyPhoneCodeButton.disabled = true;

    try {
      await confirmationResult.confirm(code);

      showMessage(
        "Du hast dich erfolgreich mit deiner Handynummer angemeldet!",
        "success"
      );

      phoneCodeInput.value = "";
      confirmationResult = null;
    } catch (error) {
      showMessage(getErrorMessage(error));
    } finally {
      verifyPhoneCodeButton.disabled = false;
    }
  });
}

// 13. Angemeldeten Nutzer anzeigen
onAuthStateChanged(auth, (user) => {
  if (user) {
    authView.hidden = true;
    userView.hidden = false;

    userName.textContent = user.displayName || "Lernender";
    userEmail.textContent = user.email || user.phoneNumber || "";

    clearMessage(userMessage);
  } else {
    userView.hidden = true;
    authView.hidden = false;
  }
});

// 14. Abmelden
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  clearMessage(userMessage);

  try {
    await signOut(auth);

    setMode("login");
    authForm.reset();
    rememberMeInput.checked = true;

    showMessage("Du wurdest erfolgreich abgemeldet.", "success");
  } catch (error) {
    showMessage(getErrorMessage(error), "error", userMessage);
  } finally {
    logoutButton.disabled = false;
  }
});

// 15. Mit dem Login-Formular beginnen
setMode("login");
