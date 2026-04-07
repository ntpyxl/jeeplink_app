import { LocationSearchAutocomplete } from "./core/search/locationSearchAutocomplete.js";
import { createCurrentLocationItem, createLocationResultItem } from "./ui/dropdownElements.js";
import { setupNamedLocations, getCurrentLocation } from "./core/search/locationSearchAutocomplete.js";

fetch("../api/getBlobFile?filename=Dasma_Points.geojson")
    .then(r => r.json())
    .then(setupNamedLocations);

const startingPointSearch = new LocationSearchAutocomplete($("#startingPointField"));
const destinationPointSearch = new LocationSearchAutocomplete($("#destinationPointField"));

// SHOW "Your Location" on focus (START)
$("#startingPointField").on("focus click", async function () {
    const container = $("#startingSuggestions");
    container.empty();

    const currentLocationItem = await createCurrentLocationItem();

    currentLocationItem.on("click", async () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            return;
        }

        $("#startingPointField").val("Getting your location...");

        const location = await getCurrentLocation();
        sessionStorage.setItem("start", JSON.stringify(location));

        isStartingPointSelectedLocation = true;

        $("#startingPointField").val("Your Location");
        container.addClass("hidden");
    });

    container.append(currentLocationItem);
    container.removeClass("hidden");
});

// SHOW "Your Location" on focus (DESTINATION)
$("#destinationPointField").on("focus click", async function () {
    const container = $("#destinationSuggestions");
    container.empty();

    const currentLocationItem = await createCurrentLocationItem();

    currentLocationItem.on("click", async () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            return;
        }

        $("#destinationPointField").val("Getting your location...");

        const location = await getCurrentLocation();
        sessionStorage.setItem("destination", JSON.stringify(location));

        isDestinationPointSelectedLocation = true;

        $("#destinationPointField").val("Your Location");
        container.addClass("hidden");
    });

    container.append(currentLocationItem);
    container.removeClass("hidden");
});

let isStartingPointSelectedLocation = false;
let isDestinationPointSelectedLocation = false;

startingPointSearch.onResults = async function(results) {
    sessionStorage.setItem("start", JSON.stringify(results[0]));
    const container = $("#startingSuggestions");
    container.empty();

    const currentLocationItem = await createCurrentLocationItem();

    currentLocationItem.on("click", async () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            return;
        }

        $("#startingPointField").val("Getting your location...");

        sessionStorage.setItem("start", JSON.stringify(await getCurrentLocation()));
        isStartingPointSelectedLocation = true;

        $("#startingPointField").val("Your Location");
        $("#startingSuggestions").addClass("hidden");
    });
    container.append(currentLocationItem);

    if (!results || results.length === 0) {
        container.addClass("hidden");
        return;
    }

    results.forEach(async result => {
        const item = await createLocationResultItem(result.name);

        item.on("click", () => {
            $("#startingPointField").val(result.name);
            isStartingPointSelectedLocation = true;
            container.addClass("hidden");

            sessionStorage.setItem("start", JSON.stringify(result));
        });
        container.append(item);
    });

    container.removeClass("hidden");
};

destinationPointSearch.onResults = async function(results) {
    sessionStorage.setItem("destination", JSON.stringify(results[0]));
    const container = $("#destinationSuggestions");
    container.empty();

    const currentLocationItem = await createCurrentLocationItem();

    currentLocationItem.on("click", async () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            return;
        }

        $("#destinationPointField").val("Getting your location...");

        sessionStorage.setItem("destination", JSON.stringify(await getCurrentLocation()));
        isDestinationPointSelectedLocation = true;

        $("#destinationPointField").val("Your Location");
        $("#destinationSuggestions").addClass("hidden");
    });
    container.append(currentLocationItem);


    if (!results || results.length === 0) {
        container.addClass("hidden");
        return;
    }

    results.forEach(async result => {
        const item = await createLocationResultItem(result.name);
        
        item.on("click", () => {
            $("#destinationPointField").val(result.name);
            isDestinationPointSelectedLocation = true;
            container.addClass("hidden");

            sessionStorage.setItem("destination", JSON.stringify(result));
        });
        container.append(item);
    });

    container.removeClass("hidden");
};

$("#calculateRouteButton").on("click", async () => {
    const tasks = [];

    if (!isStartingPointSelectedLocation) {
        tasks.push(startingPointSearch.flush());
    }
    if (!isDestinationPointSelectedLocation) {
        tasks.push(destinationPointSearch.flush());
    }

    await Promise.all(tasks);
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