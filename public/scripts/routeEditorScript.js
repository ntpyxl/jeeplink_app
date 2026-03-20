import { buildGraph } from "./graphBuilder.js";
import { apiFetch } from "./jeeplinkApiFetcher.js";

const map = L.map("map", {
    renderer: L.canvas()
}).setView([14.3272, 120.9404], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);

const roadsGeoJSON = await fetch("api/getRoadsGeoJson.js").then(r => r.json());
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
}).addTo(map);

let drawnNodes = [];
let drawnRouteLine = null;
let existingRouteLines = null;
const graph = buildGraph(roadsGeoJSON, false); // NOTE: graph.get(key) => [{ to, weight, coords }]

map.on("zoomend", () => {
    const zoom = map.getZoom();
    let weight;

    if (zoom <= 13) weight = 1;
    else if (zoom <= 15) weight = 2;
    else if (zoom <= 17) weight = 3;
    else weight = 4;

    roadsLayer.setStyle({ weight });
});

roadsLayer.on("click", async event => {
    const snapped = snapToRoad(event.latlng);
    if (!snapped) return;

    // TODO: Consider double checking graphKey and coordinates var, both are coordinates but are somewhat different (with coords being more accurate vs graphKey).
    const graphNodeKey = snapToGraphNode(snapped.coordinates);
    /*
    const graphNodeKey = insertTemporaryNode(
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

    drawnNodes.push(node);

    $("#startNodeText").text(drawnNodes[0].graphKey);
    if(drawnNodes.length > 1) $("#endNodeText").text(drawnNodes[drawnNodes.length - 1].graphKey);

    drawNode(node);
    await drawRoute(drawnNodes);
});

$("#saveNewJeepRoute").on("click", async event => {
    try {
        await apiFetch("/insertJeepRoute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nodes: drawnNodes
            })
        });

        alert("Successfully saved Jeepney Route!");
    } catch (err) {
        console.error(err);
        alert("Failed to save Jeepney Route.");
    }
})

$("#toggleJeepRoutes").on("click", async event => {
    if(!existingRouteLines) try {
        const queryData = await apiFetch("/getJeepRoutesWithNodes", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        existingRouteLines = queryData.queryData;
    } catch (err) {
        console.error(err);
    }

    await Promise.all(
        existingRouteLines.map(route => displayExistingRoutes(route.nodes))
    );
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

function snapToGraphNode(coord) {
    let closestKey = null;
    let minDist = Infinity;

    for (const key of graph.keys()) {
        const [lng, lat] = key.split(",").map(Number);
        const d = turf.distance(
            turf.point(coord),
            turf.point([lng, lat]),
            { units: "meters" }
        );

        if (d < minDist) {
            minDist = d;
            closestKey = key;
        }
    }

    return closestKey;
}

// TODO: Fix route jumping through roads.
function insertTemporaryNode(coord, a, b) {
    const key = coord.join(",");

    if (graph.has(key)) return key;

    const aKey = a.join(",");
    const bKey = b.join(",");

    const distA = turf.distance(turf.point(coord), turf.point(a), { units: "meters" });
    const distB = turf.distance(turf.point(coord), turf.point(b), { units: "meters" });

    graph.set(key, []);

    graph.get(key).push({ to: aKey, weight: distA });
    graph.get(key).push({ to: bKey, weight: distB });

    graph.get(aKey).push({ to: key, weight: distA });
    graph.get(bKey).push({ to: key, weight: distB });

    return key;
}

async function drawRoute(routeNodes) {
    if (routeNodes.length < 2) return;

    const response = await apiFetch("/multipoint_dijkstra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            waypoints: routeNodes.map(n => n.graphKey)
        })
    });

    const { path } = await response;

    const routePath = path.map(k => k.split(",").map(Number).reverse()); 

    if (drawnRouteLine) map.removeLayer(drawnRouteLine);
    drawnRouteLine = L.polyline(routePath, {
        color: "orange",
        weight: 5
    }).addTo(map);
}

async function displayExistingRoutes(routeNodes) {
    console.log(routeNodes)
    if (routeNodes.length < 2) return;

    const response = await apiFetch("/multipoint_dijkstra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            waypoints: routeNodes.map(node => `${node.longitude},${node.latitude}`)
        })
    });

    const { path } = await response;

    const routePath = path.map(k => k.split(",").map(Number).reverse()); 

    L.polyline(routePath, {
        color: "orange",
        weight: 5
    }).addTo(map);
}

function drawNode(node) {
    // TODO: Soon, color code the drawnNodes
    const colors = {
        start: "green",
        end: "red",
        turn: "blue"
    };

    L.circleMarker(
        [node.coordinates[1], node.coordinates[0]],
        {
            radius: 7,
            color: "green",
            fillColor: "green",
            fillOpacity: 1
        }
    ).addTo(map);
}




