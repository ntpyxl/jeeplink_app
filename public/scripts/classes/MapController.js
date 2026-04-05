import { GraphHelper } from "./graphHelper.js";
import { RouteEditor } from "./routeEditor.js";
import { RouteRenderer } from "./routeRenderer.js";

export class MapController {
    constructor(options) {
        const { 
            containerId, 
            roadsGeoJSON, 
            enableRouteEditing = false, 
            enableCommuterMode = false 
        } = options;

        this.map = L.map(containerId, {
            renderer: L.canvas(),
            minZoom: 12,
            maxZoom: 18,
            zoomControl: true
        }).setView([14.3272, 120.9404], 15);

        L.control.zoom({ position: "bottomright" }).addTo(this.map);

        this.roadsLayer = L.geoJSON(this.roadsGeoJSON, {
            filter: feature => feature.geometry.type === "LineString",
            style: { color: "#555", weight: 2, opacity: 1 }
        }).addTo(this.map);

        this.map.createPane("routePane");
        this.map.createPane("nodePane");
        this.map.getPane("routePane").style.zIndex = 400;
        this.map.getPane("nodePane").style.zIndex = 500;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: 'Map data from <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap and its contributors</a>'
        }).addTo(this.map);

        this.roadsGeoJSON = roadsGeoJSON;
        this.graphHelper = new GraphHelper(roadsGeoJSON);
        this.routeRenderer = new RouteRenderer(this.map);

        if (enableRouteEditing) {
            this.routeEditor = new RouteEditor(this.map, this.snapToRoad.bind(this), this.graphHelper);
            this.enableRouteEditing();
        }

        if (enableCommuterMode) {
            this.routeGenerated = new RouteEditor(this.map, this.snapToRoad.bind(this), this.graphHelper);
            // Possibly add commuter-specific features like markers, starting points, etc.
        }

        this.addZoomHandler();
    }

    addZoomHandler() {
        this.map.on("zoomend", () => {
            const zoom = this.map.getZoom();
            let weight = 2;
            if (zoom <= 13) weight = 1;
            else if (zoom <= 15) weight = 2;
            else if (zoom <= 17) weight = 3;
            else weight = 4;

            this.roadsLayer.setStyle({ weight });
        });
    }

    snapToRoad(latlng) {
        const clicked = turf.point([latlng.lng, latlng.lat]);
        let closestRoad = null;
        let closestSnap = null;
        let minDist = Infinity;

        this.roadsGeoJSON.features.forEach(road => {
            const snap = turf.nearestPointOnLine(road, clicked);
            if (snap.properties.dist < minDist) {
                minDist = snap.properties.dist;
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

    enableRouteEditing() {
        this.roadsLayer.on("click", async (e) => {
            if (!this.routeEditor) return;

            const snapped = this.snapToRoad(e.latlng);
            if (!snapped) return;

            // TODO: Consider double checking graphKey and coordinates var, both are coordinates but are somewhat different (with coords being more accurate vs graphKey).
            const graphNodeKey = this.graphHelper.snapToGraphNode(snapped.coordinates);
            
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

            this.routeEditor.addNode(node);
            await this.routeEditor.drawRoute();
        });
    }
}