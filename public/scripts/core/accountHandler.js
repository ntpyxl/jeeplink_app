import { apiFetch } from "./jeeplinkApiFetcher.js";

export async function checkAuth() {
    let token = localStorage.getItem("token");

    if (!token) {
        window.location.replace("./login.html");
        return;
    }

    try {
        const response = await apiFetch("/getCurrentUser", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        $("body").css("visibility", "visible");
        return {"loggedInUsername": response.username};
    } catch (error) {
        localStorage.removeItem("token");
        window.location.replace("./login.html");
    }
}

export function logout() {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
}

export function isLoggedIn() {
    return !!localStorage.getItem("token");
}
