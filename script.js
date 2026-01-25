// Task data structure
var tasks = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
};

var currentDay = '';
var editingTaskId = null;
var currentFilter = 'all';
var currentTheme = 'light';
var confirmCallback = null;
var MAX_VISIBLE_TASKS = 4;
var focusModeEnabled = false;
var currentDayOfWeek = '';

// Sound Effects
var sounds = {
    click: new Audio('data:audio/wav;base64,UklGRhwAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='),
    complete: createSound(800, 0.1, 'sine'),
    delete: createSound(300, 0.15, 'square'),
    drag: createSound(600, 0.08, 'sine'),
    drop: createSound(500, 0.12, 'triangle'),
    add: createSound(700, 0.1, 'sine')
};

function createSound(frequency, duration, type) {
    return function() {
        try {
            var audioContext = new (window.AudioContext || window.webkitAudioContext)();
            var oscillator = audioContext.createOscillator();
            var gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            // Silently fail if audio context is not available
        }
    };
}

function playSound(soundName) {
    if (sounds[soundName]) {
        if (typeof sounds[soundName] === 'function') {
            sounds[soundName]();
        } else {
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(function() {});
        }
    }
}

// Initialize app when DOM is ready
window.addEventListener('load', function() {
    checkWeeklyReset();
    loadTasksFromStorage();
    loadTheme();
    renderAllTasks();
    setupEventListeners();
    updateProfileDisplay();
});

// Check if new week started and save report
function checkWeeklyReset() {
    var lastWeekStart = localStorage.getItem('lastWeekStart');
    var currentWeekStart = getWeekStartDate();
    
    if (lastWeekStart && lastWeekStart !== currentWeekStart) {
        // New week detected - save report and reset
        saveWeeklyReport();
        resetWeeklyData();
    }
    
    localStorage.setItem('lastWeekStart', currentWeekStart);
}

function getWeekStartDate() {
    var now = new Date();
    var day = now.getDay();
    var diff = now.getDate() - day + (day === 0 ? -6 : 1);
    var monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

function getWeekEndDate(startDate) {
    var start = new Date(startDate);
    var end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
}

function saveWeeklyReport() {
    var stats = calculateWeekStats();
    var weekStart = localStorage.getItem('lastWeekStart') || getWeekStartDate();
    
    var report = {
        id: Date.now(),
        weekStart: weekStart,
        weekEnd: getWeekEndDate(weekStart),
        stats: stats,
        savedAt: new Date().toISOString()
    };
    
    var reports = JSON.parse(localStorage.getItem('weeklyReports') || '[]');
    reports.unshift(report);
    
    if (reports.length > 10) {
        reports = reports.slice(0, 10);
    }
    
    localStorage.setItem('weeklyReports', JSON.stringify(reports));
}

function calculateWeekStats() {
    var stats = {
        totalTasks: 0,
        completedTasks: 0,
        activeTasks: 0,
        completionRate: 0,
        byDay: {},
        byCategory: {},
        byPriority: { high: 0, medium: 0, low: 0 }
    };
    
    var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(function(day) {
        var dayTasks = tasks[day] || [];
        var dayCompleted = 0;
        
        dayTasks.forEach(function(task) {
            stats.totalTasks++;
            
            if (task.completed) {
                stats.completedTasks++;
                dayCompleted++;
            } else {
                stats.activeTasks++;
            }
            
            var category = task.category || 'other';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
            
            if (task.priority) {
                stats.byPriority[task.priority]++;
            }
        });
        
        stats.byDay[day] = {
            total: dayTasks.length,
            completed: dayCompleted,
            rate: dayTasks.length > 0 ? Math.round((dayCompleted / dayTasks.length) * 100) : 0
        };
    });
    
    stats.completionRate = stats.totalTasks > 0 
        ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
        : 0;
    
    return stats;
}

function resetWeeklyData() {
    // Keep the structure but clear tasks
    tasks = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };
    saveTasksToStorage();
    renderAllTasks();
}

function setupEventListeners() {
    // Setup form submission
    var taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Setup modal click outside to close
    var taskModal = document.getElementById('taskModal');
    if (taskModal) {
        taskModal.addEventListener('click', function(e) {
            if (e.target.id === 'taskModal') {
                closeTaskModal();
            }
        });
    }
    
    // Setup search input
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterTasks);
    }
    
    // Setup drag and drop for day containers
    setupDragAndDrop();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeTaskModal();
        }
    });
}

// Theme management
function loadTheme() {
    var savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    updateThemeIcons();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme');
    updateThemeIcons();
    localStorage.setItem('theme', currentTheme);
}

function updateThemeIcons() {
    var iconProfile = document.getElementById('themeIconProfile');
    var themeText = document.getElementById('themeText');
    
    if (iconProfile) {
        iconProfile.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    if (themeText) {
        themeText.textContent = currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
}

// Focus Mode Functions
function toggleFocusMode() {
    focusModeEnabled = !focusModeEnabled;
    
    var focusIcon = document.getElementById('focusIcon');
    var weekGrid = document.querySelector('.week-grid');
    var container = document.querySelector('.container');
    
    if (focusModeEnabled) {
        // Get current day of week
        var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        var today = new Date().getDay();
        currentDayOfWeek = days[today];
        
        // Add focus mode classes
        if (container) container.classList.add('focus-mode-active');
        if (weekGrid) weekGrid.classList.add('focus-mode');
        if (focusIcon) {
            focusIcon.className = 'fas fa-times-circle';
            focusIcon.parentElement.classList.add('active');
        }
        
        // Hide all day cards except current day
        var dayCards = document.querySelectorAll('.day-card');
        for (var i = 0; i < dayCards.length; i++) {
            var dayCard = dayCards[i];
            var day = dayCard.getAttribute('data-day');
            
            if (day === currentDayOfWeek) {
                dayCard.classList.add('focus-active');
                dayCard.classList.remove('focus-hidden');
            } else {
                dayCard.classList.add('focus-hidden');
                dayCard.classList.remove('focus-active');
            }
        }
        
        showNotification('Focus Mode: Showing ' + capitalizeFirstLetter(currentDayOfWeek) + ' tasks only', 'success');
    } else {
        // Remove focus mode classes
        if (container) container.classList.remove('focus-mode-active');
        if (weekGrid) weekGrid.classList.remove('focus-mode');
        if (focusIcon) {
            focusIcon.className = 'fas fa-bullseye';
            focusIcon.parentElement.classList.remove('active');
        }
        
        // Show all day cards
        var dayCards = document.querySelectorAll('.day-card');
        for (var i = 0; i < dayCards.length; i++) {
            dayCards[i].classList.remove('focus-hidden', 'focus-active');
        }
        
        showNotification('Focus Mode disabled', 'info');
    }
}

// Profile Modal Functions
function openProfileModal() {
    var modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'flex';
        loadProfile();
    }
}

function closeProfileModal() {
    var modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function loadProfile() {
    var profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    var nameInput = document.getElementById('profileName');
    var emailInput = document.getElementById('profileEmail');
    var ageInput = document.getElementById('profileAge');
    
    if (nameInput && profile.name) nameInput.value = profile.name;
    if (emailInput && profile.email) emailInput.value = profile.email;
    if (ageInput && profile.age) ageInput.value = profile.age;
}

function saveProfile() {
    var name = document.getElementById('profileName').value;
    var email = document.getElementById('profileEmail').value;
    var age = document.getElementById('profileAge').value;
    
    var profile = {
        name: name,
        email: email,
        age: age
    };
    
    localStorage.setItem('userProfile', JSON.stringify(profile));
    updateProfileDisplay();
    
    var greeting = name ? 'Welcome, ' + name + '! Profile saved successfully!' : 'Profile saved successfully!';
    showNotification(greeting, 'success');
    
    setTimeout(function() {
        closeProfileModal();
    }, 1500);
}

function updateProfileDisplay() {
    var profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    var displayElement = document.getElementById('profileNameDisplay');
    
    if (displayElement) {
        if (profile.name && profile.name.trim() !== '') {
            displayElement.textContent = profile.name;
            displayElement.style.display = 'block';
        } else {
            displayElement.textContent = 'Guest';
            displayElement.style.display = 'block';
        }
    }
}

// Custom Notification System
function showNotification(message, type) {
    var notification = document.getElementById('customNotification');
    if (!notification) return;
    
    var icon = notification.querySelector('.notification-icon');
    var messageEl = notification.querySelector('.notification-message');
    
    // Set icon based on type
    var iconClass = '';
    if (type === 'success') {
        iconClass = 'fas fa-check-circle success';
    } else if (type === 'error') {
        iconClass = 'fas fa-exclamation-circle error';
    } else {
        iconClass = 'fas fa-info-circle info';
    }
    
    icon.className = 'notification-icon ' + type;
    icon.innerHTML = '<i class="' + iconClass + '"></i>';
    messageEl.innerHTML = message;
    
    notification.classList.add('show');
    
    setTimeout(function() {
        notification.classList.remove('show');
    }, 3000);
}

// Custom Confirm Dialog
function showConfirm(message, callback) {
    var dialog = document.getElementById('confirmDialog');
    if (!dialog) return;
    
    var messageEl = dialog.querySelector('.confirm-message');
    messageEl.textContent = message;
    
    confirmCallback = callback;
    dialog.classList.add('active');
}

function closeConfirm(confirmed) {
    var dialog = document.getElementById('confirmDialog');
    if (dialog) {
        dialog.classList.remove('active');
    }
    
    if (confirmCallback) {
        confirmCallback(confirmed);
        confirmCallback = null;
    }
}

// Export tasks
function exportTasks() {
    var dataStr = JSON.stringify(tasks, null, 2);
    var dataBlob = new Blob([dataStr], { type: 'application/json' });
    var url = URL.createObjectURL(dataBlob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'weekly-tasks-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Tasks exported successfully!', 'success');
}

// Import tasks
function importTasks() {
    var fileInput = document.getElementById('importFile');
    if (fileInput) {
        fileInput.click();
    }
}

function handleFileImport(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var importedData = JSON.parse(e.target.result);
            
            // Validate the data structure
            var validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            var isValid = true;
            
            for (var i = 0; i < validDays.length; i++) {
                var day = validDays[i];
                if (!importedData[day] || !Array.isArray(importedData[day])) {
                    isValid = false;
                    break;
                }
            }
            
            if (isValid) {
                showConfirm('This will replace all your current tasks. Are you sure?', function(confirmed) {
                    if (confirmed) {
                        tasks = importedData;
                        saveTasksToStorage();
                        renderAllTasks();
                        showNotification('Tasks imported successfully!', 'success');
                    }
                });
            } else {
                showNotification('Invalid file format. Please select a valid tasks JSON file.', 'error');
            }
        } catch (error) {
            showNotification('Error reading file. Please make sure it is a valid JSON file.', 'error');
        }
        
        // Reset the file input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Filter functions
function filterTasks() {
    var searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    var searchTerm = searchInput.value.toLowerCase();
    
    var days = Object.keys(tasks);
    for (var i = 0; i < days.length; i++) {
        var day = days[i];
        var dayTasks = tasks[day];
        
        for (var j = 0; j < dayTasks.length; j++) {
            var task = dayTasks[j];
            var taskElement = document.querySelector('[data-task-id="' + task.id + '"]');
            if (!taskElement) continue;
            
            var matchesSearch = task.title.toLowerCase().indexOf(searchTerm) !== -1 ||
                              (task.description && task.description.toLowerCase().indexOf(searchTerm) !== -1);
            
            var matchesFilter = 
                currentFilter === 'all' ||
                (currentFilter === 'active' && !task.completed) ||
                (currentFilter === 'completed' && task.completed) ||
                (currentFilter === 'high' && task.priority === 'high');
            
            if (matchesSearch && matchesFilter) {
                taskElement.classList.remove('hidden');
            } else {
                taskElement.classList.add('hidden');
            }
        }
    }
}

function filterByStatus(status) {
    currentFilter = status;
    
    // Update active filter button
    var filterBtns = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < filterBtns.length; i++) {
        filterBtns[i].classList.remove('active');
    }
    
    // Add active class to clicked button
    var clickedBtn = event && event.target ? event.target.closest('.filter-btn') : null;
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    
    filterTasks();
}

function filterByPriority(priority) {
    currentFilter = priority;
    
    // Update active filter button
    var filterBtns = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < filterBtns.length; i++) {
        filterBtns[i].classList.remove('active');
    }
    
    // Add active class to clicked button
    var clickedBtn = event && event.target ? event.target.closest('.filter-btn') : null;
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    
    filterTasks();
}

// Drag and Drop functionality
var draggedTask = null;
var draggedElement = null;

function setupDragAndDrop() {
    var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (var i = 0; i < days.length; i++) {
        var dayContainer = document.getElementById(days[i] + '-tasks');
        if (dayContainer) {
            dayContainer.addEventListener('dragover', handleDragOver);
            dayContainer.addEventListener('drop', handleDrop);
            dayContainer.addEventListener('dragenter', handleDragEnter);
            dayContainer.addEventListener('dragleave', handleDragLeave);
        }
    }
}

function handleDragStart(e) {
    playSound('drag');
    draggedTask = {
        id: parseInt(this.getAttribute('data-task-id')),
        day: this.getAttribute('data-day')
    };
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remove all drop-zone-active classes and drag-over classes
    var containers = document.querySelectorAll('.tasks-container');
    for (var i = 0; i < containers.length; i++) {
        containers[i].classList.remove('drop-zone-active');
    }
    
    var taskItems = document.querySelectorAll('.task-item');
    for (var i = 0; i < taskItems.length; i++) {
        taskItems[i].classList.remove('drag-over-top', 'drag-over-bottom');
    }
    
    draggedElement = null;
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    // Handle reordering within same day
    var target = e.target.closest('.task-item');
    if (target && draggedElement && target !== draggedElement) {
        var targetDay = target.getAttribute('data-day');
        if (targetDay === draggedTask.day) {
            var rect = target.getBoundingClientRect();
            var midpoint = rect.top + rect.height / 2;
            
            // Remove previous indicators
            var taskItems = document.querySelectorAll('.task-item');
            for (var i = 0; i < taskItems.length; i++) {
                taskItems[i].classList.remove('drag-over-top', 'drag-over-bottom');
            }
            
            // Add indicator based on position
            if (e.clientY < midpoint) {
                target.classList.add('drag-over-top');
            } else {
                target.classList.add('drag-over-bottom');
            }
        }
    }
    
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drop-zone-active');
}

function handleDragLeave(e) {
    // Only remove if we're leaving the container itself, not a child element
    if (e.target === this) {
        this.classList.remove('drop-zone-active');
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    if (e.preventDefault) {
        e.preventDefault();
    }
    
    playSound('drop');
    this.classList.remove('drop-zone-active');
    
    if (!draggedTask) return;
    
    // Check if dropped on a task item (for reordering within same day)
    var targetTaskElement = e.target.closest('.task-item');
    
    if (targetTaskElement && targetTaskElement !== draggedElement) {
        var targetDay = targetTaskElement.getAttribute('data-day');
        var sourceDay = draggedTask.day;
        
        // Reorder within same day
        if (sourceDay === targetDay) {
            var targetTaskId = parseInt(targetTaskElement.getAttribute('data-task-id'));
            reorderTasksInDay(sourceDay, draggedTask.id, targetTaskId, e);
            draggedTask = null;
            return false;
        }
    }
    
    // Get target day from container id
    var targetDay = this.id.replace('-tasks', '');
    var sourceDay = draggedTask.day;
    
    // Don't do anything if dropped on same day container (but not on a task)
    if (sourceDay === targetDay && !targetTaskElement) {
        draggedTask = null;
        return false;
    }
    
    // Find the task in source day
    var taskIndex = -1;
    for (var i = 0; i < tasks[sourceDay].length; i++) {
        if (tasks[sourceDay][i].id === draggedTask.id) {
            taskIndex = i;
            break;
        }
    }
    
    if (taskIndex === -1) return;
    
    // Move task from source to target
    var task = tasks[sourceDay].splice(taskIndex, 1)[0];
    tasks[targetDay].push(task);
    
    // Save and re-render
    saveTasksToStorage();
    renderTasks(sourceDay);
    renderTasks(targetDay);
    
    showNotification('Task moved to ' + capitalizeFirstLetter(targetDay), 'success');
    
    draggedTask = null;
    return false;
}

// Reorder tasks within the same day
function reorderTasksInDay(day, draggedTaskId, targetTaskId, event) {
    // Find indices
    var draggedIndex = -1;
    var targetIndex = -1;
    
    for (var i = 0; i < tasks[day].length; i++) {
        if (tasks[day][i].id === draggedTaskId) {
            draggedIndex = i;
        }
        if (tasks[day][i].id === targetTaskId) {
            targetIndex = i;
        }
    }
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Remove the dragged task
    var task = tasks[day].splice(draggedIndex, 1)[0];
    
    // Determine where to insert based on mouse position
    var targetElement = event.target.closest('.task-item');
    if (targetElement) {
        var rect = targetElement.getBoundingClientRect();
        var midpoint = rect.top + rect.height / 2;
        
        // Recalculate target index after removal
        if (draggedIndex < targetIndex) {
            targetIndex--;
        }
        
        // Insert above or below based on position
        if (event.clientY < midpoint) {
            tasks[day].splice(targetIndex, 0, task);
        } else {
            tasks[day].splice(targetIndex + 1, 0, task);
        }
    } else {
        tasks[day].splice(targetIndex, 0, task);
    }
    
    // Save and re-render
    saveTasksToStorage();
    renderTasks(day);
    
    showNotification('Task reordered successfully', 'success');
}

// Open task modal
function openTaskModal(day) {
    currentDay = day;
    editingTaskId = null;
    
    var modalTitle = document.getElementById('modalTitle');
    var submitBtn = document.getElementById('submitBtn');
    
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add Task - ' + capitalizeFirstLetter(day);
    }
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Add Task';
    }
    
    // Reset form
    var taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.reset();
    }
    
    var prioritySelect = document.getElementById('taskPriority');
    var categorySelect = document.getElementById('taskCategory');
    if (prioritySelect) prioritySelect.value = 'medium';
    if (categorySelect) categorySelect.value = 'work';
    
    // Clear subtasks
    var subtasksContainer = document.getElementById('subtasksContainer');
    if (subtasksContainer) {
        subtasksContainer.innerHTML = '';
    }
    
    // Show modal with animation
    var modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.add('active');
    }
    
    playSound('click');
}

// Close task modal
function closeTaskModal() {
    var modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.remove('active');
    }
    editingTaskId = null;
}

// Subtask Management
function addSubtaskInput(text) {
    var container = document.getElementById('subtasksContainer');
    if (!container) return;
    
    var wrapper = document.createElement('div');
    wrapper.className = 'subtask-input-wrapper';
    
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter subtask...';
    input.className = 'subtask-input';
    if (text) input.value = text;
    
    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-subtask';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.onclick = function() {
        playSound('click');
        wrapper.remove();
    };
    
    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
    
    playSound('click');
}

function getSubtasksFromForm() {
    var inputs = document.querySelectorAll('#subtasksContainer .subtask-input');
    var subtasks = [];
    
    for (var i = 0; i < inputs.length; i++) {
        var text = inputs[i].value.trim();
        if (text) {
            subtasks.push({
                id: Date.now() + i,
                text: text,
                completed: false
            });
        }
    }
    
    return subtasks;
}

function loadSubtasksToForm(subtasks) {
    var container = document.getElementById('subtasksContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    if (subtasks && subtasks.length > 0) {
        for (var i = 0; i < subtasks.length; i++) {
            addSubtaskInput(subtasks[i].text);
        }
    }
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    var taskTitle = document.getElementById('taskTitle');
    var taskTime = document.getElementById('taskTime');
    var taskDueDate = document.getElementById('taskDueDate');
    var taskPriority = document.getElementById('taskPriority');
    var taskCategory = document.getElementById('taskCategory');
    var taskDescription = document.getElementById('taskDescription');
    var taskNotes = document.getElementById('taskNotes');
    var taskPeriod = document.getElementById('taskPeriod');
    
    var taskData = {
        id: editingTaskId || Date.now(),
        title: taskTitle ? taskTitle.value : '',
        time: taskTime ? taskTime.value : '',
        dueDate: taskDueDate ? taskDueDate.value : '',
        priority: taskPriority ? taskPriority.value : 'medium',
        category: taskCategory ? taskCategory.value : 'work',
        period: taskPeriod ? taskPeriod.value : '',
        description: taskDescription ? taskDescription.value : '',
        notes: taskNotes ? taskNotes.value : '',
        subtasks: getSubtasksFromForm(),
        completed: false
    };
    
    if (editingTaskId) {
        // Update existing task
        var index = -1;
        for (var i = 0; i < tasks[currentDay].length; i++) {
            if (tasks[currentDay][i].id === editingTaskId) {
                index = i;
                break;
            }
        }
        if (index !== -1) {
            taskData.completed = tasks[currentDay][index].completed;
            // Preserve existing subtask completion states
            if (tasks[currentDay][index].subtasks) {
                var oldSubtasks = tasks[currentDay][index].subtasks;
                for (var i = 0; i < taskData.subtasks.length; i++) {
                    for (var j = 0; j < oldSubtasks.length; j++) {
                        if (taskData.subtasks[i].text === oldSubtasks[j].text) {
                            taskData.subtasks[i].completed = oldSubtasks[j].completed;
                            taskData.subtasks[i].id = oldSubtasks[j].id;
                            break;
                        }
                    }
                }
            }
            tasks[currentDay][index] = taskData;
        }
        playSound('click');
    } else {
        // Add new task
        tasks[currentDay].push(taskData);
        playSound('add');
    }
    
    saveTasksToStorage();
    renderTasks(currentDay);
    closeTaskModal();
    showNotification('Task ' + (editingTaskId ? 'updated' : 'added') + ' successfully!', 'success');
}

// Render all tasks
function renderAllTasks() {
    var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (var i = 0; i < days.length; i++) {
        renderTasks(days[i]);
    }
}

// Render tasks for a specific day
function renderTasks(day) {
    var container = document.getElementById(day + '-tasks');
    var countElement = document.getElementById(day + '-count');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    var dayTasks = tasks[day];
    var completedCount = 0;
    for (var i = 0; i < dayTasks.length; i++) {
        if (dayTasks[i].completed) {
            completedCount++;
        }
    }
    
    if (countElement) {
        countElement.textContent = dayTasks.length + ' task' + (dayTasks.length !== 1 ? 's' : '') + ' • ' + completedCount + ' completed';
    }
    
    // Render tasks with overflow handling
    for (var i = 0; i < dayTasks.length; i++) {
        var taskElement = createTaskElement(dayTasks[i], day);
        
        // Add hidden-overflow class to tasks beyond MAX_VISIBLE_TASKS
        if (i >= MAX_VISIBLE_TASKS) {
            taskElement.classList.add('hidden-overflow');
        }
        
        container.appendChild(taskElement);
    }
    
    // Add "Show More" button if there are more tasks than visible limit
    if (dayTasks.length > MAX_VISIBLE_TASKS) {
        var showMoreBtn = document.createElement('button');
        showMoreBtn.className = 'show-more-btn';
        showMoreBtn.setAttribute('data-day', day);
        showMoreBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Show ' + (dayTasks.length - MAX_VISIBLE_TASKS) + ' More';
        showMoreBtn.onclick = function() {
            toggleShowMore(this);
        };
        container.appendChild(showMoreBtn);
    }
    
    filterTasks();
}

// Toggle show more/less
function toggleShowMore(button) {
    var day = button.getAttribute('data-day');
    var container = document.getElementById(day + '-tasks');
    var isExpanded = container.classList.contains('expanded');
    
    if (isExpanded) {
        container.classList.remove('expanded');
        button.classList.remove('expanded');
        var hiddenCount = tasks[day].length - MAX_VISIBLE_TASKS;
        button.innerHTML = '<i class="fas fa-chevron-down"></i> Show ' + hiddenCount + ' More';
    } else {
        container.classList.add('expanded');
        button.classList.add('expanded');
        button.innerHTML = '<i class="fas fa-chevron-up"></i> Show Less';
    }
}

// Create task element
function createTaskElement(task, day) {
    var taskDiv = document.createElement('div');
    taskDiv.className = 'task-item priority-' + task.priority + ' category-' + task.category + (task.completed ? ' completed' : '');
    taskDiv.setAttribute('data-task-id', task.id);
    taskDiv.setAttribute('data-day', day);
    taskDiv.setAttribute('draggable', 'true');
    
    // Add drag event listeners
    taskDiv.addEventListener('dragstart', handleDragStart);
    taskDiv.addEventListener('dragend', handleDragEnd);
    
    var priorityIcons = {
        high: 'fa-exclamation-circle',
        medium: 'fa-minus-circle',
        low: 'fa-info-circle'
    };
    
    var categoryIcons = {
        work: 'fa-briefcase',
        personal: 'fa-user',
        health: 'fa-heartbeat',
        study: 'fa-book',
        other: 'fa-circle'
    };
    
    var periodNames = {
        'early-morning': 'Early Morning',
        'morning': 'Morning',
        'afternoon': 'Afternoon',
        'evening': 'Evening',
        'night': 'Night',
        'late-night': 'Late Night'
    };
    
    var periodIcons = {
        'early-morning': 'fa-sunrise',
        'morning': 'fa-sun',
        'afternoon': 'fa-cloud-sun',
        'evening': 'fa-sunset',
        'night': 'fa-moon',
        'late-night': 'fa-star'
    };
    
    var metaHTML = '<div class="task-meta">';
    if (task.time) {
        metaHTML += '<span class="task-time"><i class="fas fa-clock"></i> ' + task.time + '</span>';
    }
    if (task.period) {
        metaHTML += '<span class="task-period ' + task.period + '"><i class="fas ' + periodIcons[task.period] + '"></i> ' + periodNames[task.period] + '</span>';
    }
    if (task.priority) {
        metaHTML += '<span class="task-priority ' + task.priority + '"><i class="fas ' + priorityIcons[task.priority] + '"></i> ' + capitalizeFirstLetter(task.priority) + '</span>';
    }
    if (task.category) {
        metaHTML += '<span class="task-category"><i class="fas ' + categoryIcons[task.category] + '"></i> ' + capitalizeFirstLetter(task.category) + '</span>';
    }
    if (task.dueDate) {
        metaHTML += '<span class="task-due"><i class="fas fa-calendar-alt"></i> ' + task.dueDate + '</span>';
    }
    metaHTML += '</div>';
    
    var titleHTML = linkifyText(task.title);
    var descHTML = task.description ? linkifyText(task.description) : '';
    var notesHTML = task.notes ? linkifyText(task.notes) : '';
    
    // Build subtasks HTML
    var subtasksHTML = '';
    if (task.subtasks && task.subtasks.length > 0) {
        subtasksHTML = '<div class="task-subtasks">';
        for (var i = 0; i < task.subtasks.length; i++) {
            var subtask = task.subtasks[i];
            subtasksHTML += 
                '<div class="subtask-item' + (subtask.completed ? ' completed' : '') + '">' +
                    '<input type="checkbox" class="subtask-checkbox" ' + 
                    (subtask.completed ? 'checked' : '') + 
                    ' onchange="toggleSubtaskComplete(\'' + day + '\', ' + task.id + ', ' + subtask.id + ')">' +
                    '<span class="subtask-text">' + linkifyText(subtask.text) + '</span>' +
                '</div>';
        }
        subtasksHTML += '</div>';
    }
    
    taskDiv.innerHTML = 
        '<div class="task-header">' +
            '<div class="checkbox-wrapper">' +
                '<input type="checkbox" class="task-checkbox" ' + (task.completed ? 'checked' : '') + ' onchange="toggleTaskComplete(\'' + day + '\', ' + task.id + ')">' +
            '</div>' +
            '<div class="task-content">' +
                '<div class="task-title">' + titleHTML + '</div>' +
                metaHTML +
            '</div>' +
        '</div>' +
        (task.description ? '<div class="task-description">' + descHTML + '</div>' : '') +
        subtasksHTML +
        (task.notes ? '<div class="task-notes"><i class="fas fa-sticky-note"></i><span>' + notesHTML + '</span></div>' : '') +
        '<div class="task-actions">' +
            '<button class="task-btn" onclick="showTaskDetails(\'' + day + '\', ' + task.id + ')"><i class="fas fa-info-circle"></i> See Details</button>' +
        '</div>';
    
    return taskDiv;
}

// Toggle task completion
function toggleTaskComplete(day, taskId) {
    playSound('complete');
    for (var i = 0; i < tasks[day].length; i++) {
        if (tasks[day][i].id === taskId) {
            var wasCompleted = tasks[day][i].completed;
            tasks[day][i].completed = !tasks[day][i].completed;
            
            // Show appreciation when task is completed
            if (!wasCompleted && tasks[day][i].completed) {
                var profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                var name = profile.name && profile.name.trim() !== '' ? profile.name : '';
                var messages = [
                    'Great job' + (name ? ', ' + name : '') + '! Task completed! <i class="fas fa-party-horn"></i>',
                    'Awesome work' + (name ? ', ' + name : '') + '! Keep it up! <i class="fas fa-dumbbell"></i>',
                    'Well done' + (name ? ', ' + name : '') + '! You\'re crushing it! <i class="fas fa-star"></i>',
                    'Fantastic' + (name ? ', ' + name : '') + '! Another one done! <i class="fas fa-sparkles"></i>',
                    'Excellent' + (name ? ', ' + name : '') + '! You\'re on fire! <i class="fas fa-fire"></i>'
                ];
                var randomMessage = messages[Math.floor(Math.random() * messages.length)];
                showNotification(randomMessage, 'success');
            }
            
            saveTasksToStorage();
            renderTasks(day);
            break;
        }
    }
}

// Toggle subtask completion
function toggleSubtaskComplete(day, taskId, subtaskId) {
    playSound('click');
    for (var i = 0; i < tasks[day].length; i++) {
        if (tasks[day][i].id === taskId) {
            var task = tasks[day][i];
            if (task.subtasks) {
                for (var j = 0; j < task.subtasks.length; j++) {
                    if (task.subtasks[j].id === subtaskId) {
                        task.subtasks[j].completed = !task.subtasks[j].completed;
                        saveTasksToStorage();
                        renderTasks(day);
                        return;
                    }
                }
            }
            break;
        }
    }
}

// Edit task
function editTask(day, taskId) {
    currentDay = day;
    editingTaskId = taskId;
    
    var task = null;
    for (var i = 0; i < tasks[day].length; i++) {
        if (tasks[day][i].id === taskId) {
            task = tasks[day][i];
            break;
        }
    }
    if (!task) return;
    
    // Populate form
    var taskTitle = document.getElementById('taskTitle');
    var taskTime = document.getElementById('taskTime');
    var taskDueDate = document.getElementById('taskDueDate');
    var taskPriority = document.getElementById('taskPriority');
    var taskCategory = document.getElementById('taskCategory');
    var taskPeriod = document.getElementById('taskPeriod');
    var taskDescription = document.getElementById('taskDescription');
    var taskNotes = document.getElementById('taskNotes');
    
    if (taskTitle) taskTitle.value = task.title;
    if (taskTime) taskTime.value = task.time || '';
    if (taskDueDate) taskDueDate.value = task.dueDate || '';
    if (taskPriority) taskPriority.value = task.priority || 'medium';
    if (taskCategory) taskCategory.value = task.category || 'work';
    if (taskPeriod) taskPeriod.value = task.period || '';
    if (taskDescription) taskDescription.value = task.description || '';
    if (taskNotes) taskNotes.value = task.notes || '';
    
    // Load subtasks
    loadSubtasksToForm(task.subtasks);
    
    // Update modal title
    var modalTitle = document.getElementById('modalTitle');
    var submitBtn = document.getElementById('submitBtn');
    
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Task - ' + capitalizeFirstLetter(day);
    }
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Task';
    }
    
    // Show modal
    var modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.add('active');
    }
    
    playSound('click');
}

// Delete task
function deleteTask(day, taskId) {
    showConfirm('Are you sure you want to delete this task?', function(confirmed) {
        if (!confirmed) return;
        
        playSound('delete');
        
        var newTasks = [];
        for (var i = 0; i < tasks[day].length; i++) {
            if (tasks[day][i].id !== taskId) {
                newTasks.push(tasks[day][i]);
            }
        }
        tasks[day] = newTasks;
        
        saveTasksToStorage();
        renderTasks(day);
        showNotification('Task deleted successfully!', 'success');
    });
}

// Save tasks to localStorage
function saveTasksToStorage() {
    localStorage.setItem('weeklyTasks', JSON.stringify(tasks));
}

// Load tasks from localStorage
function loadTasksFromStorage() {
    var stored = localStorage.getItem('weeklyTasks');
    if (stored) {
        try {
            tasks = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading tasks from storage:', e);
        }
    }
}

// Utility functions
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function escapeHtml(text) {
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) {
        return map[m];
    });
}

// Function to detect and linkify URLs
function linkifyText(text) {
    if (!text) return '';
    
    // Escape HTML first
    var escaped = escapeHtml(text);
    
    // URL regex pattern
    var urlPattern = /(https?:\/\/[^\s]+)/g;
    
    // Replace URLs with clickable links
    return escaped.replace(urlPattern, function(url) {
        return '<a href="' + url + '" class="task-link" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">' + url + '</a>';
    });
}

// Function to show task details modal
function showTaskDetails(day, taskId) {
    var task = null;
    for (var i = 0; i < tasks[day].length; i++) {
        if (tasks[day][i].id === taskId) {
            task = tasks[day][i];
            break;
        }
    }
    if (!task) return;
    
    // Create modal if it doesn't exist
    var existingModal = document.getElementById('taskDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'taskDetailsModal';
    
    var priorityIcons = {
        high: 'fa-exclamation-circle',
        medium: 'fa-minus-circle',
        low: 'fa-info-circle'
    };
    
    var categoryIcons = {
        work: 'fa-briefcase',
        personal: 'fa-user',
        health: 'fa-heartbeat',
        study: 'fa-book',
        other: 'fa-circle'
    };
    
    var periodNames = {
        'early-morning': 'Early Morning',
        'morning': 'Morning',
        'afternoon': 'Afternoon',
        'evening': 'Evening',
        'night': 'Night',
        'late-night': 'Late Night'
    };
    
    var periodIcons = {
        'early-morning': 'fa-sunrise',
        'morning': 'fa-sun',
        'afternoon': 'fa-cloud-sun',
        'evening': 'fa-sunset',
        'night': 'fa-moon',
        'late-night': 'fa-star'
    };
    
    var detailsHTML = '<div class="modal-content task-details-modal">' +
        '<div class="modal-header">' +
            '<h3 class="modal-title">' +
                '<i class="fas fa-info-circle"></i> Task Details' +
            '</h3>' +
            '<button class="close-btn" onclick="closeTaskDetailsModal()">' +
                '<i class="fas fa-times"></i>' +
            '</button>' +
        '</div>' +
        '<div class="task-details-content">' +
            '<div class="detail-section">' +
                '<h4><i class="fas fa-heading"></i> Title</h4>' +
                '<p class="detail-value">' + linkifyText(task.title) + '</p>' +
            '</div>' +
            '<div class="detail-row">' +
                '<div class="detail-section">' +
                    '<h4><i class="fas fa-calendar-day"></i> Day</h4>' +
                    '<p class="detail-value">' + capitalizeFirstLetter(day) + '</p>' +
                '</div>' +
                '<div class="detail-section">' +
                    '<h4><i class="fas fa-flag"></i> Priority</h4>' +
                    '<p class="detail-value priority-' + task.priority + '">' +
                        '<i class="fas ' + priorityIcons[task.priority] + '"></i> ' +
                        capitalizeFirstLetter(task.priority) +
                    '</p>' +
                '</div>' +
            '</div>' +
            (task.time || task.dueDate || task.period ? 
                '<div class="detail-row">' +
                    (task.time ? '<div class="detail-section"><h4><i class="fas fa-clock"></i> Time</h4><p class="detail-value">' + task.time + '</p></div>' : '') +
                    (task.dueDate ? '<div class="detail-section"><h4><i class="fas fa-calendar-alt"></i> Due Date</h4><p class="detail-value">' + task.dueDate + '</p></div>' : '') +
                    (task.period ? '<div class="detail-section"><h4><i class="fas ' + periodIcons[task.period] + '"></i> Period</h4><p class="detail-value">' + periodNames[task.period] + '</p></div>' : '') +
                '</div>' 
            : '') +
            '<div class="detail-row">' +
                '<div class="detail-section">' +
                    '<h4><i class="fas fa-tag"></i> Category</h4>' +
                    '<p class="detail-value">' +
                        '<i class="fas ' + categoryIcons[task.category] + '"></i> ' +
                        capitalizeFirstLetter(task.category) +
                    '</p>' +
                '</div>' +
                '<div class="detail-section">' +
                    '<h4><i class="fas fa-check-circle"></i> Status</h4>' +
                    '<p class="detail-value status-' + (task.completed ? 'completed' : 'active') + '">' +
                        '<i class="fas ' + (task.completed ? 'fa-check-circle' : 'fa-clock') + '"></i> ' +
                        (task.completed ? 'Completed' : 'Active') +
                    '</p>' +
                '</div>' +
            '</div>' +
            (task.description ? 
                '<div class="detail-section">' +
                    '<h4><i class="fas fa-align-left"></i> Description</h4>' +
                    '<p class="detail-value description-text">' + linkifyText(task.description) + '</p>' +
                '</div>'
            : '') +
            (task.notes ? 
                '<div class="detail-section">' +
                    '<h4><i class="fas fa-sticky-note"></i> Notes</h4>' +
                    '<p class="detail-value notes-text">' + linkifyText(task.notes) + '</p>' +
                '</div>'
            : '') +
        '</div>' +
        '<div class="task-details-actions">' +
            '<button class="btn btn-primary" onclick="editTaskFromDetails(\'' + day + '\', ' + task.id + ')">' +
                '<i class="fas fa-edit"></i> Edit Task' +
            '</button>' +
            '<button class="btn btn-danger" onclick="deleteTaskFromDetails(\'' + day + '\', ' + task.id + ')">' +
                '<i class="fas fa-trash"></i> Delete Task' +
            '</button>' +
        '</div>' +
    '</div>';
    
    modal.innerHTML = detailsHTML;
    document.body.appendChild(modal);
    
    // Add click outside to close
    setTimeout(function() {
        modal.classList.add('active');
        modal.addEventListener('click', function(e) {
            if (e.target.id === 'taskDetailsModal') {
                closeTaskDetailsModal();
            }
        });
    }, 10);
}

// Close task details modal
function closeTaskDetailsModal() {
    var modal = document.getElementById('taskDetailsModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(function() {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

// Edit task from details modal
function editTaskFromDetails(day, taskId) {
    closeTaskDetailsModal();
    editTask(day, taskId);
}

// Delete task from details modal
function deleteTaskFromDetails(day, taskId) {
    closeTaskDetailsModal();
    deleteTask(day, taskId);
}
