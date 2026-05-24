import { apiFetch } from "./jeeplinkApiFetcher.js";

export class ClosureRenderer {
    constructor({ map, refreshInterval = 15000 }) {
        this.map = map;

        this.closure = [];
        this.markers = new Map(); // closureId -> marker
        this.markerLayer = new L.LayerGroup().addTo(this.map);

        this.refreshInterval = refreshInterval;
        this.refreshTimer = null;
        this.isStillRefreshing = false;

        // Custom Icon for closure terminal
        this.closureIcon = L.icon({
            iconUrl: "../../images/road-closure.png",
            iconSize: [52, 52],
            iconAnchor: [26, 52],
            popupAnchor: [0, -30]
        });

        // Hover
        this.closureIconHover = L.icon({
            iconUrl: "../../images/road-closure.png",
            iconSize: [60, 60], 
            iconAnchor: [30, 60],
            popupAnchor: [0, -30]
        });
    }

    async loadClosures() {
        const { closures_data } = await apiFetch(`/getClosures`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        return closures_data || [];
    }

    createMarker(closure) {
        const marker = L.marker(
            [closure.latitude, closure.longitude],
            { icon: this.closureIcon }
        ).addTo(this.markerLayer);

        marker.bindPopup(`
            <b>Road Closure - Expect traffic and reroute!</b><br>
            <b>${closure.closure_name}</b><br>
            ID: ${closure.id}
        `);

        marker.on("mouseover", () => {
            marker.setIcon(this.closureIconHover);
        });

        marker.on("mouseout", () => {
            marker.setIcon(this.closureIcon);
        });

        this.markers.set(closure.id, marker);
    }

    removeMarker(closureId) {
        const marker = this.markers.get(closureId);

        if (!marker) return;
        this.markerLayer.removeLayer(marker);
        this.markers.delete(closureId);
    }

    async displayClosures({ exceptHazardId = null } = {}) {
        if(this.isStillRefreshing) return;
        this.isStillRefreshing = true;

        try {
            const latestClosures = await this.loadClosures();

            // Convert to maps for comparison
            const latestMap = new Map();
            latestClosures.forEach(h => latestMap.set(h.id, h));

            const currentMap = new Map();
            this.closure.forEach(h => currentMap.set(h.id, h));

            const renderedIds = new Set(this.markers.keys());

            // Add new closure
            latestClosures.forEach((closure) => {
                if (exceptHazardId === closure.id) return;
                if (closure.times_reported < 3) return;

                if (!renderedIds.has(closure.id)) {
                    this.createMarker(closure);
                }
            });

            // Remove deleted closure
            this.closure.forEach((closure) => {
                if (!latestMap.has(closure.id)) {
                    this.removeMarker(closure.id);
                    hasChanges = true;
                }
            });

            this.closure = latestClosures;
        } finally {
            this.isStillRefreshing = false;
        }
    }

    startAutoRefresh(options = {}) {
        // Prevent duplicate intervals
        this.stopAutoRefresh();

        // Initial render
        this.displayClosures(options);

        this.refreshTimer = setInterval(() => {
            this.displayClosures(options);
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
        this.closure = [];
        this.startAutoRefresh();
    }
}