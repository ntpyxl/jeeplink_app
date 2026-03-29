import { apiFetch } from "./jeeplinkApiFetcher.js";

let currentMatrixId = null;

$('.openUpdateMatrixModal').on('click', function() {
    currentMatrixId = $(this).attr('data-id');
    console.log("open update matrix modal")
    console.log("Opening modal for Matrix:", currentMatrixId);
    $("#updateMatrixModal").removeClass("hidden");
});

$('#closeUpdateMatrixModalButton').on('click', function() {
    $("#updateMatrixModal").addClass("hidden");
    $("#modalPdfInput").val("");
});

$('#uploadFareMatrixFile').on('click', async event => {
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

        $("#updateMatrixModal").addClass("hidden");
        $("#modalPdfInput").val("");
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