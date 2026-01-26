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
// Show notification
function showNotification(message, type) {
    var notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification ' + type + ' show';
    
    setTimeout(function() {
        notification.classList.remove('show');
    }, 4000);
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
