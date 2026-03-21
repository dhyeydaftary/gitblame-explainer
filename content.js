// content.js
(() => {
    const HOVER_DELAY = 700;
    const HIDE_DELAY = 280;
    const SCROLL_THRESHOLD = 60;
    const TOOLTIP_WIDTH = 340;
    const TOOLTIP_HEIGHT_ESTIMATE = 240;
    const MARGIN = 16;

    let tooltip = null;
    let hoverTimer = null;
    let hideTimer = null;
    let currentLine = null;
    let lastResolvedLine = null;
    let lastResolvedData = null;
    let scrollY = window.scrollY;
    let repoInfo = null;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const parseGitHubUrl = () => {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts.length < 5 || parts[2] !== "blob") return null;
        return {
            owner: parts[0],
            repo: parts[1],
            ref: parts[3],
            filePath: parts.slice(4).join("/"),
        };
    };

    const injectStyles = () => {
        if (document.getElementById("gbe-styles")) return;
        const style = document.createElement("style");
        style.id = "gbe-styles";
        style.textContent = `
            #gbe-tooltip {
                position: absolute;
                z-index: 99999;
                width: 340px;
                padding: 18px 20px;
                background: #161b22;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 14px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                font-size: 13px;
                color: #b1bac4;
                line-height: 1.4;
                box-shadow:
                    0 20px 60px rgba(0,0,0,0.6),
                    0 0 0 1px rgba(255,255,255,0.05),
                    0 0 80px -20px rgba(139,92,246,0.08);
                opacity: 0;
                transform: translateY(6px);
                visibility: hidden;
                pointer-events: none;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            #gbe-tooltip.gbe-visible {
                opacity: 1;
                transform: translateY(0);
                visibility: visible;
                pointer-events: auto;
            }
            #gbe-tooltip .gbe-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            #gbe-tooltip .gbe-sha {
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 11px;
                font-weight: 600;
                color: #a78bfa;
                background: rgba(139,92,246,0.15);
                border: 1px solid rgba(139,92,246,0.3);
                padding: 3px 10px;
                border-radius: 999px;
                letter-spacing: 0.01em;
            }
            #gbe-tooltip .gbe-date {
                font-size: 11px;
                color: #4a5568;
            }
            #gbe-tooltip .gbe-author {
                font-size: 12px;
                color: #6b7280;
                font-style: italic;
                margin-bottom: 6px;
            }
            #gbe-tooltip .gbe-message {
                font-size: 13px;
                font-weight: 600;
                color: #f0f6fc;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 14px;
                line-height: 1.4;
            }
            #gbe-tooltip .gbe-divider {
                border: none;
                border-top: 1px solid rgba(255,255,255,0.07);
                margin: 0 0 14px 0;
            }
            #gbe-tooltip .gbe-ai-label {
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: #a78bfa;
                margin-bottom: 0;
                padding: 10px 12px 0 12px;
                background: rgba(139,92,246,0.06);
                border-left: 2px solid rgba(139,92,246,0.4);
                border-radius: 0 8px 0 0;
            }
            #gbe-tooltip .gbe-explanation {
                font-size: 12.5px;
                color: #c9d1d9;
                line-height: 1.65;
                margin-bottom: 14px;
                padding: 8px 12px 10px 12px;
                background: rgba(139,92,246,0.06);
                border-left: 2px solid rgba(139,92,246,0.4);
                border-radius: 0 0 8px 0;
            }
            #gbe-tooltip .gbe-link {
                display: inline-block;
                font-size: 11px;
                color: #6b7280;
                text-decoration: none;
                transition: color 0.15s ease;
            }
            #gbe-tooltip .gbe-link:hover {
                color: #a78bfa;
            }
            #gbe-tooltip.gbe-loading .gbe-sha {
                animation: gbe-pulse 1.4s ease-in-out infinite;
            }
            #gbe-tooltip.gbe-loading .gbe-explanation {
                color: #374151;
            }
            #gbe-tooltip.gbe-error .gbe-explanation {
                color: #f87171;
            }
            @keyframes gbe-pulse {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    };

    const createTooltip = () => {
        if (tooltip) return tooltip;
        injectStyles();
        const el = document.createElement("div");
        el.id = "gbe-tooltip";
        el.innerHTML = `
            <div class="gbe-header">
                <span class="gbe-sha"  id="gbe-sha"></span>
                <span class="gbe-date" id="gbe-date"></span>
            </div>
            <div class="gbe-author"      id="gbe-author"></div>
            <div class="gbe-message"     id="gbe-message"></div>
            <hr  class="gbe-divider"  />
            <div class="gbe-ai-label">AI explanation</div>
            <div class="gbe-explanation" id="gbe-explanation"></div>
            <a   class="gbe-link"        id="gbe-link" target="_blank" rel="noopener">View commit →</a>
        `;
        document.body.appendChild(el);
        tooltip = el;
        el.addEventListener("mouseenter", () => clearTimeout(hideTimer));
        el.addEventListener("mouseleave", () => scheduleHide());
        return el;
    };

    const setField = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "";
    };

    const setLink = (url) => {
        const el = document.getElementById("gbe-link");
        if (!el) return;
        if (url && url !== "#") {
            el.href = url;
            el.style.display = "";
        } else {
            el.style.display = "none";
        }
    };

    const positionTooltip = () => {
        const t = createTooltip();

        const mouseX = lastMouseX;
        const mouseY = lastMouseY;

        let left = mouseX + MARGIN;
        if (left + TOOLTIP_WIDTH + 8 > window.innerWidth) {
            left = mouseX - TOOLTIP_WIDTH - MARGIN;
        }
        left = Math.max(4, left);

        let top = mouseY;
        if (top + TOOLTIP_HEIGHT_ESTIMATE > window.innerHeight) {
            top = window.innerHeight - TOOLTIP_HEIGHT_ESTIMATE - MARGIN;
        }
        top = Math.max(4, top);

        t.style.left = `${left + window.scrollX}px`;
        t.style.top = `${top + window.scrollY}px`;
    };

    const setTooltipState = (state) => {
        const t = createTooltip();
        t.classList.remove("gbe-loading", "gbe-error", "gbe-success");
        if (state) t.classList.add(`gbe-${state}`);
    };

    const showTooltip = () => {
        clearTimeout(hideTimer);
        createTooltip().classList.add("gbe-visible");
    };

    const hideTooltip = () => {
        if (tooltip) tooltip.classList.remove("gbe-visible");
        currentLine = null;
    };

    const scheduleHide = () => {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            if (tooltip && !tooltip.matches(":hover")) hideTooltip();
        }, HIDE_DELAY);
    };

    const showLoading = () => {
        setTooltipState("loading");
        setField("gbe-sha", "fetching...");
        setField("gbe-date", "");
        setField("gbe-author", "");
        setField("gbe-message", "");
        setField("gbe-explanation", "Asking AI...");
        setLink(null);
        positionTooltip();
        showTooltip();
    };

    const showData = (data) => {
        setTooltipState("success");
        setField("gbe-sha", data.sha ? `#${data.sha}` : "");
        setField("gbe-date", data.date || "");
        setField("gbe-author", data.author ? `by ${data.author}` : "");
        setField("gbe-message", data.message || "");
        setField("gbe-explanation", data.explanation || "No explanation available.");
        setLink(data.commitUrl);
    };

    const showError = (msg) => {
        setTooltipState("error");
        setField("gbe-explanation", msg || "Something went wrong.");
        setLink(null);
    };

    const handleHover = (cell, lineNumber) => {
        if (lineNumber === lastResolvedLine && lastResolvedData) {
            positionTooltip();
            showData(lastResolvedData);
            showTooltip();
            return;
        }

        showLoading();

        chrome.runtime.sendMessage(
            {
                type: "EXPLAIN_LINE",
                owner: repoInfo.owner,
                repo: repoInfo.repo,
                filePath: repoInfo.filePath,
                lineNumber,
            },
            (response) => {
                if (currentLine !== lineNumber) return;
                if (chrome.runtime.lastError) {
                    showError("Extension error — try reloading the page.");
                    return;
                }
                if (!response) {
                    showError("No response from extension.");
                    return;
                }
                if (response.success) {
                    lastResolvedLine = lineNumber;
                    lastResolvedData = response.data;
                    showData(response.data);
                } else {
                    showError(response.error);
                }
            }
        );
    };

    const getLineNumber = (target) => {
        const lcCell = target.closest("[id^='LC']");
        if (lcCell?.id) return { cell: lcCell, lineNumber: lcCell.id.slice(2) };

        const tr = target.closest("tr");
        if (tr) {
            const blobCell = tr.querySelector(".blob-code");
            const lineEl = tr.querySelector("[data-line-number]");
            if (blobCell && lineEl) {
                return { cell: blobCell, lineNumber: lineEl.getAttribute("data-line-number") };
            }
        }

        const lineEl = target.closest("[data-line-number]");
        if (lineEl) {
            return { cell: lineEl.parentElement || lineEl, lineNumber: lineEl.getAttribute("data-line-number") };
        }

        return null;
    };

    let moveRaf = null;

    const attachListeners = () => {
        document.addEventListener("mousemove", (e) => {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;

            if (moveRaf) cancelAnimationFrame(moveRaf);
            moveRaf = requestAnimationFrame(() => {
                let result = null;

                if (e.target.id !== "gbe-tooltip" && e.target.tagName !== "TEXTAREA") {
                    result = getLineNumber(e.target);
                }
                if (!result) {
                    const elements = document.elementsFromPoint(e.clientX, e.clientY);
                    for (const el of elements) {
                        if (el.id === "gbe-tooltip" || el.closest("#gbe-tooltip")) continue;
                        if (el.tagName === "TEXTAREA") continue;
                        result = getLineNumber(el);
                        if (result) break;
                    }
                }

                if (!result) {
                    const lineNums = document.querySelectorAll('[data-line-number]');
                    for (const num of lineNums) {
                        const rect = num.getBoundingClientRect();
                        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                            const text = num.getAttribute('data-line-number');
                            if (text && /^\d+$/.test(text)) {
                                const codeContainer = num.parentElement?.parentElement;
                                const codeCell = codeContainer?.querySelector('.react-file-line') ||
                                    codeContainer?.querySelector(`[id="LC${text}"]`) ||
                                    num.parentElement;
                                result = { cell: codeCell || num.parentElement, lineNumber: text };
                                break;
                            }
                        }
                    }
                }

                if (!result) {
                    if (currentLine !== null) {
                        currentLine = null;
                        clearTimeout(hoverTimer);
                        scheduleHide();
                    }
                    return;
                }

                const { cell, lineNumber } = result;

                if (lineNumber === currentLine) {
                    clearTimeout(hideTimer);
                    return;
                }

                currentLine = lineNumber;
                clearTimeout(hoverTimer);
                clearTimeout(hideTimer);

                hoverTimer = setTimeout(() => {
                    if (currentLine === lineNumber) handleHover(cell, lineNumber);
                }, HOVER_DELAY);
            });
        });

        document.addEventListener("click", (e) => {
            if (tooltip && !tooltip.contains(e.target)) hideTooltip();
        });

        window.addEventListener("scroll", () => {
            if (Math.abs(window.scrollY - scrollY) > SCROLL_THRESHOLD) {
                clearTimeout(hoverTimer);
                hideTooltip();
            }
            scrollY = window.scrollY;
        }, { passive: true });
    };

    const init = () => {
        repoInfo = parseGitHubUrl();
        if (!repoInfo) return;
        lastResolvedLine = null;
        lastResolvedData = null;
        attachListeners();
    };

    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            hideTooltip();
            repoInfo = parseGitHubUrl();
            lastResolvedLine = null;
            lastResolvedData = null;
        }
    }).observe(document.body, { childList: true, subtree: true });

    init();
})();