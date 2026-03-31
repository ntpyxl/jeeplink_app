import { LocationSuggester } from "./locationSuggester.js";

const startingPointSearch = new LocationSuggester($("#startingPointField"));
const destinationPointSearch = new LocationSuggester($("#destinationPointField"));

startingPointSearch.onResults = function(results) {
    console.log("Starting Point search results");
    console.log(results);

    // TODO: Should maybe default to user's current geolocation if this is left empty.
    // TODO: Stored value should be the user's selected location suggestion OR whatever it has typed.
    sessionStorage.setItem("start", JSON.stringify(results[0]));
};

destinationPointSearch.onResults = function(results) {
    console.log("Destination Point search results");
    console.log(results);

    // TODO: Stored value should be the user's selected location suggestion OR whatever it has typed.
    sessionStorage.setItem("destination", JSON.stringify(results[0]));
};

$("#calculateRouteButton").on("click", async event => {
    await startingPointSearch.flush();
    await destinationPointSearch.flush();
    
    window.location.href = "/map.html";
});