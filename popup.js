// popup.js
(() => {
    const $ = (id) => document.getElementById(id);
    const groqKeyInput = $("groqKey");
    const githubTokenInput = $("githubToken");
    const saveBtn = $("saveBtn");
    const statusEl = $("status");

    let statusTimer = null;
    let savedValues = { groqKey: "", githubToken: "" };

    const showStatus = (message, type = "success") => {
        if (statusTimer) clearTimeout(statusTimer);
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        statusTimer = setTimeout(() => {
            statusEl.textContent = "";
            statusEl.className = "status";
            statusTimer = null;
        }, 3000);
    };

    const setInputError = (input, hasError) => {
        input.style.borderColor = hasError ? "#f85149" : "";
        input.style.boxShadow = hasError ? "0 0 0 3px rgba(248, 81, 73, 0.12)" : "";
    };

    const validate = () => {
        const groq = groqKeyInput.value.trim();
        const github = githubTokenInput.value.trim();

        setInputError(groqKeyInput, false);
        setInputError(githubTokenInput, false);

        if (!groq) {
            setInputError(groqKeyInput, true);
            groqKeyInput.focus();
            showStatus("API key is required to continue.", "error");
            return null;
        }
        if (!groq.startsWith("gsk_")) {
            setInputError(groqKeyInput, true);
            groqKeyInput.focus();
            showStatus("Groq key must start with gsk_", "error");
            return null;
        }
        if (github && !github.startsWith("ghp_")) {
            setInputError(githubTokenInput, true);
            githubTokenInput.focus();
            showStatus("Token must start with ghp_", "error");
            return null;
        }
        return { groqKey: groq, githubToken: github };
    };

    const save = () => {
        const data = validate();
        if (!data) return;

        if (
            data.groqKey === savedValues.groqKey &&
            data.githubToken === savedValues.githubToken
        ) {
            showStatus("Already up to date - no changes.", "success");
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        chrome.storage.local.set(data, () => {
            savedValues = { ...data };
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
            showStatus("Keys saved ✓", "success");
        });
    };

    chrome.storage.local.get(["groqKey", "githubToken"], (result) => {
        if (result.groqKey) groqKeyInput.value = result.groqKey;
        if (result.githubToken) githubTokenInput.value = result.githubToken;
        savedValues = {
            groqKey: result.groqKey || "",
            githubToken: result.githubToken || "",
        };
    });

    groqKeyInput.addEventListener("input", () => setInputError(groqKeyInput, false));
    githubTokenInput.addEventListener("input", () => setInputError(githubTokenInput, false));

    saveBtn.addEventListener("click", save);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
    });
})();