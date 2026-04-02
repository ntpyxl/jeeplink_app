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

export async function apiFetch(endpoint, options = {}, requireAuth = true) {
    const base = await getAPIBase();

    if (requireAuth) {
        const token = localStorage.getItem("token");
        if (token) {
            options.headers = {
                ...(options.headers || {}),
                "Authorization": `Bearer ${token}`
            };
        }
    }

    const res = await fetch(base + endpoint, options);

    if (!res.ok) {
        // Optional: handle 401 globally
        if (res.status === 401 && requireAuth) {
            localStorage.removeItem("token");
            window.location.href = "./admin/login.html";
        }
        throw new Error(`API request failed: ${res.status}`);
    }

    return res.json();
}