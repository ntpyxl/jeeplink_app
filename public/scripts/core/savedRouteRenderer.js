import { apiFetch } from "./jeeplinkApiFetcher.js";

export class SavedRouteRenderer {
    constructor({ map }) {
        this.map = map;

        this.routeLines = [];
        this.calculatedRoutes = null;
        this.isLoading = false;
    }

    async display() {
        if (this.isLoading) return;
        this.isLoading = true;
        $("#toggleJeepRoutes_loadingSpinner").removeClass("hidden");

        try {
            if (!this.calculatedRoutes) {
                this.calculatedRoutes = await apiFetch("/getSavedRouteRendered", {
                    method: "GET",
                    headers: {"Content-Type": "application/json"}
                });
            }

            const paths = this.calculatedRoutes.paths;

            for (const path of paths) {
                const routePath = path.map(k => k.split(",").map(Number).reverse());

                const line = L.polyline(routePath, {
                    color: "blue",
                    weight: 5
                }).addTo(this.map);

                this.routeLines.push(line);
            }

        } finally {
            this.isLoading = false;
            $("#toggleJeepRoutes_loadingSpinner").addClass("hidden");
        }
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