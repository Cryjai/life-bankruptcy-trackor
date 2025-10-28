class LifeBankruptcyTracker {
  constructor() {
    // app-level static configuration
    this.appData = {
      importanceLevels: {
        low: { reward: 10 },
        medium: { reward: 30 },
        high: { reward: 60 },
      },
      wastePresets: [5, 10, 30],
      pomodoroDefault: { work: 25 * 60, break: 5 * 60 },
    };

    // user data persisted to localStorage
    this.userData = {
      name: '',
      birthDate: '',
      currentMoney: 0,
      initialCapital: 0,
      tasks: [],
      todayStats: {
        tasksCompleted: 0,
        earned: 0,
        wasted: 0,
        autoDeducted: 0,
        focusSessions: 0,
      },
      preferences: {
        darkMode: false,
      },
    };

    this.storageKey = 'lbt_userData';
    this.lastActiveKey = 'lbt_lastActiveTime';
    this.pomodoroTimer = null;
    this.pomodoroRemaining = 0;
    this.pomodoroMode = 'work'; // 'work' or 'break'
    this.isPomodoroRunning = false;
  }

  init() {
    this.loadUserData();
    this.applyPreferences();
    this.bindEvents();

    // set last active time
    localStorage.setItem(this.lastActiveKey, Date.now().toString());

    // start any background intervals if necessary
    this.startMoneyDecrement(); // keep the app's time-driven deduction working

    // initial render
    this.renderTasks();
    this.updateDisplay();
  }

  loadUserData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // merge parsed into default userData to avoid missing keys
        this.userData = Object.assign(this.userData, parsed);
        // ensure important nested objects exist
        this.userData.todayStats = Object.assign(this.userData.todayStats || {}, parsed.todayStats || {});
        this.userData.preferences = Object.assign(this.userData.preferences || {}, parsed.preferences || {});
      }
    } catch (e) {
      console.error('Failed to load user data:', e);
      // reset storage if corrupt (could be destructive; user can re-import)
      // localStorage.removeItem(this.storageKey);
    }
  }

  saveUserData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.userData));
      localStorage.setItem(this.lastActiveKey, Date.now().toString());
    } catch (e) {
      console.error('Failed to save user data:', e);
      this.showNotification('儲存資料失敗，請檢查瀏覽器設定', 'error');
    }
  }

  applyPreferences() {
    if (this.userData.preferences?.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  calculateAge(birthDate) {
    if (!birthDate) return 0;
    const b = new Date(birthDate);
    const diff = Date.now() - b.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  calculateInitialCapital(age) {
    // simple formula as a fun metric
    const base = 10000;
    return Math.max(1000, Math.floor(base * Math.max(0.2, (50 - age) / 50)));
  }

  bindEvents() {
    document.getElementById('startApp')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSetup();
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
        const amount = parseInt(btn.getAttribute('data-amount'), 10) || 0;
        this.applyWaste(amount);
      });
    });

    document.getElementById('shareProgressBtn')?.addEventListener('click', () => {
      const stats = this.userData.todayStats || { tasksCompleted: 0, earned: 0, wasted: 0 };
      const summary = `我今日完成了 ${stats.tasksCompleted} 個任務，賺取 $${stats.earned}，浪費 $${stats.wasted}！ #人生破產追蹤器 https://cryjai.github.io/life-bankruptcy-trackor/`;
      if (navigator.share) {
        navigator.share({ title: '今日進度', text: summary }).catch(() => {
          // share can fail; fallback to copying to clipboard
          navigator.clipboard?.writeText(summary).then(() => {
            this.showNotification('進度已複製到剪貼簿', 'info');
          }).catch(() => {
            alert(summary);
          });
        });
      } else {
        // fallback: copy to clipboard if possible
        if (navigator.clipboard) {
          navigator.clipboard.writeText(summary).then(() => {
            this.showNotification('進度已複製到剪貼簿', 'info');
          }).catch(() => {
            alert(summary);
          });
        } else {
          alert(summary);
        }
      }
    });

    document.getElementById('toggleDarkMode')?.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const enabled = document.body.classList.contains('dark-mode');
      this.userData.preferences.darkMode = enabled;
      this.saveUserData();
    });

    // export/import
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      const data = JSON.stringify(this.userData, null, 2);
      // open a modal or prompt showing data for copy
      const exportArea = document.getElementById('exportArea');
      if (exportArea) {
        exportArea.value = data;
        this.showNotification('已生成匯出資料，複製並另存', 'info');
      }
      this.showAddTaskModal(); // reuse simple modal if no dedicated export modal present
    });

    document.getElementById('importBtn')?.addEventListener('click', () => {
      const raw = prompt('請貼上先前匯出的 JSON 資料以還原：');
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        // Basic validation
        if (parsed && typeof parsed === 'object') {
          this.userData = Object.assign(this.userData, parsed);
          this.saveUserData();
          this.renderTasks();
          this.updateDisplay();
          this.showNotification('資料已還原', 'success');
        } else {
          throw new Error('資料格式錯誤');
        }
      } catch (e) {
        console.error('Import failed:', e);
        this.showNotification('匯入資料失敗，請檢查格式', 'error');
      }
    });

    // Pomodoro UI
    document.getElementById('pomodoroBtn')?.addEventListener('click', () => {
      this.showModalById('pomodoroModal');
    });
    document.getElementById('pomodoroStart')?.addEventListener('click', () => this.startPomodoro());
    document.getElementById('pomodoroPause')?.addEventListener('click', () => this.pausePomodoro());
    document.getElementById('pomodoroReset')?.addEventListener('click', () => this.resetPomodoro());

    // keyboard shortcut: N to add task quickly
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        this.showAddTaskModal();
      }
    });

    // visibility tracking: handle when user returns to page
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this) {
        const now = Date.now();
        const lastSave = localStorage.getItem(this.lastActiveKey);
        if (lastSave) {
          const minutesAway = Math.floor((now - parseInt(lastSave, 10)) / 60000);
          if (minutesAway > 0 && this.userData.currentMoney > 0) {
            const deduction = Math.min(minutesAway, this.userData.currentMoney);
            this.userData.currentMoney = Math.max(0, this.userData.currentMoney - deduction);
            this.userData.todayStats.autoDeducted = (this.userData.todayStats.autoDeducted || 0) + deduction;
            this.saveUserData();
            this.updateDisplay();
            if (minutesAway > 30) {
              this.showNotification(`你離開咗 ${minutesAway} 分鐘，自動扣咗 $${deduction}`, 'warning');
            }
          }
        }
        localStorage.setItem(this.lastActiveKey, now.toString());
      }
    });
  }

  showModalById(id) {
    document.getElementById(id)?.classList.remove('hidden');
  }

  showSetupModal() {
    document.getElementById('setupModal')?.classList.remove('hidden');
  }

  showMainApp() {
    document.getElementById('setupModal')?.classList.add('hidden');
    document.getElementById('mainApp')?.classList.remove('hidden');
  }

  handleSetup() {
    const name = document.getElementById('nameInput')?.value?.trim() || '';
    const birthDate = document.getElementById('birthInput')?.value || '';
    if (!birthDate) return this.showNotification('請輸入出生日期以繼續', 'error');
    const age = this.calculateAge(birthDate);
    const initialCapital = this.calculateInitialCapital(age);
    this.userData.name = name;
    this.userData.birthDate = birthDate;
    this.userData.initialCapital = initialCapital;
    if (!this.userData.currentMoney) this.userData.currentMoney = initialCapital;
    this.saveUserData();
    this.applyPreferences();
    this.showMainApp();
    this.updateDisplay();
  }

  startMoneyDecrement() {
    // Simple example: decrement $1 every minute
    if (this._moneyInterval) return;
    this._moneyInterval = setInterval(() => {
      if (this.isPomodoroRunning) return; // optionally pause decrement during focus, keep user control
      if (this.userData.currentMoney > 0) {
        this.userData.currentMoney = Math.max(0, this.userData.currentMoney - 1);
        this.userData.todayStats.autoDeducted = (this.userData.todayStats.autoDeducted || 0) + 1;
        this.saveUserData();
        this.updateDisplay();
      }
    }, 60_000);
  }

  updateDisplay() {
    // Money and stats
    document.getElementById('todayEarned') && (document.getElementById('todayEarned').textContent = String(this.userData.todayStats.earned || 0));
    document.getElementById('tasksCompleted') && (document.getElementById('tasksCompleted').textContent = String(this.userData.todayStats.tasksCompleted || 0));
    document.getElementById('currentMoney') && (document.getElementById('currentMoney').textContent = String(this.userData.currentMoney || 0));
    // summary modal values
    document.getElementById('summaryAutoDeduct') && (document.getElementById('summaryAutoDeduct').textContent = String(this.userData.todayStats.autoDeducted || 0));
    const net = (this.userData.todayStats.earned || 0) - (this.userData.todayStats.wasted || 0) - (this.userData.todayStats.autoDeducted || 0);
    document.getElementById('summaryNet') && (document.getElementById('summaryNet').textContent = `$${net}`);
  }

  showNotification(text, type = 'info') {
    const n = document.getElementById('notification');
    if (!n) return;
    n.className = 'notification';
    n.classList.add(type);
    const t = document.getElementById('notificationText');
    if (t) t.textContent = text;
    n.classList.remove('hidden');
    clearTimeout(this._notifTimeout);
    this._notifTimeout = setTimeout(() => {
      n.classList.add('hidden');
    }, 3500);
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
    const titleEl = document.getElementById('taskTitle');
    const title = titleEl?.value?.trim() || '';
    const category = document.getElementById('taskCategory')?.value || '';
    const importance = document.getElementById('taskImportance')?.value || '';
    const desc = document.getElementById('taskDescription')?.value?.trim() || '';
    let reward = this.appData.importanceLevels[importance]?.reward || 0;
    const customRewardVal = document.getElementById('customReward')?.value;
    const customReward = customRewardVal ? parseInt(customRewardVal, 10) : NaN;
    if (!isNaN(customReward) && customReward > 0) reward = customReward;

    if (!title) return this.showNotification('任務標題唔可以空！', 'error');
    if (!category || !importance) return this.showNotification('請揀任務類型同重要度！', 'error');

    this.userData.tasks.push({ title, category, importance, desc, reward, isDone: false });
    this.hideModal('addTaskModal');
    // clear form
    if (titleEl) titleEl.value = '';
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
      // task header
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
      finishBtn.setAttribute('aria-pressed', String(!!task.isDone));
      actions.appendChild(finishBtn);
      div.appendChild(actions);

      // attach listener directly to the created button
      finishBtn.addEventListener('click', () => {
        if (!task.isDone) {
          task.isDone = true;
          this.userData.todayStats.earned = (this.userData.todayStats.earned || 0) + (task.reward || 0);
          this.userData.currentMoney = (this.userData.currentMoney || 0) + (task.reward || 0);
          this.userData.todayStats.tasksCompleted = (this.userData.todayStats.tasksCompleted || 0) + 1;
          this.saveUserData();
          this.renderTasks();
          this.updateDisplay();
          this.showNotification('恭喜完成任務！已獲得獎勵', 'success');
        } else {
          this.showNotification('此任務已標為完成', 'info');
        }
      });

      box.appendChild(div);
    });
  }

  showDailySummary() {
    // populate summary modal
    document.getElementById('summaryAutoDeduct') && (document.getElementById('summaryAutoDeduct').textContent = String(this.userData.todayStats.autoDeducted || 0));
    const net = (this.userData.todayStats.earned || 0) - (this.userData.todayStats.wasted || 0) - (this.userData.todayStats.autoDeducted || 0);
    document.getElementById('summaryNet') && (document.getElementById('summaryNet').textContent = `$${net}`);
    document.getElementById('summaryMessage') && (document.getElementById('summaryMessage').textContent =
      net >= 0 ? '今日總體狀態良好，繼續保持！' : '今日損失多，明日努力補回！');
    this.showModalById('summaryModal');
  }

  recordCustomWaste() {
    const el = document.getElementById('customWasteInput');
    if (!el) return this.showNotification('自定浪費輸入找不到', 'error');
    const val = parseInt(el.value, 10);
    if (isNaN(val) || val <= 0) return this.showNotification('請輸入有效金額', 'error');
    this.applyWaste(val);
    el.value = '';
    this.hideModal('wasteTimeModal');
  }

  applyWaste(amount) {
    amount = Math.abs(parseInt(amount, 10)) || 0;
    if (!amount) return;
    // deduct from currentMoney but never negative
    const deducted = Math.min(this.userData.currentMoney, amount);
    this.userData.currentMoney = Math.max(0, this.userData.currentMoney - amount);
    this.userData.todayStats.wasted = (this.userData.todayStats.wasted || 0) + amount;
    this.saveUserData();
    this.updateDisplay();
    this.renderTasks();
    this.showNotification(`已浪費 $${amount}`, 'warning');
  }

  escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  /* Pomodoro logic (client-only) */
  startPomodoro() {
    const workMin = parseInt(document.getElementById('pomWork')?.value || '25', 10) || 25;
    const breakMin = parseInt(document.getElementById('pomBreak')?.value || '5', 10) || 5;
    // convert to seconds
    if (!this.isPomodoroRunning) {
      if (this.pomodoroMode === 'work') {
        this.pomodoroRemaining = workMin * 60;
      } else {
        this.pomodoroRemaining = breakMin * 60;
      }
    }
    if (this.pomodoroTimer) clearInterval(this.pomodoroTimer);
    this.isPomodoroRunning = true;
    this.pomodoroTimer = setInterval(() => {
      if (this.pomodoroRemaining > 0) {
        this.pomodoroRemaining--;
        this.updatePomodoroDisplay();
      } else {
        // switch modes
        if (this.pomodoroMode === 'work') {
          this.userData.todayStats.focusSessions = (this.userData.todayStats.focusSessions || 0) + 1;
          // auto switch to break
          this.pomodoroMode = 'break';
          // set break duration from input
          this.pomodoroRemaining = (parseInt(document.getElementById('pomBreak')?.value || '5', 10) || 5) * 60;
          this.showNotification('工作時段完成，開始休息', 'info');
        } else {
          // break finished -> back to work
          this.pomodoroMode = 'work';
          this.pomodoroRemaining = (parseInt(document.getElementById('pomWork')?.value || '25', 10) || 25) * 60;
          this.showNotification('休息完畢，開始新一輪工作', 'info');
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
    document.getElementById('pomodoroStart') && (document.getElementById('pomodoroStart').disabled = this.isPomodoroRunning);
    document.getElementById('pomodoroPause') && (document.getElementById('pomodoroPause').disabled = !this.isPomodoroRunning);
  }
}

// --- boot up app ---
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new LifeBankruptcyTracker();
  app.init();
  app.renderTasks();

  // make sure last active time is tracked
  localStorage.setItem(app.lastActiveKey, Date.now().toString());
});

