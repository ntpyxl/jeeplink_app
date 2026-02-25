const API_URL =
    location.origin !== "https://jeeplink-app.vercel.app"
        ? "http://127.0.0.1:8000"
        : "https://jeeplinkapi.vercel.app";

fetch(API_URL + "/").then(response => response.json())
    .then(data => {
        document.getElementById("textHere").textContent = data.Hello;
    })
    .catch(error => {
        console.error(error);
        document.getElementById("textHere").textContent = "Error loading data";
    });