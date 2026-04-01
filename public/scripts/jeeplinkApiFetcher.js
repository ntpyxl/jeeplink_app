const localAPI = "http://127.0.0.1:8000";
const publicAPI = "https://jeeplinkapi.vercel.app";

let baseAPI = null;

async function getAPIBase() {
    if (baseAPI) return baseAPI;

    const testConnection = async (url) => {
        const res = await fetch(url + "/", { method: "GET" });
        if (!res.ok) throw new Error("Bad response");
        return url;
    };

    try {
        baseAPI = await Promise.any([
            testConnection(localAPI),
            testConnection(publicAPI)
        ]);
    } catch {
        baseAPI = publicAPI;
    }

    return baseAPI;
}

export async function apiFetch(endpoint, options = {}) {
    const base = await getAPIBase();
    const res = await fetch(base + endpoint, options);
    return res.json();
}