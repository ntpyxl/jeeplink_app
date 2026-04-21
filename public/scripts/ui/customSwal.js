
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