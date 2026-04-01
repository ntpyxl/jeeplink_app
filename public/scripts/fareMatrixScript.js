import { apiFetch } from "./jeeplinkApiFetcher.js";

let currentMatrixId = null;

const matrixLabels = {
    "1": "PUJ general fare guide",
    "2": "Non-aircon modern & electric PUJ",
    "3": "Aircon modern & electric PUJ"
};

function closeUpdateMatrixModal() {
    $("#updateMatrixModal").removeClass("fare-matrix-modal--open");
    $("#modalPdfInput").val("");
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

$('#closeUpdateMatrixModalButton, #closeUpdateMatrixModalX').on('click', closeUpdateMatrixModal);

$('#updateMatrixModal').on('click', function (e) {
    if (e.target === this) closeUpdateMatrixModal();
});

$(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $('#updateMatrixModal').hasClass('fare-matrix-modal--open')) {
        closeUpdateMatrixModal();
    }
});

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

        closeUpdateMatrixModal();
        file = null;
    } catch (err) {
        console.error("Error:", err);
    }
});

// try {
//     // TODO: Eto yung data ng mga fare matrix para madisplay sa page.
//     const fareMatrixData = await apiFetch("/getFareMatrix", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//             "matrixId": "0"
//         })
//     });
// } catch (err) {
//     console.error("Error:", err);
// }

try {
    // Load latest matrix data from uploaded PDF and expose Alpine-ready payload.
    const fareMatrixData = await apiFetch("/getFareMatrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            matrixId: "0"
        })
    });

    const toNum = value => Number.parseFloat(value) || 0;
    const roundToQuarter = value => Math.round(value * 4) / 4;
    const toMoney = value => roundToQuarter(value).toFixed(2);

    const formatDate = raw => {
        if (!raw) return "";
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return String(raw);
        return date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
        }).toUpperCase();
    };

    const mapRows = matrix => {
        const rows = Array.isArray(matrix?.rows) ? matrix.rows : [];

        if (rows.length > 0) {
            return rows.map(row => ({
                distance: row.distance ?? row.km ?? row.kilometer ?? "",
                regular: toMoney(toNum(row.regular ?? row.fare ?? row.withoutDiscount)),
                discounted: toMoney(toNum(row.discounted ?? row.withDiscount ?? row.discountFare))
            }));
        }

        const first4kmFare = toNum(matrix?.first4kmFare ?? matrix?.baseFare ?? matrix?.regularBaseFare ?? matrix?.regular_base_fare);
        const perKmFare = toNum(matrix?.perKmFare ?? matrix?.succeedingKmFare ?? matrix?.addOnPerKm ?? matrix?.regular_per_km);
        const discountRate = matrix?.discountRate != null ? toNum(matrix.discountRate) : 0.2;
        const maxDistance = Math.max(4, toNum(matrix?.maxDistance ?? matrix?.distanceMax ?? 40));

        const generatedRows = [];
        for (let distance = 4; distance <= maxDistance; distance += 4) {
            const extraKm = Math.max(0, distance - 4);
            const regularFare = first4kmFare + (extraKm * perKmFare);
            const discountedFare = regularFare * (1 - discountRate);

            generatedRows.push({
                distance,
                regular: toMoney(regularFare),
                discounted: toMoney(discountedFare)
            });
        }

        return generatedRows;
    };

    const normalizeMatrix = matrix => ({
        matrixId: String(matrix?.matrixId ?? matrix?.id ?? matrix?.matrix_id ?? ""),
        effectiveDate: formatDate(matrix?.effectiveDate ?? matrix?.dateEffective ?? matrix?.updated_at ?? matrix?.effective_date ?? ""),
        baseDistanceKm: toNum(matrix?.baseDistanceKm ?? matrix?.base_distance_km ?? 4),
        regularBaseFare: toMoney(toNum(matrix?.regularBaseFare ?? matrix?.first4kmFare ?? matrix?.regular_base_fare ?? matrix?.baseFare)),
        regularPerKm: toMoney(toNum(matrix?.regularPerKm ?? matrix?.perKmFare ?? matrix?.regular_per_km ?? matrix?.succeedingKmFare)),
        discountBaseFare: toMoney(toNum(matrix?.discountBaseFare ?? matrix?.discount_base_fare)),
        discountPerKm: toMoney(toNum(matrix?.discountPerKm ?? matrix?.discount_per_km)),
        rows: mapRows(matrix),
        raw: matrix
    });

    const source = Array.isArray(fareMatrixData)
        ? fareMatrixData
        : (fareMatrixData?.fareMatrixData ?? fareMatrixData?.matrices ?? [fareMatrixData]);
    const normalized = source.filter(Boolean).map(normalizeMatrix);
    const matricesById = normalized.reduce((acc, matrix) => {
        acc[matrix.matrixId] = matrix;
        return acc;
    }, {});

    window.fareMatrixPayload = normalized;
    window.getFareMatrixById = matrixId => matricesById[String(matrixId)] || null;

    const syncFareMatrixStore = () => {
        if (!(window.Alpine && typeof window.Alpine.store === "function")) return;

        const existingStore = window.Alpine.store("fareMatrix");
        if (existingStore) {
            existingStore.matrices = normalized;
            existingStore.matricesById = matricesById;
            return;
        }

        window.Alpine.store("fareMatrix", {
            matrices: normalized,
            matricesById
        });
    };

    syncFareMatrixStore();
    document.addEventListener("alpine:init", syncFareMatrixStore, { once: true });
} catch (err) {
    console.error("Error:", err);
}