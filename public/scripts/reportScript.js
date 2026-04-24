import { apiFetch } from "./core/jeeplinkApiFetcher.js";

function selectIssue(button) {
    $(".issue-category-btn")
        .attr("aria-pressed", "false")
        .removeClass("btn-active")
        .addClass("btn-inactive");

    button
        .attr("aria-pressed", "true")
        .removeClass("btn-inactive")
        .addClass("btn-active");
}

$(".issue-category-btn").on("click", function () {
    selectIssue($(this));
});

$("#submitReport").on("click", async () => {
    try {
        if (!$("#reportDesc").val().trim()) {
            throw new Error("A description of the issue is required.")
        }

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
    } finally {
        $("#reportModal").addClass("hidden");
    }
})

$("#cancelBtn").on("click", async () => {
    resetReportForm()
})

function resetReportForm() {
    $(".issue-category-btn")
        .attr("aria-pressed", "false")
        .removeClass("btn-active")
        .addClass("btn-inactive");

    $(".issue-category-btn").first()
        .attr("aria-pressed", "true")
        .removeClass("btn-inactive")
        .addClass("btn-active");

    $("#reportTitle").val("");
    $("#reportDesc").val("");
    $("#reportEmail").val("");
}