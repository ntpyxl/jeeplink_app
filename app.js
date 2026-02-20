import { buildGraph } from "./graphBuilder.js";

const map = L.map("map").setView([14.3272, 120.9404], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
}).addTo(map);


const roadsGeoJSON = await fetch("./dasmarinas-260216_roads_v2.geojson").then(r => r.json());
roadsGeoJSON.features.forEach((feature, index) => {
    feature.properties.id = `road-${index}`;
});

// NOTE: Debug Code
function countGeometryType(geojsondata){
    const counts = {};

    geojsondata.features.forEach(feature => {
        if (feature.geometry && feature.geometry.type) {
                const type = feature.geometry.type;

                if (counts[type]) {
                    counts[type]++;
                } else {
                    counts[type] = 1;
                }
            }
    });

    return counts
}

console.log(countGeometryType(roadsGeoJSON));
// NOTE: End of Debug Code

const roadsLayer = L.geoJSON(roadsGeoJSON, {
    filter: function(feature) {
        return feature.geometry && feature.geometry.type === "LineString";
    },
    style: {
        color: "#555",
        opacity: 1,
        weight: map.getZoom()/3
    }
}).addTo(map);

let nodes = [];
let routeLine = null;
const graph = buildGraph(roadsGeoJSON);
// NOTE: graph.get(key) => [{ to, weight, coords }]
//console.log(graph);

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

function drawRoute() {
    if (routeLine) map.removeLayer(routeLine);
    if (nodes.length < 2) return;

    let fullPath = [];

    for (let i = 0; i < nodes.length - 1; i++) {
        const start = nodes[i].graphKey;
        const end = nodes[i + 1].graphKey;

        const pathKeys = dijkstra(start, end);

        const coords = pathKeys.map(k => {
            const [lng, lat] = k.split(",").map(Number);
            return [lat, lng];
        });

        if (i > 0) coords.shift(); // avoid duplicates
        fullPath.push(...coords);
    }

    routeLine = L.polyline(fullPath, {
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

function dijkstra(startKey, endKey) {
    const distances = new Map();
    const previous = new Map();
    const queue = new Set(graph.keys());

    for (const key of queue) distances.set(key, Infinity);
    distances.set(startKey, 0);

    while (queue.size) {
        let current = null;

        for (const k of queue) {
            if (current === null || distances.get(k) < distances.get(current)) {
                current = k;
            }
        }

        if (current === endKey) break;

        queue.delete(current);

        for (const edge of graph.get(current)) {
        const alt = distances.get(current) + edge.weight;
            if (alt < distances.get(edge.to)) {
                distances.set(edge.to, alt);
                previous.set(edge.to, current);
            }
        }
    }

    // Reconstruct path
    const path = [];
    let cur = endKey;

    while (cur) {
        path.unshift(cur);
        cur = previous.get(cur);
    }

    return path;
}

/*
map.on("click", e => {
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
    drawRoute();

    console.log(nodes);
    console.log(routeLine);
});
*/

map.on("mousemove", e => {
    $("#cursor_pos_text").text(`(${e.latlng.lat}, ${e.latlng.lng})`);
})