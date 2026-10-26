   
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
} from
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// DEINE FIREBASE-DATEN HIER EINTRAGEN
const firebaseConfig = {
    apiKey: "DEIN_API_KEY",
    authDomain: "DEIN_PROJEKT.firebaseapp.com",
    projectId: "DEINE_PROJEKT_ID",
    appId: "DEINE_APP_ID"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const $ = id => document.getElementById(id);

let words = [];
let currentWord = null;
let loading = false;

function showLoginMessage(text) {
    $("loginMessage").textContent = text;
}

function showStatus(text) {
    $("status").textContent = text;
}

// Jeder Benutzer bekommt seine eigene Vokabelliste.
function wordCollection(user) {
    return collection(db, "users", user.uid, "words");
}

// Fehlermeldungen bei der Anmeldung
function authError(error) {
    console.error(error);

    switch (error.code) {
        case "auth/invalid-credential":
            return "E-Mail oder Passwort ist falsch.";

        case "auth/email-already-in-use":
            return "Diese E-Mail ist bereits registriert. Bitte einloggen.";

        case "auth/invalid-email":
            return "Bitte eine gültige E-Mail-Adresse eingeben.";

        case "auth/weak-password":
            return "Bitte verwende ein stärkeres Passwort.";

        case "auth/too-many-requests":
            return "Zu viele Versuche. Bitte versuche es später erneut.";

        default:
            return "Fehler: " + error.message;
    }
}

// NEUES KONTO ERSTELLEN
$("registerButton").addEventListener("click", async () => {
    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || !password) {
        showLoginMessage("Bitte E-Mail und Passwort eingeben.");
        return;
    }

    if (password.length < 6) {
        showLoginMessage("Das Passwort muss mindestens 6 Zeichen haben.");
        return;
    }

    showLoginMessage("Konto wird erstellt ...");

    try {
        await createUserWithEmailAndPassword(
            auth, email, password
        );

        showLoginMessage("");
    } catch (error) {
        showLoginMessage(authError(error));
    }
});

// EINLOGGEN
$("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    showLoginMessage("Anmeldung läuft ...");

    try {
        await signInWithEmailAndPassword(
            auth,
            $("email").value.trim(),
            $("password").value
        );

        showLoginMessage("");
    } catch (error) {
        showLoginMessage(authError(error));
    }
});

// VOKABELN ANZEIGEN
function renderWords() {
    const list = $("wordList");
    list.replaceChildren();

    if (words.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "Du hast noch keine Vokabeln gespeichert.";
        list.appendChild(empty);
        return;
    }

    words.forEach(word => {
        const row = document.createElement("div");
        row.className = "word";

        const label = document.createElement("span");
        label.textContent = word.german + " — " + word.english;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Löschen";
        button.addEventListener("click", () => deleteWord(word.id));

        row.append(label, button);
        list.appendChild(row);
    });
}

// VOKABELN AUS DER CLOUD LADEN
async function loadWords(user) {
    loading = true;
    showStatus("Vokabeln werden geladen ...");

    try {
        const snapshot = await getDocs(wordCollection(user));

        words = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        renderWords();
        showStatus(words.length + " Vokabeln gespeichert.");
    } catch (error) {
        console.error(error);
        showStatus(
            "Laden fehlgeschlagen. Prüfe deine Firestore-Regeln."
        );
    } finally {
        loading = false;
    }
}

// ANMELDESTATUS PRÜFEN
async function startApp() {
    // Die Sitzung im Browser beibehalten.
    await setPersistence(auth, browserLocalPersistence);

    // Genau ein Anmeldestatus-Listener.
    onAuthStateChanged(auth, async user => {
        $("loginPage").classList.toggle("hidden", !!user);
        $("appPage").classList.toggle("hidden", !user);

        if (!user) {
            words = [];
            currentWord = null;

            $("wordList").replaceChildren();
            $("userEmail").textContent = "";
            $("result").textContent = "";
            $("status").textContent = "";

            $("question").textContent =
                "Klicke auf „Nächste Vokabel“, um zu starten.";

            return;
        }

        $("userEmail").textContent =
            "Angemeldet als: " + user.email;

        await loadWords(user);
    });
}

startApp().catch(error => {
    console.error(error);
    showLoginMessage(
        "Firebase konnte nicht gestartet werden. Prüfe deine Konfiguration."
    );
});

// ABMELDEN
$("logoutButton").addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
        showStatus("Abmelden fehlgeschlagen.");
    }
});

// NEUE VOKABEL SPEICHERN
$("wordForm").addEventListener("submit", async event => {
    event.preventDefault();

    const user = auth.currentUser;

    if (!user || loading) return;

    const german = $("word1").value.trim();
    const english = $("word2").value.trim();

    if (!german || !english) return;

    try {
        await addDoc(wordCollection(user), {
            german,
            english,
            createdAt: Date.now()
        });

        $("word1").value = "";
        $("word2").value = "";

        await loadWords(user);
    } catch (error) {
        console.error(error);
        showStatus(
            "Speichern fehlgeschlagen. Prüfe deine Firestore-Regeln."
        );
    }
});

// VOKABEL LÖSCHEN
async function deleteWord(id) {
    const user = auth.currentUser;

    if (!user) return;

    try {
        await deleteDoc(
            doc(db, "users", user.uid, "words", id)
        );

        await loadWords(user);
    } catch (error) {
        console.error(error);
        showStatus("Löschen fehlgeschlagen.");
    }
}

// NÄCHSTE VOKABEL
$("nextButton").addEventListener("click", () => {
    if (words.length === 0) {
        $("question").textContent =
            "Füge zuerst ein paar Vokabeln hinzu.";
        return;
    }

    const alternatives = words.filter(
        word => word.id !== currentWord?.id
    );

    const pool = alternatives.length ? alternatives : words;

    currentWord = pool[
        Math.floor(Math.random() * pool.length)
    ];

    $("question").textContent =
        "Was heißt „" + currentWord.german + "“ auf Englisch?";

    $("answer").value = "";
    $("result").textContent = "";
});

// ANTWORT PRÜFEN
$("answerForm").addEventListener("submit", event => {
    event.preventDefault();

    if (!currentWord) {
        $("result").textContent =
            "Klicke zuerst auf „Nächste Vokabel“.";
        return;
    }

    const answer = $("answer").value.trim().toLowerCase();
    const correct = currentWord.english.trim().toLowerCase();

    if (answer && answer === correct) {
        $("result").textContent = "Richtig! Gut gemacht.";
    } else {
        $("result").textContent =
            "Noch nicht richtig. Lösung: " + currentWord.english;
    }
});
