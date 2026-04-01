import { LocationSuggester } from "./locationSuggester.js";

const startingPointSearch = new LocationSuggester($("#startingPointField"));
const destinationPointSearch = new LocationSuggester($("#destinationPointField"));

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
    if(!isStartingPointSelectedLocation) await startingPointSearch.flush();
    if(!isDestinationPointSelectedLocation) await destinationPointSearch.flush();
    
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

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                const locationData = {
                    name: "Your Location",
                    searchName: "Your Location",
                    coords: [lon, lat]
                };

                resolve(locationData);
            },
            (error) => {
                console.error(error);
                alert("Failed to get location.");
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    });
}

function createCurrentLocationItem() {
    return $(`
        <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b">
            <i class="fa-solid fa-location-crosshairs text-blue-600 text-lg"></i>
            <span class="text-[blue-600] font-semibold">
                Your Location
            </span>
        </div>
    `);
}

function createLocationResultItem(text) {
    return $(`
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
                    ${text}
                </span>
            </div>

        </div>
    `);
}