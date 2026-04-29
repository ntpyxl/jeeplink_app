export function watchUserPosition(onUpdate, onError) {
    if (!navigator.geolocation) {
        showError("Geolocation not supported.");
        return;
    }

    const watchId = navigator.geolocation.watchPosition(
        pos => {
            onUpdate({
                coords: [pos.coords.longitude, pos.coords.latitude]
            });
        },
        err => {
            console.error(err);
            
            if (err.code === 1)
                showError("Location permission denied. Double check your browser's location settings.");
            else if (err.code === 2)
                showError("Location unavailable. GPS signal may be weak.");
            else if (err.code === 3)
                showError("Location request timed out. Please try again.");
            else
                showError("Failed to get location. Unknown specific error.");

            reject(err);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 5000
        }
    );

    return watchId;
}

export function simulateUserPosition(map, onUpdate, onError) {
    if (!map) {
        if (onError) onError(new Error("Map instance is required"));
        return;
    }

    const handler = (e) => {
        onUpdate({
            coords: [e.latlng.lng, e.latlng.lat]
        });
    };

    map.on("mousemove", handler);

    // return "watchId" as cleanup function
    return () => {
        map.off("mousemove", handler);
    };
}