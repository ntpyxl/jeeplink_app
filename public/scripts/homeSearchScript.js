import { LocationSuggester } from "./locationSuggester.js";

const startingPointSearch = new LocationSuggester($("#startingPointField"));
const destinationPointSearch = new LocationSuggester($("#destinationPointField"));

// startingPointSearch.onResults = function(results) {
//     console.log("Starting Point search results");
//     console.log(results);

//     // TODO: Should maybe default to user's current geolocation if this is left empty.
//     // TODO: Stored value should be the user's selected location suggestion OR whatever it has typed.
//     sessionStorage.setItem("start", JSON.stringify(results[0]));
// };

startingPointSearch.onResults = function(results) {
    const container = $("#startingSuggestions");
    container.empty();

    if (!results || results.length === 0) {
        container.addClass("hidden");
        return;
    }

    results.forEach(result => {
        const item = $(`
            <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-none">
                
                <!-- Font Awesome Location Icon -->
                <i class="fa-solid fa-location-dot text-[#2E7D32] text-lg"></i>

                <!-- Place Name -->
                <span class="text-[#003B01] font-medium">
                    ${result.name}
                </span>

            </div>
        `);

        // When user clicks a suggestion
        item.on("click", () => {
            $("#startingPointField").val(result.name);
            container.addClass("hidden");

            // Save selected result
            sessionStorage.setItem("start", JSON.stringify(result));
        });

        container.append(item);
    });

    container.removeClass("hidden");
};

// destinationPointSearch.onResults = function(results) {
//     console.log("Destination Point search results");
//     console.log(results);

//     // TODO: Stored value should be the user's selected location suggestion OR whatever it has typed.
//     sessionStorage.setItem("destination", JSON.stringify(results[0]));
// };

destinationPointSearch.onResults = function(results) {
    const container = $("#destinationSuggestions");
    container.empty();

    if (!results || results.length === 0) {
        container.addClass("hidden");
        return;
    }

    results.forEach(result => {
        const item = $(`
            <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-none">
                
                <!-- Font Awesome Location Icon -->
                <i class="fa-solid fa-location-dot text-[#2E7D32] text-lg"></i>

                <!-- Place Name -->
                <span class="text-[#003B01] font-medium">
                    ${result.name}
                </span>

            </div>
        `);

        item.on("click", () => {
            $("#destinationPointField").val(result.name);
            container.addClass("hidden");

            sessionStorage.setItem("destination", JSON.stringify(result));
        });

        container.append(item);
    });

    container.removeClass("hidden");
};

$("#calculateRouteButton").on("click", async event => {
    window.location.href = "/map.html";
});

$(document).on("click", function(e) {
    if (!$(e.target).closest("#startingPointField, #startingSuggestions").length) {
        $("#startingSuggestions").addClass("hidden");
    }

    if (!$(e.target).closest("#destinationPointField, #destinationSuggestions").length) {
        $("#destinationSuggestions").addClass("hidden");
    }
});