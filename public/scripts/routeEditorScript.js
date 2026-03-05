import { buildGraph } from "./graphBuilder.js";
import { dijkstra } from "./pathingAlgorithm.js";

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

map.on("zoomend", () => {
    const zoom = map.getZoom();
    let weight;

    if (zoom <= 13) weight = 1;
    else if (zoom <= 15) weight = 2;
    else if (zoom <= 17) weight = 3;
    else weight = 4;

    roadsLayer.setStyle({ weight });
});

let nodes = [];
let routeLine = null;
const graph = buildGraph(roadsGeoJSON, false);
// NOTE: graph.get(key) => [{ to, weight, coords }]

function snapToRoad(latlng) {
    const clicked = turf.point([latlng.lng, latlng.lat]);

    let closestRoad = null;
    let minDist = Infinity;

    roadsGeoJSON.features.forEach(road => {
        const dist = turf.pointToLineDistance(clicked, road, { units: "meters" });
        if (dist < minDist) {
            minDist = dist;
            closestRoad = road;
        }
    });

    if (!closestRoad) return null;

    const snapped = turf.nearestPointOnLine(closestRoad, clicked);

    return {
        point: snapped, // Turf point (important)
        coordinates: snapped.geometry.coordinates,
        roadId: closestRoad.properties.id
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

// TODO: Routes are not fully connected to nodes sometimes.
async function drawRoute() {
    if (nodes.length < 2) return;

    const response = await fetch("http://127.0.0.1:8000/multipoint_dijkstra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            waypoints: nodes.map(n => n.graphKey),
            graph: Object.fromEntries(graph)
        })
    });

    const { path } = await response.json();

    const routePath = path.map(k => k.split(",").map(Number).reverse()); 

    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline(routePath, {
        color: "orange",
        weight: 5
    }).addTo(map);
}

function drawNode(node) {
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




roadsLayer.on("click", async e => {
    $("#cursor_last_click_pos_text").text(`(${e.latlng.lat}, ${e.latlng.lng})`);

    const snapped = snapToRoad(e.latlng);
    if (!snapped) return;

    const graphNodeKey = snapToGraphNode(snapped.coordinates);

    const node = {
        id: crypto.randomUUID(),
        coordinates: snapped.coordinates,
        roadId: snapped.roadId,
        graphKey: graphNodeKey
    };

    nodes.push(node);

    drawNode(node);
    await drawRoute();
});


map.on("mousemove", e => {
    $("#cursor_pos_text").text(`(${e.latlng.lat}, ${e.latlng.lng})`);
})