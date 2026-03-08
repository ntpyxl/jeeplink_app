import { apiFetch } from "./jeeplinkApiFetcher.js";

await apiFetch("/")
    .then(data => {
        document.getElementById("textHere").textContent = data.Hello;
    })
    .catch(error => {
        console.log(error);
        document.getElementById("textHere").textContent = "Error loading data";
    });