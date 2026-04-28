import { apiFetch } from "./jeeplinkApiFetcher.js";

export class TerminalRenderer {
    constructor({ map }) {
        this.map = map;

        this.terminals = null;
        this.markers = [];
        this.markerLayer = new L.LayerGroup().addTo(this.map);

        // Custom Icon for jeepney terminal
        this.jeepneyIcon = L.icon({
            iconUrl: "../../images/jeep-terminal-pin.png",
            iconSize: [52, 52],
            iconAnchor: [26, 52],
            popupAnchor: [0, -30]
        });

        // Hover
        this.jeepneyIconHover = L.icon({
            iconUrl: "../../images/jeep-terminal-pin.png",
            iconSize: [60, 60], 
            iconAnchor: [30, 60],
            popupAnchor: [0, -30]
        });
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
            // const marker = L.circleMarker(
            //     [terminal.latitude, terminal.longitude],
            //     {
            //         radius: 6,
            //         color: "#0000FF",
            //         fillColor: "#babaff",
            //         fillOpacity: 1,
            //         weight: 2
            //     }
            // ).addTo(this.markerLayer);

            const marker = L.marker(
                [terminal.latitude, terminal.longitude],
                { icon: this.jeepneyIcon }
            ).addTo(this.markerLayer);

            marker.bindPopup(`
                ID: ${terminal.id}<br>
                <b>${terminal.terminal_name}</b>
            `);

            marker.on("mouseover", () => {
                marker.setIcon(this.jeepneyIconHover);
            });

            marker.on("mouseout", () => {
                marker.setIcon(this.jeepneyIcon);
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