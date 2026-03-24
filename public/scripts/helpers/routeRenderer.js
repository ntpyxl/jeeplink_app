import { apiFetch } from "../jeeplinkApiFetcher.js";

export class RouteRenderer {
    constructor(map) {
        this.map = map;
        this.routes = null;
        this.routeLines = [];
        this.calculatedRoutes = null;
    }

    async loadRoutes() {
        const queryData = await apiFetch("/getJeepRoutesWithNodes", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
        this.routes = queryData.queryData.map(route =>
            route.nodes.map(node => `${node.longitude},${node.latitude}`)
        );
    }

    async display() {
        if (!this.calculatedRoutes) {
            if (!this.routes) await this.loadRoutes();
            this.calculatedRoutes = await apiFetch("/calculateRoute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    algorithm: "dijkstra",
                    routes: this.routes
                })
            });
        }

        this.calculatedRoutes.paths.forEach(path => {
            const routePath = path.map(k => k.split(",").map(Number).reverse());

            const line = L.polyline(routePath, {
                color: "orange",
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