import { setupLocationSearch, setupNamedLocations } from "./core/search/locationSearchAutocomplete.js";

window.addEventListener("pageshow", () => {
    $("#startingPointField").val();
    $("#destinationPointField").val();
    sessionStorage.removeItem("start");
    sessionStorage.removeItem("destination");
});

fetch("../api/getBlobFile?filename=Dasma_Points.geojson")
    .then(r => r.json())
    .then(setupNamedLocations);

let startingPoint = null;
let destinationPoint = null;
let isStartingPointSelectedLocation = false;
let isDestinationPointSelectedLocation = false;

const startingPointSearch = setupLocationSearch({
    field: $("#startingPointField"),
    suggestionBox: $("#startingSuggestions"),
    onSelect: (location) => {
        startingPoint = location;
        sessionStorage.setItem("start", JSON.stringify(startingPoint));
        isStartingPointSelectedLocation = true;
    }
});

const destinationPointSearch = setupLocationSearch({
    field: $("#destinationPointField"),
    suggestionBox: $("#destinationSuggestions"),
    onSelect: (location) => {
        destinationPoint = location;
        sessionStorage.setItem("destination", JSON.stringify(destinationPoint));
        isDestinationPointSelectedLocation = true;
    }
});

$("#calculateRouteButton").on("click", async () => {
    const tasks = [];

    if (!isStartingPointSelectedLocation) {
        tasks.push(startingPointSearch.flush());
    }
    if (!isDestinationPointSelectedLocation) {
        tasks.push(destinationPointSearch.flush());
    }

    await Promise.all(tasks);
    sessionStorage.setItem("start", JSON.stringify(startingPoint));
    sessionStorage.setItem("destination", JSON.stringify(destinationPoint));
    window.location.href = "/map.html";
});

// Close autocomplete suggested location when clicked out
$(document).on("click", function(e) {
    if (!$(e.target).closest("#startingPointField, #startingSuggestions").length) {
        $("#startingSuggestions").addClass("hidden");
    }

    if (!$(e.target).closest("#destinationPointField, #destinationSuggestions").length) {
        $("#destinationSuggestions").addClass("hidden");
    }
});