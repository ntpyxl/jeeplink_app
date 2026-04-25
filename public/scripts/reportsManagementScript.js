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

const rowsPerPage = 10;
let currentPage = 1;
let currentFilter = null;
let currentStatusFilter = null;
let currentSearch = "";
let allReports = [];
let filteredReports = [];

// Render reports in the table
function renderReports(reports) {
    const $tbody = $("#reportsTableBody");

    $tbody.find("tr:not(#tableLoading)").remove();

    if (!reports.length) {
        $tbody.append(`
            <tr class="border-b">
                <td colspan="7" class="py-6 text-center text-gray-400">No reports found.</td>
            </tr>
        `);
        return;
    }

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

function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).toLowerCase();
}

function getFilteredReports() {
    const query = normalizeText(currentSearch).trim();

    return allReports.filter((report) => {
        const typeMatches = !currentFilter || report.report_type === currentFilter;
        const statusMatches = !currentStatusFilter || report.report_status === currentStatusFilter;

        if (!query) return typeMatches && statusMatches;

        const searchable = [
            report.id,
            formatType(report.report_type),
            report.title,
            report.description,
            report.reporter_email,
            formatDate(report.submitted_at),
            report.report_status
        ].map(normalizeText).join(" ");

        return typeMatches && statusMatches && searchable.includes(query);
    });
}

function renderPagination() {
    const totalRows = filteredReports.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    currentPage = Math.min(currentPage, totalPages);

    const start = totalRows ? (currentPage - 1) * rowsPerPage + 1 : 0;
    const end = totalRows ? Math.min(currentPage * rowsPerPage, totalRows) : 0;

    $("#paginationInfo").text(`Showing ${start} to ${end} of ${totalRows} entries`);

    $("#prevBtn").prop("disabled", currentPage === 1)
        .toggleClass("opacity-50 cursor-not-allowed", currentPage === 1);
    $("#nextBtn").prop("disabled", currentPage === totalPages || totalRows === 0)
        .toggleClass("opacity-50 cursor-not-allowed", currentPage === totalPages || totalRows === 0);

    const $pageNumbers = $("#pageNumbers");
    $pageNumbers.empty();

    for (let i = 1; i <= totalPages; i += 1) {
        const isActive = i === currentPage;
        const button = $(`
            <button class="cursor-pointer px-3 py-1 border rounded-lg ${isActive ? "bg-[#35903A] text-white border-[#35903A]" : "hover:bg-gray-100"}">
                ${i}
            </button>
        `);

        button.on("click", () => {
            currentPage = i;
            refreshTable();
        });

        $pageNumbers.append(button);
    }
}

function refreshTable() {
    filteredReports = getFilteredReports();
    const startIndex = (currentPage - 1) * rowsPerPage;
    const pageRows = filteredReports.slice(startIndex, startIndex + rowsPerPage);

    renderReports(pageRows);
    renderPagination();
}

async function loadReportsData() {
    showLoading();
    try {
        const data = await getReportsData();
        allReports = data?.reports || [];
        refreshTable();
    } catch (error) {
        console.error("Error loading reports:", error);
        allReports = [];
        refreshTable();
    } finally {
        hideLoading();
    }
}

// Report type filter
$(document).on("click", ".filter-btn", async function () {
    $(".filter-btn").removeClass("bg-[#84C177] text-black font-medium").addClass("bg-gray-100");
    $(this).removeClass("bg-gray-100").addClass("bg-[#84C177] text-black font-medium");

    currentFilter = $(this).data("type") || null;
    currentPage = 1;
    refreshTable();
});

// Status filter
$(document).on("click", ".status-filter-btn", async function () {
    $(".status-filter-btn").removeClass("bg-[#84C177] text-black font-medium").addClass("bg-gray-100");
    $(this).removeClass("bg-gray-100").addClass("bg-[#84C177] text-black font-medium");

    currentStatusFilter = $(this).data("status") || null;
    currentPage = 1;
    refreshTable();
});

// Initial load
$(document).ready(async function () {
    $("#reportsSearch").on("input", function () {
        currentSearch = $(this).val();
        currentPage = 1;
        refreshTable();
    });

    $("#prevBtn").on("click", function () {
        if (currentPage > 1) {
            currentPage -= 1;
            refreshTable();
        }
    });

    $("#nextBtn").on("click", function () {
        const totalPages = Math.max(1, Math.ceil(filteredReports.length / rowsPerPage));
        if (currentPage < totalPages) {
            currentPage += 1;
            refreshTable();
        }
    });

    await loadReportsData();
});

// Loading Spinner Script
function showLoading() {
    $("#tableLoading").removeClass("hidden");
}

function hideLoading() {
    $("#tableLoading").addClass("hidden");
}