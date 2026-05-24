export function createRouteStepRow(step, i) {
    return $(`
        <div class="flex mt-2 gap-3 md:gap-4 items-start">
            <div class="flex-shrink-0 w-6 h-6 md:w-7 md:h-7
                        rounded-full bg-[#004F11]
                        text-[#E9CD2D] font-bold
                        flex items-center justify-center
                        text-xs md:text-sm shadow-sm">

                ${i + 1}
            </div>
            
            <p 
                class="routeStepInstructionRowText text-sm md:text-base leading-relaxed text-gray-800 pt-[2px] md:pt-0"
                data-step-num=${i}
            >

                ${step}
            </p>
        </div>
    `);
}

export function createRouteTotalPrices(routeCost, showFareComputationButton = false) {
    return $(`
        <div class="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-700">
            <div class="flex items-center justify-between gap-3 mb-2">
                <div class="flex items-center text-gray-800">
                    <span class="font-medium">
                        Total Fare
                    </span>

                    <i class="fa-solid fa-circle-info fare-info-icon text-gray-400 hover:text-gray-600 transition-colors cursor-pointer ml-1"></i>

                    ${
                        showFareComputationButton
                        ? `
                            <button
                                type="button"
                                class="show-fare-computation-btn inline-flex items-center gap-0.5
                                    rounded-full border border-[#004F11]/20
                                    bg-[#004F11]/5 hover:bg-[#004F11]/10
                                    px-2 py-1 text-[10px] font-semibold
                                    text-[#004F11] transition-all duration-200 ml-2
                                    cursor-pointer"
                            >
                                <i class="fa-solid fa-receipt text-[9px]"></i>
                                Fare Breakdown
                            </button>
                        `
                        : ""
                    }
                </div>

                <div class="inline-flex rounded-full border border-gray-300 bg-white shadow-sm overflow-hidden">
                    <button type="button" class="price-toggle-btn active px-3 py-1 text-[11px] font-semibold text-[#004F11] bg-[#E9CD2D]/20 cursor-pointer" data-mode="regular">Regular</button>
                    <button type="button" class="price-toggle-btn px-3 py-1 text-[11px] font-semibold text-gray-500 cursor-pointer" data-mode="discounted">Discounted</button>
                </div>
            </div>

            <div class="route-price-grid grid grid-cols-3 gap-2 text-xs text-gray-600">
                <div class="rounded-xl border border-gray-200 bg-gray-50 p-2 text-center">
                    <div class="font-medium text-gray-800">Traditional</div>
                    <div class="fare-value fare-value-regular text-[#004F11] font-bold">₱${routeCost.regular.traditional}</div>
                    <div class="fare-value fare-value-discounted text-[#004F11] font-bold hidden">₱${routeCost.discounted.traditional}</div>
                </div>

                <div class="rounded-xl border border-gray-200 bg-gray-50 p-2 text-center">
                    <div class="font-medium text-gray-800">Non-AC Modern</div>
                    <div class="fare-value fare-value-regular text-[#004F11] font-bold">₱${routeCost.regular.nonAcModern}</div>
                    <div class="fare-value fare-value-discounted text-[#004F11] font-bold hidden">₱${routeCost.discounted.nonAcModern}</div>
                </div>

                <div class="rounded-xl border border-gray-200 bg-gray-50 p-2 text-center">
                    <div class="font-medium text-gray-800">AC Modern</div>
                    <div class="fare-value fare-value-regular text-[#004F11] font-bold">₱${routeCost.regular.acModern}</div>
                    <div class="fare-value fare-value-discounted text-[#004F11] font-bold hidden">₱${routeCost.discounted.acModern}</div>
                </div>
            </div>

        </div>
    `);
}

export function createRouteInformationCard(routeTitle, routeInformation, routeSteps, totalRidePrices) {
    return `
        <div class="min-w-full px-1 sm:px-2 route-card opacity-0 translate-y-4">
            <div class="bg-gradient-to-br from-[#004F11] to-[#1f7a3a]
                        rounded-xl sm:rounded-2xl shadow-xl overflow-hidden
                        border border-white/10 backdrop-blur-md">
                
                <div class="route-details">
                    <div class="summary flex items-center justify-between gap-2 sm:gap-3
                                px-3 sm:px-4 py-3 sm:py-4 cursor-pointer
                                hover:bg-white/5 transition-colors duration-200">

                        <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">

                            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E9CD2D]
                                        flex items-center justify-center shrink-0 shadow-sm">
                                <i class="fa-solid fa-route text-[#004F11] text-sm"></i>
                            </div>

                            <div class="flex flex-col min-w-0">
                                <span class="text-[#E9CD2D] font-semibold text-sm sm:text-base truncate">
                                    ${routeTitle}
                                </span>
                                <span class="text-white/70 text-[11px] sm:text-sm truncate">
                                    ${routeInformation.routeDistance} • ${routeInformation.jeepRidesCount} • ~${routeInformation.tripDurationFormatted}
                                </span>

                                <span class="text-white/60 text-[10px] sm:text-xs italic truncate">
                                    This route was generated using the ${routeInformation.algorithm}
                                </span>
                            </div>

                        </div>

                        <span class="text-[#E9CD2D] text-sm transition-transform duration-300 arrow">
                            ▲
                        </span>
                    </div>

                    <div class="route-content hidden bg-white/95 text-gray-800
                                px-3 sm:px-4 py-3 sm:py-4">

                        <div class="max-h-44 sm:max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            ${routeSteps}
                        </div>

                        <div class="mt-3">
                            ${totalRidePrices}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
}

export function updateHighlightedRouteStepRow(stepNum = null) {
    const highlightclassList = `px-3 rounded-xl transition-all duration-200 bg-[#004F11]/10 ring-2 ring-[#35903A] shadow-md scale-[1.01]`;
    $(".routeStepInstructionRowText").removeClass(highlightclassList)
    if(stepNum) {
        $(`.routeStepInstructionRowText[data-step-num="${stepNum}"]`).addClass(highlightclassList)
    }
}