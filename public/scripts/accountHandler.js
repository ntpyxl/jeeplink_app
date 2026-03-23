import { apiFetch } from "../scripts/jeeplinkApiFetcher.js";

$("#loginForm").on("submit", async event => {
    event.preventDefault();
    console.log("form submitted");

    const usernameValue = $("#usernameField").val();
    const passwordValue = $("#passwordField").val();

    const response = await apiFetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: usernameValue,
            password: passwordValue
        })
    })

    console.log(response);
});