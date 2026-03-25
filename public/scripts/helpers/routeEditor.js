import { apiFetch } from "../jeeplinkApiFetcher.js";

export class RouteEditor {
    constructor(map) {
        this.map = map;
        this.nodes = [];
        this.markers = [];
        this.routeLine = null;
    }

    addNode(node) {
        this.nodes.push(node);
        this.drawNode(node);
    }

    drawNode(node) {
        // TODO: Soon, color code the drawnNodes
        const colors = {
            start: "green",
            end: "red",
            turn: "blue"
        };

        const marker = L.circleMarker(
            [node.coordinates[1], node.coordinates[0]],
            {
                radius: 5,
                color: "green",
                fillColor: "orange",
                fillOpacity: 1
            }
        ).addTo(this.map);

        this.markers.push(marker);
    }

    async drawRoute() {
        if (this.nodes.length < 2) return;

        const response = await apiFetch("/calculateRoute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                algorithm: "dijkstra",
                routes: [this.nodes.map(n => n.graphKey)]
            })
        });

        const { paths } = await response;

        const routePath = paths[0].map(k => k.split(",").map(Number).reverse());

        // Remove previous line if exists
        if (this.routeLine) this.map.removeLayer(this.routeLine);

        this.routeLine = L.polyline(routePath, {
            color: "orange",
            weight: 5
        }).addTo(this.map);
    }

    clear() {
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
        this.nodes = [];

        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
            this.routeLine = null;
        }
    }

    getStartNode() {
        return this.nodes[0] ?? null;
    }

    getEndNode() {
        return this.nodes[this.nodes.length - 1] ?? null;
    }

    getNodes() {
        return this.nodes;
    }
}