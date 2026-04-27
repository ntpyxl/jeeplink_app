export function renderTerminalsTable(terminals, tableBody) {
    tableBody.empty();

    terminals.forEach(terminal => {
        const row = $(`
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3">${terminal.id}</td>
                <td class="py-3">${terminal.terminal_name}</td>
                <td class="py-3 text-center space-x-2">
                    <button class="text-blue-500 hover:underline cursor-pointer edit-terminal-btn" data-terminal-id="${terminal.id}">Edit</button>
                    <button class="text-red-500 hover:underline cursor-pointer delete-terminal-btn" data-terminal-id="${terminal.id}">Delete</button>
                </td>
            </tr>
        `);
        tableBody.append(row);
    });
}