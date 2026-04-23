import { apiFetch } from "./core/jeeplinkApiFetcher.js";

function selectIssue(button) {
    $(".issue-category-btn").attr("aria-pressed", "false");
    button.attr("aria-pressed", "true");
}

$(".issue-category-btn").on("click", function () {
    selectIssue($(this));
});

$("#submitReport").on("click", async () => {
    try {
        const response = await apiFetch("/submitReport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                report_title: $("#reportTitle").val(),
                report_desc: $("#reportDesc").val(),
                email: $("#reportEmail").val(),
                report_type: $(".issue-category-btn[aria-pressed='true']").data("category"),
                jeep_route_reported: null
            })
        });

        const reportId = response.reportedIssue.id;
        const reportSubmitRawDateTime = response.reportedIssue.submitted_at;

        const reportSubmitFormattedDateTime = new Date(reportSubmitRawDateTime).toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });

        resetReportForm()

        jeeplinkSwal.fire({
            icon: "success",
            title: "Success",
            text: `Your report has been submitted with Report ID# ${reportId}. Submitted on ${reportSubmitFormattedDateTime}`,
            timer: 30000,
            showConfirmButton: true,
            allowOutsideClick: false
        });
    } catch (err) {
        jeeplinkSwal.fire({
            icon: "error",
            title: "Error",
            text: err,
            allowOutsideClick: false
        });
    }
})

$("#cancelBtn").on("click", async () => {
    resetReportForm()
})

function resetReportForm() {
    $("#reportModal").addClass("hidden");

    $("#issueJeep")
        .removeClass("border text-[#004F11] hover:bg-[#004F11]/5")
        .addClass("bg-[#2E7D32] text-white hover:bg-[#004F11]");

    $("#issueOther")
        .removeClass("bg-[#2E7D32] text-white hover:bg-[#004F11]")
        .addClass("border text-[#004F11] hover:bg-[#2E7D32]/5");

    $("#titleField").slideUp(150);
    
    $("#descLabel").text("Description (Optional)");

    selectIssue($("#issueJeep").length ? $("#issueJeep") : $("#issueOther"));
    $("#reportTitle").val("");
    $("#reportDesc").val("");
    $("#reportEmail").val("");
}
