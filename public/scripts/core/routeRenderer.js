import { apiFetch } from "../core/jeeplinkApiFetcher.js";

export class RouteRenderer {
    constructor({ map, snapToRoad, graphHelper }) {
        this.map = map;
        this.snapToRoad = snapToRoad;
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
                const snapped = this.snapToRoad({
                    lat: node.latitude,
                    lng: node.longitude
                });

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
            this.calculatedRoutes = await apiFetch("/calculateRoute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    algorithm: "dijkstra",
                    nodes: this.routes,
                    tempNodes: this.tempNodes
                })
            });
        }

        this.calculatedRoutes.paths.forEach(path => {
            const routePath = path.map(edge => edge.to.split(",").map(Number).reverse());

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