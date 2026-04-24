export function createCurrentLocationItem() {
    return $(`
        <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b">
            <i class="fa-solid fa-location-crosshairs text-blue-600 text-lg"></i>
            <span class="text-[blue-600] font-semibold">
                Your Location
            </span>
        </div>
    `);
}

export function createPlacePinLocationItem() {
    return $(`
        <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer border-b">
            <i class="fa-solid fa-thumbtack text-blue-600 text-lg"></i>
            <span class="text-[blue-600] font-semibold">
                Pin a location
            </span>
        </div>
    `);
}

export function createLocationResultItem(text) {
    return $(`
        <div class="flex items-center gap-4 px-5 py-4 cursor-pointer
                    transition-all duration-200
                    hover:bg-green-50 hover:scale-[1.01] active:scale-[0.98]">

            <!-- Icon -->
            <div class="w-10 h-10 flex items-center justify-center
                        bg-green-100 text-[#2E7D32] rounded-full">
                <i class="fa-solid fa-location-dot text-sm"></i>
            </div>

            <!-- Text -->
            <div class="flex flex-col">
                <span class="text-[#003B01] font-semibold text-sm md:text-base">
                    ${text}
                </span>
            </div>

        </div>
    `);
}

export function createNoLocationResultMessage(text) {
    return $(`
        <div class="flex items-center gap-4 px-5 py-4">

            <!-- Icon -->
            <div class="w-10 h-10 flex items-center justify-center
                        bg-green-100 text-[#2E7D32] rounded-full">
                <i class="fa-solid fa-xmark text-sm"></i>
            </div>

            <!-- Text -->
            <div class="flex flex-col">
                <span class="text-[#003B01] font-semibold text-sm md:text-base">
                    ${text}
                </span>
            </div>

        </div>
    `);
}