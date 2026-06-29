const shoppingList = document.getElementById("shoppingList");
const shoppingPanel = document.getElementById("shoppingPanel");
const memoVisual = document.getElementById("memoVisual");
const stockList = document.getElementById("stockList");
const stockBox = document.getElementById("stockBox");
const fridgeVisual = document.getElementById("fridgeVisual");
const trash = document.getElementById("trash");
const monthlyBudget = document.getElementById("monthlyBudget");
const plannedExpense = document.getElementById("plannedExpense");
const remainingBudget = document.getElementById("remainingBudget");
const hourHand = document.getElementById("hourHand");
const minuteHand = document.getElementById("minuteHand");
const secondHand = document.getElementById("secondHand");
const analogClock = document.querySelector(".clock");
const pigeonStage = document.getElementById("pigeonStage");
const fortuneResult = document.getElementById("fortuneResult");
const redFlash = document.getElementById("redFlash");
const digitalClock = document.getElementById("digitalClock");
const calendarDate = document.getElementById("calendarDate");
const saveBtn = document.getElementById("saveBtn");
const bulkShoppingInput = document.getElementById("bulkShoppingInput");
const bulkAddBtn = document.getElementById("bulkAddBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const itemModal = document.getElementById("itemModal");
const modalAmount = document.getElementById("modalAmount");
const modalExpiry = document.getElementById("modalExpiry");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");

const SNAPSHOT_API = "/api/snapshot";
const THEME_STORAGE_KEY = "freezer_theme";
const THEMES = ["stylish", "natural", "monochrome"];

let plannedTotal = 0;
let draggedItem = null;
let wasOverBudget = false;
let suppressAutoSave = false;
let modalTargetItem = null;
let fridgeOpened = false;
let memoOpened = false;
const SWIPE_DELETE_THRESHOLD = 72;

function formatNumber(value) {
    return Number(value).toLocaleString("ja-JP");
}

function parseNumberInput(value) {
    const normalized = String(value || "").replace(/,/g, "").trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function formatLocalDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function formatDateNoYear(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[1]}/${parts[2]}`;
}

function getSelectedType() {
    return "shopping";
}

function normalizeTheme(theme) {
    return THEMES.includes(theme) ? theme : "stylish";
}

function applyTheme(theme) {
    const safeTheme = normalizeTheme(theme);
    document.body.dataset.theme = safeTheme;
}

function loadThemePreference() {
    applyTheme(localStorage.getItem(THEME_STORAGE_KEY));
}

function rotateTheme() {
    const currentTheme = normalizeTheme(document.body.dataset.theme);
    const currentIndex = THEMES.indexOf(currentTheme);
    const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

async function saveSnapshotToDatabase(payload = buildSavePayload()) {
    if (suppressAutoSave) return;
    try {
        const response = await fetch(SNAPSHOT_API, {
            method: "PUT",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.error("DB保存に失敗しました:", error);
        throw error;
    }
}

async function loadSnapshotFromDatabase() {
    try {
        const response = await fetch(SNAPSHOT_API, { method: "GET" });
        if (response.status === 204) return null;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("DB読込に失敗しました:", error);
        throw error;
    }
}

function updateBudgetSummary() {
    const budget = parseNumberInput(monthlyBudget.value);
    const safeBudget = Number.isFinite(budget) ? budget : 0;
    const remaining = safeBudget - plannedTotal;
    plannedExpense.textContent = formatNumber(plannedTotal);
    remainingBudget.textContent = formatNumber(remaining);
    remainingBudget.classList.toggle("danger", remaining < 0);
    if (bulkShoppingInput) bulkShoppingInput.disabled = remaining < 0;
    if (bulkAddBtn) bulkAddBtn.disabled = remaining < 0;

    if (remaining < 0 && !wasOverBudget) {
        alert("使い過ぎです！");
    }
    wasOverBudget = remaining < 0;
}

function buildListText(record) {
    if (record.type === "shopping") {
        return `${record.task} (金額: ${record.amount ? `￥${formatNumber(record.amount)}` : "未入力"})`;
    }
    return record.task || "";
}

function attachCommonDragEvents(item) {
    item.addEventListener("dragstart", () => {
        draggedItem = item;
    });

    item.addEventListener("dragend", () => {
        draggedItem = null;
    });
}

function removeListItem(item) {
    if (!item) return;
    item.remove();
    recomputePlannedTotal();
    updateBudgetSummary();
    updateStockAgeHighlight();
    updateStockScrollState();
    saveSnapshotToDatabase().catch(() => {
        alert("データベース保存に失敗しました。");
    });
}

function attachSwipeToDelete(item) {
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let swiping = false;
    let movedHorizontally = false;

    item.style.touchAction = "pan-y";

    item.addEventListener("touchstart", (event) => {
        if (!event.touches.length) return;
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        deltaX = 0;
        swiping = false;
        movedHorizontally = false;
        item.style.transition = "";
    }, { passive: true });

    item.addEventListener("touchmove", (event) => {
        if (!event.touches.length) return;
        const touch = event.touches[0];
        const diffX = touch.clientX - startX;
        const diffY = touch.clientY - startY;
        if (!swiping) {
            if (Math.abs(diffX) < 8) return;
            if (Math.abs(diffY) > Math.abs(diffX)) return;
            swiping = true;
        }
        movedHorizontally = true;
        deltaX = diffX;
        item.style.transform = `translateX(${diffX}px)`;
    }, { passive: true });

    item.addEventListener("touchend", () => {
        if (!swiping) return;
        if (Math.abs(deltaX) >= SWIPE_DELETE_THRESHOLD) {
            item.dataset.suppressClickUntil = String(Date.now() + 260);
            removeListItem(item);
            return;
        }
        item.style.transition = "transform 0.18s ease";
        item.style.transform = "translateX(0)";
        if (movedHorizontally) {
            item.dataset.suppressClickUntil = String(Date.now() + 200);
        }
    });

    item.addEventListener("touchcancel", () => {
        item.style.transition = "transform 0.18s ease";
        item.style.transform = "translateX(0)";
    });
}

function attachTypeSpecificEvents(item) {
    if (item.dataset.type === "shopping") {
        item.addEventListener("click", () => {
            const suppressClickUntil = Number(item.dataset.suppressClickUntil || 0);
            if (Date.now() < suppressClickUntil) return;
            openItemModal(item);
        });
    }
}

function createItemElement(record) {
    const item = document.createElement(record.type === "stock" ? "tr" : "li");
    item.draggable = true;
    item.dataset.type = record.type;
    item.dataset.task = record.task;
    item.dataset.amount = String(Number(record.amount) || 0);
    item.dataset.purchaseDate = record.purchaseDate || "";
    item.dataset.expiryDate = record.expiryDate || "";
    if (record.type === "shopping") {
        item.textContent = buildListText(record);
    } else {
        const taskCell = document.createElement("td");
        taskCell.textContent = record.task || "";
        const amountCell = document.createElement("td");
        amountCell.textContent = record.amount ? `￥${formatNumber(record.amount)}` : "未入力";
        const purchasedCell = document.createElement("td");
        purchasedCell.textContent = record.purchaseDate ? formatDateNoYear(record.purchaseDate) : "未設定";
        const expiryCell = document.createElement("td");
        expiryCell.textContent = record.expiryDate ? formatDateNoYear(record.expiryDate) : "未設定";
        item.append(taskCell, amountCell, purchasedCell, expiryCell);
    }

    attachCommonDragEvents(item);
    attachSwipeToDelete(item);
    attachTypeSpecificEvents(item);
    return item;
}

function normalizeTaskName(task) {
    return String(task || "").trim().toLowerCase();
}

function hasSameItemInStock(task) {
    const target = normalizeTaskName(task);
    if (!target) return false;
    return Array.from(stockList.querySelectorAll("tr")).some((item) => {
        return normalizeTaskName(item.dataset.task) === target;
    });
}

function moveShoppingToStock(item, itemAmount = 0, expiryDate = "") {
    if (!item || item.dataset.type !== "shopping") return;
    const stockRecord = {
        task: item.dataset.task || "",
        type: "stock",
        amount: Number(itemAmount) || 0,
        purchaseDate: formatLocalDate(new Date()),
        expiryDate: expiryDate || ""
    };
    const stockRow = createItemElement(stockRecord);
    stockList.appendChild(stockRow);
    item.remove();
    recomputePlannedTotal();
    updateBudgetSummary();
    updateStockAgeHighlight();
    updateStockScrollState();
}

function extractItemRecord(item) {
    return {
        task: item.dataset.task || "",
        type: item.dataset.type || "",
        amount: Number(item.dataset.amount) || 0,
        purchaseDate: item.dataset.purchaseDate || "",
        expiryDate: item.dataset.expiryDate || ""
    };
}

function serializeList(listElement) {
    return Array.from(listElement.querySelectorAll("[data-type]")).map((item) => extractItemRecord(item));
}

function recomputePlannedTotal() {
    plannedTotal = Array.from(stockList.querySelectorAll("tr")).reduce((sum, item) => {
        return sum + (Number(item.dataset.amount) || 0);
    }, 0);
}

function buildSavePayload() {
    const budget = parseNumberInput(monthlyBudget.value);
    const safeBudget = Number.isFinite(budget) ? budget : 0;
    return {
        savedAt: new Date().toISOString(),
        budget: {
            monthly: safeBudget,
            plannedTotal,
            remaining: safeBudget - plannedTotal
        },
        form: {
            selectedType: getSelectedType(),
            task: ""
        },
        lists: {
            shopping: serializeList(shoppingList),
            stock: serializeList(stockList)
        }
    };
}

function postToSendPage(payload) {
    const encoded = encodeURIComponent(JSON.stringify(payload));
    location.href = `send.html?payload=${encoded}`;
}

function updateStockAgeHighlight() {
    const today = new Date(`${formatLocalDate(new Date())}T00:00:00`);
    Array.from(stockList.querySelectorAll("tr")).forEach((item) => {
        const purchaseDate = item.dataset.purchaseDate;
        const expiryDate = item.dataset.expiryDate;
        item.classList.remove("expiry-soon-3", "expiry-soon-1", "expiry-expired");

        if (expiryDate) {
            const expiry = new Date(`${expiryDate}T00:00:00`);
            const diffDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
                item.classList.add("expiry-expired");
            } else if (diffDays === 3) {
                item.classList.add("expiry-soon-3");
            } else if (diffDays <= 1) {
                item.classList.add("expiry-soon-1");
            }
        }

        if (!purchaseDate) {
            item.classList.remove("stock-week-old");
            return;
        }
        const purchased = new Date(`${purchaseDate}T00:00:00`);
        const diffDays = Math.floor((today - purchased) / (1000 * 60 * 60 * 24));
        item.classList.toggle("stock-week-old", diffDays >= 7);
    });
}

function updateStockScrollState() {
    if (!stockBox || !stockList) return;
    const rowCount = stockList.querySelectorAll("tr").length;
    stockBox.classList.toggle("scroll-active", rowCount >= 5);
}

function updateClock() {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours() % 12;
    const fullHours = String(now.getHours()).padStart(2, "0");
    const fullMinutes = String(minutes).padStart(2, "0");
    const fullSeconds = String(seconds).padStart(2, "0");
    const fullYear = now.getFullYear();
    const fullMonth = String(now.getMonth() + 1).padStart(2, "0");
    const fullDate = String(now.getDate()).padStart(2, "0");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[now.getDay()];
    const secondDeg = seconds * 6;
    const minuteDeg = minutes * 6 + seconds * 0.1;
    const hourDeg = hours * 30 + minutes * 0.5;

    hourHand.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
    minuteHand.style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
    secondHand.style.transform = `translateX(-50%) rotate(${secondDeg}deg)`;
    digitalClock.textContent = `${fullHours}:${fullMinutes}:${fullSeconds}`;
    calendarDate.textContent = `${fullYear}-${fullMonth}-${fullDate} (${weekday})`;
}

function openItemModal(item) {
    modalTargetItem = item;
    const currentAmount = Number(item.dataset.amount) || 0;
    modalAmount.value = currentAmount ? formatNumber(currentAmount) : "";
    modalExpiry.value = "";
    itemModal.classList.add("show");
    itemModal.setAttribute("aria-hidden", "false");
    modalAmount.focus();
}

function closeItemModal() {
    itemModal.classList.remove("show");
    itemModal.setAttribute("aria-hidden", "true");
    modalTargetItem = null;
}

function resetVisualsToClosed() {
    memoOpened = false;
    fridgeOpened = false;

    if (memoVisual) memoVisual.style.display = "grid";
    if (shoppingPanel) {
        shoppingPanel.hidden = true;
        shoppingPanel.classList.remove("show");
    }

    if (fridgeVisual) fridgeVisual.style.display = "grid";
    if (stockBox) {
        stockBox.hidden = true;
        stockBox.classList.remove("show");
    }
}

function openMemoView() {
    if (memoOpened || !memoVisual || !shoppingPanel) return;
    memoOpened = true;
    memoVisual.classList.add("opening");
    setTimeout(() => {
        memoVisual.style.display = "none";
        shoppingPanel.hidden = false;
        shoppingPanel.classList.add("show");
    }, 1000);
}

function closeMemoView() {
    return new Promise((resolve) => {
        if (!memoOpened || !memoVisual || !shoppingPanel) {
            resolve();
            return;
        }

        shoppingPanel.classList.remove("show");
        shoppingPanel.hidden = true;

        memoVisual.style.display = "grid";
        memoVisual.classList.add("opening");
        void memoVisual.offsetWidth;

        requestAnimationFrame(() => {
            memoVisual.classList.remove("opening");
        });

        setTimeout(() => {
            memoOpened = false;
            resolve();
        }, 1000);
    });
}

function openFridgeView() {
    if (fridgeOpened || !fridgeVisual || !stockBox) return;
    fridgeOpened = true;
    fridgeVisual.classList.add("opening");
    setTimeout(() => {
        fridgeVisual.style.display = "none";
        stockBox.hidden = false;
        stockBox.classList.add("show");
    }, 1000);
}

function closeFridgeView() {
    return new Promise((resolve) => {
        if (!fridgeOpened || !fridgeVisual || !stockBox) {
            resolve();
            return;
        }

        stockBox.classList.remove("show");
        stockBox.hidden = true;

        fridgeVisual.style.display = "grid";
        fridgeVisual.classList.add("opening");
        void fridgeVisual.offsetWidth;

        requestAnimationFrame(() => {
            fridgeVisual.classList.remove("opening");
        });

        setTimeout(() => {
            fridgeOpened = false;
            resolve();
        }, 1000);
    });
}

function addRecordToList(record) {
    const item = createItemElement(record);
    if (record.type === "shopping") {
        shoppingList.appendChild(item);
    } else {
        stockList.appendChild(item);
    }
}

function launchPigeons() {
    const count = 9;
    let maxDuration = 0;
    for (let i = 0; i < count; i++) {
        const bird = document.createElement("span");
        const sx = `${Math.floor(Math.random() * 100)}vw`;
        const sy = `${Math.floor(Math.random() * 100)}vh`;
        const mx = `${Math.floor(Math.random() * 100)}vw`;
        const my = `${Math.floor(Math.random() * 100)}vh`;
        const ex = `${Math.floor(Math.random() * 100)}vw`;
        const ey = `${Math.floor(Math.random() * 100)}vh`;
        const dur = 4 + Math.random() * 4;
        if (dur > maxDuration) maxDuration = dur;

        bird.className = "flying-pigeon";
        bird.innerHTML = "<span class=\"wing left\"></span><span class=\"wing right\"></span><span class=\"pigeon-body\"></span>";
        bird.style.setProperty("--sx", sx);
        bird.style.setProperty("--sy", sy);
        bird.style.setProperty("--mx", mx);
        bird.style.setProperty("--my", my);
        bird.style.setProperty("--ex", ex);
        bird.style.setProperty("--ey", ey);
        bird.style.setProperty("--dur", `${dur}s`);
        pigeonStage.appendChild(bird);
        setTimeout(() => {
            bird.remove();
        }, dur * 1000);
    }

    const fortunes = [
        "末吉", "末吉", "末吉", "末吉", "末吉",
        "小吉", "小吉", "小吉", "小吉",
        "凶", "凶", "凶",
        "大吉", "大吉",
        "大凶"
    ];

    function showJumboBill() {
        const bill = document.createElement("span");
        bill.className = "bill-jumbo";
        bill.textContent = "💴";
        document.body.appendChild(bill);
        setTimeout(() => bill.remove(), 4000);
    }

    function flashRedScreen() {
        redFlash.classList.remove("show");
        void redFlash.offsetWidth;
        redFlash.classList.add("show");
    }

    setTimeout(() => {
        const result = fortunes[Math.floor(Math.random() * fortunes.length)];
        fortuneResult.textContent = `今日の運勢: ${result}`;
        fortuneResult.classList.remove("show");
        void fortuneResult.offsetWidth;
        fortuneResult.classList.add("show");
        if (result === "大吉") {
            showJumboBill();
        } else if (result === "大凶") {
            flashRedScreen();
        }
    }, maxDuration * 1000);
}

async function restoreFromDatabase() {
    let snapshot = null;
    try {
        snapshot = await loadSnapshotFromDatabase();
    } catch (_error) {
        alert("データベースからの読込に失敗しました。接続設定を確認してください。");
        return;
    }
    if (!snapshot) return;

    suppressAutoSave = true;
    try {
        shoppingList.innerHTML = "";
        stockList.innerHTML = "";

        (snapshot.lists?.shopping || []).forEach((record) => addRecordToList(record));
        (snapshot.lists?.stock || []).forEach((record) => addRecordToList(record));

        monthlyBudget.value = formatNumber(Number(snapshot.budget?.monthly) || 0);

        recomputePlannedTotal();
        updateBudgetSummary();
        updateStockAgeHighlight();
        updateStockScrollState();
    } finally {
        suppressAutoSave = false;
    }
}

updateClock();
loadThemePreference();
resetVisualsToClosed();
updateBudgetSummary();
updateStockAgeHighlight();
updateStockScrollState();
setInterval(updateClock, 1000);
setInterval(updateStockAgeHighlight, 60000);

restoreFromDatabase();

monthlyBudget.addEventListener("input", () => {
    const normalized = monthlyBudget.value.replace(/,/g, "").replace(/[^\d]/g, "");
    monthlyBudget.value = normalized ? formatNumber(normalized) : "";
    updateBudgetSummary();
    saveSnapshotToDatabase().catch(() => {
        alert("データベース保存に失敗しました。");
    });
});

trash.addEventListener("dragover", (event) => {
    event.preventDefault();
    trash.classList.add("drag-over");
});

trash.addEventListener("dragleave", () => {
    trash.classList.remove("drag-over");
});

trash.addEventListener("drop", (event) => {
    event.preventDefault();
    trash.classList.remove("drag-over");
    if (draggedItem) {
        removeListItem(draggedItem);
        draggedItem = null;
    }
});

stockBox.addEventListener("dragover", (event) => {
    event.preventDefault();
    stockBox.classList.add("drop-target");
});

stockBox.addEventListener("dragleave", () => {
    stockBox.classList.remove("drop-target");
});

stockBox.addEventListener("drop", (event) => {
    event.preventDefault();
    stockBox.classList.remove("drop-target");
    moveShoppingToStock(draggedItem);
    draggedItem = null;
    updateStockScrollState();
    saveSnapshotToDatabase().catch(() => {
        alert("データベース保存に失敗しました。");
    });
});

analogClock.addEventListener("click", launchPigeons);

if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
        await closeMemoView();
        await closeFridgeView();
        const payload = buildSavePayload();
        try {
            await saveSnapshotToDatabase(payload);
            alert("データベースに保存しました");
        } catch (_error) {
            alert("データベース保存に失敗しました。");
        }
    });
}

if (bulkAddBtn && bulkShoppingInput) {
    bulkAddBtn.addEventListener("click", () => {
        const lines = bulkShoppingInput.value
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (!lines.length) return;

        lines.forEach((task) => {
            if (hasSameItemInStock(task)) {
                const shouldAdd = window.confirm("既に冷蔵庫にあります。リストに入れますか？");
                if (!shouldAdd) return;
            }
            const record = {
                task,
                type: "shopping",
                amount: 0,
                purchaseDate: "",
                expiryDate: ""
            };
            addRecordToList(record);
        });

        recomputePlannedTotal();
        updateBudgetSummary();
        updateStockAgeHighlight();
        bulkShoppingInput.value = "";
        saveSnapshotToDatabase().catch(() => {
            alert("データベース保存に失敗しました。");
        });
    });
}

if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", () => {
        closeItemModal();
    });
}

if (modalConfirmBtn) {
    modalConfirmBtn.addEventListener("click", () => {
        if (!modalTargetItem) return;

        const enteredAmount = modalAmount.value.trim() === "" ? 0 : parseNumberInput(modalAmount.value);
        if (!Number.isFinite(enteredAmount) || enteredAmount < 0) {
            alert("金額は0以上で入力してください");
            return;
        }

        moveShoppingToStock(modalTargetItem, enteredAmount, modalExpiry.value);
        closeItemModal();
        saveSnapshotToDatabase().catch(() => {
            alert("データベース保存に失敗しました。");
        });
    });
}

if (modalAmount) {
    modalAmount.addEventListener("input", () => {
        const normalized = modalAmount.value.replace(/,/g, "").replace(/[^\d]/g, "");
        if (!normalized) {
            modalAmount.value = "";
            return;
        }
        modalAmount.value = formatNumber(normalized);
    });
}

if (itemModal) {
    itemModal.addEventListener("click", (event) => {
        if (event.target === itemModal) {
            closeItemModal();
        }
    });
}

if (fridgeVisual) {
    fridgeVisual.addEventListener("click", openFridgeView);
    fridgeVisual.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFridgeView();
        }
    });
}

if (memoVisual) {
    memoVisual.addEventListener("click", openMemoView);
    memoVisual.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMemoView();
        }
    });
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", rotateTheme);
}

