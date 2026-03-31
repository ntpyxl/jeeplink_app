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

    const currentLocationItem = $(`
        <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b">
            <i class="fa-solid fa-location-crosshairs text-blue-600 text-lg"></i>
            <span class="text-[blue-600] font-semibold">
                Your Location
            </span>
        </div>
    `);

    currentLocationItem.on("click", () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            return;
        }

        $("#startingPointField").val("Getting your location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                const locationData = {
                    name: "Your Location",
                    lat: lat,
                    lon: lon
                };

                $("#startingPointField").val("Your Location");
                $("#startingSuggestions").addClass("hidden");

                sessionStorage.setItem("start", JSON.stringify(locationData));
            },
            (error) => {
                alert("Failed to get location.");
                console.error(error);
            }
        );
    });

    container.append(currentLocationItem);

    if (!results || results.length === 0) {
        container.addClass("hidden");
        return;
    }

    results.forEach(result => {
const item = $(`
    <div class="flex items-center gap-4 px-5 py-4 cursor-pointer
                transition-all duration-200
                hover:bg-green-50 hover:scale-[1.01] active:scale-[0.98]">

        <!-- Icon -->
        <div class="w-10 h-10 flex items-center justify-center
                    bg-green-100 text-[#2E7D32] rounded-full">
            <i class="fa-solid fa-location-dot text-sm"></i>
        </div>

        <!-- Text -->
        <div class="flex flex-col">
            <span class="text-[#003B01] font-semibold text-sm md:text-base">
                ${result.name}
            </span>
        </div>

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

    const currentLocationItem = $(`
        <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b">
            <i class="fa-solid fa-location-crosshairs text-blue-600 text-lg"></i>
            <span class="text-blue-600 font-semibold">
                Your Location
            </span>
        </div>
    `);

    currentLocationItem.on("click", () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            return;
        }

        $("#destinationPointField").val("Getting your location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                const locationData = {
                    name: "Your Location",
                    lat: lat,
                    lon: lon
                };

                $("#destinationPointField").val("Your Location");
                $("#destinationSuggestions").addClass("hidden");

                sessionStorage.setItem("destination", JSON.stringify(locationData));
            },
            (error) => {
                alert("Failed to get location.");
                console.error(error);
            }
        );
    });

    container.append(currentLocationItem);


    if (!results || results.length === 0) {
        container.addClass("hidden");
        return;
    }

    results.forEach(result => {
        const item = $(`
            <div class="flex items-center gap-4 px-5 py-4 cursor-pointer
                        transition-all duration-200
                        hover:bg-green-50 hover:scale-[1.01] active:scale-[0.98]">

                <!-- Icon -->
                <div class="w-10 h-10 flex items-center justify-center
                            bg-green-100 text-[#2E7D32] rounded-full">
                    <i class="fa-solid fa-location-dot text-sm"></i>
                </div>

                <!-- Text -->
                <div class="flex flex-col">
                    <span class="text-[#003B01] font-semibold text-sm md:text-base">
                        ${result.name}
                    </span>
                </div>

                
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
    await startingPointSearch.flush();
    await destinationPointSearch.flush();
    
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