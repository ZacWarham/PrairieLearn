$(window).on("load", function() {
    // Initialize counter at 0 and list of added items
    let counter = 0;
    let itemList = [];

    // Create the sticky buttons and modal structure
    function initializeModal() {
        $("body").append(`
            <div id="stickyButtons" style="position: sticky; bottom: 20px; left: 20px; display: flex; gap: 10px;">
                <button id="modalBtn" type="button" class="btn btn-primary" 
                        data-bs-toggle="modal" data-bs-target="#counterModal">
                    Build #0
                </button>

                <!-- Refresh button with icon -->
                <button id="refreshBtn" type="button" class="btn btn-secondary">
                    <i class="bi bi-arrow-clockwise"></i> <!-- Bootstrap icon for refresh -->
                </button>
            </div>

            <!-- Modal Structure -->
            <div class="modal fade" id="counterModal" tabindex="-1" aria-labelledby="counterModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="counterModalLabel">Build #0</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>The current build number is <strong id="modalCounter">0</strong>.</p>
                            <p>Items in the build:</p>
                            <ul id="itemList"></ul>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    // Add buttons to each sticky-column <td> and manage their states
    function updateTableButtons() {
        $("td.sticky-column").each(function() {
            const anchorTag = $(this).find("a");
            const linkText = anchorTag.text().trim();

            // If there is an anchor tag, proceed
            if (anchorTag.length > 0) {
                // Remove any existing buttons first
                $(this).find(".plus-btn").remove();

                // Check if the link text is already in the list, and set button state accordingly
                const buttonState = itemList.includes(linkText) ? 'btn-danger' : 'btn-success';
                const buttonSymbol = itemList.includes(linkText) ? '-' : '+';

                // Prepend the button before the <a> tag
                anchorTag.before(`
                    <button type="button" class="btn btn-sm ${buttonState} plus-btn">
                        ${buttonSymbol}
                    </button>
                `);
            }
        });
    }

    // Event listener for plus/minus button click
    $(document).on("click", ".plus-btn", function() {
        const button = $(this);
        const linkText = button.next("a").text().trim();

        if (button.hasClass("btn-success")) {
            // If button is a plus button, increment the counter, add item, and change to minus
            counter++;
            itemList.push(linkText);

            // Update the button to minus
            button.removeClass("btn-success").addClass("btn-danger").text("-");
        } else {
            // If button is a minus button, decrement the counter, remove item, and change to plus
            counter--;
            itemList = itemList.filter(item => item !== linkText);

            // Update the button to plus
            button.removeClass("btn-danger").addClass("btn-success").text("+");
        }

        // Update modal counter, modal button text, and item list
        $("#counterModalLabel").text(`Build #${counter}`);
        $("#modalCounter").text(counter);
        $("#modalBtn").text(`Build #${counter}`);

        // Update the list in the modal
        updateItemList();
    });

    // Function to update the item list in the modal
    function updateItemList() {
        const itemListHtml = itemList.map(item => `<li>${item}</li>`).join("");
        $("#itemList").html(itemListHtml);
    }

    // Call this function after any table update to refresh buttons
    function handleTableUpdates() {
        // First, update the buttons in the table
        updateTableButtons();

        // Make sure the counter and list are synced
        updateItemList();
        $("#counterModalLabel").text(`Build #${counter}`);
        $("#modalCounter").text(counter);
        $("#modalBtn").text(`Build #${counter}`);
    }

    // Run the initial modal and button setup
    initializeModal();
    handleTableUpdates();

    // Event listener for the refresh button click
    $(document).on("click", "#refreshBtn", function() {
        handleTableUpdates();
        console.log("Table updated manually!");
    });
});