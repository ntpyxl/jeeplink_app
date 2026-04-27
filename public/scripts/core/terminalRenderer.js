import { apiFetch } from "./jeeplinkApiFetcher.js";

export class TerminalRenderer {
    constructor({ map }) {
        this.map = map;

        this.terminals = null;
        this.markers = [];
        this.markerLayer = new L.LayerGroup().addTo(this.map);
    }

    async loadTerminals() {
        const { terminals_data } = await apiFetch(`/getTerminals`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        this.terminals = terminals_data || [];
    }

    async displayTerminals({ exceptTerminalId = null } = {}) {
        if (!this.terminals) {
            await this.loadTerminals();
        }

        this.terminals.forEach((terminal) => {
            if(exceptTerminalId === terminal.id) return;
            const marker = L.circleMarker(
                [terminal.latitude, terminal.longitude],
                {
                    radius: 6,
                    color: "#0000FF",
                    fillColor: "#babaff",
                    fillOpacity: 1,
                    weight: 2
                }
            ).addTo(this.markerLayer);

            marker.bindPopup(`
                ID: ${terminal.id}<br>
                <b>${terminal.terminal_name}</b>
            `);

            marker.on("mouseover", () => {
                marker.setStyle({
                    radius: 8,
                    color: "#0000FF",
                    fillColor: "#babaff",
                });
            });

            marker.on("mouseout", () => {
                marker.setStyle({
                    radius: 6,
                    color: "#0000FF",
                    fillColor: "#babaff",
                });
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
            this.displayTerminals();
        }
    }

    reload() {
        this.hide();
        this.terminals = null;
        this.displayTerminals();
    }
}