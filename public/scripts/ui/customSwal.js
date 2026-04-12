const jeeplinkSwal = Swal.mixin({
  background: "#ffffff",
  color: "black",
  confirmButtonColor: "#2f7a33",
  customClass: {
    popup: " shadow-lg rounded-3",
    title: "fw-bold",
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
  });
}