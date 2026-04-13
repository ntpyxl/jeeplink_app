$(document).ready(function () {

    // Nav bar
    $("#menuBtn").on("click", function () {
        $("#mobileMenu").toggleClass("max-h-0 max-h-96");
    });

    // Detect mobile
    function isMobile() {
        return window.innerWidth < 768;
    }

    // Toggle commute panel
    $("#toggleCommute").on("click", function () {
        $("#commuteContent").stop().slideToggle(250);
        $("#arrow").toggleClass("rotate-180");
    });

    function autoCloseCommute() {
        if (isMobile()) {
            $("#commuteContent").hide();
            $("#arrow").addClass("rotate-180");
        } else {
            $("#commuteContent").show();
            $("#arrow").removeClass("rotate-180");
        }
    }

    autoCloseCommute();

    $(window).on("resize", function () {
        autoCloseCommute();
    });

    if (window.innerWidth < 768) {
        $("#commuteContent").hide();
        $("#arrow").addClass("rotate-180");
    }

    // =========================
    // ROUTE SLIDER SYSTEM
    // =========================

    let currentRoute = 0;
    let totalRoutes = 0;

    const $slider = $("#routeSlider");

    function updateSlider() {
        $slider.css("transform", `translateX(-${currentRoute * 100}%)`);
        $("#routeIndicator").text(`${currentRoute + 1} / ${totalRoutes}`);
    }

    function resetSlider() {
        currentRoute = 0;
        updateSlider();
    }

    $("#nextRoute").on("click", function () {
        if (currentRoute < totalRoutes - 1) {
            currentRoute++;
            updateSlider();
        }
    });

    $("#prevRoute").on("click", function () {
        if (currentRoute > 0) {
            currentRoute--;
            updateSlider();
        }
    });

    // =========================
    // SYNC ALL ROUTE DETAILS
    // =========================
    function setAllRoutes(state) {
        $(".route-details").each(function () {
            this.open = state;
        });
    }

    $(".route-details").on("toggle", function () {
        setAllRoutes(this.open);
    });

    $("#dragToggle").on("click", function () {
        const allOpen = $(".route-details").get(0).open;

        if (allOpen) {
            setAllRoutes(false);
        } else {
            setAllRoutes(true);

            const active = $(".route-details").get(currentRoute);
            setTimeout(() => {
                active?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    });


    // =========================
    // DYNAMIC ROUTE RENDERER
    // =========================
    window.renderRoutes = function (routeData) {

        const routes = [
            {
                title: "Fastest Route",
                info: routeData.fastestRouteInformation,
                path: routeData.paths?.fastestRoute
            },
            {
                title: "Cheapest Route",
                info: routeData.cheapestRouteInformation,
                path: routeData.paths?.cheapestRoute
            },
            {
                title: "Minimal Transfer Route",
                info: routeData.minimalTransferRouteInformation,
                path: routeData.paths?.minimalTransferRoute
            }
        ];

        $slider.empty();
        currentRoute = 0;
        totalRoutes = routes.length;

        routes.forEach((route, index) => {

            const instructions =
                route.info?.cheapestRouteInstructions ||
                route.info?.fastestRouteInstructions ||
                route.info?.minimalTransferRouteInstructions ||
                [];

            // TODO: DI KO ALAM PANO TO
            const ridesCount = route.path?.jeepRidesCount || 0;
            const duration = route.path?.routeDurationSeconds
                ? Math.round(route.path.routeDurationSeconds / 60)
                : 0;

            const stepsHtml = instructions.map((step, i) => `
                <div class="flex gap-2">
                    <span class="text-[#004F11] font-semibold">${i + 1}.</span>
                    <p>${step}</p>
                </div>
            `).join("");

            const html = `
                <div class="min-w-full px-1">
                    <div class="bg-gradient-to-br from-[#004F11] to-[#1f7a3a]
                                rounded-2xl shadow-lg overflow-hidden
                                border border-white/10">

                        <details class="route-details group">

                            <summary class="flex items-center justify-between gap-3 p-4 cursor-pointer list-none hover:bg-white/5 transition">

                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-full bg-[#E9CD2D] text-[#004F11]
                                                flex items-center justify-center shadow-md">
                                        <i class="fa-solid fa-route text-sm"></i>
                                    </div>

                                    <div class="flex flex-col leading-tight">
                                        <span class="text-[#E9CD2D] font-semibold text-sm">
                                            ${route.title}
                                        </span>
                                        <span class="text-white/70 text-xs">
                                            ${ridesCount} rides • ~${duration} mins
                                        </span>
                                    </div>
                                </div>

                                <span class="material-symbols-outlined text-[#E9CD2D]
                                            transition-transform duration-300 group-open:rotate-180">
                                    keyboard_arrow_down
                                </span>

                            </summary>

                            <div class="bg-white/95 text-sm text-gray-800 px-5 py-4 border-t border-black/5">
                                <div class="space-y-2">
                                    ${stepsHtml}
                                </div>
                            </div>

                        </details>

                    </div>
                </div>
            `;

            $slider.append(html);
        });

        updateSlider();
    };

    // INIT
    updateSlider();

    // Terms modal
    const accepted = localStorage.getItem("jeepLink_termsAccepted");

    if (!accepted) {
        $("#termsModal").removeClass("hidden");
    }

    $("#acceptTermsBtn").on("click", function () {
        localStorage.setItem("jeepLink_termsAccepted", "true");
        $("#termsModal").fadeOut(200);
    });
});