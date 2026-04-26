const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

const localAPI = "http://127.0.0.1:8000";
const publicAPI = "https://jeeplinkapi.vercel.app";

let baseAPI = null;

// Check if API server is reachable
async function testConnection(url, timeout = 800) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url + "/", {
            method: "GET",
            signal: controller.signal
        });

        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}


// Determine preferred API
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

// Core request helper
async function doFetch(url, endpoint, options) {
    const res = await fetch(url + endpoint, options);

    if (!res.ok) {
        const error = new Error(`${res.status}`);
        error.status = res.status;
        throw error;
    }

    return res;
}

// Public API fetch
export async function apiFetch(endpoint, options = {}, requireAuth = true) {
    const base = await getAPIBase();

    const finalOptions = {
        ...options,
        headers: {
            ...(options.headers || {})
        }
    };

    if (requireAuth) {
        const token = localStorage.getItem("token");
        if (token) finalOptions.headers.Authorization = `Bearer ${token}`;
    }

    try {
        const res = await doFetch(base, endpoint, finalOptions);
        return await res.json();
    } catch (err) {
        // HTTP errors = DO NOT fallback
        if (err.status) {
            if (err.status === 401 && requireAuth) {
                localStorage.removeItem("token");
                window.location.href = "./login.html";
            }

            throw err;
        }

        // Network failure only:
        // fallback local -> public
        if (base === localAPI) {
            baseAPI = publicAPI;
            const res = await doFetch(publicAPI, endpoint, finalOptions);
            return await res.json();
        }

        throw err;
    }
}