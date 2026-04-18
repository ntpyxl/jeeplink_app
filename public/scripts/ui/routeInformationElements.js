export function createRouteStepRow(step, i) {
    return $(`
        <div class="flex gap-3 md:gap-4 items-start">
            <div class="flex-shrink-0 w-6 h-6 md:w-7 md:h-7
                        rounded-full bg-[#004F11]
                        text-[#E9CD2D] font-bold
                        flex items-center justify-center
                        text-xs md:text-sm shadow-sm">

                ${i + 1}
            </div>
            
            <p class="text-sm md:text-base leading-relaxed text-gray-800
                    pt-[2px] md:pt-0">

                ${step}
            </p>
        </div>
    `);
}

export function createRouteTotalPrices(routeCost) {
    return $(`
        <div class="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">

            <!-- Traditional -->
            <div class="flex-1 text-center">
                <div class="text-gray-700 font-medium">Traditional</div>

                <div class="flex items-center justify-center gap-2">
                    <div class="text-[#004F11] font-semibold text-base">
                        ₱${routeCost.regular.traditional}
                    </div>
                    <div class="text-xs text-gray-500">
                        ₱${routeCost.discounted.traditional} (-20%)
                    </div>
                </div>
            </div>

            <!-- Non-AC Modern -->
            <div class="flex-1 text-center border-x border-gray-200">
                <div class="text-gray-700 font-medium">Non-AC</div>

                <div class="flex items-center justify-center gap-2">
                    <div class="text-[#004F11] font-semibold text-base">
                        ₱${routeCost.regular.nonAcModern}
                    </div>
                    <div class="text-xs text-gray-500">
                        ₱${routeCost.discounted.nonAcModern} (-20%)
                    </div>
                </div>
            </div>

            <!-- AC Modern -->
            <div class="flex-1 text-center">
                <div class="text-gray-700 font-medium">AC</div>

                <div class="flex items-center justify-center gap-2">
                    <div class="text-[#004F11] font-semibold text-base">
                        ₱${routeCost.regular.acModern}
                    </div>
                    <div class="text-xs text-gray-500">
                        ₱${routeCost.discounted.acModern} (-20%)
                    </div>
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
                            </div>

                        </div>

                        <span class="text-[#E9CD2D] text-sm transition-transform duration-300 arrow">
                            ▼
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