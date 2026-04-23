import { apiFetch } from "./core/jeeplinkApiFetcher.js";

async function getReportsData({page_number = null, report_type = null, report_status = null} = {}) {
    try {
        const params = new URLSearchParams();

        if (report_type !== null) {
            params.append("report_type", report_type);
        }
        if (report_status !== null) {
            params.append("report_status", report_status);
        }

        let url = "/getReports";
        if (page_number !== null) {
            url += `/${page_number}`;
        }
        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await apiFetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        return response;
    } catch (err) {
        console.error("Error:", err);
    }
}

// Render reports in the table
function renderReports(reports) {
    const $tbody = $("#reportsTableBody");

    $tbody.find("tr:not(#tableLoading)").remove();

    $.each(reports, function (index, report) {
        const reportType = formatType(report.report_type);
        const title = report.title;
        const description = report.description;
        const reporterEmail = report.reporter_email;
        const date = formatDate(report.submitted_at);
        const status = formatStatusDropdown(report.report_status, report.id);

        const row = `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3">${report.id}</td>
                <td class="py-3">${reportType}</td>
                <td class="py-3">${title}</td>
                <td class="py-3 w-1/3">${description}</td>
                <td class="py-3">${reporterEmail}</td>
                <td class="py-3">${date}</td> 
                <td class="py-3 text-center">
                    ${status}
                </td>
            </tr>
        `;

        $tbody.append(row);
    });

    applyStatusColors();
}

// Helper functions
function formatType(type) {
    const types = {
        jeep_diverted: "Jeep Diverted",
        other_issues: "Other Issues",
        missing_jeepney: "Missing Jeepney",
        incorrect_fares: "Incorrect Fares",
        wrong_route: "Wrong Route"
    };

    return types[type] || type;
}

function formatStatusDropdown(status, reportId) {
    return `
        <select
            class="status-dropdown px-2 py-1 rounded-full text-xs border"
            data-id="${reportId}"
            data-original-value="${status}"
        >
            <option value="ongoing" ${status === "ongoing" ? "selected" : ""}>Ongoing</option>
            <option value="resolved" ${status === "resolved" ? "selected" : ""}>Resolved</option>
        </select>
    `;
}

function formatDate(date) {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function applyStatusColors() {
    $(".status-dropdown").each(function () {
        const val = $(this).val();

        $(this).removeClass(
            "bg-green-100 text-green-600 bg-yellow-100 text-yellow-600 bg-red-100 text-red-600"
        );

        if (val === "resolved") {
            $(this).addClass("bg-green-100 text-green-600");
        } else if (val === "ongoing") {
            $(this).addClass("bg-yellow-100 text-yellow-600");
        } else {
            $(this).addClass("bg-red-100 text-red-600");
        }
    });
}

// Event listener for status change
$(document).on("change", ".status-dropdown", async function () {
    const reportId = $(this).data("id");
    const oldStatus = $(this).data("original-value")
    const newStatus = $(this).val();

    applyStatusColors();

    const confirmation = await jeeplinkSwal.fire({
        icon: "question",
        title: "Are you sure?",
        text: `You will be changing Report ID# ${reportId}'s status to ${newStatus}`,
        showConfirmButton: true,
        showCancelButton: true,
        allowOutsideClick: false
    });

    if(!confirmation.isConfirmed) {
        $(this).val(oldStatus);
        applyStatusColors();
        return;
    }

    try {
        const response = await apiFetch("/changeReportStatus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                report_status: newStatus,
                report_id: reportId
            })
        });
        $(this).data("original-value", newStatus);
    } catch (err) {
        console.error(err);
        $(this).val(oldStatus);
        applyStatusColors();
    }
    
});

// Initial load
$(document).ready(async function () {
    try {
        showLoading(); 

        const data = await getReportsData();

        console.log(data);

        renderReports(data.reports);

    } catch (error) {
        console.error("Error loading reports:", error);

    } finally {
        hideLoading(); 
    }
});

// Loading Spinner Script
function showLoading() {
    $("#tableLoading").removeClass("hidden");
}

function hideLoading() {
    $("#tableLoading").addClass("hidden");
}