import { apiFetch } from "../jeeplinkApiFetcher.js";

export class RouteEditor {
    constructor(map, snapToRoad, graphHelper) {
        this.map = map;
        this.snapToRoad = snapToRoad;
        this.graphHelper = graphHelper;

        this.nodes = [];
        this.routeLine = null;
        
        this.nodeLayer = new L.LayerGroup().addTo(this.map);
    }

    addNode(node) {
        this.nodes.push(node);
        this.drawNode(node);
    }

    drawNode(node) {
        const marker = L.circleMarker(
            [node.coordinates[1], node.coordinates[0]],
            {
                radius: 6,
                color: "green",
                fillColor: "orange",
                fillOpacity: 1,
                weight: 2
            }
        ).addTo(this.nodeLayer);

        node.layer = marker;

        let dragging = false;

        marker.on("mousedown", () => {
            dragging = true;
            this.map.dragging.disable();
        });

        this.map.on("mousemove", (e) => {
            if (!dragging) return;

            const snapped = this.snapToRoad(e.latlng);
            if (!snapped) return;

            const graphNodeKey = this.graphHelper.snapToGraphNode(snapped.coordinates);

            node.coordinates = snapped.coordinates;
            node.graphKey = graphNodeKey;

            marker.setLatLng([
                snapped.coordinates[1],
                snapped.coordinates[0]
            ]);
        });

        this.map.on("mouseup", async () => {
            if (!dragging) return;

            dragging = false;
            this.map.dragging.enable();

            await this.drawRoute();
        });
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

        if (this.routeLine) this.map.removeLayer(this.routeLine);

        this.routeLine = L.polyline(routePath, {
            color: "orange",
            weight: 5
        }).addTo(this.map);
    }

    clear() {
        this.nodeLayer.clearLayers();
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