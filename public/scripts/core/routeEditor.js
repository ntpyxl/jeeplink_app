import { apiFetch } from "../core/jeeplinkApiFetcher.js";
import { snapToRoad } from "../helper/snapToRoadFunction.js";

export class RouteEditor {
    constructor({ map, roadsGeoJSON, graphHelper }) {
        this.map = map;
        this.roadsGeoJSON = roadsGeoJSON;
        this.graphHelper = graphHelper;

        this.nodes = [];
        this.routeLine = null;
        
        this.nodeLayer = new L.LayerGroup().addTo(this.map);
    }

    addNode({ node, index = null, type = null }) {
        if (type === "start") {
            if (this.nodes[0]) {
                this.nodeLayer.removeLayer(this.nodes[0].layer);
                this.nodes[0] = node;
            } else {
                this.nodes.unshift(node);
            }
        } else if (type === "destination") {
            const lastIndex = this.nodes.length;
            if (this.nodes[lastIndex]) {
                this.nodeLayer.removeLayer(this.nodes[lastIndex].layer);
                this.nodes[lastIndex] = node;
            } else {
                this.nodes.push(node);
            }
        } else {
            if (index === null) {
                this.nodes.push(node);
            } else {
                this.nodes.splice(index, 0, node);
            }
        }

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
                weight: 2,
                pane: "nodePane"
            }
        ).addTo(this.nodeLayer);

        node.layer = marker;
        this.addNodeInteractability(node, marker, this.map);
    }

    async drawRoute() {
        if (this.nodes.length < 2) return;

        // Collect definitions for any "temporary" nodes (clicked points in middle of roads)
        const tempNodeDefinitions = this.nodes.map(node => ({
            id: node.graphKey,
            neighbors: this.graphHelper.graph.get(node.graphKey) || [] // This includes the distances to segment A and segment B
        }));
        
        const response = await apiFetch("/calculateRoute_Unweighted", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nodes: [this.nodes.map(n => n.graphKey)],
                tempNodes: tempNodeDefinitions
            })
        });

        const { paths } = await response;
        const routePath = paths[0].map(k => k.split(",").map(Number).reverse());

        if (this.routeLine) this.map.removeLayer(this.routeLine);
        this.routeLine = L.polyline(routePath, {
            color: "orange",
            weight: 5,
            pane: "routePane"
        }).addTo(this.map);

        this.addRouteInteractability(this.routeLine);
    }

    removeNode(nodeId) {
        const index = this.nodes.findIndex(n => n.id === nodeId);
        if (index === -1) return;

        const node = this.nodes[index];

        if (node.layer) {
            this.nodeLayer.removeLayer(node.layer);
        }

        this.nodes.splice(index, 1);
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

    addNodeInteractability(node, marker, map) {
        let dragging = false;

        marker.on("mousedown", () => {
            dragging = true;
            this.map.dragging.disable();
        });

        map.on("mousemove", (e) => {
            if (!dragging) return;

            const snapped = snapToRoad(e.latlng, this.roadsGeoJSON);
            if (!snapped) return;

            const graphNodeKey = this.graphHelper.insertTemporaryNode(
                snapped.coordinates,
                snapped.segmentA,
                snapped.segmentB
            );    

            node.coordinates = snapped.coordinates;
            node.graphKey = graphNodeKey;

            marker.setLatLng([snapped.coordinates[1], snapped.coordinates[0]]);
        });

        map.on("mouseup", async () => {
            if (!dragging) return;

            dragging = false;
            map.dragging.enable();

            await this.drawRoute();
        });

        marker.on("mouseover", () => {
            marker.setStyle({
                radius: 8,
                color: "green",
                fillColor: "yellow"
            });
        });

        marker.on("mouseout", () => {
            marker.setStyle({
                radius: 6,
                color: "green",
                fillColor: "orange",
            });
        });

        marker.on("contextmenu", async () => {
            this.removeNode(node.id);
            await this.drawRoute();
        });
    }

    addRouteInteractability(routeLine) {
        routeLine.on("click", (e) => {
            if (this.nodes.length < 2) return;

            const clicked = turf.point([e.latlng.lng, e.latlng.lat]);

            let nearestNodeIndex = null;
            let minDist = Infinity;

            for (let i = 0; i < this.nodes.length - 1; i++) {

                const a = this.nodes[i].coordinates;
                const b = this.nodes[i + 1].coordinates;

                const line = turf.lineString([a, b]);

                const snap = turf.nearestPointOnLine(line, clicked);
                const dist = snap.properties.dist;

                if (dist < minDist) {
                    minDist = dist;
                    nearestNodeIndex = i + 1;
                }
            }

            if (nearestNodeIndex === null) return;

            const snapped = snapToRoad(e.latlng, this.roadsGeoJSON);
            if (!snapped) return;

            const graphNodeKey = this.graphHelper.insertTemporaryNode(
                snapped.coordinates,
                snapped.segmentA,
                snapped.segmentB
            );  

            const node = {
                id: crypto.randomUUID(),
                coordinates: snapped.coordinates,
                graphKey: graphNodeKey
            };

            this.addNode({node: node, index: nearestNodeIndex});
            this.drawRoute();
        })
    }
}