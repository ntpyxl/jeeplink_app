const localAPI = "http://127.0.0.1:8000";
const publicAPI = "https://jeeplinkapi.vercel.app";

let baseAPI = null;

// TODO: VERY INEFFICIENT!!!! WHEN NO LOCAL SERVER, IT WILL TAKE SECONDS TO USE VERCEL SERVER AND PRODUCES UNNECESSARY ERROR
async function getAPIBase() {
    if (baseAPI) return baseAPI;

    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5000); // Modify 5000 (ms) should it fail to connect to the local server despite it running.

        const res = await fetch(localAPI + "/", { method: "GET", signal: controller.signal });
        if (res.ok) {
            baseAPI = localAPI;
            return baseAPI;
        }
    } catch {}

    baseAPI = publicAPI;
    return baseAPI;
}

export async function apiFetch(endpoint, options = {}) {
    const base = await getAPIBase();
    const res = await fetch(base + endpoint, options);
    return res.json();
}