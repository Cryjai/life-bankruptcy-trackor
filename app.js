
class LifeBankruptcyTracker {
  constructor() {
    this.appData = {
      taskCategories: ["Study", "Exercise", "Reading", "Skill Learning", "Other"],
      importanceLevels: {
        "low": { reward: 275, color: "#4CAF50" },
        "medium": { reward: 1225, color: "#FF9800" },
        "high": { reward: 3750, color: "#F44336" }
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
          "時間就係金錢，你明唔明？",
          "努力唔代表有成果，但唔努力一定廢到飛起。",
          "連自己都唔欣賞自己，仲想人欣賞你？",
          "App係你毒打自己嘅最後機會，再廢就連App都唔想serve你",
          "庸人自擾？你係庸人，仲擾到我！"
        ],
        taskCompleted: [
          "叮！終於做完一樣嘢啦",
          "恭喜你冇完全浪費時間",
          "做得好，繼續努力啦"
        ],
        timeWasted: [
          "又浪費時間？你條命值錢過咁？",
          "你咁樣法落去就等死啦",
          "仲有幾多錢俾你浪費？",
          "我淨係睇住你個存款一路跌，想笑你廢"
        ],
        dailySummary: {
          positive: "恭喜你今日冇完全浪費人生，繼續努力啦",
          negative: "你今日又成功浪費人生，繼續落去就破產啦",
          veryNegative: "你咁樣法落去，三個月就破產，不如去做乞衣算啦"
        }
      }
    };

    this.userData = this.loadUserData();
    this.moneyInterval = null;

    // Pomodoro state
    this.pomodoroTimer = null;
    this.pomodoroRemaining = 0;
    this.pomodoroMode = 'work';
    this.isPomodoroRunning = false;
  }

  init() {
    this.bindEvents();

    // If user already set up, skip front page and show main app
    if (!this.userData.birthDate) {
      // show front page; setup initiated from frontPage startApp button
      document.getElementById('frontPage')?.classList.remove('hidden');
      document.getElementById('mainApp')?.classList.add('hidden');
    } else {
      document.getElementById('frontPage')?.classList.add('hidden');
      this.showMainApp();
      this.startMoneyDecrement();
      this.updateDisplay();
      this.renderTasks();
    }
  }

  loadUserData() {
    const defaultData = {
      birthDate: null,
      name: '',
      age: 0,
      initialCapital: 0,
      currentMoney: 0,
      tasks: [],
      todayStats: {
        earned: 0,
        wasted: 0,
        autoDeducted: 0,
        tasksCompleted: 0
      },
      preferences: { darkMode: false }
    };

    try {
      const saved = localStorage.getItem('lifeBankruptcyData');
      if (saved) {
        const data = JSON.parse(saved);
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
    return hoursLeft * 100; // 100 HKD/hr (same fun metric)
  }

  bindEvents() {
    // FRONT PAGE start button opens setup modal
    document.getElementById('startApp')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('frontPage')?.classList.add('hidden');
      this.showSetupModal();
    });

    // Setup modal save/cancel
    document.getElementById('saveSetup')?.addEventListener('click', () => this.handleSetup());
    document.getElementById('cancelSetup')?.addEventListener('click', () => {
      // go back to front page
      this.hideModal('setupModal');
      document.getElementById('frontPage')?.classList.remove('hidden');
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
        const amount = parseInt(btn.getAttribute('data-amount')) || 0;
        this.applyWaste(amount);
        this.hideModal('wasteTimeModal');
      });
    });

    document.getElementById('birthInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.handleSetup(); }
    });

    document.getElementById('shareProgressBtn')?.addEventListener('click', () => {
      const stats = this.userData.todayStats;
      const summary = `我今日完成了${stats.tasksCompleted}個任務，賺取$${stats.earned}，浪費$${stats.wasted}！#人生破產追蹤器byAcry https://cryjai.github.io/life-bankruptcy-trackor/`;
      if (navigator.share) {
        navigator.share({ title: '今日進度', text: summary });
      } else {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(summary).then(() => this.showNotification('進度已複製到剪貼簿', 'info')).catch(() => alert(summary));
        } else {
          alert(summary);
        }
      }
    });

    document.getElementById('toggleDarkMode')?.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      this.userData.preferences.darkMode = document.body.classList.contains('dark-mode');
      this.saveUserData();
    });

    document.getElementById('pomodoroBtn')?.addEventListener('click', () => this.showModalById('pomodoroModal'));
    document.getElementById('pomodoroStart')?.addEventListener('click', () => this.startPomodoro());
    document.getElementById('pomodoroPause')?.addEventListener('click', () => this.pausePomodoro());
    document.getElementById('pomodoroReset')?.addEventListener('click', () => this.resetPomodoro());
    document.getElementById('closePomodoro')?.addEventListener('click', () => {
      this.pausePomodoro();
      this.hideModal('pomodoroModal');
    });

    // overlay click: close modals if clicking outside modal-content
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        // if clicked the modal overlay itself (not inside modal-content), close it
        if (e.target === modal) {
          const id = modal.id;
          this.hideModal(id);
          // if pomodoro modal closed, pause timer
          if (id === 'pomodoroModal') this.pausePomodoro();
        }
      });
    });

    // Esc closes any open modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal:not(.hidden)');
        modals.forEach(m => {
          this.hideModal(m.id);
          if (m.id === 'pomodoroModal') this.pausePomodoro();
        });
      }
    });

    // visibility tracking
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this) {
        const now = Date.now();
        const lastSave = localStorage.getItem('lastActiveTime');
        if (lastSave) {
          const minutesAway = Math.floor((now - parseInt(lastSave, 10)) / 60000);
          if (minutesAway > 0 && this.userData.currentMoney > 0) {
            const deduction = Math.min(minutesAway, this.userData.currentMoney);
            this.userData.currentMoney = Math.max(0, this.userData.currentMoney - deduction);
            this.userData.todayStats.autoDeducted += deduction;
            this.saveUserData();
            this.updateDisplay();
            if (minutesAway > 5) this.showNotification(`你離開咗 ${minutesAway} 分鐘，自動扣咗 $${deduction}`, 'warning');
          }
        }
        localStorage.setItem('lastActiveTime', now.toString());
      }
    });
  }

  showSetupModal() {
    document.getElementById('setupModal')?.classList.remove('hidden');
  }

  showMainApp() {
    document.getElementById('setupModal')?.classList.add('hidden');
    document.getElementById('frontPage')?.classList.add('hidden');
    document.getElementById('mainApp')?.classList.remove('hidden');
  }

  handleSetup() {
    const birthInput = document.getElementById('birthInput');
    const nameInput = document.getElementById('nameInput');
    const birthDate = birthInput?.value;
    const name = nameInput?.value?.trim() || '';
    if (!birthDate) return this.showNotification('請輸入出生日期！', 'error');
    const age = this.calculateAge(birthDate);
    if (age < 0 || age > 120) return this.showNotification('請輸入有效出生日期', 'error');
    const initialCapital = this.calculateInitialCapital(age);
    this.userData = { ...this.userData, birthDate, age, name, initialCapital, currentMoney: initialCapital };
    this.saveUserData();
    this.showMainApp();
    this.startMoneyDecrement();
    this.renderTasks();
    this.updateDisplay();
    this.showNotification(`歡迎 ${name || ''}！你有 $${initialCapital.toLocaleString()} 人生資本`, 'success');
  }

  startMoneyDecrement() {
    if (this.moneyInterval) clearInterval(this.moneyInterval);
    this.moneyInterval = setInterval(() => {
      if (this.userData.currentMoney > 0 && !this.isPomodoroRunning) {
        this.userData.currentMoney--;
        this.userData.todayStats.autoDeducted++;
        this.saveUserData();
        this.updateDisplay();
        if (this.userData.currentMoney <= 0) {
          this.showNotification('破產啦！做嘢啦！', 'error');
        }
      }
    }, 60000);
  }

  updateDisplay() {
    document.getElementById('currentMoney') && (document.getElementById('currentMoney').textContent = this.userData.currentMoney);
    document.getElementById('tasksCompleted') && (document.getElementById('tasksCompleted').textContent = this.userData.todayStats.tasksCompleted);
    document.getElementById('todayEarned') && (document.getElementById('todayEarned').textContent = this.userData.todayStats.earned);
    document.getElementById('todayWasted') && (document.getElementById('todayWasted').textContent = this.userData.todayStats.wasted);
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
    }, 3500);
  }

  showAddTaskModal() { document.getElementById('addTaskModal')?.classList.remove('hidden'); }
  showWasteTimeModal() { document.getElementById('wasteTimeModal')?.classList.remove('hidden'); }
  hideModal(modalId) { document.getElementById(modalId)?.classList.add('hidden'); }
  showModalById(id) { document.getElementById(id)?.classList.remove('hidden'); }

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
    this.updateDisplay();
    this.showNotification('任務已新增', 'success');
  }

  renderTasks() {
    const box = document.getElementById('tasksList');
    if (!box) return;
    box.innerHTML = '';
    this.userData.tasks.forEach((task, idx) => {
      const div = document.createElement('div');
      div.className = 'task-item' + (task.isDone ? ' completed' : '');
      const header = document.createElement('div');
      header.className = 'task-header';
      header.innerHTML = `<strong>${this.escapeHtml(task.title)}</strong><span class="task-meta">${this.escapeHtml(task.category)} / ${this.escapeHtml(task.importance)} [+${task.reward}]</span>`;
      div.appendChild(header);
      if (task.desc) {
        const desc = document.createElement('small');
        desc.textContent = task.desc;
        div.appendChild(desc);
      }
      const actions = document.createElement('div');
      actions.className = 'task-actions';
      const finishBtn = document.createElement('button');
      finishBtn.type = 'button';
      finishBtn.className = 'btn btn--primary';
      finishBtn.textContent = task.isDone ? '已完成' : '完成';
      actions.appendChild(finishBtn);
      div.appendChild(actions);

      finishBtn.addEventListener('click', () => {
        if (!task.isDone) {
          task.isDone = true;
          this.userData.todayStats.earned += task.reward;
          this.userData.currentMoney += task.reward;
          this.userData.todayStats.tasksCompleted++;
          this.saveUserData();
          this.showNotification(this.appData.sarcasticMessages.taskCompleted[Math.floor(Math.random() * 3)], 'success');
          this.renderTasks();
          this.updateDisplay();
        } else {
          this.showNotification('此任務已完成過', 'info');
        }
      });

      box.appendChild(div);
    });
  }

  showDailySummary() {
    document.getElementById('summaryTasksCount') && (document.getElementById('summaryTasksCount').textContent = this.userData.todayStats.tasksCompleted);
    document.getElementById('summaryEarned') && (document.getElementById('summaryEarned').textContent = this.userData.todayStats.earned);
    document.getElementById('summaryWasted') && (document.getElementById('summaryWasted').textContent = this.userData.todayStats.wasted);
    document.getElementById('summaryAutoDeduct') && (document.getElementById('summaryAutoDeduct').textContent = this.userData.todayStats.autoDeducted);
    const net = this.userData.todayStats.earned - this.userData.todayStats.wasted - this.userData.todayStats.autoDeducted;
    document.getElementById('summaryNet') && (document.getElementById('summaryNet').textContent = net >= 0 ? `$${net}` : `-$${Math.abs(net)}`);
    let msg = '';
    if (net > 0) msg = this.appData.sarcasticMessages.dailySummary.positive;
    else if (net < -500) msg = this.appData.sarcasticMessages.dailySummary.veryNegative;
    else msg = this.appData.sarcasticMessages.dailySummary.negative;
    document.getElementById('summaryMessage') && (document.getElementById('summaryMessage').textContent = msg);
    this.showModalById('summaryModal');
  }

  recordCustomWaste() {
    const activity = '自定浪費';
    const penalty = parseInt(document.getElementById('customWasteInput')?.value, 10);
    if (isNaN(penalty) || penalty <= 0) {
      this.showNotification('請輸入有效的浪費金額', 'error');
      return;
    }
    this.userData.todayStats.wasted += penalty;
    this.userData.currentMoney = Math.max(0, this.userData.currentMoney - penalty);
    this.saveUserData();
    this.showNotification(`${activity}：扣咗$${penalty}！`, 'error');
    this.updateDisplay();
    this.hideModal('wasteTimeModal');
  }

  applyWaste(amount) {
    amount = Math.abs(parseInt(amount, 10)) || 0;
    if (!amount) return;
    this.userData.todayStats.wasted += amount;
    this.userData.currentMoney = Math.max(0, this.userData.currentMoney - amount);
    this.saveUserData();
    this.updateDisplay();
    this.showNotification(`扣咗 $${amount}（浪費）`, 'error');
  }

  escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // Pomodoro logic (unchanged core behavior; added pause on close)
  startPomodoro() {
    const workMin = parseInt(document.getElementById('pomWork')?.value || '25', 10) || 25;
    const breakMin = parseInt(document.getElementById('pomBreak')?.value || '5', 10) || 5;
    if (!this.isPomodoroRunning) {
      this.pomodoroMode = 'work';
      this.pomodoroRemaining = workMin * 60;
    }
    if (this.pomodoroTimer) clearInterval(this.pomodoroTimer);
    this.isPomodoroRunning = true;
    this.pomodoroTimer = setInterval(() => {
      if (this.pomodoroRemaining > 0) {
        this.pomodoroRemaining--;
        this.updatePomodoroDisplay();
      } else {
        if (this.pomodoroMode === 'work') {
          this.userData.todayStats.focusSessions = (this.userData.todayStats.focusSessions || 0) + 1;
          this.pomodoroMode = 'break';
          this.pomodoroRemaining = breakMin * 60;
          this.showNotification('工作完成，開始休息', 'info');
        } else {
          this.pomodoroMode = 'work';
          this.pomodoroRemaining = workMin * 60;
          this.showNotification('休息完，返工喇', 'info');
        }
        this.saveUserData();
      }
    }, 1000);
    document.body.classList.add('focus-mode');
    this.updatePomodoroDisplay();
  }

  pausePomodoro() {
    if (this.pomodoroTimer) {
      clearInterval(this.pomodoroTimer);
      this.pomodoroTimer = null;
    }
    this.isPomodoroRunning = false;
    document.body.classList.remove('focus-mode');
    this.updatePomodoroDisplay();
  }

  resetPomodoro() {
    this.pausePomodoro();
    this.pomodoroMode = 'work';
    this.pomodoroRemaining = (parseInt(document.getElementById('pomWork')?.value || '25', 10) || 25) * 60;
    this.updatePomodoroDisplay();
  }

  updatePomodoroDisplay() {
    const el = document.getElementById('pomTimer');
    if (!el) return;
    const mins = Math.floor(this.pomodoroRemaining / 60);
    const secs = this.pomodoroRemaining % 60;
    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} (${this.pomodoroMode})`;
  }
}

// --- boot up app ---
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new LifeBankruptcyTracker();
  app.init();
});

