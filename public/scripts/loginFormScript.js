import { apiFetch } from "../scripts/jeeplinkApiFetcher.js";

$("#loginForm").on("submit", async event => {
    event.preventDefault();

    const usernameValue = $("#usernameField").val();
    const passwordValue = $("#passwordField").val();

    try {
        const response = await apiFetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: usernameValue,
                password: passwordValue
            })
        });

        if (response.access_token) {
            localStorage.setItem("token", response.access_token);
            window.location.href = "./dashboard.html";
        }

    } catch (err) {
        console.error("Login failed:", err);
    }
});