import { apiFetch } from "./jeeplinkApiFetcher.js";
import { GraphHelper } from "./classes/graphHelper.js";
import { RouteEditor } from "./classes/routeEditor.js";
import { RouteRenderer } from "./classes/routeRenderer.js";
import { LocationSuggester } from "./locationSuggester.js";

// TODO: Put into class since most scripts are just using the same shit for these
const map = L.map("map", {
    renderer: L.canvas(),
    minZoom: 12,
    maxZoom: 18,
    zoomControl: false
}).setView([14.3272, 120.9404], 15);
map.createPane("routePane");
map.createPane("nodePane");
map.getPane("routePane").style.zIndex = 400;
map.getPane("nodePane").style.zIndex = 500;

// TODO: Add locate current user location button above the + - icon
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);

const roadsGeoJSON = await fetch("../api/getBlobFile?filename=Dasma_LineStrings-PublicRoads.geojson").then(r => r.json());

// Assigns a road ID to each road
roadsGeoJSON.features.forEach((feature, index) => {
    feature.properties.id = `road-${index}`;
});

const roadsLayer = L.geoJSON(roadsGeoJSON, {
    filter: function(feature) {
        return feature.geometry && feature.geometry.type === "LineString" && !feature.properties.disabled;
    },
    style: {
        color: "#555",
        opacity: 1,
        weight: 2
    }
})

map.on("zoomend", () => {
    const zoom = map.getZoom();
    let weight;

    if (zoom <= 13) weight = 1;
    else if (zoom <= 15) weight = 2;
    else if (zoom <= 17) weight = 3;
    else weight = 4;

    roadsLayer.setStyle({ weight });
});

const graphHelper = new GraphHelper(roadsGeoJSON);
// NOTE: graphHelper.graph.get(key) => [{ to, weight, coords }]
const routeRenderer = new RouteRenderer(map);
const routeGenerated = new RouteEditor({
    map: map,
    addInteractability: false
});

$("#toggleJeepRoutes").on("click", async () => {
    routeRenderer.toggle();
})

function snapToRoad(latlng) {
    const clicked = turf.point([latlng.lng, latlng.lat]);

    let closestRoad = null;
    let closestSnap = null;
    let minDist = Infinity;

    roadsGeoJSON.features.forEach(road => {
        const snap = turf.nearestPointOnLine(road, clicked);
        const dist = snap.properties.dist;

        if (dist < minDist) {
            minDist = dist;
            closestRoad = road;
            closestSnap = snap;
        }
    });

    if (!closestRoad) return null;

    const coords = closestRoad.geometry.coordinates;
    const segmentIndex = closestSnap.properties.index;

    return {
        coordinates: closestSnap.geometry.coordinates,
        roadId: closestRoad.properties.id,
        segmentA: coords[segmentIndex],
        segmentB: coords[segmentIndex + 1]
    };
}

function addRouteNode(data) {
    const randomUUID = crypto.randomUUID();
    const node = {
        id: randomUUID,
        coordinates: data.coords,
        roadId: randomUUID,
        graphKey: graphHelper.snapToGraphNode(data.coords)
    };

    routeGenerated.addNode(node);
}

let startingPoint = null;
let destinationPoint = null;

if(sessionStorage.getItem("start") && sessionStorage.getItem("destination")) {
    startingPoint = JSON.parse(sessionStorage.getItem("start"));
    destinationPoint = JSON.parse(sessionStorage.getItem("destination"));
    sessionStorage.removeItem("start");
    sessionStorage.removeItem("destination");

    $("#startingPointField").val(startingPoint.name);
    $("#destinationPointField").val(destinationPoint.name);

    routeGenerated.clear();

    addRouteNode(startingPoint);
    addRouteNode(destinationPoint);

    // TODO: Still using Dijkstra, should be A* now
    // TODO: Also should return three routes (shortest, cheapest, minimal transfer)
    await routeGenerated.drawRoute();
}

const startingPointSearch = new LocationSuggester($("#startingPointField"));
const destinationPointSearch = new LocationSuggester($("#destinationPointField"));

// SHOW "Your Location" on focus (START)
$("#startingPointField").on("focus click", async function () {
    const container = $("#startingSuggestions");
    container.empty();

    const currentLocationItem = await createCurrentLocationItem();

    currentLocationItem.on("click", async () => {
        $("#startingPointField").val("Getting your location...");

        startingPoint = await getCurrentLocation();

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
        $("#destinationPointField").val("Getting your location...");

        startingPoint = await getCurrentLocation();

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
    startingPoint = results[0];
    const container = $("#startingSuggestions");
    container.empty();

    const currentLocationItem = await createCurrentLocationItem();

    currentLocationItem.on("click", async () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            return;
        }

        $("#startingPointField").val("Getting your location...");

        startingPoint = await getCurrentLocation();
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

            startingPoint = result;
        });
        container.append(item);
    });

    container.removeClass("hidden");
};

destinationPointSearch.onResults = async function(results) {
    destinationPoint = results[0];
    const container = $("#destinationSuggestions");
    container.empty();

    const currentLocationItem = await createCurrentLocationItem();

    currentLocationItem.on("click", async () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported.");
            return;
        }

        $("#destinationPointField").val("Getting your location...");

        destinationPoint = await getCurrentLocation();
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

            destinationPoint = result;
        });
        container.append(item);
    });

    container.removeClass("hidden");
};

$("#calculateRouteButton").on("click", async () => {
    if(!isStartingPointSelectedLocation) await startingPointSearch.flush();
    if(!isDestinationPointSelectedLocation) await destinationPointSearch.flush();

    routeGenerated.clear();

    addRouteNode(startingPoint);
    addRouteNode(destinationPoint);

    // TODO: Still using Dijkstra, should be A* now
    // TODO: Also should return three routes (shortest, cheapest, minimal transfer)
    await routeGenerated.drawRoute();
})

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