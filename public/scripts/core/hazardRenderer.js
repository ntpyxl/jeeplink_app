import { apiFetch } from "./jeeplinkApiFetcher.js";

export class HazardRenderer {
    constructor({ map, refreshInterval = 15000 }) {
        this.map = map;

        this.hazards = [];
        this.markers = new Map(); // hazardId -> marker
        this.markerLayer = new L.LayerGroup().addTo(this.map);

        this.refreshInterval = refreshInterval;
        this.refreshTimer = null;

        // Custom Icon for hazard terminal
        this.hazardIcon = L.icon({
            iconUrl: "../../images/road-hazard.png",
            iconSize: [52, 52],
            iconAnchor: [26, 52],
            popupAnchor: [0, -30]
        });

        // Hover
        this.hazardIconHover = L.icon({
            iconUrl: "../../images/road-hazard.png",
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

        return hazards_data || [];
    }

    createMarker(hazard) {
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

        this.markers.set(hazard.id, marker);
    }

    removeMarker(hazardId) {
        const marker = this.markers.get(hazardId);

        if (!marker) return;
        this.markerLayer.removeLayer(marker);
        this.markers.delete(hazardId);
    }

    async displayHazards({ exceptHazardId = null } = {}) {
        const latestHazards = await this.loadHazards();

        // Convert to maps for comparison
        const latestMap = new Map();
        latestHazards.forEach(h => latestMap.set(h.id, h));

        const currentMap = new Map();
        this.hazards.forEach(h => currentMap.set(h.id, h));

        let hasChanges = false;

        // Add new hazards
        latestHazards.forEach((hazard) => {
            if (exceptHazardId === hazard.id) return;

            if (!currentMap.has(hazard.id)) {
                this.createMarker(hazard);
                hasChanges = true;
            }
        });

        // Remove deleted hazards
        this.hazards.forEach((hazard) => {
            if (!latestMap.has(hazard.id)) {
                this.removeMarker(hazard.id);
                hasChanges = true;
            }
        });

        this.hazards = latestHazards;
    }

    startAutoRefresh(options = {}) {
        // Prevent duplicate intervals
        this.stopAutoRefresh();

        // Initial render
        this.displayHazards(options);

        this.refreshTimer = setInterval(() => {
            this.displayHazards(options);
        }, this.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    hide() {
        this.stopAutoRefresh();
        this.markerLayer.clearLayers();
        this.markers.clear();
    }

    toggle() {
        if (this.markers.size > 0) {
            this.hide();
        } else {
            this.startAutoRefresh();
        }
    }

    reload() {
        this.hide();
        this.hazards = [];
        this.startAutoRefresh();
    }
}