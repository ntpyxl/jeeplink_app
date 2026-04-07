import { GraphHelper } from "./core/graphHelper.js";
import { RouteEditor } from "./core/routeEditor.js";
import { RouteRenderer } from "./core/routeRenderer.js";
import { setupLocationSearch, setupNamedLocations, getCurrentLocation } from "./core/search/locationSearchAutocomplete.js";

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

// Fetch and setup required JSON files
const roadsPromise = fetch("../api/getBlobFile?filename=Dasma_LineStrings-PublicRoads.geojson").then(r => r.json());
fetch("../api/getBlobFile?filename=Dasma_Points.geojson")
    .then(r => r.json())
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
const routeRenderer = new RouteRenderer(map);
const routeGenerated = new RouteEditor({
    map: map,
    addInteractability: false
});

$("#toggleJeepRoutes").on("click", async () => {
    routeRenderer.toggle();
})

function addRouteNode(data, type = null) {
    const graphNodeKey = graphHelper.insertTemporaryNode(
        snapped.coordinates,
        snapped.segmentA,
        snapped.segmentB
    );    

    const node = {
        id: crypto.randomUUID(),
        coordinates: data.coords,
        roadId: randomUUID,
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

if (start && destination) {
    startingPoint = JSON.parse(start);
    destinationPoint = JSON.parse(destination);

    sessionStorage.removeItem("start");
    sessionStorage.removeItem("destination");

    $("#startingPointField").val(startingPoint.name);
    $("#destinationPointField").val(destinationPoint.name);

    routeGenerated.clear();

    addRouteNode(startingPoint, "start");
    addRouteNode(destinationPoint, "destination");

    await routeGenerated.drawRoute();
}

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

    routeGenerated.clear();

    addRouteNode(startingPoint, "start");
    addRouteNode(destinationPoint, "destination");

    // TODO: Still using Dijkstra, should be A* now
    // TODO: Also should return three routes (shortest, cheapest, minimal transfer)
    await routeGenerated.drawRoute();
})

$(document).on("click", e => {
    ["starting", "destination"].forEach(type => {
        if (!$(e.target).closest(`#${type}PointField, #${type}Suggestions`).length) {
            $(`#${type}Suggestions`).addClass("hidden");
        }
    });
});