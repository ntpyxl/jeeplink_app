import { apiFetch } from "./jeeplinkApiFetcher.js";

export class HazardRenderer {
    constructor({ map }) {
        this.map = map;

        this.hazards = null;
        this.markers = [];
        this.markerLayer = new L.LayerGroup().addTo(this.map);

        // Custom Icon for hazard terminal
        this.hazardIcon = L.icon({
            iconUrl: "../../images/jeep-terminal-pin.png",
            iconSize: [52, 52],
            iconAnchor: [26, 52],
            popupAnchor: [0, -30]
        });

        // Hover
        this.hazardIconHover = L.icon({
            iconUrl: "../../images/jeep-terminal-pin.png",
            iconSize: [60, 60], 
            iconAnchor: [30, 60],
            popupAnchor: [0, -30]
        });
    }

    async loadHazards() {
        const { hazards_data } = await apiFetch(`/getHazards`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        this.hazards = hazards_data || [];
    }

    async displayHazards({ exceptHazardId = null } = {}) {
        if (!this.hazards) {
            await this.loadHazards();
        }

        this.hazards.forEach((hazard) => {
            if(exceptHazardId === hazard.id) return;

            const marker = L.marker(
                [hazard.latitude, hazard.longitude],
                { icon: this.hazardIcon }
            ).addTo(this.markerLayer);

            marker.bindPopup(`
                <b>Road Hazard - Expect traffic!</b><br>
                <b>${hazard.hazard_name}</b><br>
                ID: ${hazard.id}
            `);

            marker.on("mouseover", () => {
                marker.setIcon(this.hazardIconHover);
            });

            marker.on("mouseout", () => {
                marker.setIcon(this.hazardIcon);
            });

            this.markers.push(marker);
        });
    }

    hide() {
        this.markerLayer.clearLayers();
        this.markers = [];
    }

    toggle() {
        if (this.markers.length > 0) {
            this.hide();
        } else {
            this.displayHazards();
        }
    }

    reload() {
        this.hide();
        this.hazards = null;
        this.displayHazards();
    }
}