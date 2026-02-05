const map = L.map("map").setView([14.3272, 120.9404], 15); // Manila example

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
}).addTo(map);

const roadsGeoJSON = {
    type: "FeatureCollection",
    features: [
    {
        type: "Feature",
        properties: { id: "road-1" },
        geometry: {
            type: "LineString",
            coordinates: [
                [120.9395, 14.3294],
                [120.9354, 14.3272],
                [120.9366, 14.3252]
            ]
        }
    }
  ]
};

const roadsLayer = L.geoJSON(roadsGeoJSON, {
    style: { color: "#555", weight: 4 }
}).addTo(map);

let nodes = [];
let routeLine = null;

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

map.on("click", e => {
    console.log(e.latlng);
    const snapped = snapToRoad(e.latlng);
    if (!snapped) return;

    const type =
        nodes.length === 0 ? "start" :
        nodes.length === 1 ? "end" :
        "turn";

    const node = {
        id: crypto.randomUUID(),
        type,
        coordinates: snapped.coordinates,
        roadId: snapped.roadId
    };

    nodes.push(node);

    drawNode(node);
    drawRoute();
});

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
            color: colors[node.type],
            fillColor: colors[node.type],
            fillOpacity: 1
        }
    ).addTo(map);
}

function drawRoute() {
    if (routeLine) {
        map.removeLayer(routeLine);
    }

    if (nodes.length < 2) return;

    const coords = nodes.map(n => n.coordinates);

    routeLine = L.polyline(
        coords.map(c => [c[1], c[0]]),
        { color: "orange", weight: 5 }
    ).addTo(map);
}