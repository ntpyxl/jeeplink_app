const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

const localAPI = "http://127.0.0.1:8000";
const publicAPI = "https://jeeplinkapi.vercel.app";

let baseAPI = null;

async function testConnection(url, timeout = 800) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url + "/", {
            method: "GET",
            signal: controller.signal
        });
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(id);
    }
}

async function getAPIBase() {
    if (baseAPI) return baseAPI;

    if (isLocalhost) {
        const localWorks = await testConnection(localAPI);
        if (localWorks) {
            baseAPI = localAPI;
            return baseAPI;
        }
    }

    baseAPI = publicAPI;
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

    try {
        const res = await fetch(base + endpoint, options);

        if (!res.ok) {
            if (res.status === 401 && requireAuth) {
                localStorage.removeItem("token");
                window.location.href = "./login.html";
            }
            throw new Error(`API request failed: ${res.status}`);
        }

        return await res.json();

    } catch (err) {
        if (base === localAPI) {
            baseAPI = publicAPI;

            const res = await fetch(publicAPI + endpoint, options);

            if (!res.ok) {
                throw new Error(`API request failed: ${res.status}`);
            }

            return res.json();
        }

        throw err;
    }
}