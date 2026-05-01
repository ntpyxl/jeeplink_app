import { apiFetch } from "./jeeplinkApiFetcher.js";
import { adminShowLoader, adminHideLoader } from "../ui/adminStylingScript.js";

export async function checkAuth() {
    let token = localStorage.getItem("token");

    adminShowLoader([
        "Loading...",
        "Checking authentication...",
        "Almost there..."
    ]);

    if (!token) {
        adminHideLoader();
        promptUserLogin();
        return;
    }

    try {
        const response = await apiFetch("/getCurrentUser", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        adminHideLoader();
        if(response?.new_token) localStorage.setItem("token", response.new_token);
        return {"loggedInUsername": response.username};
    } catch (error) {
        localStorage.removeItem("token");
        promptUserLogin();
    }
}

function promptUserLogin() {
    const currentPage = window.location.pathname;
    window.location.replace(`./login.html#returnTo=${encodeURIComponent(currentPage)}`);
}

export function logout() {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
}

export function isLoggedIn() {
    return !!localStorage.getItem("token");
}
