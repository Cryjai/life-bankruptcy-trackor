// 人生破產追蹤器 App Logic

class LifeBankruptcyTracker {
    constructor() {
        this.appData = {
            taskCategories: ["Study", "Exercise", "Reading", "Skill Learning", "Other"],
            importanceLevels: {
                "Low": { reward: 75, color: "#4CAF50" },
                "Medium": { reward: 225, color: "#FF9800" },
                "High": { reward: 750, color: "#F44336" }
            },
            timeWasteActivities: [
                { name: "看八卦", penalty: 200 },
                { name: "刷抖音", penalty: 300 },
                { name: "發呆", penalty: 150 },
                { name: "看無用片", penalty: 250 },
                { name: "打機", penalty: 400 }
            ],
            sarcasticMessages: {
                moneyDecreasing: [
                    "人生苦短，你仲唔做嘢？",
                    "你個錢燒緊，快啲做task啦",
                    "時間就係金錢，你明唔明？"
                ],
                taskCompleted: [
                    "叮！終於做完一樣嘢啦",
                    "恭喜你冇完全浪費時間",
                    "做得好，繼續努力啦"
                ],
                timeWasted: [
                    "又浪費時間？你條命值錢過咁？",
                    "你咁樣法落去就等死啦",
                    "仲有幾多錢俾你浪費？"
                ],
                dailySummary: {
                    positive: "恭喜你今日冇完全浪費人生",
                    negative: "你今日又成功浪費人生，繼續落去就破產啦",
                    veryNegative: "你咁樣法落去，三個月就破產，不如去做乞丐算啦"
                }
            }
        };
        
        this.userData = this.loadUserData();
        this.moneyInterval = null;
        this.notificationTimeout = null;
    }

    init() {
        console.log('Initializing app...');
        this.bindEvents();
        
        if (!this.userData.birthDate) {
            console.log('No birth date found, showing setup');
            this.showSetupModal();
        } else {
            console.log('Birth date found, showing main app');
            this.showMainApp();
            this.startMoneyDecrement();
            this.updateDisplay();
        }
    }

    loadUserData() {
        const defaultData = {
            birthDate: null,
            age: 0,
            initialCapital: 0,
            currentMoney: 0,
            tasks: [],
            todayStats: {
                earned: 0,
                wasted: 0,
                autoDeducted: 0,
                tasksCompleted: 0,
                lastResetDate: new Date().toDateString()
            }
        };

        try {
            const saved = localStorage.getItem('lifeBankruptcyData');
            if (saved) {
                const data = JSON.parse(saved);
                // Reset daily stats if it's a new day
                if (data.todayStats.lastResetDate !== new Date().toDateString()) {
                    data.todayStats = {
                        earned: 0,
                        wasted: 0,
                        autoDeducted: 0,
                        tasksCompleted: 0,
                        lastResetDate: new Date().toDateString()
                    };
                }
                return { ...defaultData, ...data };
            }
        } catch (e) {
            console.error('Error loading user data:', e);
        }
        
        return defaultData;
    }

    saveUserData() {
        try {
            localStorage.setItem('lifeBankruptcyData', JSON.stringify(this.userData));
            console.log('User data saved successfully');
        } catch (e) {
            console.error('Error saving user data:', e);
        }
    }

    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    calculateInitialCapital(age) {
        // (90 - age) * 365 * 24 hours * 100 HKD per hour
        const remainingYears = Math.max(90 - age, 1);
        const hoursLeft = remainingYears * 365 * 24;
        return hoursLeft * 100; // 100 HKD per hour for psychological impact
    }

    bindEvents() {
        console.log('Binding events...');
        
        // Setup modal - use arrow function to preserve 'this' context
        const startButton = document.getElementById('startApp');
        if (startButton) {
            startButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Start button clicked');
                this.handleSetup();
            });
            console.log('Setup button event bound');
        }
        
        // Main app buttons
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.showAddTaskModal());
        }
        
        const wasteTimeBtn = document.getElementById('wasteTimeBtn');
        if (wasteTimeBtn) {
            wasteTimeBtn.addEventListener('click', () => this.showWasteTimeModal());
        }
        
        const showSummaryBtn = document.getElementById('showSummaryBtn');
        if (showSummaryBtn) {
            showSummaryBtn.addEventListener('click', () => this.showDailySummary());
        }
        
        // Add task modal
        const saveTaskBtn = document.getElementById('saveTask');
        if (saveTaskBtn) {
            saveTaskBtn.addEventListener('click', () => this.saveTask());
        }
        
        const cancelTaskBtn = document.getElementById('cancelTask');
        if (cancelTaskBtn) {
            cancelTaskBtn.addEventListener('click', () => this.hideModal('addTaskModal'));
        }
        
        // Waste time modal
        const cancelWasteBtn = document.getElementById('cancelWaste');
        if (cancelWasteBtn) {
            cancelWasteBtn.addEventListener('click', () => this.hideModal('wasteTimeModal'));
        }
        
        const customWasteBtn = document.getElementById('customWasteBtn');
        if (customWasteBtn) {
            customWasteBtn.addEventListener('click', () => this.recordCustomWaste());
        }
        
        // Summary modal
        const closeSummaryBtn = document.getElementById('closeSummary');
        if (closeSummaryBtn) {
            closeSummaryBtn.addEventListener('click', () => this.hideModal('summaryModal'));
        }
        
        // Waste time quick buttons
        document.querySelectorAll('.waste-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activity = e.target.getAttribute('data-activity');
                const penalty = parseInt(e.target.getAttribute('data-penalty'));
                this.recordTimeWaste(activity, penalty);
                this.hideModal('wasteTimeModal');
            });
        });
        
        // Enter key support for birth date input
        const birthDateInput = document.getElementById('birthDate');
        if (birthDateInput) {
            birthDateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSetup();
                }
            });
        }
    }

    showSetupModal() {
        console.log('Showing setup modal');
        document.getElementById('setupModal').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        console.log('Showing main app');
        document.getElementById('setupModal').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
    }

    handleSetup() {
        console.log('Handling setup...');
        const birthDateInput = document.getElementById('birthDate');
        const birthDate = birthDateInput.value;
        
        console.log('Birth date value:', birthDate);
        
        if (!birthDate) {
            this.showNotification('請輸入出生日期！', 'error');
            return;
        }

        const age = this.calculateAge(birthDate);
        console.log('Calculated age:', age);
        
        if (age < 0 || age > 100) {
            this.showNotification('請輸入有效的出生日期！', 'error');
            return;
        }

        const initialCapital = this.calculateInitialCapital(age);
        console.log('Initial capital:', initialCapital);
        
        this.userData = {
            ...this.userData,
            birthDate,
            age,
            initialCapital,
            currentMoney: initialCapital
        };

        this.saveUserData();
        this.showMainApp();
        this.startMoneyDecrement();
        this.updateDisplay();
        
        this.showNotification(`歡迎！你有 $${initialCapital.toLocaleString()} 人生資本`, 'success');
    }

    startMoneyDecrement() {
        // Clear existing interval
        if (this.moneyInterval) {
            clearInterval(this.moneyInterval);
        }

        // Deduct $1 every minute (60000ms) - for demo, use 10 seconds
        this.moneyInterval = setInterval(() => {
            this.userData.currentMoney = Math.max(0, this.userData.currentMoney - 1);
            this.userData.todayStats.autoDeducted += 1;
            this.updateMoneyDisplay();
            this.updateMotivationalMessage();
            this.saveUserData();

            // Check for bankruptcy
            if (this.userData.currentMoney <= 0) {
                this.handleBankruptcy();
            }
        }, 10000); // 10 seconds for demo - change to 60000 for production
    }

    handleBankruptcy() {
        clearInterval(this.moneyInterval);
        this.showNotification('💀 你破產啦！人生完結！', 'error');
        document.getElementById('moneyStatus').textContent = '💀 已破產';
        document.getElementById('timeWarning').textContent = '你的人生已經結束了...';
    }

    updateDisplay() {
        this.updateMoneyDisplay();
        this.updateUserInfo();
        this.updateTodayStats();
        this.updateTasksList();
        this.updateMotivationalMessage();
    }

    updateMoneyDisplay() {
        const moneyElement = document.getElementById('currentMoney');
        if (moneyElement) {
            moneyElement.textContent = this.userData.currentMoney.toLocaleString();
        }
        
        // Update status
        const statusElement = document.getElementById('moneyStatus');
        if (statusElement) {
            if (this.userData.currentMoney <= 0) {
                statusElement.textContent = '💀 已破產';
            } else if (this.userData.currentMoney < 10000) {
                statusElement.textContent = '⚠️ 瀕臨破產中...';
            } else {
                statusElement.textContent = '正在燒銀紙中...';
            }
        }
        
        // Update warning
        const warningElement = document.getElementById('timeWarning');
        if (warningElement) {
            const daysLeft = Math.floor(this.userData.currentMoney / (24 * 60)); // $1 per minute = $1440 per day
            if (daysLeft <= 30) {
                warningElement.textContent = `只剩 ${daysLeft} 日就破產！`;
                warningElement.style.color = 'var(--color-error)';
            } else if (daysLeft <= 90) {
                warningElement.textContent = `還有 ${daysLeft} 日生存時間`;
                warningElement.style.color = 'var(--color-warning)';
            } else {
                warningElement.textContent = `還有 ${daysLeft} 日生存時間`;
                warningElement.style.color = 'var(--color-text-secondary)';
            }
        }
    }

    updateUserInfo() {
        const ageElement = document.getElementById('userAge');
        if (ageElement) {
            ageElement.textContent = this.userData.age;
        }
        
        const daysLeft = Math.floor(this.userData.currentMoney / (24 * 60));
        const daysLeftElement = document.getElementById('userDaysLeft');
        if (daysLeftElement) {
            daysLeftElement.textContent = daysLeft.toLocaleString();
        }
    }

    updateTodayStats() {
        const tasksCompletedElement = document.getElementById('tasksCompleted');
        if (tasksCompletedElement) {
            tasksCompletedElement.textContent = this.userData.todayStats.tasksCompleted;
        }
        
        const todayEarnedElement = document.getElementById('todayEarned');
        if (todayEarnedElement) {
            todayEarnedElement.textContent = this.userData.todayStats.earned.toLocaleString();
        }
        
        const todayWastedElement = document.getElementById('todayWasted');
        if (todayWastedElement) {
            todayWastedElement.textContent = this.userData.todayStats.wasted.toLocaleString();
        }
    }

    updateTasksList() {
        const tasksList = document.getElementById('tasksList');
        if (!tasksList) return;
        
        const todayTasks = this.userData.tasks.filter(task => {
            const taskDate = new Date(task.createdAt).toDateString();
            const today = new Date().toDateString();
            return taskDate === today;
        });

        if (todayTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <p>今日未有任務<br>快啲加Task賺錢啦！</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = todayTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <h4 class="task-title">${task.title}</h4>
                    <span class="task-importance ${task.importance.toLowerCase()}">
                        ${task.importance} (+$${this.appData.importanceLevels[task.importance].reward})
                    </span>
                </div>
                <div class="task-category">📂 ${this.getCategoryDisplayName(task.category)}</div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                <div class="task-actions">
                    ${!task.completed ? `<button class="btn btn--primary btn--sm" onclick="app.completeTask('${task.id}')">完成</button>` : ''}
                    <button class="btn btn--outline btn--sm" onclick="app.deleteTask('${task.id}')">刪除</button>
                </div>
            </div>
        `).join('');
    }

    getCategoryDisplayName(category) {
        const categories = {
            'Study': '學習',
            'Exercise': '運動',
            'Reading': '閱讀',
            'Skill Learning': '技能學習',
            'Other': '其他'
        };
        return categories[category] || category;
    }

    updateMotivationalMessage() {
        const messageElement = document.getElementById('motivationalMessage');
        if (messageElement) {
            const messages = this.appData.sarcasticMessages.moneyDecreasing;
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            messageElement.textContent = randomMessage;
        }
    }

    showAddTaskModal() {
        this.showModal('addTaskModal');
        // Clear form
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
        document.getElementById('taskCategory').value = 'Study';
        document.getElementById('taskImportance').value = 'Medium';
    }

    saveTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const category = document.getElementById('taskCategory').value;
        const importance = document.getElementById('taskImportance').value;

        if (!title) {
            this.showNotification('請輸入任務標題！', 'error');
            return;
        }

        const task = {
            id: Date.now().toString(),
            title,
            description,
            category,
            importance,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.userData.tasks.push(task);
        this.saveUserData();
        this.updateTasksList();
        this.hideModal('addTaskModal');
        this.showNotification('任務已新增！', 'success');
    }

    completeTask(taskId) {
        const task = this.userData.tasks.find(t => t.id === taskId);
        if (!task || task.completed) return;

        task.completed = true;
        task.completedAt = new Date().toISOString();

        const reward = this.appData.importanceLevels[task.importance].reward;
        this.userData.currentMoney += reward;
        this.userData.todayStats.earned += reward;
        this.userData.todayStats.tasksCompleted += 1;

        // Animate money gain
        const moneyElement = document.getElementById('currentMoney');
        if (moneyElement) {
            moneyElement.classList.add('money-gain');
            setTimeout(() => moneyElement.classList.remove('money-gain'), 600);
        }

        this.saveUserData();
        this.updateDisplay();
        
        const messages = this.appData.sarcasticMessages.taskCompleted;
        const message = messages[Math.floor(Math.random() * messages.length)];
        this.showNotification(`${message} +$${reward}`, 'success');
    }

    deleteTask(taskId) {
        this.userData.tasks = this.userData.tasks.filter(t => t.id !== taskId);
        this.saveUserData();
        this.updateTasksList();
        this.showNotification('任務已刪除', 'warning');
    }

    showWasteTimeModal() {
        this.showModal('wasteTimeModal');
        // Clear custom waste form
        document.getElementById('customWaste').value = '';
        document.getElementById('customPenalty').value = '';
    }

    recordTimeWaste(activity, penalty) {
        this.userData.currentMoney = Math.max(0, this.userData.currentMoney - penalty);
        this.userData.todayStats.wasted += penalty;

        // Animate money loss
        const moneyElement = document.getElementById('currentMoney');
        if (moneyElement) {
            moneyElement.classList.add('money-loss');
            setTimeout(() => moneyElement.classList.remove('money-loss'), 600);
        }

        this.saveUserData();
        this.updateDisplay();

        const messages = this.appData.sarcasticMessages.timeWasted;
        const message = messages[Math.floor(Math.random() * messages.length)];
        this.showNotification(`${message} -$${penalty}`, 'error');
    }

    recordCustomWaste() {
        const activity = document.getElementById('customWaste').value.trim();
        const penalty = parseInt(document.getElementById('customPenalty').value);

        if (!activity || !penalty || penalty < 50 || penalty > 1000) {
            this.showNotification('請輸入有效的浪費行為和罰款金額 (50-1000)！', 'error');
            return;
        }

        this.recordTimeWaste(activity, penalty);
        this.hideModal('wasteTimeModal');
    }

    showDailySummary() {
        const stats = this.userData.todayStats;
        const netChange = stats.earned - stats.wasted - stats.autoDeducted;
        
        document.getElementById('summaryTasksCount').textContent = stats.tasksCompleted;
        document.getElementById('summaryEarned').textContent = stats.earned.toLocaleString();
        document.getElementById('summaryWasted').textContent = stats.wasted.toLocaleString();
        document.getElementById('summaryAutoDeduct').textContent = stats.autoDeducted.toLocaleString();
        
        const netElement = document.getElementById('summaryNet');
        netElement.textContent = (netChange >= 0 ? '+' : '') + '$' + netChange.toLocaleString();
        netElement.className = netChange >= 0 ? 'stat-positive' : 'stat-negative';
        
        // Generate sarcastic message
        const messageElement = document.getElementById('summaryMessage');
        let message;
        if (netChange > 500) {
            message = this.appData.sarcasticMessages.dailySummary.positive;
        } else if (netChange < -1000) {
            message = this.appData.sarcasticMessages.dailySummary.veryNegative;
        } else {
            message = this.appData.sarcasticMessages.dailySummary.negative;
        }
        messageElement.textContent = message;
        
        this.showModal('summaryModal');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showNotification(text, type = 'info') {
        const notification = document.getElementById('notification');
        const textElement = document.getElementById('notificationText');
        
        if (!notification || !textElement) return;
        
        textElement.textContent = text;
        notification.className = `notification ${type}`;
        
        // Hide any existing timeout
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // Show notification for 4 seconds
        this.notificationTimeout = setTimeout(() => {
            notification.classList.add('hidden');
        }, 4000);
    }
}

// Initialize app when page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    app = new LifeBankruptcyTracker();
    app.init();
});

// Handle page visibility change to continue money deduction even when tab is not active
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && app) {
        // Recalculate money when user returns to tab
        const now = new Date().getTime();
        const lastSave = localStorage.getItem('lastActiveTime');
        
        if (lastSave) {
            const minutesAway = Math.floor((now - parseInt(lastSave)) / 60000);
            if (minutesAway > 0 && app.userData.currentMoney > 0) {
                const deduction = Math.min(minutesAway, app.userData.currentMoney);
                app.userData.currentMoney = Math.max(0, app.userData.currentMoney - deduction);
                app.userData.todayStats.autoDeducted += deduction;
                app.saveUserData();
                app.updateDisplay();
                
                if (minutesAway > 5) {
                    app.showNotification(`你離開了 ${minutesAway} 分鐘，扣除 $${deduction}`, 'warning');
                }
            }
        }
    }
    document.getElementById('shareProgressBtn').addEventListener('click', () => {
    const summary = '我今日完成了X個任務，賺取$Y，浪費$Z！#人生破產追蹤器';
    if (navigator.share) {
        navigator.share({ title: '今日進度', text: summary });
    } else {
        alert('你的瀏覽器不支援分享功能');
    }
});
    
    // Save current time when leaving
    if (document.hidden) {
        localStorage.setItem('lastActiveTime', new Date().getTime().toString());
    }
});
