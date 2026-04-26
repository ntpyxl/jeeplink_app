
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
