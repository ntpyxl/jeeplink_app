const map = L.map("map").setView([14.3272, 120.9404], 15); // Manila example

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
}).addTo(map);

const roadsGeoJSON = await fetch("./exampleDasmaRoadData.json").then(r => r.json());
roadsGeoJSON.features.forEach((feature, index) => {
    feature.properties.id = `road-${index}`;
});

const roadsLayer = L.geoJSON(roadsGeoJSON, {
    style: { color: "#555", weight: map.getZoom()/3 }
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
    $("#cursor_last_click_pos_text").text(`(${e.latlng.lat}, ${e.latlng.lng})`);
    const snapped = snapToRoad(e.latlng);
    if (!snapped) return;

    const node = {
        id: crypto.randomUUID(),
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
            color: "green",
            fillColor: "green",
            fillOpacity: 1
        }
    ).addTo(map);
}

function drawRoute() {
  if (routeLine) map.removeLayer(routeLine);
  if (nodes.length < 2) return;

  const latlngs = nodes.map(n => [
    n.coordinates[1], // lat
    n.coordinates[0]  // lng
  ]);

  routeLine = L.polyline(latlngs, {
    color: "orange",
    weight: 5
  }).addTo(map);
}

map.on("mousemove", e => {
    $("#cursor_pos_text").text(`(${e.latlng.lat}, ${e.latlng.lng})`);
})