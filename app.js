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
  if (routeLine) map.removeLayer(routeLine);
  if (nodes.length < 2) return;

  let routeCoords = [];

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];

    // Slice along the road where the first node exists
    const road = roadsGeoJSON.features.find(r => r.properties.id === a.roadId);

    let segmentCoords;

    if (road) {
      // Slice along road if possible
      const start = turf.point(a.coordinates);
      const end = turf.point(b.coordinates);

      try {
        const sliced = turf.lineSlice(start, end, road);
        segmentCoords = sliced.geometry.coordinates;

        // Avoid duplicate points when concatenating
        if (i > 0) segmentCoords.shift();
      } catch (err) {
        // Fallback if slice fails
        segmentCoords = [a.coordinates, b.coordinates];
      }
    } else {
      // Fallback to straight line
      segmentCoords = [a.coordinates, b.coordinates];
    }

    routeCoords.push(...segmentCoords);
  }

  routeLine = L.polyline(
    routeCoords.map(c => [c[1], c[0]]),
    { color: "orange", weight: 5 }
  ).addTo(map);
}

map.on("mousemove", e => {
    $("#cursor_pos_text").text(`(${e.latlng.lat}, ${e.latlng.lng})`);
})