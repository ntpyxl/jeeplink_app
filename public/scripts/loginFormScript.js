import { apiFetch } from "../scripts/core/jeeplinkApiFetcher.js";

$(document).ready(function () {
    // Password visibility toggle
    $("#togglePassword").on("click", function () {
        let passwordField = $("#passwordField");

        if (passwordField.attr("type") === "password") {
            passwordField.attr("type", "text");
            $(this).removeClass("fa-eye").addClass("fa-eye-slash");
        } else {
            passwordField.attr("type", "password");
            $(this).removeClass("fa-eye-slash").addClass("fa-eye");
        }
    });

    $("#loginForm").on("submit", async function (event) {
        event.preventDefault();

        const usernameValue = $("#usernameField").val();
        const passwordValue = $("#passwordField").val();
        const errorBox = $("#errorMessage");

        const loginBtn = $("#loginBtn");
        const spinner = $("#loadingSpinner");
        const btnText = $("#btnText");

        // Reset error
        errorBox.addClass("hidden").text("");

        // Validation
        if (!usernameValue || !passwordValue) {
            errorBox.removeClass("hidden").text("Please fill in all fields.");
            return;
        }

        loginBtn.prop("disabled", true);
        spinner.removeClass("hidden");
        btnText.text("Logging in...");

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
            } else {
                errorBox.removeClass("hidden").text("Invalid username or password.");
            }

        } catch (err) {
            console.error("Login failed:", err);
            errorBox.removeClass("hidden").text("Login failed. Please try again.");
        } finally {
            loginBtn.prop("disabled", false);
            spinner.addClass("hidden");
            btnText.text("Login");
        }
    });
});