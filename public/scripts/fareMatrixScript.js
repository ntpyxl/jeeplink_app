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

try {
    // TODO: Eto yung data ng mga fare matrix para madisplay sa page.
    const fareMatrixData = await apiFetch("/getFareMatrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            "matrixId": "0"
        })
    });
} catch (err) {
    console.error("Error:", err);
}