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
var inboxViewEnabled = false;

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
    updateCoinsDisplay(); // Initialize coin display
    updateFeatureLockStates(); // Initialize feature lock states
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
    // Setup form submission - only via button click
    var taskForm = document.getElementById('taskForm');
    if (taskForm) {
        // Prevent default form submission on Enter
        taskForm.addEventListener('submit', handleFormSubmit);
        
        // Setup Enter key to move to next field instead of submitting
        taskForm.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                
                // Get all focusable inputs in the form
                var inputs = Array.from(taskForm.querySelectorAll('input:not([type="checkbox"]), select, textarea'));
                var currentIndex = inputs.indexOf(e.target);
                
                // Move to next input if exists
                if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
                    inputs[currentIndex + 1].focus();
                }
            }
        });
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

// Focus Mode Functions - Premium Full-Screen Experience
function toggleFocusMode() {
    focusModeEnabled = !focusModeEnabled;
    
    var focusOverlay = document.getElementById('focusModeOverlay');
    var focusIcon = document.getElementById('focusIcon');
    
    if (focusModeEnabled) {
        // Show premium focus mode overlay
        if (focusOverlay) {
            focusOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        // Update header icon
        if (focusIcon) {
            focusIcon.className = 'fas fa-times';
            focusIcon.parentElement.classList.add('active');
        }
        
        // Initialize focus mode
        initializeFocusMode();
        startFocusClock();
        
    } else {
        // Hide focus mode overlay
        if (focusOverlay) {
            focusOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        // Reset header icon
        if (focusIcon) {
            focusIcon.className = 'fas fa-bullseye';
            focusIcon.parentElement.classList.remove('active');
        }
        
        // Stop the clock
        if (focusClockInterval) {
            clearInterval(focusClockInterval);
            focusClockInterval = null;
        }
    }
}

var focusClockInterval = null;

function initializeFocusMode() {
    // Get current day
    var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var today = new Date().getDay();
    var currentDayKey = days[today];
    var currentDayName = dayNames[today];
    
    // Update day name in header
    var focusDayName = document.getElementById('focusDayName');
    if (focusDayName) {
        focusDayName.textContent = currentDayName + "'s Tasks";
    }
    
    // Update date display
    var focusDate = document.getElementById('focusDate');
    if (focusDate) {
        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        focusDate.textContent = new Date().toLocaleDateString('en-US', options);
    }
    
    // Load motivational quote
    loadFocusQuote();
    
    // Render tasks for today
    renderFocusTasks(currentDayKey);
}

function startFocusClock() {
    updateFocusClock();
    focusClockInterval = setInterval(updateFocusClock, 1000);
}

function updateFocusClock() {
    var clockElement = document.getElementById('focusClock');
    if (clockElement) {
        var now = new Date();
        var hours = String(now.getHours()).padStart(2, '0');
        var minutes = String(now.getMinutes()).padStart(2, '0');
        var seconds = String(now.getSeconds()).padStart(2, '0');
        clockElement.textContent = hours + ':' + minutes + ':' + seconds;
    }
}

function renderFocusTasks(day) {
    var tasksList = document.getElementById('focusTasksList');
    var emptyState = document.getElementById('focusEmptyState');
    var dayTasks = tasks[day] || [];
    
    if (!tasksList) return;
    
    // Update stats
    var totalTasks = dayTasks.length;
    var completedTasks = dayTasks.filter(function(t) { return t.completed; }).length;
    var progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    var totalEl = document.getElementById('focusTotalTasks');
    var completedEl = document.getElementById('focusCompletedTasks');
    var progressEl = document.getElementById('focusProgressPercent');
    var progressBar = document.getElementById('focusProgressBar');
    
    if (totalEl) totalEl.textContent = totalTasks;
    if (completedEl) completedEl.textContent = completedTasks;
    if (progressEl) progressEl.textContent = progressPercent + '%';
    if (progressBar) progressBar.style.width = progressPercent + '%';
    
    // Show empty state or tasks
    if (dayTasks.length === 0) {
        tasksList.style.display = 'none';
        if (emptyState) emptyState.classList.add('show');
        return;
    }
    
    tasksList.style.display = 'flex';
    if (emptyState) emptyState.classList.remove('show');
    
    // Render task items
    tasksList.innerHTML = '';
    
    dayTasks.forEach(function(task) {
        var taskItem = document.createElement('div');
        taskItem.className = 'focus-task-item priority-' + task.priority + (task.completed ? ' completed' : '');
        taskItem.setAttribute('data-task-id', task.id);
        
        var categoryIcons = {
            work: 'fa-briefcase',
            personal: 'fa-user',
            health: 'fa-heartbeat',
            study: 'fa-book',
            other: 'fa-circle'
        };
        
        var metaHTML = '';
        if (task.time) {
            metaHTML += '<span class="focus-task-tag time"><i class="fas fa-clock"></i> ' + task.time + '</span>';
        }
        if (task.category) {
            metaHTML += '<span class="focus-task-tag category"><i class="fas ' + categoryIcons[task.category] + '"></i> ' + capitalizeFirstLetter(task.category) + '</span>';
        }
        if (task.priority) {
            metaHTML += '<span class="focus-task-tag"><i class="fas fa-flag"></i> ' + capitalizeFirstLetter(task.priority) + '</span>';
        }
        
        taskItem.innerHTML = 
            '<div class="focus-task-checkbox ' + (task.completed ? 'checked' : '') + '" onclick="toggleFocusTaskComplete(\'' + day + '\', ' + task.id + ')"></div>' +
            '<div class="focus-task-content">' +
                '<div class="focus-task-title">' + task.title + '</div>' +
                '<div class="focus-task-meta">' + metaHTML + '</div>' +
            '</div>' +
            '<div class="focus-task-actions">' +
                '<button class="focus-task-action-btn" onclick="editTaskFromFocus(\'' + day + '\', ' + task.id + ')" title="Edit">' +
                    '<i class="fas fa-pen"></i>' +
                '</button>' +
                '<button class="focus-task-action-btn delete" onclick="deleteTaskFromFocus(\'' + day + '\', ' + task.id + ')" title="Delete">' +
                    '<i class="fas fa-trash"></i>' +
                '</button>' +
            '</div>';
        
        tasksList.appendChild(taskItem);
    });
}

function toggleFocusTaskComplete(day, taskId) {
    playSound('complete');
    
    for (var i = 0; i < tasks[day].length; i++) {
        if (tasks[day][i].id === taskId) {
            var wasCompleted = tasks[day][i].completed;
            tasks[day][i].completed = !tasks[day][i].completed;
            
            if (!wasCompleted && tasks[day][i].completed) {
                // Award coins for completing task
                addCoins(COINS_PER_TASK, 'Completed task: ' + tasks[day][i].title);
                
                var profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                var name = profile.name && profile.name.trim() !== '' ? profile.name : '';
                var messages = [
                    'Great job' + (name ? ', ' + name : '') + '! +' + COINS_PER_TASK + ' coins! <i class="fas fa-sparkles"></i>',
                    'Awesome work' + (name ? ', ' + name : '') + '! +' + COINS_PER_TASK + ' coins! <i class="fas fa-dumbbell"></i>',
                    'Well done' + (name ? ', ' + name : '') + '! +' + COINS_PER_TASK + ' coins! <i class="fas fa-star"></i>',
                    'You\'re crushing it' + (name ? ', ' + name : '') + '! +' + COINS_PER_TASK + ' coins! <i class="fas fa-fire"></i>'
                ];
                showNotification(messages[Math.floor(Math.random() * messages.length)], 'success');
            } else if (wasCompleted && !tasks[day][i].completed) {
                // Remove coins if uncompleting task
                removeCoins(COINS_PER_TASK);
            }
            
            saveTasksToStorage();
            renderFocusTasks(day);
            renderTasks(day);
            updateHeaderStats();
            break;
        }
    }
}

function editTaskFromFocus(day, taskId) {
    toggleFocusMode(); // Close focus mode
    setTimeout(function() {
        editTask(day, taskId);
    }, 300);
}

function deleteTaskFromFocus(day, taskId) {
    showConfirm('Delete this task?', function(confirmed) {
        if (confirmed) {
            for (var i = 0; i < tasks[day].length; i++) {
                if (tasks[day][i].id === taskId) {
                    tasks[day].splice(i, 1);
                    break;
                }
            }
            saveTasksToStorage();
            renderFocusTasks(day);
            renderTasks(day);
            showNotification('Task deleted', 'success');
        }
    });
}

function openTaskModalFromFocus() {
    var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    var today = new Date().getDay();
    var currentDayKey = days[today];
    
    // Open task modal without closing focus mode
    openTaskModal(currentDayKey);
}

// ===== WEEKLY COINS SYSTEM =====
var COINS_PER_TASK = 5;
var COINS_PER_SUBTASK = 0.5;

function getCoinsData() {
    var data = JSON.parse(localStorage.getItem('weeklyCoins') || '{}');
    var currentWeek = getWeekNumber();
    
    // Reset coins if it's a new week
    if (data.week !== currentWeek) {
        data = {
            week: currentWeek,
            coins: 0,
            totalEarned: data.totalEarned || 0,
            history: data.history || []
        };
        saveCoinsData(data);
    }
    return data;
}

function saveCoinsData(data) {
    localStorage.setItem('weeklyCoins', JSON.stringify(data));
}

function getWeekNumber() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 1);
    var diff = now - start;
    var oneWeek = 604800000; // milliseconds in a week
    return Math.floor(diff / oneWeek) + '-' + now.getFullYear();
}

function addCoins(amount, reason) {
    var data = getCoinsData();
    data.coins += amount;
    data.totalEarned = (data.totalEarned || 0) + amount;
    
    // Add to history
    if (!data.history) data.history = [];
    data.history.push({
        amount: amount,
        reason: reason,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 entries
    if (data.history.length > 50) {
        data.history = data.history.slice(-50);
    }
    
    saveCoinsData(data);
    updateCoinsDisplay();
    showCoinAnimation(amount);
}

function removeCoins(amount) {
    var data = getCoinsData();
    data.coins = Math.max(0, data.coins - amount);
    saveCoinsData(data);
    updateCoinsDisplay();
}

function updateCoinsDisplay() {
    var data = getCoinsData();
    var coinsEl = document.getElementById('weeklyCoins');
    if (coinsEl) {
        coinsEl.textContent = data.coins.toFixed(1);
        // Add pulse animation
        coinsEl.classList.add('coin-pulse');
        setTimeout(function() {
            coinsEl.classList.remove('coin-pulse');
        }, 600);
    }
}

function showCoinAnimation(amount) {
    var coinPopup = document.createElement('div');
    coinPopup.className = 'coin-popup';
    coinPopup.innerHTML = '<i class="fas fa-coins"></i> +' + amount.toFixed(1);
    document.body.appendChild(coinPopup);
    
    setTimeout(function() {
        coinPopup.classList.add('show');
    }, 10);
    
    setTimeout(function() {
        coinPopup.classList.add('fade-out');
        setTimeout(function() {
            coinPopup.remove();
        }, 500);
    }, 2000);
}

function showCoinsHistory() {
    var data = getCoinsData();
    
    // Create modal overlay
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'coinsHistoryModal';
    overlay.onclick = function(e) {
        if (e.target === overlay) closeCoinsHistory();
    };
    
    var currentCoins = data.coins.toFixed(1);
    var totalEarned = (data.totalEarned || 0).toFixed(1);
    var history = data.history || [];
    
    var historyHtml = '';
    if (history.length === 0) {
        historyHtml = '<div class="coins-empty"><i class="fas fa-coins"></i><p>No coin activity yet. Complete tasks to earn coins!</p></div>';
    } else {
        // Show last 20 entries, newest first
        var recentHistory = history.slice(-20).reverse();
        recentHistory.forEach(function(entry) {
            var date = new Date(entry.timestamp);
            var timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            var dateStr = date.toLocaleDateString([], {month: 'short', day: 'numeric'});
            historyHtml += '<div class="coin-history-item">' +
                '<div class="coin-history-left">' +
                    '<span class="coin-amount">+' + entry.amount.toFixed(1) + '</span>' +
                    '<span class="coin-reason">' + (entry.reason || 'Task completed') + '</span>' +
                '</div>' +
                '<div class="coin-history-time">' + dateStr + ' ' + timeStr + '</div>' +
            '</div>';
        });
    }
    
    overlay.innerHTML = 
        '<div class="modal-content coins-modal">' +
            '<div class="modal-header">' +
                '<div class="modal-title-wrapper">' +
                    '<i class="fas fa-coins" style="color: #ffc107;"></i>' +
                    '<h3>Weekly Coins</h3>' +
                '</div>' +
                '<button class="close-btn" onclick="closeCoinsHistory()">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>' +
            '<div class="modal-body">' +
                '<div class="coins-stats-grid">' +
                    '<div class="coins-stat-card current">' +
                        '<div class="coins-stat-icon"><i class="fas fa-wallet"></i></div>' +
                        '<div class="coins-stat-info">' +
                            '<span class="coins-stat-value">' + currentCoins + '</span>' +
                            '<span class="coins-stat-label">This Week</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="coins-stat-card total">' +
                        '<div class="coins-stat-icon"><i class="fas fa-piggy-bank"></i></div>' +
                        '<div class="coins-stat-info">' +
                            '<span class="coins-stat-value">' + totalEarned + '</span>' +
                            '<span class="coins-stat-label">All Time</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="coins-info-card">' +
                    '<h4><i class="fas fa-info-circle"></i> How to Earn</h4>' +
                    '<div class="coins-info-items">' +
                        '<div class="coins-info-item"><i class="fas fa-check-circle"></i> Complete a task <span>+5 coins</span></div>' +
                        '<div class="coins-info-item"><i class="fas fa-check"></i> Complete a subtask <span>+0.5 coins</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="coins-history-section">' +
                    '<h4><i class="fas fa-history"></i> Recent Activity</h4>' +
                    '<div class="coins-history-list">' + historyHtml + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    document.body.appendChild(overlay);
}

function closeCoinsHistory() {
    var modal = document.getElementById('coinsHistoryModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(function() {
            modal.remove();
        }, 300);
    }
}

// ===== FEATURE UNLOCK SYSTEM =====
var FEATURE_COSTS = {
    calendar: 15,
    focusMode: 25,
    agent: 50
};

function getUnlockedFeatures() {
    return JSON.parse(localStorage.getItem('unlockedFeatures') || '{}');
}

function saveUnlockedFeatures(features) {
    localStorage.setItem('unlockedFeatures', JSON.stringify(features));
}

function isFeatureUnlocked(featureName) {
    var features = getUnlockedFeatures();
    return features[featureName] === true;
}

function unlockFeature(featureName) {
    var cost = FEATURE_COSTS[featureName];
    var data = getCoinsData();
    
    if (data.coins >= cost) {
        // Deduct coins
        data.coins -= cost;
        saveCoinsData(data);
        updateCoinsDisplay();
        
        // Unlock feature
        var features = getUnlockedFeatures();
        features[featureName] = true;
        saveUnlockedFeatures(features);
        
        // Update UI
        updateFeatureLockStates();
        
        return true;
    }
    return false;
}

function tryAccessFeature(featureName, callback) {
    if (isFeatureUnlocked(featureName)) {
        callback();
        return;
    }
    
    var cost = FEATURE_COSTS[featureName];
    var data = getCoinsData();
    var featureNames = {
        calendar: 'Calendar',
        focusMode: 'Focus Mode',
        agent: 'Weekly Agent'
    };
    var featureIcons = {
        calendar: 'fa-calendar-alt',
        focusMode: 'fa-bullseye',
        agent: 'fa-robot'
    };
    
    showUnlockModal(featureName, featureNames[featureName], featureIcons[featureName], cost, data.coins);
}

function showUnlockModal(featureKey, featureName, featureIcon, cost, currentCoins) {
    var canUnlock = currentCoins >= cost;
    
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'unlockModal';
    overlay.onclick = function(e) {
        if (e.target === overlay) closeUnlockModal();
    };
    
    overlay.innerHTML = 
        '<div class="modal-content unlock-modal">' +
            '<div class="unlock-modal-header">' +
                '<div class="unlock-feature-icon ' + (canUnlock ? 'can-unlock' : 'locked') + '">' +
                    '<i class="fas ' + featureIcon + '"></i>' +
                    '<div class="lock-badge"><i class="fas fa-lock"></i></div>' +
                '</div>' +
                '<button class="close-btn" onclick="closeUnlockModal()">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>' +
            '<div class="unlock-modal-body">' +
                '<h2>Unlock ' + featureName + '</h2>' +
                '<p class="unlock-description">This premium feature requires coins to unlock. Once unlocked, it stays unlocked forever!</p>' +
                '<div class="unlock-cost-display">' +
                    '<div class="cost-item">' +
                        '<span class="cost-label">Cost</span>' +
                        '<span class="cost-value"><i class="fas fa-coins"></i> ' + cost + '</span>' +
                    '</div>' +
                    '<div class="cost-divider"></div>' +
                    '<div class="cost-item">' +
                        '<span class="cost-label">Your Coins</span>' +
                        '<span class="cost-value ' + (canUnlock ? 'enough' : 'not-enough') + '"><i class="fas fa-wallet"></i> ' + currentCoins.toFixed(1) + '</span>' +
                    '</div>' +
                '</div>' +
                (canUnlock ? 
                    '<button class="btn-unlock" onclick="confirmUnlock(\'' + featureKey + '\')">' +
                        '<i class="fas fa-unlock"></i> Unlock Now' +
                    '</button>' :
                    '<div class="not-enough-coins">' +
                        '<i class="fas fa-exclamation-circle"></i>' +
                        '<span>You need <strong>' + (cost - currentCoins).toFixed(1) + '</strong> more coins</span>' +
                    '</div>' +
                    '<p class="earn-hint"><i class="fas fa-lightbulb"></i> Complete tasks to earn more coins!</p>'
                ) +
            '</div>' +
        '</div>';
    
    document.body.appendChild(overlay);
}

function closeUnlockModal() {
    var modal = document.getElementById('unlockModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(function() {
            modal.remove();
        }, 300);
    }
}

function confirmUnlock(featureKey) {
    var featureNames = {
        calendar: 'Calendar',
        focusMode: 'Focus Mode',
        agent: 'Weekly Agent'
    };
    
    if (unlockFeature(featureKey)) {
        closeUnlockModal();
        showNotification('<i class="fas fa-unlock"></i> ' + featureNames[featureKey] + ' unlocked!', 'success');
        
        // Auto-trigger the feature after unlock
        setTimeout(function() {
            if (featureKey === 'focusMode') {
                toggleFocusMode();
            } else if (featureKey === 'calendar') {
                window.location.href = 'calendar.html';
            } else if (featureKey === 'agent') {
                window.location.href = 'agent.html';
            }
        }, 500);
    }
}

function updateFeatureLockStates() {
    var focusBtn = document.querySelector('.action-icon-btn[onclick*="toggleFocusMode"], .action-icon-btn[onclick*="tryFocusMode"]');
    var calendarBtn = document.querySelector('.action-icon-btn[href="calendar.html"], a.action-icon-btn[onclick*="tryCalendar"]');
    var agentBtn = document.querySelector('.action-icon-btn[href="agent.html"], a.action-icon-btn[onclick*="tryAgent"]');
    
    // Update Focus Mode button
    if (focusBtn) {
        if (isFeatureUnlocked('focusMode')) {
            focusBtn.classList.remove('feature-locked');
            focusBtn.setAttribute('onclick', 'toggleFocusMode()');
            focusBtn.innerHTML = '<i class="fas fa-bullseye" id="focusIcon"></i>';
        } else {
            focusBtn.classList.add('feature-locked');
            focusBtn.setAttribute('onclick', 'tryFocusMode()');
            focusBtn.innerHTML = '<i class="fas fa-bullseye"></i><span class="lock-indicator"><i class="fas fa-lock"></i></span>';
        }
    }
    
    // Update Calendar button
    if (calendarBtn) {
        if (isFeatureUnlocked('calendar')) {
            calendarBtn.classList.remove('feature-locked');
            calendarBtn.removeAttribute('onclick');
            calendarBtn.setAttribute('href', 'calendar.html');
            calendarBtn.innerHTML = '<i class="fas fa-calendar-alt"></i>';
        } else {
            calendarBtn.classList.add('feature-locked');
            calendarBtn.setAttribute('onclick', 'tryCalendar(event)');
            calendarBtn.setAttribute('href', '#');
            calendarBtn.innerHTML = '<i class="fas fa-calendar-alt"></i><span class="lock-indicator"><i class="fas fa-lock"></i></span>';
        }
    }
    
    // Update Agent button
    if (agentBtn) {
        if (isFeatureUnlocked('agent')) {
            agentBtn.classList.remove('feature-locked');
            agentBtn.removeAttribute('onclick');
            agentBtn.setAttribute('href', 'agent.html');
            agentBtn.innerHTML = '<i class="fas fa-robot"></i>';
        } else {
            agentBtn.classList.add('feature-locked');
            agentBtn.setAttribute('onclick', 'tryAgent(event)');
            agentBtn.setAttribute('href', '#');
            agentBtn.innerHTML = '<i class="fas fa-robot"></i><span class="lock-indicator"><i class="fas fa-lock"></i></span>';
        }
    }
}

function tryFocusMode() {
    tryAccessFeature('focusMode', function() {
        toggleFocusMode();
    });
}

function tryCalendar(event) {
    if (event) event.preventDefault();
    tryAccessFeature('calendar', function() {
        window.location.href = 'calendar.html';
    });
}

function tryAgent(event) {
    if (event) event.preventDefault();
    tryAccessFeature('agent', function() {
        window.location.href = 'agent.html';
    });
}

var focusQuotes = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
    { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
    { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
    { text: "Concentrate all your thoughts upon the work in hand.", author: "Alexander Graham Bell" },
    { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Your focus determines your reality.", author: "George Lucas" },
    { text: "Starve your distractions, feed your focus.", author: "Unknown" }
];

function loadFocusQuote() {
    var quote = focusQuotes[Math.floor(Math.random() * focusQuotes.length)];
    var quoteEl = document.getElementById('focusQuote');
    var authorEl = document.getElementById('focusQuoteAuthor');
    
    if (quoteEl) quoteEl.textContent = quote.text;
    if (authorEl) authorEl.textContent = '— ' + quote.author;
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
    var avatarElement = document.getElementById('profileAvatarDisplay');
    
    var name = (profile.name && profile.name.trim() !== '') ? profile.name : 'Guest';
    var initials = name.split(' ').map(function(n) { return n.charAt(0); }).join('').toUpperCase().substring(0, 2);
    
    if (displayElement) {
        displayElement.textContent = name;
        displayElement.style.display = 'block';
    }
    
    if (avatarElement) {
        avatarElement.textContent = initials || 'G';
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
    var searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    var days = Object.keys(tasks);
    for (var i = 0; i < days.length; i++) {
        var day = days[i];
        var dayTasks = tasks[day];
        
        for (var j = 0; j < dayTasks.length; j++) {
            var task = dayTasks[j];
            var taskElement = document.querySelector('[data-task-id="' + task.id + '"]');
            if (!taskElement) continue;
            
            var matchesSearch = !searchTerm || 
                              task.title.toLowerCase().indexOf(searchTerm) !== -1 ||
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
    inboxViewEnabled = false;
    
    // Show week grid if it was hidden
    var weekGrid = document.querySelector('.week-grid, .week-grid-modern');
    if (weekGrid) {
        weekGrid.style.display = 'grid';
    }
    
    // Hide inbox container if it exists
    var inboxContainer = document.getElementById('inbox-container');
    if (inboxContainer) {
        inboxContainer.style.display = 'none';
    }
    
    // Update active filter button (both old and new styles)
    var filterBtns = document.querySelectorAll('.filter-btn, .filter-pill');
    for (var i = 0; i < filterBtns.length; i++) {
        filterBtns[i].classList.remove('active');
    }
    
    // Add active class to clicked button
    var clickedBtn = event && event.target ? event.target.closest('.filter-btn, .filter-pill') : null;
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    
    filterTasks();
}

function filterByPriority(priority) {
    currentFilter = priority;
    inboxViewEnabled = false;
    
    // Show week grid if it was hidden
    var weekGrid = document.querySelector('.week-grid, .week-grid-modern');
    if (weekGrid) {
        weekGrid.style.display = 'grid';
    }
    
    // Hide inbox container if it exists
    var inboxContainer = document.getElementById('inbox-container');
    if (inboxContainer) {
        inboxContainer.style.display = 'none';
    }
    
    // Update active filter button (both old and new styles)
    var filterBtns = document.querySelectorAll('.filter-btn, .filter-pill');
    for (var i = 0; i < filterBtns.length; i++) {
        filterBtns[i].classList.remove('active');
    }
    
    // Add active class to clicked button
    var clickedBtn = event && event.target ? event.target.closest('.filter-btn, .filter-pill') : null;
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    
    filterTasks();
}

// INBOX View - Show all tasks from all days
function showInboxView() {
    inboxViewEnabled = true;
    currentFilter = 'all';
    
    // Update active filter button (both old and new styles)
    var filterBtns = document.querySelectorAll('.filter-btn, .filter-pill');
    for (var i = 0; i < filterBtns.length; i++) {
        filterBtns[i].classList.remove('active');
    }
    
    // Add active class to INBOX button
    var inboxBtn = document.querySelector('[data-filter="inbox"]');
    if (inboxBtn) {
        inboxBtn.classList.add('active');
    }
    
    // Hide the week grid
    var weekGrid = document.querySelector('.week-grid, .week-grid-modern');
    if (weekGrid) {
        weekGrid.style.display = 'none';
    }
    
    // Create or get inbox container
    var inboxContainer = document.getElementById('inbox-container');
    if (!inboxContainer) {
        inboxContainer = document.createElement('div');
        inboxContainer.id = 'inbox-container';
        inboxContainer.className = 'inbox-container';
        weekGrid.parentNode.insertBefore(inboxContainer, weekGrid.nextSibling);
    }
    
    inboxContainer.style.display = 'block';
    inboxContainer.innerHTML = '';
    
    // Create inbox header
    var inboxHeader = document.createElement('div');
    inboxHeader.className = 'inbox-header';
    inboxHeader.innerHTML = '<h2><i class="fas fa-inbox"></i> INBOX - All Tasks</h2>';
    inboxContainer.appendChild(inboxHeader);
    
    // Collect all tasks from all days
    var allTasks = [];
    var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    var dayNames = {
        'monday': 'Monday',
        'tuesday': 'Tuesday',
        'wednesday': 'Wednesday',
        'thursday': 'Thursday',
        'friday': 'Friday',
        'saturday': 'Saturday',
        'sunday': 'Sunday'
    };
    
    for (var i = 0; i < days.length; i++) {
        var day = days[i];
        var dayTasks = tasks[day];
        
        for (var j = 0; j < dayTasks.length; j++) {
            allTasks.push({
                task: dayTasks[j],
                day: day,
                dayName: dayNames[day]
            });
        }
    }
    
    // Show count
    var countDiv = document.createElement('div');
    countDiv.className = 'inbox-count';
    var completedCount = 0;
    for (var i = 0; i < allTasks.length; i++) {
        if (allTasks[i].task.completed) {
            completedCount++;
        }
    }
    countDiv.textContent = allTasks.length + ' total task' + (allTasks.length !== 1 ? 's' : '') + ' • ' + completedCount + ' completed';
    inboxContainer.appendChild(countDiv);
    
    // Create tasks list
    var tasksList = document.createElement('div');
    tasksList.className = 'inbox-tasks-list';
    
    if (allTasks.length === 0) {
        var emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-inbox-message';
        emptyMsg.innerHTML = '<i class="fas fa-inbox" style=\"font-size: 48px; opacity: 0.3; margin-bottom: 10px;\"></i><p>No tasks yet. Start adding tasks to your days!</p>';
        tasksList.appendChild(emptyMsg);
    } else {
        for (var i = 0; i < allTasks.length; i++) {
            var taskData = allTasks[i];
            var taskElement = createTaskElement(taskData.task, taskData.day);
            
            // Add day badge
            var dayBadge = document.createElement('span');
            dayBadge.className = 'task-day-badge';
            dayBadge.textContent = taskData.dayName;
            
            // Insert day badge after checkbox
            var checkbox = taskElement.querySelector('.task-checkbox');
            if (checkbox && checkbox.parentNode) {
                checkbox.parentNode.insertBefore(dayBadge, checkbox.nextSibling);
            }
            
            tasksList.appendChild(taskElement);
        }
    }
    
    inboxContainer.appendChild(tasksList);
    
    showNotification('INBOX: Showing all ' + allTasks.length + ' tasks', 'success');
}

// AI Task Creator Functions
function toggleAICreator() {
    var body = document.getElementById('aiCreatorBody');
    var btn = document.getElementById('aiToggleBtn');
    
    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        body.style.animation = 'slideDown 0.3s ease-out';
    } else {
        body.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }
}

function clearAIPrompt() {
    document.getElementById('aiPromptInput').value = '';
    document.getElementById('aiPreview').style.display = 'none';
    showNotification('Prompt cleared', 'info');
}

function processAIPrompt() {
    var prompt = document.getElementById('aiPromptInput').value.trim();
    
    if (!prompt) {
        showNotification('Please enter a task description', 'error');
        return;
    }
    
    // Parse the prompt and extract tasks
    var parsedTasks = parseAIPrompt(prompt);
    
    if (parsedTasks.length === 0) {
        showNotification('Could not understand the prompt. Please try again with day information (e.g., "on Monday", "Tuesday")', 'error');
        return;
    }
    
    // Show preview
    showTaskPreview(parsedTasks);
}

function parseAIPrompt(prompt) {
    var tasks = [];
    var promptLower = prompt.toLowerCase();
    
    // Define keyword patterns
    var dayPatterns = {
        'monday': ['monday', 'mon'],
        'tuesday': ['tuesday', 'tue', 'tues'],
        'wednesday': ['wednesday', 'wed'],
        'thursday': ['thursday', 'thu', 'thur', 'thurs'],
        'friday': ['friday', 'fri'],
        'saturday': ['saturday', 'sat'],
        'sunday': ['sunday', 'sun']
    };
    
    var priorityPatterns = {
        'high': ['high', 'urgent', 'important', 'critical', 'asap'],
        'medium': ['medium', 'normal', 'moderate'],
        'low': ['low', 'minor', 'sometime', 'later']
    };
    
    var categoryPatterns = {
        'work': ['work', 'office', 'meeting', 'project', 'business', 'client', 'team'],
        'personal': ['personal', 'home', 'family', 'errands', 'shopping', 'buy'],
        'health': ['health', 'gym', 'workout', 'exercise', 'fitness', 'doctor', 'medical'],
        'study': ['study', 'learn', 'course', 'exam', 'homework', 'assignment', 'read', 'research']
    };
    
    var periodPatterns = {
        'early-morning': ['early morning', 'dawn', 'sunrise'],
        'morning': ['morning', 'am'],
        'afternoon': ['afternoon', 'noon', 'pm'],
        'evening': ['evening', 'night']
    };
    
    // Special day keywords
    var today = new Date().getDay();
    var dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    if (promptLower.includes('today')) {
        promptLower = promptLower.replace(/today/g, dayNames[today]);
    }
    if (promptLower.includes('tomorrow')) {
        var tomorrow = (today + 1) % 7;
        promptLower = promptLower.replace(/tomorrow/g, dayNames[tomorrow]);
    }
    if (promptLower.includes('weekend')) {
        // Add task for both Saturday and Sunday
        var weekendPrompt = promptLower.replace(/weekend/g, '');
        var satTask = parseTaskDetails(weekendPrompt, 'saturday', priorityPatterns, categoryPatterns, periodPatterns);
        var sunTask = parseTaskDetails(weekendPrompt, 'sunday', priorityPatterns, categoryPatterns, periodPatterns);
        if (satTask.title) tasks.push(satTask);
        if (sunTask.title) tasks.push(sunTask);
        return tasks;
    }
    
    // Split by common separators (and, also, comma, then, etc.)
    var segments = promptLower.split(/(?:\s+and\s+|\s*,\s*|\s+also\s+|\s+then\s+)/);
    
    // If no separators, try to find multiple days in the same prompt
    if (segments.length === 1) {
        var foundDays = [];
        for (var day in dayPatterns) {
            for (var i = 0; i < dayPatterns[day].length; i++) {
                var pattern = dayPatterns[day][i];
                var regex = new RegExp('\\b' + pattern + '\\b', 'i');
                if (regex.test(promptLower)) {
                    foundDays.push(day);
                    break;
                }
            }
        }
        
        if (foundDays.length > 1) {
            // Multiple days found in one sentence
            for (var i = 0; i < foundDays.length; i++) {
                var task = parseTaskDetails(promptLower, foundDays[i], priorityPatterns, categoryPatterns, periodPatterns);
                if (task.title) {
                    tasks.push(task);
                }
            }
            return tasks;
        }
    }
    
    // Process each segment
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i].trim();
        if (!segment) continue;
        
        // Find which day this task is for
        var taskDay = null;
        for (var day in dayPatterns) {
            for (var j = 0; j < dayPatterns[day].length; j++) {
                var pattern = dayPatterns[day][j];
                var regex = new RegExp('\\b' + pattern + '\\b', 'i');
                if (regex.test(segment)) {
                    taskDay = day;
                    break;
                }
            }
            if (taskDay) break;
        }
        
        if (!taskDay) {
            // Try to use the previous segment's day or skip
            continue;
        }
        
        var task = parseTaskDetails(segment, taskDay, priorityPatterns, categoryPatterns, periodPatterns);
        if (task.title) {
            tasks.push(task);
        }
    }
    
    return tasks;
}

function parseTaskDetails(text, day, priorityPatterns, categoryPatterns, periodPatterns) {
    var task = {
        title: '',
        day: day,
        priority: 'low',
        category: 'other',
        period: 'morning'
    };
    
    // Extract priority
    for (var priority in priorityPatterns) {
        for (var i = 0; i < priorityPatterns[priority].length; i++) {
            var pattern = priorityPatterns[priority][i];
            var regex = new RegExp('\\b' + pattern + '\\b', 'i');
            if (regex.test(text)) {
                task.priority = priority;
                break;
            }
        }
        if (task.priority !== 'low') break;
    }
    
    // Extract category
    for (var category in categoryPatterns) {
        for (var i = 0; i < categoryPatterns[category].length; i++) {
            var pattern = categoryPatterns[category][i];
            var regex = new RegExp('\\b' + pattern + '\\b', 'i');
            if (regex.test(text)) {
                task.category = category;
                break;
            }
        }
        if (task.category !== 'other') break;
    }
    
    // Extract time period
    for (var period in periodPatterns) {
        for (var i = 0; i < periodPatterns[period].length; i++) {
            var pattern = periodPatterns[period][i];
            var regex = new RegExp(pattern, 'i');
            if (regex.test(text)) {
                task.period = period;
                break;
            }
        }
        if (task.period !== 'morning') break;
    }
    
    // Extract title - remove keywords and clean up
    var title = text;
    
    // Remove day names
    var dayWords = ['monday', 'mon', 'tuesday', 'tue', 'tues', 'wednesday', 'wed', 
                    'thursday', 'thu', 'thur', 'friday', 'fri', 'saturday', 'sat', 
                    'sunday', 'sun', 'today', 'tomorrow', 'weekend'];
    for (var i = 0; i < dayWords.length; i++) {
        var regex = new RegExp('\\b' + dayWords[i] + '\\b', 'gi');
        title = title.replace(regex, '');
    }
    
    // Remove priority keywords
    var priorityWords = ['high', 'urgent', 'important', 'critical', 'asap', 'medium', 'normal', 
                         'moderate', 'low', 'minor', 'sometime', 'later', 'priority'];
    for (var i = 0; i < priorityWords.length; i++) {
        var regex = new RegExp('\\b' + priorityWords[i] + '\\b', 'gi');
        title = title.replace(regex, '');
    }
    
    // Remove time period keywords
    var timeWords = ['early morning', 'morning', 'afternoon', 'evening', 'night', 'am', 'pm', 'noon', 'dawn'];
    for (var i = 0; i < timeWords.length; i++) {
        var regex = new RegExp('\\b' + timeWords[i] + '\\b', 'gi');
        title = title.replace(regex, '');
    }
    
    // Remove common words
    var commonWords = ['on', 'at', 'in', 'for', 'the', 'a', 'an', 'with', 'category'];
    for (var i = 0; i < commonWords.length; i++) {
        var regex = new RegExp('\\b' + commonWords[i] + '\\b', 'gi');
        title = title.replace(regex, '');
    }
    
    // Clean up extra spaces and capitalize
    title = title.replace(/\s+/g, ' ').trim();
    if (title) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    task.title = title;
    return task;
}

function showTaskPreview(parsedTasks) {
    var previewDiv = document.getElementById('aiPreview');
    var previewList = document.getElementById('aiPreviewList');
    
    previewList.innerHTML = '';
    
    for (var i = 0; i < parsedTasks.length; i++) {
        var task = parsedTasks[i];
        var previewItem = document.createElement('div');
        previewItem.className = 'ai-preview-item';
        
        var dayNames = {
            'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
            'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday'
        };
        
        previewItem.innerHTML = `
            <div class="preview-task-title">${task.title}</div>
            <div class="preview-task-details">
                <span class="preview-badge preview-day">${dayNames[task.day]}</span>
                <span class="preview-badge preview-priority priority-${task.priority}">${task.priority.toUpperCase()}</span>
                <span class="preview-badge preview-category">${task.category}</span>
                <span class="preview-badge preview-period">${task.period.replace('-', ' ')}</span>
            </div>
        `;
        
        previewList.appendChild(previewItem);
    }
    
    previewDiv.style.display = 'block';
    
    // Create confirm button if not exists
    var existingBtn = document.getElementById('aiConfirmBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    var confirmBtn = document.createElement('button');
    confirmBtn.id = 'aiConfirmBtn';
    confirmBtn.className = 'ai-confirm-btn';
    confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm & Add ' + parsedTasks.length + ' Task' + (parsedTasks.length > 1 ? 's' : '');
    confirmBtn.onclick = function() {
        createTasksFromAI(parsedTasks);
    };
    
    previewDiv.appendChild(confirmBtn);
}

function createTasksFromAI(parsedTasks) {
    var addedCount = 0;
    
    for (var i = 0; i < parsedTasks.length; i++) {
        var taskData = parsedTasks[i];
        
        var newTask = {
            id: Date.now() + i,
            title: taskData.title,
            completed: false,
            priority: taskData.priority,
            category: taskData.category,
            period: taskData.period,
            dueDate: '',
            notes: 'Created by AI Task Creator',
            createdAt: new Date().toISOString()
        };
        
        tasks[taskData.day].push(newTask);
        addedCount++;
    }
    
    // Save and refresh
    saveTasksToStorage();
    renderAllTasks();
    
    // Clear the input and preview
    document.getElementById('aiPromptInput').value = '';
    document.getElementById('aiPreview').style.display = 'none';
    
    // Show success notification
    showNotification('Successfully added ' + addedCount + ' task' + (addedCount > 1 ? 's' : '') + ' using AI!', 'success');
    playSound('add');
    
    // Scroll to show the added tasks
    setTimeout(function() {
        if (parsedTasks.length > 0) {
            var firstDay = parsedTasks[0].day;
            var dayCard = document.querySelector('[data-day="' + firstDay + '"]');
            if (dayCard) {
                dayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, 300);
}

// AI Chat Interface Functions
var chatHistory = [];
var currentAIMode = 'single'; // 'single' or 'multi'

function toggleAIChat() {
    var chatWindow = document.getElementById('aiChatWindow');
    var chatButton = document.getElementById('aiChatButton');
    
    if (chatWindow.classList.contains('active')) {
        chatWindow.classList.remove('active');
        chatButton.classList.remove('hidden');
    } else {
        chatWindow.classList.add('active');
        chatButton.classList.add('hidden');
        // Focus on input
        setTimeout(function() {
            document.getElementById('aiChatInput').focus();
        }, 300);
    }
}

// Legacy function - no longer needed in unified interface
function switchAIMode(mode) {
    // Unified interface doesn't need mode switching
    // Kept for backwards compatibility
    return;
}

function showJSONTemplate() {
    var template = {
        "tasks": [
            {
                "title": "Task name here",
                "day": "monday|tuesday|wednesday|thursday|friday|saturday|sunday",
                "priority": "high|medium|low (default: low)",
                "category": "work|personal|health|study|other (default: other)",
                "period": "early-morning|morning|afternoon|evening (default: morning)"
            }
        ]
    };
    
    var templateJson = JSON.stringify(template, null, 2);
    var templateId = 'template_' + Date.now();
    
    addChatMessage(
        `<p><strong>\ud83d\udccb JSON Template Ready!</strong></p>
        <p class="copy-instruction"><i class="fas fa-hand-pointer"></i> Click the button below to copy</p>
        <div class="json-template-box">
            <div class="json-header">
                <span class="json-label"><i class="fas fa-code"></i> Template</span>
                <button class="copy-json-btn-inline" onclick="copyTemplateToClipboard('${templateId}')">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
            <pre id="${templateId}"><code>${escapeHtml(templateJson)}</code></pre>
        </div>
        <div class="chatgpt-prompt-box">
            <p class="prompt-label"><i class="fas fa-comment-dots"></i> <strong>Use this prompt in ChatGPT:</strong></p>
            <div class="prompt-content" id="prompt_${templateId}">Fill this JSON with my tasks:

${templateJson}

My tasks:
- Monday morning: Team meeting (high priority, work)
- Tuesday evening: Gym workout (medium, health)  
- Wednesday afternoon: Study session (high, study)</div>
            <button class="copy-prompt-btn" onclick="copyPromptToClipboard('prompt_${templateId}')">
                <i class="fas fa-copy"></i> Copy Full Prompt for ChatGPT
            </button>
        </div>
        <p class="ai-message-hint"><i class="fas fa-arrow-right"></i> After ChatGPT responds, copy its JSON and paste here!</p>`,
        'bot'
    );
}

function showJSONExample() {
    var example = {
        "tasks": [
            {
                "title": "Team standup meeting",
                "day": "monday",
                "priority": "high",
                "category": "work",
                "period": "morning"
            },
            {
                "title": "Gym workout session",
                "day": "tuesday",
                "priority": "medium",
                "category": "health",
                "period": "evening"
            },
            {
                "title": "Study JavaScript",
                "day": "wednesday",
                "priority": "high",
                "category": "study",
                "period": "afternoon"
            },
            {
                "title": "Grocery shopping",
                "day": "saturday",
                "priority": "low",
                "category": "personal",
                "period": "morning"
            }
        ]
    };
    
    var exampleJson = JSON.stringify(example, null, 2);
    var exampleId = 'example_' + Date.now();
    
    addChatMessage(
        `<p><strong>\u2728 Example JSON (4 tasks):</strong></p>
        <div class="json-template-box example-box">
            <div class="json-header">
                <span class="json-label"><i class="fas fa-star"></i> Example</span>
                <button class="copy-json-btn-inline" onclick="copyTemplateToClipboard('${exampleId}')">
                    <i class="fas fa-copy"></i> Copy Example
                </button>
            </div>
            <pre id="${exampleId}"><code>${escapeHtml(exampleJson)}</code></pre>
        </div>
        <div class="info-box">
            <p><i class="fas fa-info-circle"></i> <strong>What this creates:</strong></p>
            <ul class="task-preview-list">
                <li><span class="preview-day">Monday</span> Team standup meeting <span class="preview-priority high">\ud83d\udd34 HIGH</span></li>
                <li><span class="preview-day">Tuesday</span> Gym workout session <span class="preview-priority medium">\ud83d\udfe1 MEDIUM</span></li>
                <li><span class="preview-day">Wednesday</span> Study JavaScript <span class="preview-priority high">\ud83d\udd34 HIGH</span></li>
                <li><span class="preview-day">Saturday</span> Grocery shopping <span class="preview-priority low">\ud83d\udfe2 LOW</span></li>
            </ul>
        </div>
        <p class="ai-message-hint"><i class="fas fa-magic"></i> You can copy and modify this example!</p>`,
        'bot'
    );
}

function copyToClipboard(text, label) {
    // Unescape the text
    var textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    var unescapedText = textarea.value;
    
    navigator.clipboard.writeText(unescapedText).then(function() {
        showNotification(label + ' copied to clipboard! \ud83d\udccb', 'success');
    }).catch(function() {
        // Fallback
        var textArea = document.createElement('textarea');
        textArea.value = unescapedText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification(label + ' copied to clipboard! \ud83d\udccb', 'success');
    });
}

function copyTemplateToClipboard(elementId) {
    var element = document.getElementById(elementId);
    if (!element) return;
    
    var text = element.textContent;
    
    navigator.clipboard.writeText(text).then(function() {
        // Visual feedback
        var button = event.target.closest('.copy-json-btn-inline');
        if (button) {
            var originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied!';
            button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            
            setTimeout(function() {
                button.innerHTML = originalHTML;
                button.style.background = '';
            }, 2000);
        }
        showNotification('\u2705 Copied to clipboard!', 'success');
    }).catch(function() {
        // Fallback
        var textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('\u2705 Copied to clipboard!', 'success');
    });
}

function copyPromptToClipboard(elementId) {
    var element = document.getElementById(elementId);
    if (!element) return;
    
    var text = element.textContent.trim();
    
    navigator.clipboard.writeText(text).then(function() {
        var button = event.target.closest('.copy-prompt-btn');
        if (button) {
            var originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check-circle"></i> Copied! Now paste in ChatGPT';
            button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            
            setTimeout(function() {
                button.innerHTML = originalHTML;
                button.style.background = '';
            }, 3000);
        }
        showNotification('\u2705 Prompt copied! Paste it in ChatGPT', 'success');
    }).catch(function() {
        showNotification('Please try again', 'error');
    });
}

function insertExample(text) {
    var input = document.getElementById('aiChatInput');
    input.value = text;
    input.focus();
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    
    // Show a hint
    showNotification('\u2728 Example inserted! Click send to add this task', 'info');
}

function showQuickGuide() {
    addChatMessage(
        `<p><strong>\ud83d\udcda Quick Guide: Multi-Task JSON</strong></p>
        <div class="guide-box">
            <div class="guide-section">
                <h4><i class="fas fa-rocket"></i> How It Works</h4>
                <ol class="guide-steps">
                    <li>Get the JSON template from this chat</li>
                    <li>Copy it to ChatGPT</li>
                    <li>Tell ChatGPT your tasks</li>
                    <li>ChatGPT fills the template</li>
                    <li>Copy & paste result here</li>
                    <li>All tasks added instantly! \u2728</li>
                </ol>
            </div>
            <div class="guide-section">
                <h4><i class="fas fa-tags"></i> Valid Values</h4>
                <div class="values-grid">
                    <div class="value-item">
                        <strong>Days:</strong> monday, tuesday, wednesday, thursday, friday, saturday, sunday
                    </div>
                    <div class="value-item">
                        <strong>Priority:</strong> <span class="priority-tag high">high</span> <span class="priority-tag medium">medium</span> <span class="priority-tag low">low (default)</span>
                    </div>
                    <div class="value-item">
                        <strong>Category:</strong> work, personal, health, study, other
                    </div>
                    <div class="value-item">
                        <strong>Period:</strong> early-morning, morning (default), afternoon, evening
                    </div>
                </div>
            </div>
            <div class="guide-section">
                <h4><i class="fas fa-comment-dots"></i> ChatGPT Prompt Example</h4>
                <div class="prompt-example">
                    "Fill this JSON with tasks:<br>
                    - Monday 9am: Team meeting (high priority, work)<br>
                    - Tuesday evening: Gym (health)<br>
                    - Wednesday: Study React (study, important)"
                </div>
            </div>
        </div>
        <p class="ai-message-hint"><i class="fas fa-question-circle"></i> Need help? Just ask in single task mode!</p>`,
        'bot'
    );
}

function validateJSON() {
    var input = document.getElementById('aiChatInput');
    var jsonText = input.value.trim();
    
    if (!jsonText) {
        showNotification('Please paste JSON first', 'error');
        return;
    }
    
    try {
        var data = JSON.parse(jsonText);
        if (!data.tasks || !Array.isArray(data.tasks)) {
            throw new Error('Invalid format: must have "tasks" array');
        }
        
        showNotification('\u2705 Valid JSON! ' + data.tasks.length + ' tasks found', 'success');
        
        // Show preview
        addChatMessage(
            `<p>\u2705 <strong>JSON is valid!</strong></p>
            <p>Found ${data.tasks.length} task${data.tasks.length > 1 ? 's' : ''}. Click send to add them!</p>`,
            'bot'
        );
    } catch (e) {
        showNotification('\u274c Invalid JSON: ' + e.message, 'error');
        addChatMessage(
            `<p>\u274c <strong>Invalid JSON format</strong></p>
            <p class="ai-message-hint">${escapeHtml(e.message)}</p>
            <p>Make sure you copied the complete JSON from ChatGPT.</p>`,
            'bot'
        );
    }
}

function clearChatInput() {
    document.getElementById('aiChatInput').value = '';
    document.getElementById('aiChatInput').style.height = 'auto';
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
    }
}

function insertQuickText(text) {
    var input = document.getElementById('aiChatInput');
    var currentText = input.value.trim();
    
    if (currentText) {
        input.value = currentText + ' ' + text;
    } else {
        input.value = text + ' ';
    }
    input.focus();
}

function insertExample(text) {
    var input = document.getElementById('aiChatInput');
    input.value = text;
    input.focus();
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    
    // Show a hint
    showNotification('<i class="fas fa-magic"></i> Example inserted! Click send to add this task', 'info');
}

function sendChatMessage() {
    var input = document.getElementById('aiChatInput');
    var message = input.value.trim();
    
    if (!message) return;
    
    // Intelligent auto-detection: JSON or natural language
    var isJSON = detectJSONFormat(message);
    
    if (isJSON) {
        // Process as JSON array
        processJSONTasks(message);
    } else {
        // Process as natural language
        // Add user message to chat
        addChatMessage(message, 'user');
        
        // Clear input
        input.value = '';
        input.style.height = 'auto';
        updateFormatIndicator('');
        
        // Process the message
        setTimeout(function() {
            processChatMessage(message);
        }, 500);
    }
}

// Intelligent JSON detection
function detectJSONFormat(text) {
    if (!text || typeof text !== 'string') return false;
    
    var trimmed = text.trim();
    
    // Check if it starts with [ or { (JSON array or object)
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            var parsed = JSON.parse(trimmed);
            // Check if it's an array or has tasks property
            if (Array.isArray(parsed)) {
                return true;
            }
            if (parsed.tasks && Array.isArray(parsed.tasks)) {
                return true;
            }
        } catch (e) {
            return false;
        }
    }
    return false;
}

// Real-time format detection for UI feedback
function detectInputFormat() {
    var input = document.getElementById('aiChatInput');
    var text = input.value.trim();
    
    if (!text) {
        updateFormatIndicator('');
        return;
    }
    
    if (detectJSONFormat(text)) {
        updateFormatIndicator('json');
    } else {
        updateFormatIndicator('natural');
    }
}

// Update the format indicator
function updateFormatIndicator(format) {
    var indicator = document.getElementById('formatIndicator');
    if (!indicator) return;
    
    if (!format) {
        indicator.style.display = 'none';
        return;
    }
    
    indicator.style.display = 'flex';
    
    if (format === 'json') {
        indicator.innerHTML = '<i class=\"fas fa-code\"></i> <span>JSON Format Detected</span>';
        indicator.className = 'input-format-indicator json-format';
    } else {
        indicator.innerHTML = '<i class=\"fas fa-comment-dots\"></i> <span>Natural Language</span>';
        indicator.className = 'input-format-indicator natural-format';
    }
}

function addChatMessage(message, type) {
    var chatMessages = document.getElementById('aiChatMessages');
    var messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message ai-' + type + '-message';
    
    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="ai-message-content user-message-content">
                <p>${escapeHtml(message)}</p>
            </div>
            <div class="ai-message-avatar user-avatar">
                <i class="fas fa-user"></i>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="ai-message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="ai-message-content">
                ${message}
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add animation
    setTimeout(function() {
        messageDiv.classList.add('fade-in');
    }, 10);
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function processChatMessage(message) {
    // Show typing indicator
    showTypingIndicator();
    
    setTimeout(function() {
        hideTypingIndicator();
        
        // Parse the message
        var parsedTasks = parseAIPrompt(message);
        
        if (parsedTasks.length === 0) {
            addChatMessage(
                `<p>🤔 I couldn't find a day in your message. Could you specify when you want to do this?</p>
                <p class="ai-message-hint">Try: "${escapeHtml(message)} on Monday" or "${escapeHtml(message)} tomorrow"</p>`,
                'bot'
            );
            return;
        }
        
        // Create tasks
        var addedCount = 0;
        for (var i = 0; i < parsedTasks.length; i++) {
            var taskData = parsedTasks[i];
            
            var newTask = {
                id: Date.now() + i,
                title: taskData.title,
                completed: false,
                priority: taskData.priority,
                category: taskData.category,
                period: taskData.period,
                dueDate: '',
                notes: 'Created via AI Chat',
                createdAt: new Date().toISOString()
            };
            
            tasks[taskData.day].push(newTask);
            addedCount++;
        }
        
        // Save and refresh
        saveTasksToStorage();
        renderAllTasks();
        playSound('add');
        
        // Build response message
        var responseHtml = '<p>✅ Great! I\'ve added ' + addedCount + ' task' + (addedCount > 1 ? 's' : '') + ' for you:</p>';
        responseHtml += '<div class="ai-task-summary">';
        
        for (var i = 0; i < parsedTasks.length; i++) {
            var task = parsedTasks[i];
            var dayNames = {
                'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
                'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday'
            };
            
            var priorityEmojis = {
                'high': '🔴',
                'medium': '🟡',
                'low': '🟢'
            };
            
            responseHtml += `
                <div class="ai-task-item">
                    <strong>${escapeHtml(task.title)}</strong><br>
                    <small>
                        📅 ${dayNames[task.day]} | 
                        ${priorityEmojis[task.priority]} ${task.priority.toUpperCase()} | 
                        🏷️ ${task.category}
                    </small>
                </div>
            `;
        }
        
        responseHtml += '</div>';
        responseHtml += '<p class="ai-message-hint">Need anything else?</p>';
        
        addChatMessage(responseHtml, 'bot');
        
        // Show notification
        showNotification('<i class="fas fa-robot"></i> AI added ' + addedCount + ' task' + (addedCount > 1 ? 's' : '') + '!', 'success');
    }, 1000);
}

function showTypingIndicator() {
    var chatMessages = document.getElementById('aiChatMessages');
    var typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'ai-message ai-bot-message typing-indicator';
    typingDiv.innerHTML = `
        <div class="ai-message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-message-content">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    var typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function processJSONTasks(jsonText) {
    var input = document.getElementById('aiChatInput');
    
    // Show typing indicator
    showTypingIndicator();
    
    setTimeout(function() {
        hideTypingIndicator();
        
        try {
            // Parse JSON - intelligently handle both formats
            var data = JSON.parse(jsonText);
            var tasksArray;
            
            // Smart detection: Array directly or object with tasks property
            if (Array.isArray(data)) {
                tasksArray = data;
            } else if (data.tasks && Array.isArray(data.tasks)) {
                tasksArray = data.tasks;
            } else {
                throw new Error('Invalid format. Expected array or object with "tasks" property');
            }
            
            if (tasksArray.length === 0) {
                throw new Error('No tasks found in JSON');
            }
            
            // Validate and process each task
            var validTasks = [];
            var errors = [];
            
            for (var i = 0; i < tasksArray.length; i++) {
                var task = tasksArray[i];
                
                // Validate required fields
                if (!task.title && !task.task) {
                    errors.push('Task ' + (i + 1) + ': Missing title/task');
                    continue;
                }
                
                if (!task.day) {
                    errors.push('Task ' + (i + 1) + ': Missing day');
                    continue;
                }
                
                // Validate day
                var validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                if (validDays.indexOf(task.day.toLowerCase()) === -1) {
                    errors.push('Task ' + (i + 1) + ': Invalid day "' + task.day + '"');
                    continue;
                }
                
                // Set defaults - support both "title" and "task" field names
                var taskData = {
                    title: task.title || task.task,
                    day: task.day.toLowerCase(),
                    priority: task.priority ? task.priority.toLowerCase() : 'low',
                    category: task.category ? task.category.toLowerCase() : 'other',
                    period: task.period ? task.period.toLowerCase() : 'morning'
                };
                
                // Validate priority
                var validPriorities = ['high', 'medium', 'low'];
                if (validPriorities.indexOf(taskData.priority) === -1) {
                    taskData.priority = 'low';
                }
                
                // Validate category
                var validCategories = ['work', 'personal', 'health', 'study', 'other'];
                if (validCategories.indexOf(taskData.category) === -1) {
                    taskData.category = 'other';
                }
                
                // Validate period
                var validPeriods = ['early-morning', 'morning', 'afternoon', 'evening'];
                if (validPeriods.indexOf(taskData.period) === -1) {
                    taskData.period = 'morning';
                }
                
                validTasks.push(taskData);
            }
            
            if (validTasks.length === 0) {
                throw new Error('No valid tasks found. ' + (errors.length > 0 ? errors[0] : ''));
            }
            
            // Create tasks
            var addedCount = 0;
            for (var i = 0; i < validTasks.length; i++) {
                var taskData = validTasks[i];
                
                var newTask = {
                    id: Date.now() + i,
                    title: taskData.title,
                    completed: false,
                    priority: taskData.priority,
                    category: taskData.category,
                    period: taskData.period,
                    dueDate: '',
                    notes: 'Created via AI JSON import',
                    createdAt: new Date().toISOString()
                };
                
                tasks[taskData.day].push(newTask);
                addedCount++;
            }
            
            // Save and refresh
            saveTasksToStorage();
            renderAllTasks();
            playSound('add');
            
            // Clear input
            input.value = '';
            input.style.height = 'auto';
            
            // Build response
            var responseHtml = '<p>\u2705 <strong>Success!</strong> Added ' + addedCount + ' task' + (addedCount > 1 ? 's' : '') + '!</p>';
            
            if (errors.length > 0) {
                responseHtml += '<p class=\"ai-message-hint\">\u26a0\ufe0f Skipped ' + errors.length + ' invalid task' + (errors.length > 1 ? 's' : '') + '</p>';
            }
            
            responseHtml += '<div class=\"ai-task-summary\">';
            
            var dayNames = {
                'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
                'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday'
            };
            
            var priorityEmojis = {
                'high': '\ud83d\udd34',
                'medium': '\ud83d\udfe1',
                'low': '\ud83d\udfe2'
            };
            
            for (var i = 0; i < Math.min(validTasks.length, 10); i++) {
                var task = validTasks[i];
                responseHtml += `
                    <div class=\"ai-task-item\">
                        <strong>${escapeHtml(task.title)}</strong><br>
                        <small>
                            \ud83d\udcc5 ${dayNames[task.day]} | 
                            ${priorityEmojis[task.priority]} ${task.priority.toUpperCase()} | 
                            \ud83c\udff7\ufe0f ${task.category}
                        </small>
                    </div>
                `;
            }
            
            if (validTasks.length > 10) {
                responseHtml += '<p class=\"ai-message-hint\">...and ' + (validTasks.length - 10) + ' more tasks!</p>';
            }
            
            responseHtml += '</div>';
            
            addChatMessage(responseHtml, 'bot');
            showNotification('\u2728 Added ' + addedCount + ' tasks from JSON!', 'success');
            
        } catch (e) {
            addChatMessage(
                `<p>\u274c <strong>Error parsing JSON</strong></p>
                <p class=\"ai-message-hint\">${escapeHtml(e.message)}</p>
                <p>Please check your JSON format. Click "Get JSON Template" for help.</p>`,
                'bot'
            );
            showNotification('\u274c JSON Error: ' + e.message, 'error');
        }
    }, 800);
}

// Auto-resize chat input
window.addEventListener('load', function() {
    var chatInput = document.getElementById('aiChatInput');
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }
});

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

// Subtask Group Management
function addSubtaskGroup() {
    var container = document.getElementById('subtaskGroupsContainer');
    if (!container) return;
    
    var group = document.createElement('div');
    group.className = 'subtask-group';
    group.setAttribute('data-group', 'group-' + Date.now());
    
    group.innerHTML = 
        '<div class="subtask-group-header">' +
            '<input type="text" class="subtask-group-name" placeholder="Group name (e.g., \'Research\', \'Steps\')">' +
            '<button type="button" class="btn-remove-group" onclick="removeSubtaskGroup(this)" title="Remove Group">' +
                '<i class="fas fa-trash"></i>' +
            '</button>' +
        '</div>' +
        '<div class="subtasks-container"></div>' +
        '<button type="button" class="btn-add-subtask" onclick="addSubtaskToGroup(this)">' +
            '<i class="fas fa-plus"></i> Add Item' +
        '</button>';
    
    container.appendChild(group);
    playSound('click');
    
    // Focus on the group name input
    var nameInput = group.querySelector('.subtask-group-name');
    if (nameInput) nameInput.focus();
}

function removeSubtaskGroup(btn) {
    var group = btn.closest('.subtask-group');
    var container = document.getElementById('subtaskGroupsContainer');
    
    // Don't remove if it's the only group
    if (container && container.querySelectorAll('.subtask-group').length <= 1) {
        showNotification('You need at least one group', 'error');
        return;
    }
    
    if (group) {
        group.remove();
        playSound('click');
    }
}

function addSubtaskToGroup(btn) {
    var group = btn.closest('.subtask-group');
    var container = group.querySelector('.subtasks-container');
    if (!container) return;
    
    var wrapper = document.createElement('div');
    wrapper.className = 'subtask-input-wrapper';
    
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter item...';
    input.className = 'subtask-input';
    
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
    input.focus();
}

// Legacy function for backward compatibility
function addSubtaskInput(text) {
    var defaultGroup = document.querySelector('#subtaskGroupsContainer .subtask-group');
    if (!defaultGroup) return;
    
    var container = defaultGroup.querySelector('.subtasks-container');
    if (!container) return;
    
    var wrapper = document.createElement('div');
    wrapper.className = 'subtask-input-wrapper';
    
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter item...';
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
}

function getSubtasksFromForm() {
    var groups = document.querySelectorAll('#subtaskGroupsContainer .subtask-group');
    var subtaskGroups = [];
    
    groups.forEach(function(group) {
        var groupName = group.querySelector('.subtask-group-name').value.trim() || 'Tasks';
        var inputs = group.querySelectorAll('.subtasks-container .subtask-input');
        var items = [];
        
        inputs.forEach(function(input, index) {
            var text = input.value.trim();
            if (text) {
                items.push({
                    id: Date.now() + index + Math.random(),
                    text: text,
                    completed: false
                });
            }
        });
        
        if (items.length > 0 || groupName !== 'Tasks') {
            subtaskGroups.push({
                name: groupName,
                items: items
            });
        }
    });
    
    return subtaskGroups;
}

function loadSubtasksToForm(subtaskGroups) {
    var container = document.getElementById('subtaskGroupsContainer');
    if (!container) return;
    
    // Clear existing groups
    container.innerHTML = '';
    
    // Handle old format (array of subtasks) or new format (array of groups)
    if (subtaskGroups && subtaskGroups.length > 0) {
        // Check if it's old format (direct subtask items)
        if (subtaskGroups[0].text !== undefined) {
            // Old format - convert to new format
            var group = createSubtaskGroupElement('Tasks');
            container.appendChild(group);
            var groupContainer = group.querySelector('.subtasks-container');
            subtaskGroups.forEach(function(subtask) {
                addSubtaskItemToContainer(groupContainer, subtask.text);
            });
        } else {
            // New format - subtask groups
            subtaskGroups.forEach(function(groupData) {
                var group = createSubtaskGroupElement(groupData.name);
                container.appendChild(group);
                var groupContainer = group.querySelector('.subtasks-container');
                if (groupData.items) {
                    groupData.items.forEach(function(item) {
                        addSubtaskItemToContainer(groupContainer, item.text);
                    });
                }
            });
        }
    } else {
        // Create default empty group
        var defaultGroup = createSubtaskGroupElement('Tasks');
        container.appendChild(defaultGroup);
    }
}

function createSubtaskGroupElement(name) {
    var group = document.createElement('div');
    group.className = 'subtask-group';
    group.setAttribute('data-group', 'group-' + Date.now());
    
    group.innerHTML = 
        '<div class="subtask-group-header">' +
            '<input type="text" class="subtask-group-name" placeholder="Group name (e.g., \'Research\', \'Steps\')" value="' + (name || 'Tasks') + '">' +
            '<button type="button" class="btn-remove-group" onclick="removeSubtaskGroup(this)" title="Remove Group">' +
                '<i class="fas fa-trash"></i>' +
            '</button>' +
        '</div>' +
        '<div class="subtasks-container"></div>' +
        '<button type="button" class="btn-add-subtask" onclick="addSubtaskToGroup(this)">' +
            '<i class="fas fa-plus"></i> Add Item' +
        '</button>';
    
    return group;
}

function addSubtaskItemToContainer(container, text) {
    var wrapper = document.createElement('div');
    wrapper.className = 'subtask-input-wrapper';
    
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter item...';
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
    updateHeaderStats();
    highlightToday();
}

// Update header stats pills
function updateHeaderStats() {
    var totalTasksStat = document.getElementById('totalTasksStat');
    var completedTasksStat = document.getElementById('completedTasksStat');
    
    if (!totalTasksStat && !completedTasksStat) return;
    
    var stats = calculateWeekStats();
    
    if (totalTasksStat) {
        totalTasksStat.textContent = stats.totalTasks;
    }
    
    if (completedTasksStat) {
        completedTasksStat.textContent = stats.completedTasks;
    }
}

// Highlight today's card
function highlightToday() {
    var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    var today = days[new Date().getDay()];
    
    var allCards = document.querySelectorAll('.day-card-modern');
    allCards.forEach(function(card) {
        card.classList.remove('today');
        if (card.getAttribute('data-day') === today) {
            card.classList.add('today');
        }
    });
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
        countElement.textContent = dayTasks.length;
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
    
    // Build subtasks HTML with group support
    var subtasksHTML = '';
    if (task.subtasks && task.subtasks.length > 0) {
        // Check if it's new grouped format or old format
        if (task.subtasks[0].name !== undefined && task.subtasks[0].items !== undefined) {
            // New grouped format
            subtasksHTML = '<div class="task-subtask-groups">';
            for (var g = 0; g < task.subtasks.length; g++) {
                var group = task.subtasks[g];
                subtasksHTML += '<div class="task-subtask-group">';
                subtasksHTML += '<div class="task-subtask-group-name"><i class="fas fa-folder"></i> ' + group.name + '</div>';
                subtasksHTML += '<div class="subtask-list">';
                if (group.items && group.items.length > 0) {
                    for (var i = 0; i < group.items.length; i++) {
                        var subtask = group.items[i];
                        subtasksHTML += 
                            '<div class="subtask-item' + (subtask.completed ? ' completed' : '') + '">' +
                                '<input type="checkbox" class="subtask-checkbox" ' + 
                                (subtask.completed ? 'checked' : '') + 
                                ' onchange="toggleSubtaskComplete(\'' + day + '\', ' + task.id + ', ' + subtask.id + ', ' + g + ')">' +
                                '<span class="subtask-text">' + linkifyText(subtask.text) + '</span>' +
                            '</div>';
                    }
                }
                subtasksHTML += '</div></div>';
            }
            subtasksHTML += '</div>';
        } else {
            // Old flat format
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
            
            // Show appreciation and award coins when task is completed
            if (!wasCompleted && tasks[day][i].completed) {
                // Award coins for completing task
                addCoins(COINS_PER_TASK, 'Completed task: ' + tasks[day][i].title);
                
                var profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                var name = profile.name && profile.name.trim() !== '' ? profile.name : '';
                var messages = [
                    'Great job' + (name ? ', ' + name : '') + '! +' + COINS_PER_TASK + ' coins! <i class="fas fa-coins"></i>',
                    'Awesome work' + (name ? ', ' + name : '') + '! +' + COINS_PER_TASK + ' coins! <i class="fas fa-coins"></i>',
                    'Well done' + (name ? ', ' + name : '') + '! +' + COINS_PER_TASK + ' coins! <i class="fas fa-coins"></i>',
                    'Fantastic' + (name ? ', ' + name : '') + '! +' + COINS_PER_TASK + ' coins! <i class="fas fa-coins"></i>',
                    'Excellent' + (name ? ', ' + name : '') + '! +' + COINS_PER_TASK + ' coins! <i class="fas fa-coins"></i>'
                ];
                var randomMessage = messages[Math.floor(Math.random() * messages.length)];
                showNotification(randomMessage, 'success');
            } else if (wasCompleted && !tasks[day][i].completed) {
                // Remove coins if uncompleting task
                removeCoins(COINS_PER_TASK);
            }
            
            saveTasksToStorage();
            renderTasks(day);
            updateHeaderStats();
            break;
        }
    }
}

// Toggle subtask completion (supports both old and new formats)
function toggleSubtaskComplete(day, taskId, subtaskId, groupIndex) {
    playSound('click');
    for (var i = 0; i < tasks[day].length; i++) {
        if (tasks[day][i].id === taskId) {
            var task = tasks[day][i];
            if (task.subtasks) {
                // Check if it's grouped format
                if (groupIndex !== undefined && task.subtasks[groupIndex] && task.subtasks[groupIndex].items) {
                    // New grouped format
                    var items = task.subtasks[groupIndex].items;
                    for (var j = 0; j < items.length; j++) {
                        if (items[j].id === subtaskId) {
                            var wasCompleted = items[j].completed;
                            items[j].completed = !items[j].completed;
                            
                            // Award/remove coins for subtask
                            if (!wasCompleted && items[j].completed) {
                                addCoins(COINS_PER_SUBTASK, 'Completed subtask: ' + items[j].text);
                            } else if (wasCompleted && !items[j].completed) {
                                removeCoins(COINS_PER_SUBTASK);
                            }
                            
                            saveTasksToStorage();
                            renderTasks(day);
                            return;
                        }
                    }
                } else {
                    // Old flat format
                    for (var j = 0; j < task.subtasks.length; j++) {
                        if (task.subtasks[j].id === subtaskId) {
                            var wasCompleted = task.subtasks[j].completed;
                            task.subtasks[j].completed = !task.subtasks[j].completed;
                            
                            // Award/remove coins for subtask
                            if (!wasCompleted && task.subtasks[j].completed) {
                                addCoins(COINS_PER_SUBTASK, 'Completed subtask: ' + task.subtasks[j].text);
                            } else if (wasCompleted && !task.subtasks[j].completed) {
                                removeCoins(COINS_PER_SUBTASK);
                            }
                            
                            saveTasksToStorage();
                            renderTasks(day);
                            return;
                        }
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
