// 人生破產追蹤器 App Logic

class LifeBankruptcyTracker {
    constructor() {
        this.appData = {
            taskCategories: ["Study", "Exercise", "Reading", "Skill Learning", "Other"],
            importanceLevels: {
                "Low": { reward: 275, color: "#4CAF50" },
                "Medium": { reward: 1225, color: "#FF9800" },
                "High": { reward: 3750, color: "#F44336" }
            },
            timeWasteActivities: [
                { name: "看八卦", penalty: 2000 },
                { name: "睇reels", penalty: 3000 },
                { name: "沉船男神女神", penalty: 150 },
                { name: "看無用片", penalty: 900 },
                { name: "睇蠟筆小新", penalty: 1200 }
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
                    positive: "恭喜你今日冇完全浪費人生，繼續努力啦",
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
        this.bindEvents();

        if (!this.userData.birthDate) {
            this.showSetupModal();
        } else {
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
                // Reset daily stats if new day
                if (data.todayStats.lastResetDate !== new Date().toDateString()) {
                    data.todayStats = {
                        earned: 0, wasted: 0, autoDeducted: 0, tasksCompleted: 0,
                        lastResetDate: new Date().toDateString()
                    };
                }
                return { ...defaultData, ...data };
            }
        } catch (e) {
            console.error('Error loading user data:', e);
            localStorage.removeItem('lifeBankruptcyData');
        }
        return defaultData;
    }

    saveUserData() {
        try {
            localStorage.setItem('lifeBankruptcyData', JSON.stringify(this.userData));
        } catch (e) {
            console.error('Error saving user data:', e);
        }
    }

    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    }

    calculateInitialCapital(age) {
        const remainingYears = Math.max(90 - age, 1);
        const hoursLeft = remainingYears * 365 * 24;
        return hoursLeft * 100; // 100 HKD/hr
    }

    bindEvents() {
        document.getElementById('startApp')?.addEventListener('click', (e) => {
            e.preventDefault(); this.handleSetup();
        });
        document.getElementById('addTaskBtn')?.addEventListener('click', () => this.showAddTaskModal());
        document.getElementById('wasteTimeBtn')?.addEventListener('click', () => this.showWasteTimeModal());
        document.getElementById('showSummaryBtn')?.addEventListener('click', () => this.showDailySummary());
        document.getElementById('saveTask')?.addEventListener('click', () => this.saveTask());
        document.getElementById('cancelTask')?.addEventListener('click', () => this.hideModal('addTaskModal'));
        document.getElementById('cancelWaste')?.addEventListener('click', () => this.hideModal('wasteTimeModal'));
        document.getElementById('customWasteBtn')?.addEventListener('click', () => this.recordCustomWaste());
        document.getElementById('closeSummary')?.addEventListener('click', () => this.hideModal('summaryModal'));

        document.querySelectorAll('.waste-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activity = e.target.getAttribute('data-activity');
                const penalty = parseInt(e.target.getAttribute('data-penalty'));
                this.recordTimeWaste(activity, penalty);
                this.hideModal('wasteTimeModal');
            });
        });
        document.getElementById('birthDate')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.handleSetup(); }
        });
        document.getElementById('shareProgressBtn')?.addEventListener('click', () => {
            const stats = this.userData.todayStats;
            const summary = `我今日完成了${stats.tasksCompleted}個任務，賺取$${stats.earned}，浪費$${stats.wasted}！#人生破產追蹤器byAcry 大家一齊嚟試下人生破產追蹤器 https://cryjai.github.io/life-bankruptcy-trackor/`;
            if (navigator.share) {
                navigator.share({ title: '今日進度', text: summary });
            } else {
                alert('你的瀏覽器不支援分享功能');
            }
        });
        document.getElementById('toggleDarkMode')?.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }

    showSetupModal() {
        document.getElementById('setupModal')?.classList.remove('hidden');
        document.getElementById('mainApp')?.classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('setupModal')?.classList.add('hidden');
        document.getElementById('mainApp')?.classList.remove('hidden');
    }

    handleSetup() {
        const birthDateInput = document.getElementById('birthDate');
        const birthDate = birthDateInput.value;
        if (!birthDate) return this.showNotification('請輸入出生日期！', 'error');
        const age = this.calculateAge(birthDate);
        if (age < 0 || age > 100) return this.showNotification('請輸入有效的出生日期！', 'error');
        const initialCapital = this.calculateInitialCapital(age);
        this.userData = { ...this.userData, birthDate, age, initialCapital, currentMoney: initialCapital };
        this.saveUserData();
        this.showMainApp();
        this.startMoneyDecrement();
        this.updateDisplay();
        this.showNotification(`歡迎！你有 $${initialCapital.toLocaleString()} 人生資本`, 'success');
    }

    startMoneyDecrement() {
        if (this.moneyInterval) clearInterval(this.moneyInterval);
        this.moneyInterval = setInterval(() => {
            if (this.userData.currentMoney > 0) {
                this.userData.currentMoney--;
                this.userData.todayStats.autoDeducted++;
                this.saveUserData();
                this.updateDisplay();
                if (this.userData.currentMoney <= 0) {
                    this.showNotification('破產啦！做嘢啦！', 'error');
                }
            }
        }, 60000); // 每分鐘扣1蚊
    }

    updateDisplay() {
        document.getElementById('currentMoney').textContent = this.userData.currentMoney;
        document.getElementById('userAge').textContent = this.userData.age;
        const yearsLeft = Math.max(90 - this.userData.age, 0);
        document.getElementById('userDaysLeft').textContent = yearsLeft * 365;
        document.getElementById('tasksCompleted').textContent = this.userData.todayStats.tasksCompleted;
        document.getElementById('todayEarned').textContent = this.userData.todayStats.earned;
        document.getElementById('todayWasted').textContent = this.userData.todayStats.wasted;
    }

    showNotification(text, type = 'info') {
        const notification = document.getElementById('notification');
        const textElement = document.getElementById('notificationText');
        if (!notification || !textElement) return;
        textElement.textContent = text;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notification.classList.add('hidden');
        }, 4000);
    }

    showAddTaskModal() {
        document.getElementById('addTaskModal')?.classList.remove('hidden');
    }
    showWasteTimeModal() {
        document.getElementById('wasteTimeModal')?.classList.remove('hidden');
    }
    hideModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
    }

    saveTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const category = document.getElementById('taskCategory').value;
        const importance = document.getElementById('taskImportance').value;
        const desc = document.getElementById('taskDescription').value.trim();
        let reward = this.appData.importanceLevels[importance]?.reward || 0;
        const customReward = parseInt(document.getElementById('customReward')?.value);
        if (!isNaN(customReward) && customReward > 0) reward = customReward;

        if (!title) return this.showNotification('任務標題唔可以空！', 'error');
        if (!category || !importance) return this.showNotification('請揀任務類型同重要度！', 'error');

        this.userData.tasks.push({ title, category, importance, desc, reward, isDone: false });
        this.hideModal('addTaskModal');
        this.saveUserData();
        this.renderTasks();
    }

    renderTasks() {
        const box = document.getElementById('tasksList');
        if (!box) return;
        box.innerHTML = '';
        this.userData.tasks.forEach((task, idx) => {
            const div = document.createElement('div');
            div.className = 'task-item' + (task.isDone ? ' done' : '');
            div.innerHTML = `<strong>${task.title}</strong> (${task.category}/${task.importance}) [+$${task.reward}]
                <small>${task.desc}</small>
                <button class="btn btn--primary" id="finish${idx}">${task.isDone ? '已完成' : '完成'}</button>`;
            box.appendChild(div);

            document.getElementById(`finish${idx}`).addEventListener('click', () => {
                if (!task.isDone) {
                    task.isDone = true;
                    this.userData.todayStats.earned += task.reward;
                    this.userData.currentMoney += task.reward;
                    this.userData.todayStats.tasksCompleted++;
                    this.saveUserData();
                    this.showNotification(this.appData.sarcasticMessages.taskCompleted[Math.floor(Math.random() * 3)], 'success');
                    this.renderTasks();
                    this.updateDisplay();
                }
            });
        });
        this.updateDisplay();
    }

    showDailySummary() {
        document.getElementById('summaryTasksCount').textContent = this.userData.todayStats.tasksCompleted;
        document.getElementById('summaryEarned').textContent = this.userData.todayStats.earned;
        document.getElementById('summaryWasted').textContent = this.userData.todayStats.wasted;
        document.getElementById('summaryAutoDeduct').textContent = this.userData.todayStats.autoDeducted;
        const net = this.userData.todayStats.earned - this.userData.todayStats.wasted - this.userData.todayStats.autoDeducted;
        document.getElementById('summaryNet').textContent = net >= 0 ? `$${net}` : `-$${Math.abs(net)}`;
        let msg = '';
        if (net > 0) {
            msg = this.appData.sarcasticMessages.dailySummary.positive;
        } else if (net < -500) {
            msg = this.appData.sarcasticMessages.dailySummary.veryNegative;
        } else {
            msg = this.appData.sarcasticMessages.dailySummary.negative;
        }
        document.getElementById('summaryMessage').textContent = msg;
        document.getElementById('summaryModal').classList.remove('hidden');
    }

    recordTimeWaste(activity, penalty) {
        this.userData.todayStats.wasted += penalty;
        this.userData.currentMoney = Math.max(0, this.userData.currentMoney - penalty);
        this.saveUserData();
        this.showNotification(`${activity}：扣咗$${penalty}！${this.appData.sarcasticMessages.timeWasted[Math.floor(Math.random()*3)]}`, 'error');
        this.updateDisplay();
    }

    recordCustomWaste() {
        const activity = document.getElementById('customWaste').value.trim();
        const penalty = parseInt(document.getElementById('customPenalty').value);
        if (!activity || isNaN(penalty) || penalty < 50 || penalty > 1000) {
            this.showNotification('請輸入有效的浪費行為和罰款金額 (50-1000)！', 'error');
            return;
        }
        this.recordTimeWaste(activity, penalty);
        this.hideModal('wasteTimeModal');
    }
}

// --- boot up app ---
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LifeBankruptcyTracker();
    app.init();
    app.renderTasks();

    // Visibility tracking：返嚟自動計扣咗幾多錢
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && app) {
            const now = Date.now();
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
                        app.showNotification(`你離開咗${minutesAway}分鐘，扣咗$${deduction}`, 'warning');
                    }
                }
            }
        }
        if (document.hidden) {
            localStorage.setItem('lastActiveTime', Date.now().toString());
        }
    });
});

