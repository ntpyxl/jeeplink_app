export function renderReportsTable(reports, tableBody) {
    tableBody.empty();

    reports.forEach(report => {
        const row = $(`
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3 pe-6">${report.id}</td>
                <td class="py-3 pe-6">${formatType(report.report_type)}</td>
                <td class="py-3 pe-6">${report.title}</td>
                <td class="py-3 pe-12">
                    <div>
                        <p class="truncate-2-lines">
                            ${report.description || ""}
                        </p>

                        ${
                            report.description && report.description.length > 80
                                ? `<button class="text-xs text-blue-600 hover:underline view-more-btn mt-1"
                                        data-description="${encodeURIComponent(report.description)}">
                                        View full description
                                </button>`
                                : ""
                        }
                    </div>
                </td>
                <td class="py-3 pe-6">${report.reporter_email}</td>
                <td class="py-3">${formatDate(report.submitted_at)}</td>
                <td class="py-3 text-center">
                    ${formatStatusDropdown(report.report_status, report.id)}
                </td>
            </tr>
        `);
        tableBody.append(row);
    });
}

export function renderDashboardReportsTable(reports, tableBody) {
    tableBody.empty();

    reports.forEach(report => {
        const row = $(`
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3">${report.id}</td>
                <td class="py-3">${formatType(report.report_type)}</td>
                <td class="py-3">${report.title}</td>
                <td class="py-3">${formatDate(report.submitted_at)}</td>
            </tr>
        `);
        tableBody.append(row);
    });
}

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

function formatDate(date) {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
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