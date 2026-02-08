// AI Creator JavaScript

// Theme Management
function initTheme() {
    var savedTheme = localStorage.getItem('aiCreatorTheme') || localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcon();
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    var isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('aiCreatorTheme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    var themeToggle = document.getElementById('themeToggle');
    var isDark = document.body.classList.contains('dark-theme');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
});

// Get tasks from localStorage
function getTasks() {
    var stored = localStorage.getItem('weeklyTasks');
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };
}

// Save tasks to localStorage
function saveTasks(tasks) {
    localStorage.setItem('weeklyTasks', JSON.stringify(tasks));
}

// Copy template to clipboard
function copyTemplate() {
    var template = `[{
  "task": "Your task here",
  "day": "monday",
  "priority": "low",
  "category": "work",
  "period": "morning",
  "subtasks": ["Subtask 1", "Subtask 2"]
}]`;
    
    navigator.clipboard.writeText(template).then(function() {
        showNotification('Template copied to clipboard!', 'success');
        
        // Visual feedback with animation
        var btn = event.target.closest('.copy-btn-compact');
        var originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
        btn.classList.add('copied');
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.style.color = 'white';
        
        setTimeout(function() {
            btn.innerHTML = originalHTML;
            btn.classList.remove('copied');
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    }).catch(function() {
        // Fallback for older browsers
        var textArea = document.createElement('textarea');
        textArea.value = template;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Template copied to clipboard!', 'success');
    });
}

// Validate JSON
// Create tasks from JSON
function createTasks() {
    var input = document.getElementById('jsonInput');
    var text = input.value.trim();
    
    if (!text) {
        showNotification('Please paste JSON first', 'error');
        return;
    }
    
    try {
        var data = JSON.parse(text);
        
        // Check format
        var tasksArray;
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
        
        // Validate and process tasks
        var validTasks = [];
        var errors = [];
        var validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        var validPriorities = ['high', 'medium', 'low'];
        var validCategories = ['work', 'personal', 'health', 'study', 'other'];
        var validPeriods = ['early-morning', 'morning', 'afternoon', 'evening'];
        
        for (var i = 0; i < tasksArray.length; i++) {
            var task = tasksArray[i];
            
            if (!task.task && !task.title) {
                errors.push('Task ' + (i + 1) + ': Missing task/title');
                continue;
            }
            
            if (!task.day) {
                errors.push('Task ' + (i + 1) + ': Missing day');
                continue;
            }
            
            if (validDays.indexOf(task.day.toLowerCase()) === -1) {
                errors.push('Task ' + (i + 1) + ': Invalid day "' + task.day + '"');
                continue;
            }
            
            var taskData = {
                title: task.task || task.title,
                day: task.day.toLowerCase(),
                priority: task.priority ? task.priority.toLowerCase() : 'low',
                category: task.category ? task.category.toLowerCase() : 'other',
                period: task.period ? task.period.toLowerCase() : 'morning',
                subtasks: task.subtasks || []
            };
            
            // Validate and default invalid values
            if (validPriorities.indexOf(taskData.priority) === -1) {
                taskData.priority = 'low';
            }
            if (validCategories.indexOf(taskData.category) === -1) {
                taskData.category = 'other';
            }
            if (validPeriods.indexOf(taskData.period) === -1) {
                taskData.period = 'morning';
            }
            
            validTasks.push(taskData);
        }
        
        if (validTasks.length === 0) {
            throw new Error('No valid tasks found. ' + (errors.length > 0 ? errors[0] : ''));
        }
        
        // Create tasks
        var tasks = getTasks();
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
                notes: '',
                subtasks: taskData.subtasks.map(function(subtaskText, idx) {
                    return {
                        id: Date.now() + i + idx + 1,
                        text: typeof subtaskText === 'string' ? subtaskText : subtaskText.text || '',
                        completed: typeof subtaskText === 'object' ? (subtaskText.completed || false) : false
                    };
                }),
                createdAt: new Date().toISOString()
            };
            
            tasks[taskData.day].push(newTask);
            addedCount++;
        }
        
        // Save and notify
        saveTasks(tasks);
        
        showNotification('Successfully created ' + addedCount + ' task(s)!', 'success');
        
        // Clear input after 2 seconds
        setTimeout(function() {
            input.value = '';
            // Redirect to main page
            setTimeout(function() {
                window.location.href = 'index.html';
            }, 1000);
        }, 2000);
        
    } catch (e) {
        showNotification('Error: ' + e.message, 'error');
    }
}

// Clear input
function clearInput() {
    var input = document.getElementById('jsonInput');
    input.value = '';
    showNotification('Input cleared', 'success');
}

// Use example
// Show notification - Modern Toast Style
function showNotification(message, type, title) {
    var notification = document.getElementById('notification');
    var toastTitle = notification.querySelector('.toast-title');
    var toastMessage = notification.querySelector('.toast-message');
    
    // Set default titles based on type
    var titles = {
        'success': title || 'Success!',
        'error': title || 'Oops!',
        'warning': title || 'Warning',
        'info': title || 'Info'
    };
    
    toastTitle.textContent = titles[type] || 'Notice';
    toastMessage.textContent = message;
    notification.className = 'toast-notification ' + type + ' show';
    
    // Reset and restart progress animation
    var progress = notification.querySelector('.toast-progress');
    progress.style.animation = 'none';
    progress.offsetHeight; // Trigger reflow
    progress.style.animation = 'toastProgress 4s linear forwards';
    
    setTimeout(function() {
        hideNotification();
    }, 4000);
}

function hideNotification() {
    var notification = document.getElementById('notification');
    notification.classList.remove('show');
}

// Confirm Modal System
var confirmCallback = null;

function showConfirmModal(title, message, type, callback) {
    var modal = document.getElementById('confirmModal');
    modal.querySelector('.confirm-title').textContent = title;
    modal.querySelector('.confirm-message').textContent = message;
    modal.className = 'confirm-modal ' + (type || 'danger') + ' show';
    confirmCallback = callback;
}

function closeConfirmModal(result) {
    var modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    if (confirmCallback) {
        confirmCallback(result);
        confirmCallback = null;
    }
}

// Undo System
var undoData = null;
var undoTimeout = null;

function showUndoNotification(message, title, deletedTasks, day) {
    // Store undo data
    undoData = {
        tasks: deletedTasks,
        day: day
    };
    
    var notification = document.getElementById('notification');
    var toastTitle = notification.querySelector('.toast-title');
    var toastMessage = notification.querySelector('.toast-message');
    
    toastTitle.textContent = title || 'Deleted!';
    toastMessage.textContent = message;
    notification.className = 'toast-notification success with-undo show';
    
    // Reset and restart progress animation (10 seconds)
    var progress = notification.querySelector('.toast-progress');
    progress.style.animation = 'none';
    progress.offsetHeight;
    progress.style.animation = 'toastProgress 10s linear forwards';
    
    // Clear previous timeout
    if (undoTimeout) {
        clearTimeout(undoTimeout);
    }
    
    // Auto-hide after 10 seconds
    undoTimeout = setTimeout(function() {
        hideNotification();
        undoData = null;
    }, 10000);
}

function undoDelete() {
    if (!undoData) return;
    
    var tasks = getTasks();
    
    if (undoData.day === 'all') {
        // Restore all days
        tasks = undoData.tasks;
    } else {
        // Restore specific day
        tasks[undoData.day] = undoData.tasks.concat(tasks[undoData.day]);
    }
    
    saveTasks(tasks);
    hideNotification();
    
    if (undoTimeout) {
        clearTimeout(undoTimeout);
    }
    
    var restoredCount = undoData.day === 'all' ? 
        Object.values(undoData.tasks).reduce(function(sum, arr) { return sum + arr.length; }, 0) :
        undoData.tasks.length;
    
    undoData = null;
    
    showNotification(restoredCount + ' task(s) restored!', 'success', 'Undone!');
}

// Delete Count Modal System
var currentDeleteDay = null;
var currentDeleteMax = 0;

function openDeleteCountModal(day) {
    var tasks = getTasks();
    var count = tasks[day].length;
    var dayName = day.charAt(0).toUpperCase() + day.slice(1);
    
    if (count === 0) {
        showNotification('No tasks on ' + dayName, 'info', 'Empty Day');
        return;
    }
    
    currentDeleteDay = day;
    currentDeleteMax = count;
    
    document.getElementById('deleteModalDay').textContent = dayName;
    document.getElementById('availableTaskCount').textContent = count;
    document.getElementById('deleteCountInput').value = 1;
    document.getElementById('deleteCountInput').max = count;
    
    document.getElementById('deleteCountModal').classList.add('show');
}

function closeDeleteCountModal() {
    document.getElementById('deleteCountModal').classList.remove('show');
    currentDeleteDay = null;
    currentDeleteMax = 0;
}

function adjustDeleteCount(delta) {
    var input = document.getElementById('deleteCountInput');
    var newVal = parseInt(input.value || 1) + delta;
    newVal = Math.max(1, Math.min(newVal, currentDeleteMax));
    input.value = newVal;
}

function setDeleteCountAll() {
    document.getElementById('deleteCountInput').value = currentDeleteMax;
}

function confirmDeleteCount() {
    var count = parseInt(document.getElementById('deleteCountInput').value) || 1;
    count = Math.min(count, currentDeleteMax);
    
    var tasks = getTasks();
    var dayName = currentDeleteDay.charAt(0).toUpperCase() + currentDeleteDay.slice(1);
    
    // Store deleted tasks for undo
    var deletedTasks = tasks[currentDeleteDay].slice(0, count);
    
    // Remove tasks
    tasks[currentDeleteDay] = tasks[currentDeleteDay].slice(count);
    saveTasks(tasks);
    
    closeDeleteCountModal();
    
    // Show undo notification
    showUndoNotification(
        count + ' task(s) deleted from ' + dayName + '. Click Undo to restore.',
        'Deleted!',
        deletedTasks,
        currentDeleteDay
    );
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to create tasks
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        createTasks();
    }
    
    // Ctrl/Cmd + K to clear
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearInput();
    }
});

// Quick Commands Functions

// Delete all tasks from all days
function deleteAllTasks() {
    var tasks = getTasks();
    var totalCount = 0;
    var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(function(day) {
        totalCount += tasks[day].length;
    });
    
    if (totalCount === 0) {
        showNotification('No tasks to delete', 'info', 'Empty');
        return;
    }
    
    showConfirmModal(
        'Delete All Tasks?',
        'This will permanently remove ALL ' + totalCount + ' tasks from EVERY day.',
        'danger',
        function(confirmed) {
            if (confirmed) {
                // Store for undo
                var backupTasks = JSON.parse(JSON.stringify(tasks));
                
                var emptyTasks = {
                    monday: [],
                    tuesday: [],
                    wednesday: [],
                    thursday: [],
                    friday: [],
                    saturday: [],
                    sunday: []
                };
                saveTasks(emptyTasks);
                
                showUndoNotification(
                    totalCount + ' tasks deleted. Click Undo to restore.',
                    'All Cleared!',
                    backupTasks,
                    'all'
                );
            }
        }
    );
}

// Quick delete by day - opens count selector modal
function quickDeleteDay(day) {
    openDeleteCountModal(day);
}

// Delete all tasks from a specific day (legacy support)
function deleteTasksByDay() {
    var day = document.getElementById('deleteDaySelect').value;
    
    if (!day) {
        showNotification('Please select a day first', 'error');
        return;
    }
    
    quickDeleteDay(day);
    document.getElementById('deleteDaySelect').value = '';
}

// Delete specific number of tasks from a day
function deleteTaskCount() {
    var count = parseInt(document.getElementById('deleteCount').value);
    var day = document.getElementById('deleteFromDay').value;
    
    if (!count || count < 1) {
        showNotification('Please enter a valid count', 'error');
        return;
    }
    
    if (!day) {
        showNotification('Please select a day', 'error');
        return;
    }
    
    var tasks = getTasks();
    var available = tasks[day].length;
    var dayName = day.charAt(0).toUpperCase() + day.slice(1);
    
    if (available === 0) {
        showNotification('No tasks on ' + dayName, 'info', 'Empty Day');
        return;
    }
    
    var toDelete = Math.min(count, available);
    
    // Store deleted tasks for undo
    var deletedTasks = tasks[day].slice(0, toDelete);
    
    tasks[day] = tasks[day].slice(toDelete);
    saveTasks(tasks);
    
    document.getElementById('deleteCount').value = '';
    document.getElementById('deleteFromDay').value = '';
    
    showUndoNotification(
        toDelete + ' task(s) deleted from ' + dayName + '. Click Undo to restore.',
        'Deleted!',
        deletedTasks,
        day
    );
}

// Duplicate tasks from one day to another
// Duplicate all tasks and reset completion status (for new week)
function duplicateAllToNextWeek() {
    var tasks = getTasks();
    var totalTasks = 0;
    var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(function(day) {
        totalTasks += tasks[day].length;
    });
    
    if (totalTasks === 0) {
        showNotification('No tasks to reset', 'info', 'Empty Week');
        return;
    }
    
    showConfirmModal(
        'Start Fresh Week?',
        'Keep all ' + totalTasks + ' tasks but reset their completion status for a new week?',
        'warning',
        function(confirmed) {
            if (confirmed) {
                days.forEach(function(day) {
                    tasks[day] = tasks[day].map(function(task, index) {
                        return {
                            id: Date.now() + index + Math.random() * 1000,
                            title: task.title,
                            completed: false,
                            priority: task.priority,
                            category: task.category,
                            period: task.period,
                            dueDate: '',
                            notes: task.notes || '',
                            subtasks: task.subtasks.map(function(subtask, subIndex) {
                                return {
                                    id: Date.now() + index + subIndex + 1000,
                                    text: subtask.text,
                                    completed: false
                                };
                            }),
                            createdAt: new Date().toISOString()
                        };
                    });
                });
                
                saveTasks(tasks);
                showNotification(totalTasks + ' tasks ready for the new week!', 'success', 'Week Reset!');
            }
        }
    );
}
