// content.js
(() => {
    const HOVER_DELAY = 700;
    const HIDE_DELAY = 280;
    const SCROLL_THRESHOLD = 60;
    const TOOLTIP_WIDTH = 340;

    let tooltip = null;
    let hoverTimer = null;
    let hideTimer = null;
    let currentLine = null;
    let lastResolvedLine = null;
    let lastResolvedData = null;
    let scrollY = window.scrollY;
    let repoInfo = null;

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
                width: ${TOOLTIP_WIDTH}px;
                padding: 14px 16px;
                background: #0d1117;
                border: 1px solid #30363d;
                border-radius: 10px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                font-size: 12.5px;
                color: #c9d1d9;
                box-shadow: 0 8px 24px rgba(0,0,0,0.35);
                opacity: 0;
                transform: translateY(4px);
                transition: opacity 0.18s ease, transform 0.18s ease;
                pointer-events: none;
                visibility: hidden;
            }
            #gbe-tooltip.gbe-visible {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
                visibility: visible;
            }
            .gbe-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
            .gbe-sha { font-family: "SFMono-Regular", Consolas, monospace; font-size: 11.5px; color: #58a6ff; font-weight: 600; }
            .gbe-date { font-size: 11px; color: #484f58; }
            .gbe-author { font-size: 11.5px; color: #8b949e; margin-bottom: 6px; }
            .gbe-message { font-size: 12.5px; color: #e6edf3; line-height: 1.45; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
            .gbe-divider { border: none; border-top: 1px solid #21262d; margin: 8px 0; }
            .gbe-ai-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #484f58; font-weight: 600; margin-bottom: 4px; }
            .gbe-explanation { font-size: 12.5px; color: #c9d1d9; line-height: 1.5; }
            .gbe-link { display: inline-block; margin-top: 10px; font-size: 11px; color: #58a6ff; text-decoration: none; }
            .gbe-link:hover { text-decoration: underline; }
            #gbe-tooltip.gbe-loading .gbe-explanation { color: #484f58; }
            #gbe-tooltip.gbe-error .gbe-explanation { color: #f85149; }
            @keyframes gbe-pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
            #gbe-tooltip.gbe-loading .gbe-sha { animation: gbe-pulse 1.2s ease-in-out infinite; }
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

    const positionTooltip = (anchor) => {
        const t = createTooltip();
        const baseRect = anchor.getBoundingClientRect();
        
        let rightEdge = baseRect.right || 0;
        let leftEdge = baseRect.left || 0;
        let topEdge = baseRect.top || 0;
        let bottomEdge = baseRect.bottom || 0;
        
        try {
            const range = document.createRange();
            range.selectNodeContents(anchor);
            const rangeRect = range.getBoundingClientRect();
            if (rangeRect && rangeRect.width > 0) {
                rightEdge = rangeRect.right ?? rightEdge;
                leftEdge = rangeRect.left ?? leftEdge;
                topEdge = rangeRect.top ?? topEdge;
                bottomEdge = rangeRect.bottom ?? bottomEdge;
            }
        } catch (e) {
            // Silently fallback to anchor component boundaries
        }

        let left = rightEdge + 12;
        let top = topEdge - 8;

        if (left + TOOLTIP_WIDTH + 8 > window.innerWidth) {
            left = leftEdge;
            top = bottomEdge + 8;
        }
        
        left = Math.max(4, left);
        
        if (Number.isNaN(left)) left = 12;
        if (Number.isNaN(top)) top = 12;
        
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

    const showLoading = (cell) => {
        setTooltipState("loading");
        setField("gbe-sha", "fetching...");
        setField("gbe-date", "");
        setField("gbe-author", "");
        setField("gbe-message", "");
        setField("gbe-explanation", "Asking AI...");
        setLink(null);
        positionTooltip(cell);
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
        console.log(`[GitBlame Explainer] handleHover executing for line: ${lineNumber}`);
        if (lineNumber === lastResolvedLine && lastResolvedData) {
            console.log(`[GitBlame Explainer] Using cached data for line: ${lineNumber}`);
            positionTooltip(cell);
            showData(lastResolvedData);
            showTooltip();
            return;
        }

        console.log(`[GitBlame Explainer] Showing loading state for line: ${lineNumber}`);
        showLoading(cell);

        chrome.runtime.sendMessage(
            {
                type: "EXPLAIN_LINE",
                owner: repoInfo.owner,
                repo: repoInfo.repo,
                filePath: repoInfo.filePath,
                lineNumber,
            },
            (response) => {
                console.log(`[GitBlame Explainer] Background response received:`, response);
                if (currentLine !== lineNumber) return;
                if (chrome.runtime.lastError) {
                    console.error(`[GitBlame Explainer] Background script error:`, chrome.runtime.lastError);
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
        // 1. Legacy React explicit ID 
        let cell = target.closest("[id^='LC']");
        if (cell && cell.id) return { cell, lineNumber: cell.id.slice(2) };

        // 2. Legacy Table layout 
        let tr = target.closest("tr");
        if (tr) {
            let blobCell = tr.querySelector(".blob-code");
            let lineEl = tr.querySelector("[data-line-number]");
            if (blobCell && lineEl) return { cell: blobCell, lineNumber: lineEl.getAttribute("data-line-number") };
        }

        // 3. Current intermediate React layout (has data-line-number) 
        let lineEl = target.closest("[data-line-number]");
        if (lineEl) {
            let num = lineEl.getAttribute("data-line-number");
            return { cell: lineEl.parentElement || lineEl, lineNumber: num };
        }

        // 4. Cutting-edge GitHub UI: CSS Modules, missing data-line-number, missing IDs.
        let current = target;
        let depth = 0;
        while (current && current.tagName !== "BODY" && current.tagName !== "MAIN" && depth < 10) {
            for (let i = 0; i < Math.min(3, current.children.length); i++) {
                const child = current.children[i];
                const text = child.textContent.trim();
                if (/^\d+$/.test(text)) {
                    const classNames = ((current.className || "") + " " + (child.className || "")).toLowerCase();
                    if (classNames.includes("line") || classNames.includes("num") || classNames.includes("code") || classNames.includes("react")) {
                        return { cell: current, lineNumber: text };
                    }
                }
            }
            current = current.parentElement;
            depth++;
        }

        return null;
    };

    let moveRaf = null;

    const attachListeners = () => {
        document.addEventListener("mousemove", (e) => {
            // Throttle to animation frame for performance
            if (moveRaf) cancelAnimationFrame(moveRaf);
            
            moveRaf = requestAnimationFrame(() => {
                let result = null;
                
                // Fast path: if not blocked by textarea or tooltip
                if (e.target.id !== "gbe-tooltip" && e.target.tagName !== "TEXTAREA") {
                    result = getLineNumber(e.target);
                }
                
                // Slow path: penetrate the transparent overlay layer (like GitHub's new TEXTAREA)
                if (!result) {
                    const elements = document.elementsFromPoint(e.clientX, e.clientY);
                    for (const el of elements) {
                        if (el.id === "gbe-tooltip" || el.closest("#gbe-tooltip")) continue;
                        if (el.tagName === "TEXTAREA") continue;
                        
                        result = getLineNumber(el);
                        if (result) break;
                    }
                }

                // Ultimate fallback: If pointer-events is blocked off in the lower layers, 
                // we query all line numbers linearly and match by Y-coordinate directly.
                if (!result) {
                    const lineNums = document.querySelectorAll('[data-line-number], [class*="react-line-number"], [class*="LineNumber-module"]');
                    for (const num of lineNums) {
                        const rect = num.getBoundingClientRect();
                        // If the mouse is vertically inside this line's coordinates
                        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                            const text = num.getAttribute('data-line-number') || num.textContent.trim();
                            if (/^\d+$/.test(text)) {
                                result = { cell: num.parentElement || num, lineNumber: text };
                                break;
                            }
                        }
                    }
                }

                if (!result) {
                    // Mouse is no longer over a recognizable code line structure
                    if (currentLine !== null) {
                        currentLine = null;
                        clearTimeout(hoverTimer);
                        scheduleHide();
                    }
                    return;
                }

                const { cell, lineNumber } = result;

                if (lineNumber === currentLine) {
                    // We are still within the same line, just moving back and forth
                    clearTimeout(hideTimer); // Keep tooltip visible
                    return;
                }

                // Transitioned to a fundamentally different line
                console.log(`[GitBlame Explainer] Hover started on line: ${lineNumber}`);
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
        if (!repoInfo) {
            console.log("[GitBlame Explainer] Did not detect a valid GitHub file URL. Extension inert.");
            return;
        }
        console.log(`[GitBlame Explainer] Initialized on file: ${repoInfo.filePath} (${repoInfo.owner}/${repoInfo.repo})`);
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