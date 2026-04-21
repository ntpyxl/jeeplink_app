import { apiFetch } from "./core/jeeplinkApiFetcher.js";

const issueTypes = ["jeep_diverted", "other_issues"]
let currentIssueTypeIndex = 0

$("#issueJeep").on("click", () => { currentIssueTypeIndex = 0 })
$("#issueOther").on("click", () => { currentIssueTypeIndex = 1 })

const reportSwal = Swal.mixin({
    background: "#ffffff",
    color: "black",
    confirmButtonColor: "#2f7a33",
    customClass: {
        popup: " shadow-lg rounded-3",
        title: "fw-bold",
    },
});

$("#submitReport").on("click", async () => {
    try {
        const response = await apiFetch("/submitReport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                report_title: $("#reportTitle").val(),
                report_desc: $("#reportDesc").val(),
                email: $("reportEmail").val(),
                report_type: issueTypes[currentIssueTypeIndex],
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

        reportSwal.fire({
            icon: "success",
            title: "Success",
            text: `Your report has been submitted with Report ID# ${reportId}. Submitted on ${reportSubmitFormattedDateTime}`,
            timer: 30000,
            showConfirmButton: true,
        });
    } catch (err) {
        reportSwal.fire({
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

    currentIssueTypeIndex = 0
    $("#reportTitle").val("");
    $("#reportDesc").val("");
    $("reportEmail").val("");
}
