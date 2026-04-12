import { apiFetch } from "./jeeplinkApiFetcher.js";
import { snapToRoad } from "../helper/snapToRoadFunction.js";

export class SavedRouteRenderer {
    constructor({ map, roadsGeoJSON, graphHelper }) {
        this.map = map;
        this.roadsGeoJSON = roadsGeoJSON;
        this.graphHelper = graphHelper;

        this.routes = null;
        this.routeLines = [];
        this.calculatedRoutes = null;
    }

    async loadRoutes() {
        const queryData = await apiFetch("/getJeepRoutesWithNodes", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

        this.routes = [];
        this.tempNodes = [];

        queryData.queryData.forEach(route => {
            const routeGraphKeys = [];

            route.nodes.forEach(node => {
                const snapped = snapToRoad({lat: node.latitude, lng: node.longitude}, this.roadsGeoJSON);

                if (!snapped) return;
                const graphKey = this.graphHelper.insertTemporaryNode(
                    snapped.coordinates,
                    snapped.segmentA,
                    snapped.segmentB
                );

                routeGraphKeys.push(graphKey);
                this.tempNodes.push({
                    id: graphKey,
                    neighbors: this.graphHelper.graph.get(graphKey) || []
                });
            });
            
            this.routes.push(routeGraphKeys);
        });
    }

    async display() {
        if (!this.calculatedRoutes) {
            if (!this.routes) await this.loadRoutes();
            this.calculatedRoutes = await apiFetch("/calculateRoute_Unweighted", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    algorithm: "a_star",
                    nodes: this.routes,
                    tempNodes: this.tempNodes
                })
            });
        }

        this.calculatedRoutes.paths.forEach(path => {
            const routePath = path.map(k => k.split(",").map(Number).reverse());

            const line = L.polyline(routePath, {
                color: "blue",
                weight: 5
            }).addTo(this.map);

            this.routeLines.push(line);
        });
    }

    hide() {
        this.routeLines.forEach(line => this.map.removeLayer(line));
        this.routeLines = [];
    }

    toggle() {
        if (this.routeLines.length > 0) {
            this.hide();
        } else {
            this.display();
        }
    }
}