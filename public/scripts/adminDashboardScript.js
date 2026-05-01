import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { renderDashboardReportsTable } from "./ui/reportsTableRowScript.js"

const map = L.map("map", {
    renderer: L.canvas()
}).setView([14.3272, 120.9404], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);

try {
    const [ routesResult, terminalsResult, reportsResult ] = await Promise.all([
        apiFetch("/getJeepRoutes", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        }),
        apiFetch("/getTerminals", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        }),
        apiFetch("/getReports?report_status=ongoing", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        })
    ]);

    $("#totalRouteText").text(routesResult.row_count);
    $("#totalTerminalText").text(terminalsResult.row_count);
    $("#totalReportsText").text(reportsResult.row_count);

    renderDashboardReportsTable(reportsResult.reports, $("#reportsTableBody"), false)
} catch (err) {
    console.error(err);
}
