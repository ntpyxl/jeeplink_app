import { apiFetch } from "./jeeplinkApiFetcher.js";
import { GraphHelper } from "./helpers/graphHelper.js";
import { RouteEditor } from "./helpers/routeEditor.js";
import { RouteRenderer } from "./helpers/routeRenderer.js";

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

$("#clearDrawnJeepRoute").on("click", async event => {
    await clearDrawnJeepRoute();
})

async function clearDrawnJeepRoute() {
    routeEditor.clear();
    $("#drawnJeepRouteName").val("");
    $("#startNodeText").text("");
    $("#endNodeText").text("");
}

$("#saveDrawnJeepRoute").on("click", async event => {
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

$("#toggleJeepRoutes").on("click", async event => {
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

const routeGenerated = new RouteEditor(map);
// TODO: Upload Dasma_Points.geojson to Vercel Blob
const pointsGeoJSON = await fetch("/DasmaMapData/Dasma_Points.geojson").then(r => r.json());

const namedPlaces = pointsGeoJSON.features
    .filter(feature => feature.properties?.name)
    .map(feature => {
        const coords = feature.geometry.coordinates;

        // TODO: Doesn't snap to the map grid so it may fuck up?
        return {
            name: feature.properties.name,
            searchName: normalizeText(feature.properties.name),
            coords: coords,
            data: feature
        };
    });

function searchPlaces(query) {
    const normalizedQuery = normalizeText(query);

    try{
        // TODO: Maybe try Nominatim if cannot be searched, but otherwise, resort to just placing down a pin on the map.
        // TODO: Would definitely help if the user was given a suggestion on the place they are typing.
        const results = namedPlaces.filter(place =>
            place.searchName.includes(normalizedQuery)
        );

        const randomUUID = crypto.randomUUID();
        const node = {
            id: randomUUID,
            coordinates: results[0].coords,
            roadId: randomUUID,
            graphKey: graphHelper.snapToGraphNode(results[0].coords)
        };

        routeGenerated.addNode(node);

        return results;
    } catch (err) {
        console.log("Cannot find: " + query)
    }
}

function normalizeText(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

if(sessionStorage.getItem("start") && sessionStorage.getItem("destination")) {
    // TODO: Maybe default starting point to current user location.
    const startingPoint = sessionStorage.getItem("start");
    const destinationPoint = sessionStorage.getItem("destination");
    $("#startingPointField").val(startingPoint);
    $("#destinationPointField").val(destinationPoint);

    routeGenerated.clear();

    console.log(searchPlaces(startingPoint));
    console.log(searchPlaces(destinationPoint));

    // TODO: Still using Dijkstra, should be A* now
    // TODO: Also should return three routes (shortest, cheapest, minimal transfer)
    await routeGenerated.drawRoute();
}

$("#calculateRouteButton").on("click", async event => {
    // TODO: Maybe default starting point to current user location.
    const startingPoint = $("#startingPointField").val();
    const destinationPoint = $("#destinationPointField").val();
    if(!startingPoint && !destinationPoint) return;
    routeGenerated.clear();

    console.log(searchPlaces(startingPoint));
    console.log(searchPlaces(destinationPoint));

    // TODO: Still using Dijkstra, should be A* now
    // TODO: Also should return three routes (shortest, cheapest, minimal transfer)
    await routeGenerated.drawRoute();
})