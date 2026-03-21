// background.js
(() => {
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    const FETCH_TIMEOUT = 9000;
    const REQUIRED_FIELDS = ["owner", "repo", "filePath", "lineNumber"];

    const inflight = new Map();

    const ok = (data) => ({ success: true, data });
    const fail = (error) => ({ success: false, error });

    const DEV_KEYS = {
        geminiKey: "",
        githubToken: ""
    };

    const getStoredKeys = () =>
        new Promise((resolve) =>
            chrome.storage.local.get(["geminiKey", "githubToken"], (result) => {
                resolve({
                    geminiKey: result.geminiKey || DEV_KEYS.geminiKey,
                    githubToken: result.githubToken || DEV_KEYS.githubToken
                });
            })
        );

    const getCache = (key) =>
        new Promise((resolve) =>
            chrome.storage.local.get([key], (result) => {
                const entry = result[key];
                if (!entry || Date.now() - entry.timestamp > CACHE_TTL) {
                    if (entry) chrome.storage.local.remove(key);
                    return resolve(null);
                }
                resolve(entry.data);
            })
        );

    const setCache = (key, data) =>
        new Promise((resolve) =>
            chrome.storage.local.set({ [key]: { data, timestamp: Date.now() } }, resolve)
        );

    const formatDate = (iso) =>
        new Date(iso).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });

    const timedFetch = (url, options = {}) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        return fetch(url, { ...options, signal: controller.signal }).finally(() =>
            clearTimeout(id)
        );
    };

    const fetchGitHubCommits = async (owner, repo, filePath, token) => {
        const headers = { Accept: "application/vnd.github.v3+json" };
        if (token) headers.Authorization = `token ${token}`;

        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?path=${encodeURIComponent(filePath)}&per_page=1`;

        let res;
        try {
            res = await timedFetch(url, { headers });
        } catch (e) {
            if (e.name === "AbortError") throw new Error("GitHub request timed out. Try again.");
            throw new Error("Network error reaching GitHub. Check your connection.");
        }

        if (res.status === 403) throw new Error("GitHub rate limit reached. Add a token in the popup for 5,000 req/hr.");
        if (res.status === 404) throw new Error("Repo or file not found. Is it private? Add a GitHub token.");
        if (!res.ok) throw new Error(`GitHub returned ${res.status}. Try again shortly.`);

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error("No commit history found for this file.");
        return data[0];
    };

    const askGemini = async (commit, geminiKey) => {
        const prompt = `A developer made this Git commit:
Message: "${commit.commit.message}"
Author: ${commit.commit.author.name}
Date: ${commit.commit.author.date}

In 1-2 plain English sentences, explain what was changed and why.
Write for a CS student reading unfamiliar code. Be concise. Do not start with "This commit".`;

        let res;
        try {
            res = await timedFetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: 150 }
                    }),
                }
            );
        } catch (e) {
            if (e.name === "AbortError") throw new Error("Gemini request timed out. Try again.");
            throw new Error("Network error reaching Gemini. Check your connection.");
        }

        if (res.status === 400) throw new Error("Invalid Gemini API key. Update it in the popup.");
        if (res.status === 429) throw new Error("Gemini rate limit hit. Wait a moment and retry.");
        if (!res.ok) {
            let msg = `Gemini returned ${res.status}`;
            try { const b = await res.json(); msg = b.error?.message || msg; } catch { }
            throw new Error(msg);
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Gemini returned an empty response.");
        return text.trim();
    };

    const handleExplainLine = async (message) => {
        for (const field of REQUIRED_FIELDS) {
            if (!message[field] && message[field] !== 0) return fail(`Missing field: ${field}`);
        }

        const { owner, repo, filePath, lineNumber } = message;
        const cacheKey = `cache:${owner}/${repo}/${filePath}/${lineNumber}`;

        const cached = await getCache(cacheKey);
        if (cached) return ok(cached);

        if (inflight.has(cacheKey)) return inflight.get(cacheKey);

        const work = (async () => {
            try {
                const keys = await getStoredKeys();
                if (!keys.geminiKey) return fail("Add your Gemini API key in the extension popup.");

                const commit = await fetchGitHubCommits(owner, repo, filePath, keys.githubToken);
                const explanation = await askGemini(commit, keys.geminiKey);

                const result = {
                    author: commit.commit.author.name,
                    date: formatDate(commit.commit.author.date),
                    message: commit.commit.message.split("\n")[0],
                    explanation,
                    commitUrl: commit.html_url,
                    sha: commit.sha.substring(0, 7),
                };

                await setCache(cacheKey, result);
                return ok(result);
            } catch (err) {
                return fail(err.message || "Something went wrong.");
            } finally {
                inflight.delete(cacheKey);
            }
        })();

        inflight.set(cacheKey, work);
        return work;
    };

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type !== "EXPLAIN_LINE") return;
        handleExplainLine(message).then(sendResponse);
        return true;
    });
})();