import { apiFetch } from "./jeeplinkApiFetcher.js";
import { GraphHelper } from "./helpers/graphHelper.js";
import { RouteEditor } from "./helpers/routeEditor.js";
import { RouteRenderer } from "./helpers/routeRenderer.js";
import { LocationSuggester } from "./locationSuggester.js";

// TODO: Put into class since most scripts are just using the same shit for these
const map = L.map("map", {
    renderer: L.canvas(),
    minZoom: 12,
    maxZoom: 18
}).setView([14.3272, 120.9404], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);

// TODO: This takes 6 seconds everytime...
const roadsGeoJSON = await fetch("../api/getRoadsGeoJson.js").then(r => r.json());
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
const routeEditor = new RouteEditor(map);
const routeRenderer = new RouteRenderer(map);
const routeGenerated = new RouteEditor(map);

roadsLayer.on("click", async event => {
    const snapped = snapToRoad(event.latlng);
    if (!snapped) return;

    // TODO: Consider double checking graphKey and coordinates var, both are coordinates but are somewhat different (with coords being more accurate vs graphKey).
    const graphNodeKey = graphHelper.snapToGraphNode(snapped.coordinates);
    /*
    const graphNodeKey = graphHelper.insertTemporaryNode(
        snapped.coordinates,
        snapped.segmentA,
        snapped.segmentB
    );
    */

    const node = {
        id: crypto.randomUUID(),
        coordinates: snapped.coordinates,
        roadId: snapped.roadId,
        graphKey: graphNodeKey
    };

    routeEditor.addNode(node);
    await routeEditor.drawRoute();

    $("#startNodeText").text(routeEditor.getStartNode().graphKey);
    if(routeEditor.nodes.length > 1) $("#endNodeText").text(routeEditor.getEndNode().graphKey);
});

$("#clearDrawnJeepRoute").on("click", async () => {
    await clearDrawnJeepRoute();
})

async function clearDrawnJeepRoute() {
    routeEditor.clear();
    $("#drawnJeepRouteName").val("");
    $("#startNodeText").text("");
    $("#endNodeText").text("");
}

$("#saveDrawnJeepRoute").on("click", async () => {
    try {
        await apiFetch("/insertJeepRoute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                routeName: $("#drawnJeepRouteName").val(),
                nodes: routeEditor.nodes
            })
        });

        clearDrawnJeepRoute();
        $("#drawnJeepRouteName").val('');

        alert("Successfully saved Jeepney Route!");
    } catch (err) {
        console.error(err);
        alert("Failed to save Jeepney Route.");
    }
})

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

if(sessionStorage.getItem("start") && sessionStorage.getItem("destination")) {
    const startingPoint = JSON.parse(sessionStorage.getItem("start"));
    const destinationPoint = JSON.parse(sessionStorage.getItem("destination"));
    
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
    
    // TODO: Maybe default starting point to current user location.
    const startingPoint = JSON.parse(sessionStorage.getItem("start"));
    const destinationPoint = JSON.parse(sessionStorage.getItem("destination"));

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