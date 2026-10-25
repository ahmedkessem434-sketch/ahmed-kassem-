let words = JSON.parse(localStorage.getItem("vocabularies")) || [];

let currentWord = null;


// LOGIN
function login() {

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("loginMessage");

    if (!email || !password) {
        message.textContent = "Bitte E-Mail und Passwort eingeben.";
        return;
    }

    // Demo-Login
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("userEmail", email);

    showApp();
}


// GOOGLE LOGIN – Platzhalter
function googleLogin() {

    alert(
        "Der echte Google-Login wird später über Google OAuth eingerichtet."
    );
}


// LOGOUT
function logout() {

    localStorage.removeItem("loggedIn");

    document.getElementById("loginPage")
        .classList.remove("hidden");

    document.getElementById("appPage")
        .classList.add("hidden");
}


// APP ANZEIGEN
function showApp() {

    document.getElementById("loginPage")
        .classList.add("hidden");

    document.getElementById("appPage")
        .classList.remove("hidden");

    displayWords();
}


// VOKABEL HINZUFÜGEN
function addWord() {

    const word1 = document.getElementById("word1").value.trim();
    const word2 = document.getElementById("word2").value.trim();

    if (!word1 || !word2) {
        alert("Bitte beide Wörter eingeben.");
        return;
    }

    words.push({
        first: word1,
        second: word2
    });

    localStorage.setItem(
        "vocabularies",
        JSON.stringify(words)
    );

    document.getElementById("word1").value = "";
    document.getElementById("word2").value = "";

    displayWords();
}


// VOKABELN ANZEIGEN
function displayWords() {

    const list = document.getElementById("wordList");

    list.innerHTML = "";

    words.forEach((word, index) => {

        const element = document.createElement("div");

        element.className = "word";

        element.innerHTML = `
            <span>
                🇩🇪 ${word.first}
                →
                🇬🇧 ${word.second}
            </span>

            <button onclick="deleteWord(${index})">
                🗑️
            </button>
        `;

        list.appendChild(element);
    });
}


// LÖSCHEN
function deleteWord(index) {

    words.splice(index, 1);

    localStorage.setItem(
        "vocabularies",
        JSON.stringify(words)
    );

    displayWords();
}


// LERNEN
function nextWord() {

    if (words.length === 0) {
        document.getElementById("question").textContent =
            "Du hast noch keine Vokabeln.";
        return;
    }

    const randomIndex =
        Math.floor(Math.random() * words.length);

    currentWord = words[randomIndex];

    document.getElementById("question").textContent =
        currentWord.first;

    document.getElementById("answer").value = "";

    document.getElementById("result").textContent = "";
}


// ANTWORT PRÜFEN
function checkAnswer() {

    if (!currentWord) {
        nextWord();
        return;
    }

    const answer =
        document.getElementById("answer").value.trim();

    const result =
        document.getElementById("result");

    if (answer.toLowerCase() ===
        currentWord.second.toLowerCase()) {

        result.textContent = "✅ Richtig!";

    } else {

        result.textContent =
            "❌ Leider falsch. Richtig wäre: " +
            currentWord.second;
    }
}


// BEIM START PRÜFEN
if (localStorage.getItem("loggedIn") === "true") {
    showApp();
}