// popup.js
(() => {
    const $ = (id) => document.getElementById(id);
    const geminiKeyInput = $("geminiKey");
    const githubTokenInput = $("githubToken");
    const saveBtn = $("saveBtn");
    const statusEl = $("status");

    let statusTimer = null;
    let savedValues = { geminiKey: "", githubToken: "" };

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
        const gemini = geminiKeyInput.value.trim();
        const github = githubTokenInput.value.trim();

        setInputError(geminiKeyInput, false);
        setInputError(githubTokenInput, false);

        if (!gemini) {
            setInputError(geminiKeyInput, true);
            geminiKeyInput.focus();
            showStatus("API key is required to continue.", "error");
            return null;
        }
        if (!gemini.startsWith("AIza")) {
            setInputError(geminiKeyInput, true);
            geminiKeyInput.focus();
            showStatus("Gemini key must start with AIza", "error");
            return null;
        }
        if (github && !github.startsWith("ghp_")) {
            setInputError(githubTokenInput, true);
            githubTokenInput.focus();
            showStatus("Token must start with ghp_", "error");
            return null;
        }
        return { geminiKey: gemini, githubToken: github };
    };

    const save = () => {
        const data = validate();
        if (!data) return;

        if (
            data.geminiKey === savedValues.geminiKey &&
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

    chrome.storage.local.get(["geminiKey", "githubToken"], (result) => {
        if (result.geminiKey) geminiKeyInput.value = result.geminiKey;
        if (result.githubToken) githubTokenInput.value = result.githubToken;
        savedValues = {
            geminiKey: result.geminiKey || "",
            githubToken: result.githubToken || "",
        };
    });

    geminiKeyInput.addEventListener("input", () => setInputError(geminiKeyInput, false));
    githubTokenInput.addEventListener("input", () => setInputError(githubTokenInput, false));

    saveBtn.addEventListener("click", save);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
    });
})();