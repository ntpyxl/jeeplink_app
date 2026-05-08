import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { renderReportsTable } from "./ui/reportsTableRowScript.js";

let currentPage = 1;
let totalPages = 1;
let totalRows = 0;
const rowsPerPage = 10;

let reportsSearchQuery = null;
let reportsTypeFilter = null;
let reportsStatusFilter = null;
let searchTimeout = null;

const disabledFilterClassList = "bg-gray-100 hover:bg-gray-200";
const enabledFilterClassList = "bg-[#84C177] text-black font-medium";

reloadReportsData(1);

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

$("#reportSearch").on("input", function () {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        reportsSearchQuery = $(this).val().trim() || null;
        reloadReportsData(1, reportsSearchQuery, reportsTypeFilter, reportsStatusFilter);
    }, 500);
});

$("#prevBtn").on("click", () => {
    if (currentPage > 1) {
        reloadReportsData(currentPage - 1, reportsSearchQuery, reportsTypeFilter, reportsStatusFilter);
    }
});

$("#nextBtn").on("click", () => {
    if (currentPage < totalPages) {
        reloadReportsData(currentPage + 1, reportsSearchQuery, reportsTypeFilter, reportsStatusFilter);
    }
});

// Report type filter
$(document).on("click", ".filter-btn", async function () {
    $(".filter-btn")
        .removeClass(enabledFilterClassList)
        .addClass(disabledFilterClassList);
    $(this)
        .removeClass(disabledFilterClassList)
        .addClass(enabledFilterClassList);

    reportsTypeFilter = $(this).data("type") || null;
    currentPage = 1;

    reloadReportsData(1, reportsSearchQuery, reportsTypeFilter, reportsStatusFilter);
});

// Status filter
$(document).on("click", ".status-filter-btn", async function () {
    $(".status-filter-btn")
        .removeClass(enabledFilterClassList)
        .addClass(disabledFilterClassList);
    $(this)
        .removeClass(disabledFilterClassList)
        .addClass(enabledFilterClassList);

    reportsStatusFilter = $(this).data("status") || null;
    currentPage = 1;

    reloadReportsData(1, reportsSearchQuery, reportsTypeFilter, reportsStatusFilter);
});

async function reloadReportsData(pageNumber = 1, searchQuery = null, reportType = null, reportStatus = null) {
    $("#tableLoading").removeClass("hidden");

    try {
        let url = `/getReports`;
        const params = new URLSearchParams();

        params.append("page_number", pageNumber);

        if (searchQuery) {
            params.append("search_query", searchQuery.trim());
        } else {
            $("#routeSearch").val("");
        }

        if (reportType !== null) {
            params.append("report_type", reportType.trim());
        }

        if (reportStatus !== null) {
            params.append("report_status", reportStatus.trim());
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const { reports, row_count, total_pages } = await apiFetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        currentPage = pageNumber;
        totalPages = total_pages;
        totalRows = row_count;

        renderReportsTable(reports, $("#reportsTableBody"));
        applyStatusColors();
        renderPagination();
    } catch (err) {
        console.error(err);
        showError("Failed to load Reports into table.");
    } finally {
        $("#tableLoading").addClass("hidden");
    }
}

function renderPagination() {
    const start = totalRows ? (currentPage - 1) * rowsPerPage + 1 : 0;
    const end = totalRows ? Math.min(currentPage * rowsPerPage, totalRows) : 0;

    $("#paginationInfo").text(
        `Showing ${start} to ${end} of ${totalRows} entries`
    );

    $("#prevBtn").prop("disabled", currentPage === 1)
    $("#nextBtn").prop("disabled", currentPage === totalPages)

    const pageContainer = $("#pageNumbers");
    pageContainer.empty();

    for (let i = 1; i <= totalPages; i += 1) {
        const btn = $(`
            <button class="px-3 py-1 border rounded-lg cursor-pointer ${
                i === currentPage ? "bg-[#35903A] text-white " : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
            }">
                ${i}
            </button>
        `);

        btn.on("click", () => reloadReportsData(i, jeepRouteDataSearchQuery));

        pageContainer.append(btn);
    }
}

// Helper functions
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

$(document).on("click", ".view-more-btn", function () {
    const description = decodeURIComponent($(this).data("description"));

    jeeplinkSwal.fire({
        title: "Report Description",
        html: `
            <div class="text-left text-gray-700 whitespace-pre-wrap">
                ${description || "No description provided."}
            </div>
        `,
        confirmButtonColor: "#004F11",
        
    });
});