// Reports Management System

var currentTheme = 'light';
var completionChart = null;
var categoryChart = null;

// Initialize
window.addEventListener('load', function() {
    loadTheme();
    checkWeekReset();
    loadCurrentWeekData();
    loadSavedReports();
});

// Theme management
function loadTheme() {
    var savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Check if a new week has started
function checkWeekReset() {
    var lastWeekStart = localStorage.getItem('lastWeekStart');
    var currentWeekStart = getWeekStartDate();
    
    if (lastWeekStart && lastWeekStart !== currentWeekStart) {
        // New week detected - save report and reset
        saveWeeklyReport();
        resetWeeklyData();
    }
    
    localStorage.setItem('lastWeekStart', currentWeekStart);
}

// Get the start date of current week (Monday)
function getWeekStartDate() {
    var now = new Date();
    var day = now.getDay();
    var diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    var monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

// Get week end date (Sunday)
function getWeekEndDate(startDate) {
    var start = new Date(startDate);
    var end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
}

// Load current week data
function loadCurrentWeekData() {
    var tasks = JSON.parse(localStorage.getItem('weeklyTasks') || '{}');
    var stats = calculateStats(tasks);
    
    displayStats(stats);
    renderCharts(stats);
}

// Calculate statistics
function calculateStats(tasks) {
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
            
            // Category stats
            var category = task.category || 'other';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
            
            // Priority stats
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

// Display statistics
function displayStats(stats) {
    var statsContainer = document.getElementById('currentStats');
    
    var profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    var userName = profile.name || 'User';
    
    var gradeText = getPerformanceGrade(stats.completionRate);
    
    statsContainer.innerHTML = `
        <div class="stat-card stat-primary">
            <div class="stat-icon"><i class="fas fa-tasks"></i></div>
            <div class="stat-content">
                <h3>${stats.totalTasks}</h3>
                <p>Total Tasks</p>
            </div>
        </div>
        <div class="stat-card stat-success">
            <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
            <div class="stat-content">
                <h3>${stats.completedTasks}</h3>
                <p>Completed</p>
            </div>
        </div>
        <div class="stat-card stat-warning">
            <div class="stat-icon"><i class="fas fa-clock"></i></div>
            <div class="stat-content">
                <h3>${stats.activeTasks}</h3>
                <p>Active Tasks</p>
            </div>
        </div>
        <div class="stat-card stat-info">
            <div class="stat-icon"><i class="fas fa-percentage"></i></div>
            <div class="stat-content">
                <h3>${stats.completionRate}%</h3>
                <p>Completion Rate</p>
            </div>
        </div>
        <div class="stat-card stat-grade">
            <div class="stat-icon"><i class="fas fa-trophy"></i></div>
            <div class="stat-content">
                <h3>${gradeText.grade}</h3>
                <p>${gradeText.message}, ${userName}!</p>
            </div>
        </div>
    `;
}

// Get performance grade
function getPerformanceGrade(rate) {
    if (rate >= 90) return { grade: 'A+', message: 'Outstanding' };
    if (rate >= 80) return { grade: 'A', message: 'Excellent' };
    if (rate >= 70) return { grade: 'B', message: 'Great Job' };
    if (rate >= 60) return { grade: 'C', message: 'Good Work' };
    if (rate >= 50) return { grade: 'D', message: 'Keep Trying' };
    return { grade: 'F', message: 'Needs Improvement' };
}

// Render charts
function renderCharts(stats) {
    renderCompletionChart(stats);
    renderCategoryBreakdown(stats);
    renderPriorityBreakdown(stats);
}

function renderCompletionChart(stats) {
    var ctx = document.getElementById('completionChart');
    if (!ctx) return;
    
    if (completionChart) {
        completionChart.destroy();
    }
    
    var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var data = days.map(function(day) {
        return stats.byDay[day.toLowerCase()].rate;
    });
    
    completionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [{
                label: 'Completion Rate (%)',
                data: data,
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: currentTheme === 'dark' ? '#fff' : '#333' }
                },
                title: {
                    display: true,
                    text: 'Daily Completion Rate',
                    color: currentTheme === 'dark' ? '#fff' : '#333',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: currentTheme === 'dark' ? '#fff' : '#333' },
                    grid: { color: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                },
                x: {
                    ticks: { color: currentTheme === 'dark' ? '#fff' : '#333' },
                    grid: { color: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                }
            }
        }
    });
}

function renderCategoryBreakdown(stats) {
    var container = document.getElementById('categoryBreakdown');
    if (!container) return;
    
    var categories = Object.keys(stats.byCategory);
    if (categories.length === 0) {
        container.innerHTML = '<p class="no-data">No tasks categorized yet</p>';
        return;
    }
    
    var categoryIcons = {
        work: 'briefcase',
        personal: 'user',
        health: 'heartbeat',
        learning: 'book',
        other: 'ellipsis-h'
    };
    
    var categoryColors = {
        work: '#667eea',
        personal: '#764ba2',
        health: '#11998e',
        learning: '#f093fb',
        other: '#4facfe'
    };
    
    var totalCategoryTasks = Object.values(stats.byCategory).reduce(function(a, b) { return a + b; }, 0);
    
    var html = categories.map(function(cat) {
        var count = stats.byCategory[cat];
        var percentage = Math.round((count / totalCategoryTasks) * 100);
        var icon = categoryIcons[cat] || 'circle';
        var color = categoryColors[cat] || '#4facfe';
        
        return `
            <div class="breakdown-item">
                <div class="breakdown-header">
                    <div class="breakdown-label">
                        <i class="fas fa-${icon}" style="color: ${color}"></i>
                        <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    </div>
                    <div class="breakdown-value">
                        <strong>${count}</strong> <span class="text-muted">(${percentage}%)</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%; background: ${color};"></div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

function renderPriorityBreakdown(stats) {
    var container = document.getElementById('priorityBreakdown');
    if (!container) return;
    
    var priorities = [
        { key: 'high', label: 'High Priority', icon: 'exclamation-circle', color: '#f5576c' },
        { key: 'medium', label: 'Medium Priority', icon: 'minus-circle', color: '#667eea' },
        { key: 'low', label: 'Low Priority', icon: 'arrow-down', color: '#38ef7d' }
    ];
    
    var html = '<div class="priority-grid">';
    
    priorities.forEach(function(priority) {
        var count = stats.byPriority[priority.key] || 0;
        html += `
            <div class="priority-card" style="border-left: 4px solid ${priority.color}">
                <i class="fas fa-${priority.icon}" style="color: ${priority.color}"></i>
                <div class="priority-info">
                    <div class="priority-count">${count}</div>
                    <div class="priority-label">${priority.label}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderCategoryChartOld(stats) {
    var ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    var categories = Object.keys(stats.byCategory);
    var data = categories.map(function(cat) { return stats.byCategory[cat]; });
    
    var colors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(240, 147, 251, 0.8)',
        'rgba(249, 168, 212, 0.8)',
        'rgba(167, 139, 250, 0.8)'
    ];
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories.map(function(c) { return c.charAt(0).toUpperCase() + c.slice(1); }),
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: currentTheme === 'dark' ? '#1a1a1a' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: currentTheme === 'dark' ? '#fff' : '#333', padding: 15 }
                },
                title: {
                    display: true,
                    text: 'Tasks by Category',
                    color: currentTheme === 'dark' ? '#fff' : '#333',
                    font: { size: 16, weight: 'bold' }
                }
            }
        }
    });
}

// Save weekly report
function saveWeeklyReport() {
    var tasks = JSON.parse(localStorage.getItem('weeklyTasks') || '{}');
    var stats = calculateStats(tasks);
    
    var weekStart = localStorage.getItem('lastWeekStart');
    if (!weekStart) weekStart = getWeekStartDate();
    
    var report = {
        id: Date.now(),
        weekStart: weekStart,
        weekEnd: getWeekEndDate(weekStart),
        stats: stats,
        savedAt: new Date().toISOString()
    };
    
    var reports = JSON.parse(localStorage.getItem('weeklyReports') || '[]');
    
    // Add new report
    reports.unshift(report);
    
    // Keep only last 10 reports
    if (reports.length > 10) {
        reports = reports.slice(0, 10);
    }
    
    localStorage.setItem('weeklyReports', JSON.stringify(reports));
}

// Reset weekly data
function resetWeeklyData() {
    var emptyTasks = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };
    localStorage.setItem('weeklyTasks', JSON.stringify(emptyTasks));
}

// Load saved reports
function loadSavedReports() {
    var reports = JSON.parse(localStorage.getItem('weeklyReports') || '[]');
    var reportsList = document.getElementById('reportsList');
    var reportCount = document.getElementById('reportCount');
    
    reportCount.textContent = reports.length + '/10 Reports';
    
    if (reports.length === 0) {
        reportsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No saved reports yet</p>
                <small>Reports are automatically generated at the end of each week</small>
            </div>
        `;
        return;
    }
    
    reportsList.innerHTML = reports.map(function(report) {
        var gradeInfo = getPerformanceGrade(report.stats.completionRate);
        return `
            <div class="report-card" data-report-id="${report.id}">
                <div class="report-header">
                    <div class="report-date">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(report.weekStart)} - ${formatDate(report.weekEnd)}</span>
                    </div>
                    <div class="report-grade grade-${gradeInfo.grade.replace('+', 'plus')}">${gradeInfo.grade}</div>
                </div>
                <div class="report-stats-mini">
                    <div class="mini-stat">
                        <i class="fas fa-tasks"></i> ${report.stats.totalTasks}
                    </div>
                    <div class="mini-stat success">
                        <i class="fas fa-check"></i> ${report.stats.completedTasks}
                    </div>
                    <div class="mini-stat">
                        <i class="fas fa-percentage"></i> ${report.stats.completionRate}%
                    </div>
                </div>
                <div class="report-actions">
                    <button class="btn-small btn-primary" onclick="exportReport(${report.id})">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="btn-small btn-danger" onclick="deleteReport(${report.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Format date
function formatDate(dateStr) {
    var date = new Date(dateStr);
    var options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Generate current report
function generateCurrentReport() {
    var tasks = JSON.parse(localStorage.getItem('weeklyTasks') || '{}');
    var stats = calculateStats(tasks);
    var profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    
    var report = {
        userName: profile.name || 'User',
        weekStart: getWeekStartDate(),
        weekEnd: getWeekEndDate(getWeekStartDate()),
        stats: stats,
        generatedAt: new Date().toLocaleString()
    };
    
    exportReportAsJSON(report, 'current-week-report');
}

// Export report
function exportReport(reportId) {
    var reports = JSON.parse(localStorage.getItem('weeklyReports') || '[]');
    var report = reports.find(function(r) { return r.id === reportId; });
    
    if (!report) return;
    
    var profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    var exportData = {
        userName: profile.name || 'User',
        weekStart: report.weekStart,
        weekEnd: report.weekEnd,
        stats: report.stats,
        savedAt: report.savedAt
    };
    
    var filename = 'weekly-report-' + report.weekStart;
    exportReportAsJSON(exportData, filename);
}

// Export as JSON
function exportReportAsJSON(data, filename) {
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Report exported successfully!', 'success');
}

// Delete report
function deleteReport(reportId) {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    var reports = JSON.parse(localStorage.getItem('weeklyReports') || '[]');
    reports = reports.filter(function(r) { return r.id !== reportId; });
    localStorage.setItem('weeklyReports', JSON.stringify(reports));
    
    loadSavedReports();
    showNotification('Report deleted successfully', 'success');
}

// Show notification
function showNotification(message, type) {
    // Create temporary notification
    var notif = document.createElement('div');
    notif.className = 'temp-notification ' + type;
    notif.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notif);
    
    setTimeout(function() {
        notif.classList.add('show');
    }, 100);
    
    setTimeout(function() {
        notif.classList.remove('show');
        setTimeout(function() {
            document.body.removeChild(notif);
        }, 300);
    }, 3000);
}
