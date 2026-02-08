// Custom Glassmorphism Dropdown Component
// ==========================================

/**
 * Initialize all select elements as custom dropdowns
 */
function initializeCustomDropdowns() {
    var selects = document.querySelectorAll('select');
    
    selects.forEach(function(select) {
        // Skip if already initialized
        if (select.parentElement.querySelector('.custom-dropdown')) {
            return;
        }
        
        createCustomDropdown(select);
    });
}

/**
 * Create a custom dropdown from a select element
 */
function createCustomDropdown(selectElement) {
    // Get select properties
    var options = Array.from(selectElement.options);
    var selectedOption = selectElement.options[selectElement.selectedIndex];
    
    // Create dropdown container
    var dropdown = document.createElement('div');
    dropdown.className = 'custom-dropdown';
    
    // Create selected display
    var selected = document.createElement('div');
    selected.className = 'dropdown-selected';
    
    var selectedText = document.createElement('span');
    selectedText.className = 'dropdown-selected-text';
    selectedText.innerHTML = getOptionHTML(selectedOption, selectElement.id);
    
    var arrow = document.createElement('span');
    arrow.className = 'dropdown-arrow';
    arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
    
    selected.appendChild(selectedText);
    selected.appendChild(arrow);
    
    // Create options container
    var optionsContainer = document.createElement('div');
    optionsContainer.className = 'dropdown-options';
    
    // Create option items
    options.forEach(function(option) {
        if (option.value === '' && option.text === '') return; // Skip empty options
        
        var optionItem = document.createElement('div');
        optionItem.className = 'dropdown-option';
        optionItem.setAttribute('data-value', option.value);
        optionItem.innerHTML = getOptionHTML(option, selectElement.id) + '<i class="fas fa-check dropdown-option-check"></i>';
        
        if (option.selected) {
            optionItem.classList.add('selected');
        }
        
        // Click event for option
        optionItem.addEventListener('click', function(e) {
            e.stopPropagation();
            selectDropdownOption(selectElement, dropdown, option.value);
        });
        
        optionsContainer.appendChild(optionItem);
    });
    
    dropdown.appendChild(selected);
    dropdown.appendChild(optionsContainer);
    
    // Toggle dropdown
    selected.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown(dropdown);
    });
    
    // Keyboard navigation
    selected.setAttribute('tabindex', '0');
    selected.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown(dropdown);
        } else if (e.key === 'Escape') {
            closeAllDropdowns();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!optionsContainer.classList.contains('active')) {
                toggleDropdown(dropdown);
            }
        }
    });
    
    // Keyboard navigation in options
    optionsContainer.addEventListener('keydown', function(e) {
        var options = Array.from(optionsContainer.querySelectorAll('.dropdown-option'));
        var currentIndex = options.findIndex(function(opt) { return opt === document.activeElement; });
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            var nextIndex = (currentIndex + 1) % options.length;
            options[nextIndex].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            var prevIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
            options[prevIndex].focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (document.activeElement && document.activeElement.classList.contains('dropdown-option')) {
                document.activeElement.click();
            }
        } else if (e.key === 'Escape') {
            closeAllDropdowns();
            selected.focus();
        }
    });
    
    // Make options focusable
    optionsContainer.querySelectorAll('.dropdown-option').forEach(function(option) {
        option.setAttribute('tabindex', '0');
    });
    
    // Insert dropdown after select and hide select
    selectElement.style.display = 'none';
    selectElement.parentNode.insertBefore(dropdown, selectElement.nextSibling);
    
    // Store reference
    selectElement.customDropdown = dropdown;
    dropdown.selectElement = selectElement;
}

/**
 * Get HTML content for an option based on its type
 */
function getOptionHTML(option, selectId) {
    var value = option.value;
    var text = option.text;
    var icon = '';
    
    // Priority icons
    if (selectId === 'taskPriority') {
        if (value === 'high') icon = '<i class="fas fa-flag"></i>';
        else if (value === 'medium') icon = '<i class="fas fa-flag"></i>';
        else if (value === 'low') icon = '<i class="fas fa-flag"></i>';
    }
    
    // Category icons
    else if (selectId === 'taskCategory') {
        if (value === 'work') icon = '<i class="fas fa-briefcase"></i>';
        else if (value === 'personal') icon = '<i class="fas fa-user"></i>';
        else if (value === 'health') icon = '<i class="fas fa-heartbeat"></i>';
        else if (value === 'study') icon = '<i class="fas fa-book"></i>';
        else if (value === 'other') icon = '<i class="fas fa-circle"></i>';
    }
    
    // Time period icons
    else if (selectId === 'taskPeriod') {
        if (!value) icon = '<i class="fas fa-clock"></i>';
        else if (value === 'early-morning') icon = '<i class="fas fa-sunrise"></i>';
        else if (value === 'morning') icon = '<i class="fas fa-sun"></i>';
        else if (value === 'afternoon') icon = '<i class="fas fa-cloud-sun"></i>';
        else if (value === 'evening') icon = '<i class="fas fa-sunset"></i>';
        else if (value === 'night') icon = '<i class="fas fa-moon"></i>';
        else if (value === 'late-night') icon = '<i class="fas fa-star"></i>';
    }
    
    // Day selection icons (for agent)
    else if (selectId === 'duplicateFromDay' || selectId === 'duplicateToDay') {
        if (!value) icon = '<i class="fas fa-calendar"></i>';
        else icon = '<i class="fas fa-calendar-day"></i>';
    }
    
    // Feedback category icons
    else if (selectId === 'category') {
        if (value === 'general') icon = '<i class="fas fa-comment"></i>';
        else if (value === 'bug') icon = '<i class="fas fa-bug"></i>';
        else if (value === 'feature') icon = '<i class="fas fa-lightbulb"></i>';
        else if (value === 'question') icon = '<i class="fas fa-question-circle"></i>';
        else if (value === 'other') icon = '<i class="fas fa-ellipsis-h"></i>';
    }
    
    // Default icon
    if (!icon) {
        icon = '<i class="fas fa-circle"></i>';
    }
    
    return icon + '<span>' + text + '</span>';
}

/**
 * Toggle dropdown open/close
 */
function toggleDropdown(dropdown) {
    var isActive = dropdown.querySelector('.dropdown-selected').classList.contains('active');
    
    // Close all other dropdowns
    closeAllDropdowns();
    
    if (!isActive) {
        dropdown.querySelector('.dropdown-selected').classList.add('active');
        dropdown.querySelector('.dropdown-options').classList.add('active');
        
        // Add backdrop blur effect
        document.body.classList.add('dropdown-active');
        
        // Add click outside listener
        setTimeout(function() {
            document.addEventListener('click', handleClickOutside);
        }, 10);
    }
}

/**
 * Close all dropdowns
 */
function closeAllDropdowns() {
    var allDropdowns = document.querySelectorAll('.custom-dropdown');
    allDropdowns.forEach(function(dropdown) {
        dropdown.querySelector('.dropdown-selected').classList.remove('active');
        dropdown.querySelector('.dropdown-options').classList.remove('active');
    });
    
    // Remove backdrop blur effect
    document.body.classList.remove('dropdown-active');
    
    document.removeEventListener('click', handleClickOutside);
}

/**
 * Handle click outside dropdown
 */
function handleClickOutside(e) {
    if (!e.target.closest('.custom-dropdown')) {
        closeAllDropdowns();
    }
}

/**
 * Select a dropdown option
 */
function selectDropdownOption(selectElement, dropdown, value) {
    // Update original select
    selectElement.value = value;
    
    // Trigger change event
    var event = new Event('change', { bubbles: true });
    selectElement.dispatchEvent(event);
    
    // Update selected display
    var selectedOption = Array.from(selectElement.options).find(function(opt) {
        return opt.value === value;
    });
    
    if (selectedOption) {
        var selectedText = dropdown.querySelector('.dropdown-selected-text');
        selectedText.innerHTML = getOptionHTML(selectedOption, selectElement.id);
    }
    
    // Update selected class in options
    var options = dropdown.querySelectorAll('.dropdown-option');
    options.forEach(function(option) {
        if (option.getAttribute('data-value') === value) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // Close dropdown
    closeAllDropdowns();
    
    // Play sound
    if (typeof playSound === 'function') {
        playSound('click');
    }
}

/**
 * Update dropdown when select value changes programmatically
 */
function updateCustomDropdown(selectElement) {
    if (!selectElement.customDropdown) return;
    
    var dropdown = selectElement.customDropdown;
    var selectedOption = selectElement.options[selectElement.selectedIndex];
    
    // Update selected display
    var selectedText = dropdown.querySelector('.dropdown-selected-text');
    selectedText.innerHTML = getOptionHTML(selectedOption, selectElement.id);
    
    // Update selected class in options
    var options = dropdown.querySelectorAll('.dropdown-option');
    options.forEach(function(option) {
        if (option.getAttribute('data-value') === selectElement.value) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

/**
 * Refresh custom dropdowns (useful when modal opens or content changes)
 */
function refreshCustomDropdowns() {
    // Small delay to ensure DOM is ready
    setTimeout(function() {
        initializeCustomDropdowns();
    }, 50);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCustomDropdowns);
} else {
    initializeCustomDropdowns();
}

// Re-initialize when new modals or content is added
var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1 && (node.querySelector('select') || node.tagName === 'SELECT')) {
                    refreshCustomDropdowns();
                }
            });
        }
    });
});

// Start observing
if (document.body) {
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
