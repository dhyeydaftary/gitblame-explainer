// popup.js
(() => {
    const $ = (id) => document.getElementById(id);
    const claudeKeyInput = $("claudeKey");
    const githubTokenInput = $("githubToken");
    const saveBtn = $("saveBtn");
    const statusEl = $("status");

    let statusTimer = null;
    let savedValues = { claudeKey: "", githubToken: "" };

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
        const claude = claudeKeyInput.value.trim();
        const github = githubTokenInput.value.trim();

        // Reset both first
        setInputError(claudeKeyInput, false);
        setInputError(githubTokenInput, false);

        if (!claude) {
            setInputError(claudeKeyInput, true);
            claudeKeyInput.focus();
            showStatus("API key is required to continue.", "error");
            return null;
        }
        if (!claude.startsWith("sk-ant-")) {
            setInputError(claudeKeyInput, true);
            claudeKeyInput.focus();
            showStatus("Key must start with sk-ant-", "error");
            return null;
        }
        if (github && !github.startsWith("ghp_")) {
            setInputError(githubTokenInput, true);
            githubTokenInput.focus();
            showStatus("Token must start with ghp_", "error");
            return null;
        }
        return { claudeKey: claude, githubToken: github };
    };

    const save = () => {
        const data = validate();
        if (!data) return;

        if (
            data.claudeKey === savedValues.claudeKey &&
            data.githubToken === savedValues.githubToken
        ) {
            showStatus("Already up to date - no changes.", "success");
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving…";

        chrome.storage.local.set(data, () => {
            savedValues = { ...data };
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
            showStatus("Keys saved ✓", "success");
        });
    };

    chrome.storage.local.get(["claudeKey", "githubToken"], (result) => {
        if (result.claudeKey) claudeKeyInput.value = result.claudeKey;
        if (result.githubToken) githubTokenInput.value = result.githubToken;
        savedValues = {
            claudeKey: result.claudeKey || "",
            githubToken: result.githubToken || "",
        };
    });

    claudeKeyInput.addEventListener("input", () => setInputError(claudeKeyInput, false));
    githubTokenInput.addEventListener("input", () => setInputError(githubTokenInput, false));

    saveBtn.addEventListener("click", save);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
    });
})();