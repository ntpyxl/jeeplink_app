$(document).ready(function () {
    // Nav bar
    $("#menuBtn").on("click", function () {
        $("#mobileMenu").toggleClass("max-h-0 max-h-96");
    });

    // map.html
    // Toggle when clicked
    $("#toggleCommute").click(function () {
        $("#commuteContent").stop().slideToggle(250);
        $("#arrow").toggleClass("rotate-180");
    });

    // Initially hide content on mobile
    if (window.innerWidth < 768) {
        $("#commuteContent").hide();   
        $("#arrow").addClass("rotate-180"); 
    } 

    // Terms & Privacy
    const accepted = localStorage.getItem("jeepLink_termsAccepted");

    // Show modal if not accepted
    if (!accepted) {
        $("#termsModal").removeClass("hidden");
    }

    // Accept button click
    $("#acceptTermsBtn").on("click", function () {
        localStorage.setItem("jeepLink_termsAccepted", "true");
        $("#termsModal").fadeOut(200);
    });

});