import { GraphHelper } from "./core/graphHelper.js";
import { CommuterRouter } from "./core/commuterRouter.js";
import { SavedRouteRenderer } from "./core/savedRouteRenderer.js";
import { setupLocationSearch, setupNamedLocations, getCurrentLocation } from "./core/search/locationSearchAutocomplete.js";
import { apiFetch } from "./core/jeeplinkApiFetcher.js";
import { snapToRoad } from "./helper/snapToRoadFunction.js";

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
// L.control.zoom({
//     position: 'bottomright' 
// }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);
// Map Controls
document.getElementById("zoomInBtn").addEventListener("click", () => map.zoomIn());
document.getElementById("zoomOutBtn").addEventListener("click", () => map.zoomOut());
document.getElementById("locateBtn").addEventListener("click", () => {
    map.locate({ setView: true, maxZoom: 16 });
});

map.on("locationfound", (e) => {
    L.circleMarker(e.latlng, {
        radius: 8,
        color: "#004F11",
        fillColor: "#2E7D32",
        fillOpacity: 0.9,
        weight: 2
    }).addTo(map).bindPopup("You are here").openPopup();
});

map.on("locationerror", () => {
    alert("Unable to find your location. Please allow location access.");
});

// Fetch and setup required JSON files
const roadsPromise = fetch("../api/getBlobFile?filename=Dasma_LineStrings-AllRoads.geojson").then(r => r.json());
const fareMatrix = await apiFetch("/getFareMatrix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matrixId: 0 })
});
fetch("../api/getBlobFile?filename=Dasma_Points.geojson").then(r => r.json())
    .then(setupNamedLocations);

const roadsGeoJSON = await roadsPromise;

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
const savedRouteRenderer = new SavedRouteRenderer({
    map: map,
    roadsGeoJSON: roadsGeoJSON,
    graphHelper: graphHelper
});
const routeGenerated = new CommuterRouter({
    map: map,
    roadsGeoJSON: roadsGeoJSON,
    graphHelper: graphHelper,
    fareMatrix: fareMatrix,
    addInteractability: false
});

$("#toggleJeepRoutes").on("click", async () => {
    savedRouteRenderer.toggle();
})

function addRouteNode(data, type = null) {
    const latlng = data.coords;
    const snapped = snapToRoad({lat: latlng[1], lng: latlng[0]}, roadsGeoJSON);
    const graphNodeKey = graphHelper.insertTemporaryNode(
        snapped.coordinates,
        snapped.segmentA,
        snapped.segmentB
    );    

    const node = {
        id: crypto.randomUUID(),
        coordinates: data.coords,
        roadId: snapped.roadId,
        graphKey: graphNodeKey
    };

    routeGenerated.addNode({node: node, type: type});
}

let startingPoint = null;
let destinationPoint = null;
let isStartingPointSelectedLocation = false;
let isDestinationPointSelectedLocation = false;

const start = sessionStorage.getItem("start");
const destination = sessionStorage.getItem("destination");

routeGenerated.clear();

if (start) {
    console.log(start)
    startingPoint = JSON.parse(start);
    sessionStorage.removeItem("start");
    $("#startingPointField").val(startingPoint.name);
    addRouteNode(startingPoint, "start");
}

if (destination) {
    console.log(destination)
    destinationPoint = JSON.parse(destination);
    sessionStorage.removeItem("destination");
    $("#destinationPointField").val(destinationPoint.name);
    addRouteNode(destinationPoint, "destination");
}

if (start && destination) await routeGenerated.getAndDisplayRoutes();

const startingPointSearch = setupLocationSearch({
    field: $("#startingPointField"),
    map: map,
    suggestionBox: $("#startingSuggestions"),
    onSelect: (location) => {
        startingPoint = location;
        addRouteNode(startingPoint, "start");
        isStartingPointSelectedLocation = true;
    }
});

const destinationPointSearch = setupLocationSearch({
    field: $("#destinationPointField"),
    map: map,
    suggestionBox: $("#destinationSuggestions"),
    onSelect: (location) => {
        destinationPoint = location;
        addRouteNode(destinationPoint, "destination");
        isDestinationPointSelectedLocation = true;
    }
});

$("#calculateRouteButton").on("click", async () => {
    if(!isStartingPointSelectedLocation && startingPoint) {
        startingPoint = await startingPointSearch.flush();
        $("#startingPointField").val(startingPoint.name);
    }
    if(!isDestinationPointSelectedLocation) {
        destinationPoint = await destinationPointSearch.flush();
        $("#destinationPointField").val(destinationPoint.name);
    }
    if(!startingPoint) {
        startingPoint = await getCurrentLocation();
        $("#startingPointField").val(startingPoint.name);
    }
    if(!destinationPoint) return;

    $("#routePanel")
                    .hide()
                    .removeClass("hidden")
                    .fadeIn(200);

    routeGenerated.clear();

    addRouteNode(startingPoint, "start");
    addRouteNode(destinationPoint, "destination");

    // TODO: Also should return three routes (fastest, cheapest, minimal transfer)
    const completeRouteInformation = await routeGenerated.getAndDisplayRoutes();
    renderRoutes(completeRouteInformation);
})

$(document).on("click", e => {
    ["starting", "destination"].forEach(type => {
        if (!$(e.target).closest(`#${type}PointField, #${type}Suggestions`).length) {
            $(`#${type}Suggestions`).addClass("hidden");
        }
    });
});