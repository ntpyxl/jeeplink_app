import { apiFetch } from "./core/jeeplinkApiFetcher.js";

let currentMatrixId = null;

const matrixLabels = {
    "1": "PUJ general fare guide",
    "2": "Non-aircon modern & electric PUJ",
    "3": "Aircon modern & electric PUJ"
};

function closeUpdateMatrixModal() {
    $("#updateMatrixModal").removeClass("fare-matrix-modal--open");
    $("#modalPdfInput").val("");
    $("#modalPdfFilename").text("No file chosen");
    document.body.style.overflow = "";
}

function openUpdateMatrixModal(matrixId) {
    currentMatrixId = matrixId;
    const label = matrixLabels[matrixId] || `Matrix ${matrixId}`;
    $("#targetMatrixId").text(label);
    $("#updateMatrixModal").addClass("fare-matrix-modal--open");
    document.body.style.overflow = "hidden";
}

$('.openUpdateMatrixModal').on('click', function() {
    openUpdateMatrixModal($(this).attr('data-id'));
});

$("#modalPdfInput").on("change", function () {
    const file = this.files && this.files[0];
    $("#modalPdfFilename").text(file ? file.name : "No file chosen");
});

$('#closeUpdateMatrixModalButton, #closeUpdateMatrixModalX').on('click', closeUpdateMatrixModal);

$('#updateMatrixModal').on('click', function (e) {
    if (e.target === this) closeUpdateMatrixModal();
});

$(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $('#updateMatrixModal').hasClass('fare-matrix-modal--open')) {
        closeUpdateMatrixModal();
    }
});

const toNum = value => Number.parseFloat(value) || 0;
const roundToQuarter = value => Math.round(value * 4) / 4;
const toMoney = value => roundToQuarter(value).toFixed(2);

const MAX_TABLE_KM = 40;

const DEFAULT_EFFECTIVE_DATE = "JANUARY 01, 2000";

function roundToStep(value, step) {
    const s = toNum(step);
    if (!s || s <= 0) return value;
    return Math.round(value / s) * s;
}

function buildTableRows(raw) {
    const baseKm = Math.max(1, toNum(raw?.base_distance_km ?? raw?.baseDistanceKm ?? 4));
    const regBase = toNum(raw?.regular_base_fare ?? raw?.regularBaseFare);
    const regPer = toNum(raw?.regular_per_km ?? raw?.regularPerKm);
    const discBase = toNum(raw?.discount_base_fare ?? raw?.discountBaseFare);
    const discPer = toNum(raw?.discount_per_km ?? raw?.discountPerKm);
    const step = raw?.rounding != null ? toNum(raw.rounding) : 0.25;

    const rows = [];
    for (let d = 1; d <= MAX_TABLE_KM; d++) {
        const regRaw = d <= baseKm ? regBase : regBase + (d - baseKm) * regPer;
        const discRaw = d <= baseKm ? discBase : discBase + (d - baseKm) * discPer;
        rows.push({
            distance: d,
            regular: roundToStep(regRaw, step).toFixed(2),
            discounted: roundToStep(discRaw, step).toFixed(2)
        });
    }
    return rows;
}

function formatDate(raw) {
    if (!raw) return DEFAULT_EFFECTIVE_DATE;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return DEFAULT_EFFECTIVE_DATE;
    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    }).toUpperCase();
}

function normalizeMatrix(matrix) {
    return {
        matrixId: String(matrix?.matrixId ?? matrix?.id ?? matrix?.matrix_id ?? ""),
        effectiveDate: formatDate(matrix?.effectiveDate ?? matrix?.dateEffective ?? matrix?.updated_at ?? matrix?.effective_date ?? ""),
        regularBaseFare: toMoney(toNum(matrix?.regularBaseFare ?? matrix?.first4kmFare ?? matrix?.regular_base_fare ?? matrix?.baseFare)),
        regularPerKm: toMoney(toNum(matrix?.regularPerKm ?? matrix?.perKmFare ?? matrix?.regular_per_km ?? matrix?.succeedingKmFare)),
        discountBaseFare: toMoney(toNum(matrix?.discountBaseFare ?? matrix?.discount_base_fare)),
        discountPerKm: toMoney(toNum(matrix?.discountPerKm ?? matrix?.discount_per_km)),
        tableRows: buildTableRows(matrix)
    };
}

function applyDomFallback(matricesById) {
    const ids = ["1", "2", "3"];
    const setText = (elementId, value) => {
        const node = document.getElementById(elementId);
        if (node && value != null) node.textContent = value;
    };

    ids.forEach(id => {
        const matrix = matricesById[id];
        if (!matrix) return;
        setText(`effective-${id}`, matrix.effectiveDate);
        setText(`regular-base-${id}`, matrix.regularBaseFare);
        setText(`regular-perkm-${id}`, matrix.regularPerKm);
        setText(`discount-base-${id}`, matrix.discountBaseFare);
        setText(`discount-perkm-${id}`, matrix.discountPerKm);
    });
}

function renderFareTableBodies(matricesById) {
    ["1", "2", "3"].forEach(id => {
        const matrix = matricesById[id];
        const tbody = document.getElementById(`fare-table-body-${id}`);
        if (!tbody || !matrix?.tableRows?.length) return;
        tbody.innerHTML = matrix.tableRows
            .map(
                row => `<tr class="fare-matrix-card-table-row">
                <td class="fare-matrix-card-table-cell">${row.distance}</td>
                <td class="fare-matrix-card-table-cell">${row.regular}</td>
                <td class="fare-matrix-card-table-cell">${row.discounted}</td>
            </tr>`
            )
            .join("");
    });
}

function syncFareMatrixStore(matrices, matricesById) {
    if (!(window.Alpine && typeof window.Alpine.store === "function")) return;
    const existingStore = window.Alpine.store("fareMatrix");
    if (existingStore) {
        existingStore.matrices = matrices;
        existingStore.matricesById = matricesById;
        return;
    }
    window.Alpine.store("fareMatrix", { matrices, matricesById });
}

async function loadFareMatrices() {
    try {
        const response = await apiFetch("/getFareMatrix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matrixId: "0" })
        });

        const source = Array.isArray(response)
            ? response
            : (response?.fareMatrixData ?? response?.matrices ?? [response]);

        const matrices = source.filter(Boolean).map(normalizeMatrix);
        const matricesById = matrices.reduce((acc, matrix) => {
            acc[matrix.matrixId] = matrix;
            return acc;
        }, {});

        window.fareMatrixPayload = matrices;
        window.getFareMatrixById = matrixId => matricesById[String(matrixId)] || null;

        applyDomFallback(matricesById);
        renderFareTableBodies(matricesById);
        syncFareMatrixStore(matrices, matricesById);
        document.addEventListener("alpine:init", () => syncFareMatrixStore(matrices, matricesById), { once: true });
    } catch (err) {
        console.error("Error loading fare matrices:", err);
    }
}

$('#uploadFareMatrixFile').on('click', async () => {
    const fileInput = $("#modalPdfInput")[0];
    let file = fileInput.files ? fileInput.files[0] : null;

    if (!file) {
        alert("Please select a file first!");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("matrix_id", currentMatrixId);

    try {
        const response = await apiFetch("/uploadFareMatrix", {
            method: "POST",
            body: formData
        });

        if (response.status == "Received") {
            console.log("Upload successful!");
        }

        await loadFareMatrices();
        closeUpdateMatrixModal();
        file = null;
    } catch (err) {
        console.error("Error:", err);
    }
});

loadFareMatrices();