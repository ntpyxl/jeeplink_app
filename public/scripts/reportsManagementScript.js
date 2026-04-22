import { apiFetch } from "./core/jeeplinkApiFetcher.js";

async function getReportsData({page_number = null, report_type = null, report_status = null}) {
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

        return response
    } catch (err) {
        console.error("Error:", err);
    }
}

console.log(await getReportsData());
