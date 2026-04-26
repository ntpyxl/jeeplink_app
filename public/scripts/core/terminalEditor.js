export class TerminalEditor {
    constructor({ map }) {
        this.map = map;

        this.node = null;
        this.nodeLayer = new L.LayerGroup().addTo(this.map);

        this.enablePlacement();
    }

    enablePlacement() {
        this.map.on("click", (e) => {
            const { lat, lng } = e.latlng;

            if (!this.node) {
                this.createNode(lat, lng);
            } else {
                this.node.coordinates = [lng, lat];
                this.node.layer.setLatLng([lat, lng]);
            }
        });
    }

    createNode(lat, lng) {
        const marker = L.circleMarker([lat, lng], {
            radius: 6,
            color: "green",
            fillColor: "orange",
            fillOpacity: 1,
            weight: 2
        }).addTo(this.nodeLayer);

        this.node = {
            id: crypto.randomUUID(),
            coordinates: [lng, lat],
            layer: marker
        };

        this.addNodeInteractability(this.node, marker);
    }

    addNodeInteractability(node, marker) {
        let dragging = false;

        marker.on("mousedown", () => {
            dragging = true;
            this.map.dragging.disable();
        });

        this.map.on("mousemove", (e) => {
            if (!dragging) return;

            const { lat, lng } = e.latlng;

            node.coordinates = [lng, lat];
            marker.setLatLng([lat, lng]);
        });

        this.map.on("mouseup", () => {
            if (!dragging) return;

            dragging = false;
            this.map.dragging.enable();
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
                fillColor: "orange"
            });
        });

        marker.on("contextmenu", () => {
            this.clear();
        });
    }

    getNode() {
        return this.node;
    }

    clear() {
        this.nodeLayer.clearLayers();
        this.node = null;
    }
}