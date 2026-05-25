
const jeeplinkSwal = Swal.mixin({
    background: "#ffffff",
    color: "black",
    confirmButtonColor: "#2f7a33",
    cancelButtonColor: "#dc3545",
    customClass: {
        popup: " shadow-lg swal-popup",
        title: "fw-bold"
    },
});

function showSuccess(message) {
    jeeplinkSwal.fire({
        icon: "success",
        title: "Success",
        text: message,
        timer: 2500,
        showConfirmButton: false,
    });
}

function showError(message) {
    jeeplinkSwal.fire({
        icon: "error",
        title: "Error",
        text: message,

        allowOutsideClick: false
    });
}

function confirmAction(message) {
    return jeeplinkSwal.fire({
        icon: "warning",
        title: "Are you sure?",
        text: message,

        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No",

        allowOutsideClick: false
    }).then(result => result.isConfirmed);
}

function showFareInfo() {
    return jeeplinkSwal.fire({
        title: "Fare Information",
        html: `
            <p class="text-md text-gray-700 leading-relaxed">
                Fare pricing is usually rounded up to the nearest whole number when traveling on jeepneys.
            </p>`,
        confirmButtonText: "Ok",
        allowOutsideClick: false
    }).then(result => result.isConfirmed);
}

function showFareBreakdown(rawRouteInformation) {
    const tableRows = Object.values(rawRouteInformation)
        .map(routeInfo => `
            <tr class="border-t">
                <td class="px-4 py-2">${routeInfo.routeInformation.title}</td>
                <td class="px-4 py-2">${routeInfo.routeInformation.routeDistance ?? "N/A"}</td>
                <td class="px-4 py-2">₱ ${routeInfo.routeInformation.routeCost.regular.traditional ?? "N/A"}</td>
            </tr>
        `)
        .join("");

    return jeeplinkSwal.fire({
        title: "Fare Breakdown",
        html: `
            <p class="text-sm text-gray-700 leading-relaxed mb-4">
                This route was selected because it has the lowest estimated total fare among the available routes. The cheapest route is calculated with the traditional jeepney's regular commuter fare in mind. Check out the total fare comparisons of the other generated routes below.
            </p>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-left">
                    <thead>
                        <tr class="border-b">
                            <th class="px-4 py-2">Route</th>
                            <th class="px-4 py-2">Total Distance</th>
                            <th class="px-4 py-2">Total Fare Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            `,
        confirmButtonText: "Ok",
        allowOutsideClick: false
    }).then(result => result.isConfirmed);
}

function showNavigationPopup(title, message) {
    return jeeplinkSwal.fire({
        title: title,
        html: message,
        confirmButtonText: "I understand",
        allowOutsideClick: false
    }).then(result => result.isConfirmed);
}

function showNotification({title = "", description = "", icon = "info"}) {
    return jeeplinkSwal.fire({
        toast: true,
        position: 'top',
        icon: icon,
        title: title,
        text: description ? description : null,
        showConfirmButton: false,
        timer: 5000,
        background: '#fff',
        color: '#000',
        timerProgressBar: true,
        customClass: {
            popup: "toast-navigation-notification-offset"
        }
    });
}
