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

    // Route Panel 
    let currentRoute = 0;

    const $slider = $("#routeSlider");
    const $routes = $(".route-details");
    const totalRoutes = $routes.length;

    function updateSlider() {
        $slider.css("transform", `translateX(-${currentRoute * 100}%)`);
        $("#routeIndicator").text(`${currentRoute + 1} / ${totalRoutes}`);
    }

    // SYNC ALL DETAILS OPEN/CLOSE
    function setAllRoutes(state) {
        $routes.each(function () {
            this.open = state;
        });
    }

    // NEXT
    $("#nextRoute").on("click", function () {
        if (currentRoute < totalRoutes - 1) {
            currentRoute++;
            updateSlider();
        }
    });

    // PREV
    $("#prevRoute").on("click", function () {
        if (currentRoute > 0) {
            currentRoute--;
            updateSlider();
        }
    });

    // CLICK ANY ROUTE → OPEN/CLOSE ALL
    $routes.on("toggle", function () {
        setAllRoutes(this.open);
    });

    // DRAG TOGGLE
    $("#dragToggle").on("click", function () {
        const allOpen = $routes.get(0).open;

        if (allOpen) {
            setAllRoutes(false);
        } else {
            setAllRoutes(true);

            const active = $routes.get(currentRoute);
            setTimeout(() => {
                active.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    });

    // INIT
    updateSlider();
});