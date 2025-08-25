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
                    "你人生有冇咁唔值錢啊"
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
                // Daily stats reset
                if (data.todayStats.lastResetDate !== new Date().toDateString()) {
                    data.todayStats = { earned:0, wasted:0, autoDeducted:0, tasksCompleted:0, lastResetDate: new Date().toDateString()};
                }
                return { ...defaultData, ...data };
            }
        } catch(e) {
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
        return hoursLeft * 100;
    }

    bindEvents() {
        // Setup modal (保證取到this)
        const startButton = document.getElementById('startApp');
        if (startButton) startButton.addEventListener('click', (e) => {e.preventDefault(); this.handleSetup();});
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) addTaskBtn.addEventListener('click', () => this.showAddTaskModal());
        const wasteTimeBtn = document.getElementById('wasteTimeBtn');
        if (wasteTimeBtn) wasteTimeBtn.addEventListener('click', () => this.showWasteTimeModal());
        const showSummaryBtn = document.getElementById('showSummaryBtn');
        if (showSummaryBtn) showSummaryBtn.addEventListener('click', () => this.showDailySummary());
        const saveTaskBtn = document.getElementById('saveTask');
        if (saveTaskBtn) saveTaskBtn.addEventListener('click', () => this.saveTask());
        const cancelTaskBtn = document.getElementById('cancelTask');
        if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', () => this.hideModal('addTaskModal'));
        const cancelWasteBtn = document.getElementById('cancelWaste');
        if (cancelWasteBtn) cancelWasteBtn.addEventListener('click', () => this.hideModal('wasteTimeModal'));
        const customWasteBtn = document.getElementById('customWasteBtn');
        if (customWasteBtn) customWasteBtn.addEventListener('click', () => this.recordCustomWaste());
        const closeSummaryBtn = document.getElementById('closeSummary');
        if (closeSummaryBtn) closeSummaryBtn.addEventListener('click', () => this.hideModal('summaryModal'));
        document.querySelectorAll('.waste-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activity = e.target.getAttribute('data-activity');
                const penalty = parseInt(e.target.getAttribute('data-penalty'));
                this.recordTimeWaste(activity, penalty);
                this.hideModal('wasteTimeModal');
            });
        });
        const birthDateInput = document.getElementById('birthDate');
        if (birthDateInput) birthDateInput.addEventListener('keypress', (e) => {if (e.key === 'Enter') this.handleSetup();});
    }

    showSetupModal() {
        document.getElementById('setupModal').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }
    showMainApp() {
        document.getElementById('setupModal').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
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
                this.userData.currentMoney -= 1;
                this.userData.todayStats.autoDeducted += 1;
                this.saveUserData();
                this.updateDisplay();
                if (this.userData.currentMoney === 0) {
                    this.showNotification("恭喜你，你終於破產！", 'error');
                }
            }
        }, 60000);
    }

    updateDisplay() {
        document.getElementById('currentMoney').textContent = this.userData.currentMoney.toLocaleString();
        document.getElementById('userAge').textContent = this.userData.age?.toString() || '';
        document.getElementById('userDaysLeft').textContent = Math.floor(this.userData.currentMoney / (100 * 24)).toString();
        document.getElementById('tasksCompleted').textContent = this.userData.todayStats.tasksCompleted || 0;
        document.getElementById('todayEarned').textContent = this.userData.todayStats.earned || 0;
        document.getElementById('todayWasted').textContent = this.userData.todayStats.wasted || 0;
    }

    showNotification(text, type = 'info') {
        const notification = document.getElementById('notification');
        const textElement = document.getElementById('notificationText');
        if (!notification || !textElement) return;
        textElement.textContent = text;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {notification.classList.add('hidden');}, 4000);
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

    recordTimeWaste(activity, penalty) {
        this.userData.currentMoney = Math.max(0, this.userData.currentMoney - penalty);
        this.userData.todayStats.wasted += penalty;
        this.saveUserData();
        this.updateDisplay();
        this.showNotification(`「${activity}」浪費咗$${penalty}！你仲唔醒？`, 'error');
    }

    showAddTaskModal() { document.getElementById('addTaskModal').classList.remove('hidden'); }
    showWasteTimeModal() { document.getElementById('wasteTimeModal').classList.remove('hidden'); }
    showDailySummary() { document.getElementById('summaryModal').classList.remove('hidden'); this.updateSummaryStats(); }
    hideModal(id) { document.getElementById(id).classList.add('hidden'); }

    saveTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const cat = document.getElementById('taskCategory').value;
        const imp = document.getElementById('taskImportance').value;
        const desc = document.getElementById('taskDescription').value.trim();
        let reward = this.appData.importanceLevels[imp]?.reward || 75;
        const customReward = parseInt(document.getElementById('customReward').value);
        if (!isNaN(customReward) && customReward > 0) reward = customReward;
        let penalty = 0;
        const customPenalty = parseInt(document.getElementById('customPenaltyTask').value);
        if (!isNaN(customPenalty) && customPenalty > 0) penalty = customPenalty;
        if (!title) return this.showNotification('請填寫任務標題', 'error');
        // create task and add to list
        this.userData.tasks.push({ title, cat, imp, desc, reward, penalty, completed: false });
        this.saveUserData();
        this.hideModal('addTaskModal');
        this.showNotification(`新任務「${title}」已儲存`, 'success');
        this.updateDisplay();
    }

    updateSummaryStats() {
        document.getElementById('summaryTasksCount').textContent = this.userData.todayStats.tasksCompleted || 0;
        document.getElementById('summaryEarned').textContent = this.userData.todayStats.earned || 0;
        document.getElementById('summaryWasted').textContent = this.userData.todayStats.wasted || 0;
        document.getElementById('summaryAutoDeduct').textContent = this.userData.todayStats.autoDeducted || 0;
        const net = (this.userData.todayStats.earned||0) - (this.userData.todayStats.wasted||0) - (this.userData.todayStats.autoDeducted||0);
        document.getElementById('summaryNet').textContent = net>=0?`$${net}`:`-$${Math.abs(net)}`;
        const msgElement = document.getElementById('summaryMessage');
        if (net > 0) msgElement.textContent = this.appData.sarcasticMessages.dailySummary.positive;
        else if (net > -1000) msgElement.textContent = this.appData.sarcasticMessages.dailySummary.negative;
        else msgElement.textContent = this.appData.sarcasticMessages.dailySummary.veryNegative;
    }
}

// 初始化App＋分享
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LifeBankruptcyTracker();
    app.init();

    const shareBtn = document.getElementById('shareProgressBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const stats = app.userData.todayStats;
            const summary = `我今日完成了${stats.tasksCompleted}個任務，賺取$${stats.earned}，浪費$${stats.wasted}！#人生破產追蹤器`;
            if (navigator.share) navigator.share({ title: '今日進度', text: summary });
            else alert('你的瀏覽器不支援分享功能');
        });
    }
});

// Tab離開／返嚟都會計時自動扣錢
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && app) {
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
                if (minutesAway > 5) app.showNotification(`你離開了 ${minutesAway} 分鐘，扣除 $${deduction}`, 'warning');
            }
        }
    }
    if (document.hidden) localStorage.setItem('lastActiveTime', new Date().getTime().toString());
});
