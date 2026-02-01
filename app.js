// ===== Data Management =====
class FinanceManager {
    constructor() {
        this.transactions = this.loadData('transactions') || [];
        this.budgets = this.loadData('budgets') || [];
        this.goals = this.loadData('goals') || [];
        this.categories = this.loadData('categories') || {
            income: ['Salary', 'Freelance', 'Investment', 'Business', 'Gift', 'Other Income'],
            expense: ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
                'Healthcare', 'Education', 'Travel', 'Rent', 'Other Expense']
        };
    }

    addCategory(type, name) {
        if (!this.categories[type].includes(name)) {
            this.categories[type].push(name);
            this.saveData('categories', this.categories);
            return true;
        }
        return false;
    }

    deleteCategory(type, name) {
        const index = this.categories[type].indexOf(name);
        if (index !== -1) {
            this.categories[type].splice(index, 1);
            this.saveData('categories', this.categories);
            return true;
        }
        return false;
    }

    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return null;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        }
    }

    // Transaction Methods
    addTransaction(transaction) {
        transaction.id = Date.now().toString();
        this.transactions.unshift(transaction);
        this.saveData('transactions', this.transactions);
        return transaction;
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveData('transactions', this.transactions);
    }

    getTransactions(filters = {}) {
        let filtered = [...this.transactions];

        if (filters.type && filters.type !== 'all') {
            filtered = filtered.filter(t => t.type === filters.type);
        }

        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(t => t.category === filters.category);
        }

        if (filters.period && filters.period !== 'all') {
            const now = new Date();
            filtered = filtered.filter(t => {
                const transactionDate = new Date(t.date);
                switch (filters.period) {
                    case 'today':
                        return transactionDate.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return transactionDate >= weekAgo;
                    case 'month':
                        return transactionDate.getMonth() === now.getMonth() &&
                            transactionDate.getFullYear() === now.getFullYear();
                    case 'year':
                        return transactionDate.getFullYear() === now.getFullYear();
                    default:
                        return true;
                }
            });
        }

        return filtered;
    }

    // Budget Methods
    addBudget(budget) {
        budget.id = Date.now().toString();
        this.budgets.push(budget);
        this.saveData('budgets', this.budgets);
        return budget;
    }

    deleteBudget(id) {
        this.budgets = this.budgets.filter(b => b.id !== id);
        this.saveData('budgets', this.budgets);
    }

    getBudgetSpending(category) {
        const now = new Date();
        const monthTransactions = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return t.type === 'expense' &&
                t.category === category &&
                transactionDate.getMonth() === now.getMonth() &&
                transactionDate.getFullYear() === now.getFullYear();
        });

        return monthTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }

    // Goal Methods
    addGoal(goal) {
        goal.id = Date.now().toString();
        this.goals.push(goal);
        this.saveData('goals', this.goals);
        return goal;
    }

    updateGoal(id, updates) {
        const index = this.goals.findIndex(g => g.id === id);
        if (index !== -1) {
            this.goals[index] = { ...this.goals[index], ...updates };
            this.saveData('goals', this.goals);
            return this.goals[index];
        }
        return null;
    }

    deleteGoal(id) {
        this.goals = this.goals.filter(g => g.id !== id);
        this.saveData('goals', this.goals);
    }

    // Statistics Methods
    getStats(period = 'month') {
        const transactions = this.getTransactions({ period });

        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const balance = income - expenses;

        const avgGoalProgress = this.goals.length > 0
            ? this.goals.reduce((sum, g) => {
                const progress = (parseFloat(g.current) / parseFloat(g.target)) * 100;
                return sum + Math.min(progress, 100);
            }, 0) / this.goals.length
            : 0;

        return { income, expenses, balance, avgGoalProgress };
    }

    getCategoryData(period = 'month') {
        const transactions = this.getTransactions({ period, type: 'expense' });
        const categoryTotals = {};

        transactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
        });

        return categoryTotals;
    }

    getTrendData(months = 6) {
        const now = new Date();
        const trendData = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthTransactions = this.transactions.filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate.getMonth() === date.getMonth() &&
                    transactionDate.getFullYear() === date.getFullYear();
            });

            const income = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            const expenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            trendData.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                income,
                expenses
            });
        }

        return trendData;
    }
}

// ===== AI Manager =====
class AIManager {
    constructor(financeManager) {
        this.fm = financeManager;
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
    }

    hasApiKey() {
        return !!this.apiKey;
    }

    async callGemini(prompt) {
        if (!this.apiKey) {
            throw new Error('API Key not found');
        }

        try {
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to fetch from Gemini');
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    }

    prepareContextData() {
        const stats = this.fm.getStats('month');
        const transactions = this.fm.getTransactions({ period: 'month' }).slice(0, 20); // Last 20 transactions
        const categoryData = this.fm.getCategoryData('month');
        const goals = this.fm.goals;
        const budgets = this.fm.budgets;

        return JSON.stringify({
            currentMonthStats: stats,
            // trends: this.fm.getTrendData(3),
            topExpenses: Object.entries(categoryData)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([cat, amount]) => ({ category: cat, amount })),
            goals: goals.map(g => ({ name: g.name, target: g.target, current: g.current, deadline: g.deadline })),
            recentTransactions: transactions.map(t => ({
                date: t.date,
                type: t.type,
                category: t.category,
                amount: t.amount,
                description: t.description
            }))
        }, null, 2);
    }

    async generateTip() {
        const context = this.prepareContextData();
        const prompt = `
            Act as a financial advisor. Based on the following user financial data (JSON), provide a SINGLE, short, actionable, and encouraging financial tip (max 2 sentences).
            Focus on saving more or spending wisely based on their recent behavior.
            User Data:
            ${context}
        `;
        return await this.callGemini(prompt);
    }

    async generateReport() {
        const context = this.prepareContextData();
        const prompt = `
            Act as a financial advisor. Analyze the following user financial data (JSON) and provide a comprehensive monthly report.
            The report should include:
            1. **Summary**: Brief overview of financial health this month.
            2. **Spending Analysis**: Where is the money going? Any alarming categories?
            3. **Savings Review**: Progress on goals and suggestions.
            4. **Recommendations**: 3 concrete steps to improve next month.
            
            Format the output in clean Markdown. Use bolding and lists.
            User Data:
            ${context}
        `;
        return await this.callGemini(prompt);
    }

    async generatePlan(targetIncome, targetDate) {
        const context = this.prepareContextData();
        const prompt = `
            Act as a financial strategist. The user wants to achieve a monthly income/savings goal of ${targetIncome} by ${targetDate}.
            
            Current Context:
            ${context}
            
            Provide a detailed, step-by-step plan to achieve this goal responsibly.
            Include:
            1. **Feasibility Check**: Is this realistic based on current income/expenses?
            2. **Expense Optimization**: Where can they cut costs immediately to free up cash?
            3. **Income Generation Ideas**: General suggestions (freelancing, upskilling) if current income isn't enough.
            4. **Timeline**: Milestones to hit by the target date.
            
            Format the output in clean Markdown. Be encouraging but realistic.
        `;
        return await this.callGemini(prompt);
    }
}

// ===== UI Manager =====
class UIManager {
    constructor(financeManager, aiManager) {
        this.fm = financeManager;
        this.ai = aiManager;
        this.currentPage = 'dashboard';
        this.charts = {};
        this.initializeEventListeners();
        this.initializeCharts();
        this.render();
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.navigateTo(page);
            });
        });

        // Transaction Modal
        const transactionBtns = ['add-transaction-btn', 'add-transaction-btn-2'];
        transactionBtns.forEach(btnId => {
            document.getElementById(btnId)?.addEventListener('click', () => {
                this.openModal('transaction-modal');
                this.setTodayDate('transaction-date');
            });
        });

        document.getElementById('close-transaction-modal').addEventListener('click', () => {
            this.closeModal('transaction-modal');
        });

        document.getElementById('cancel-transaction').addEventListener('click', () => {
            this.closeModal('transaction-modal');
        });

        // Transaction Type Toggle
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const type = e.currentTarget.dataset.type;
                document.getElementById('transaction-type').value = type;
                this.updateCategoryOptions(type);
            });
        });

        // Transaction Form
        document.getElementById('transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransactionSubmit();
        });

        // Budget Modal
        document.getElementById('add-budget-btn').addEventListener('click', () => {
            this.openModal('budget-modal');
            this.updateBudgetCategoryOptions();
        });

        document.getElementById('close-budget-modal').addEventListener('click', () => {
            this.closeModal('budget-modal');
        });

        document.getElementById('cancel-budget').addEventListener('click', () => {
            this.closeModal('budget-modal');
        });

        document.getElementById('budget-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBudgetSubmit();
        });

        // Goal Modal
        document.getElementById('add-goal-btn').addEventListener('click', () => {
            this.openModal('goal-modal');
            document.getElementById('goal-modal-title').textContent = 'Add Savings Goal';
            document.getElementById('goal-form').reset();
            document.getElementById('goal-form').dataset.mode = 'add';
        });

        document.getElementById('close-goal-modal').addEventListener('click', () => {
            this.closeModal('goal-modal');
        });

        document.getElementById('cancel-goal').addEventListener('click', () => {
            this.closeModal('goal-modal');
        });

        document.getElementById('goal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGoalSubmit();
        });

        // Filters
        document.getElementById('filter-type').addEventListener('change', () => this.renderTransactions());
        document.getElementById('filter-category').addEventListener('change', () => this.renderTransactions());
        document.getElementById('filter-period').addEventListener('change', () => this.renderTransactions());

        document.getElementById('clear-filters').addEventListener('click', () => {
            document.getElementById('filter-type').value = 'all';
            document.getElementById('filter-category').value = 'all';
            document.getElementById('filter-period').value = 'all';
            this.renderTransactions();
        });

        // View All Transactions
        document.getElementById('view-all-transactions').addEventListener('click', () => {
            this.navigateTo('transactions');
        });

        // Chart Period Selectors
        document.getElementById('category-chart-period').addEventListener('change', (e) => {
            this.updateCategoryChart(e.target.value);
        });

        document.getElementById('trend-chart-period').addEventListener('change', (e) => {
            this.updateTrendChart(e.target.value);
        });

        // Modal Close on Outside Click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Initialize category options
        this.updateCategoryOptions('expense');
        this.updateFilterCategoryOptions();

        // Manage Categories Modal
        document.getElementById('manage-categories-btn').addEventListener('click', () => {
            this.openModal('categories-modal');
            this.currentCategoryType = 'expense';
            this.renderCategoriesList();
        });

        document.getElementById('close-categories-modal').addEventListener('click', () => {
            this.closeModal('categories-modal');
        });

        // Category Type Toggle in Manager
        ['cat-toggle-expense', 'cat-toggle-income'].forEach(id => {
            document.getElementById(id).addEventListener('click', (e) => {
                document.querySelectorAll('.categories-manager .toggle-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentCategoryType = e.currentTarget.dataset.type;
                this.renderCategoriesList();
            });
        });

        // Add Category Form
        document.getElementById('add-category-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('new-category-name');
            const name = input.value.trim();
            if (name) {
                if (this.fm.addCategory(this.currentCategoryType, name)) {
                    input.value = '';
                    this.renderCategoriesList();
                    this.updateAllCategorySelects();
                } else {
                    alert('Category already exists!');
                }
            }
        });

        // Add Money Modal
        document.getElementById('close-add-money-modal').addEventListener('click', () => {
            this.closeModal('add-money-modal');
        });

        document.getElementById('cancel-add-money').addEventListener('click', () => {
            this.closeModal('add-money-modal');
        });

        document.getElementById('add-money-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('add-money-goal-id').value;
            const amount = parseFloat(document.getElementById('add-money-amount').value);
            const goal = this.fm.goals.find(g => g.id === id);

            if (goal && !isNaN(amount) && amount > 0) {
                const newCurrent = parseFloat(goal.current) + amount;
                this.fm.updateGoal(id, { current: newCurrent.toString() });
                this.closeModal('add-money-modal');
                this.render();
            }
        });

        // Settings Modal
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            document.getElementById('gemini-api-key').value = this.ai.apiKey;
            this.openModal('settings-modal');
        });

        document.getElementById('close-settings-modal')?.addEventListener('click', () => {
            this.closeModal('settings-modal');
        });

        document.getElementById('cancel-settings')?.addEventListener('click', () => {
            this.closeModal('settings-modal');
        });

        document.getElementById('settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const key = document.getElementById('gemini-api-key').value.trim();
            this.ai.setApiKey(key);
            this.closeModal('settings-modal');
            this.renderDashboard();
        });

        // AI Features
        document.getElementById('ai-action-btn')?.addEventListener('click', async () => {
            if (!this.ai.hasApiKey()) {
                this.openModal('settings-modal');
            } else {
                this.navigateTo('ai-report');
                // Auto generate report if empty
                if (!document.getElementById('ai-detailed-analysis').dataset.loaded) {
                    const container = document.getElementById('ai-detailed-analysis');
                    container.innerHTML = '<div class="loading-spinner"></div><p>Generating analysis...</p>';
                    try {
                        const report = await this.ai.generateReport();
                        container.innerHTML = marked.parse(report);
                        container.dataset.loaded = 'true';
                    } catch (error) {
                        container.innerHTML = `<p style="color: var(--expense-color)">Error: ${error.message}</p>`;
                    }
                }
            }
        });

        document.getElementById('ai-back-btn')?.addEventListener('click', () => {
            this.navigateTo('dashboard');
        });

        document.getElementById('generate-plan-btn')?.addEventListener('click', async () => {
            const amount = document.getElementById('ai-income-goal').value;
            const date = document.getElementById('ai-income-date').value;

            if (!amount || !date) {
                alert('Please enter both amount and date');
                return;
            }

            const planContainer = document.getElementById('ai-generated-plan');
            const planSection = document.getElementById('ai-plan-section');

            planSection.style.display = 'block';
            planContainer.innerHTML = '<div class="loading-spinner"></div><p>Generating plan...</p>';

            try {
                const plan = await this.ai.generatePlan(amount, date);
                planContainer.innerHTML = marked.parse(plan);
            } catch (error) {
                planContainer.innerHTML = `<p style="color: var(--expense-color)">Error: ${error.message}</p>`;
            }
        });
    }

    initializeCharts() {
        // Category Chart
        const categoryCtx = document.getElementById('category-chart').getContext('2d');
        this.charts.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#fa709a', '#fee140',
                        '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a0a0b8',
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#a0a0b8',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: ₹${value.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });

        // Trend Chart
        const trendCtx = document.getElementById('trend-chart').getContext('2d');
        this.charts.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Income',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Expenses',
                        data: [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a0a0b8',
                            padding: 15,
                            font: { size: 12 },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#ffffff',
                        bodyColor: '#a0a0b8',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                return `${label}: ₹${value.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#a0a0b8',
                            callback: (value) => '₹' + value
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#a0a0b8'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                }
            }
        });
    }

    navigateTo(page) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `${page}-page`);
        });

        this.currentPage = page;
        this.render();
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        const form = document.querySelector(`#${modalId} form`);
        if (form) form.reset();
    }

    setTodayDate(inputId) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById(inputId).value = today;
    }

    updateCategoryOptions(type) {
        const select = document.getElementById('transaction-category');
        select.innerHTML = '<option value="">Select Category</option>';

        this.fm.categories[type].forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    }

    updateFilterCategoryOptions() {
        const select = document.getElementById('filter-category');
        select.innerHTML = '<option value="all">All Categories</option>';

        const allCategories = [...this.fm.categories.income, ...this.fm.categories.expense];
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    }

    updateBudgetCategoryOptions() {
        const select = document.getElementById('budget-category');
        select.innerHTML = '<option value="">Select Category</option>';

        const existingBudgets = this.fm.budgets.map(b => b.category);

        this.fm.categories.expense.forEach(category => {
            if (!existingBudgets.includes(category)) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            }
        });
    }

    renderCategoriesList() {
        const container = document.getElementById('categories-list');
        const categories = this.fm.categories[this.currentCategoryType];

        container.innerHTML = categories.map(cat => `
            <div class="category-item">
                <span class="category-name">${cat}</span>
                <button class="category-delete" data-name="${cat}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.category-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.dataset.name;
                if (confirm(`Delete category "${name}"?`)) {
                    if (this.fm.deleteCategory(this.currentCategoryType, name)) {
                        this.renderCategoriesList();
                        this.updateAllCategorySelects();
                    }
                }
            });
        });
    }

    updateAllCategorySelects() {
        const transactionType = document.getElementById('transaction-type').value;
        this.updateCategoryOptions(transactionType);
        this.updateFilterCategoryOptions();
        this.updateBudgetCategoryOptions();
    }

    handleTransactionSubmit() {
        const transaction = {
            type: document.getElementById('transaction-type').value,
            amount: document.getElementById('transaction-amount').value,
            category: document.getElementById('transaction-category').value,
            description: document.getElementById('transaction-description').value,
            date: document.getElementById('transaction-date').value
        };

        this.fm.addTransaction(transaction);
        this.closeModal('transaction-modal');
        this.render();
    }

    handleBudgetSubmit() {
        const budget = {
            category: document.getElementById('budget-category').value,
            amount: document.getElementById('budget-amount').value
        };

        this.fm.addBudget(budget);
        this.closeModal('budget-modal');
        this.render();
    }

    handleGoalSubmit() {
        const mode = document.getElementById('goal-form').dataset.mode;
        const goalData = {
            name: document.getElementById('goal-name').value,
            target: document.getElementById('goal-target').value,
            current: document.getElementById('goal-current').value,
            deadline: document.getElementById('goal-deadline').value
        };

        if (mode === 'add') {
            this.fm.addGoal(goalData);
        } else if (mode === 'edit') {
            const goalId = document.getElementById('goal-form').dataset.goalId;
            this.fm.updateGoal(goalId, goalData);
        }

        this.closeModal('goal-modal');
        this.render();
    }

    render() {
        switch (this.currentPage) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'transactions':
                this.renderTransactions();
                break;
            case 'budgets':
                this.renderBudgets();
                break;
            case 'goals':
                this.renderGoals();
                break;
        }
    }

    renderDashboard() {
        // Update stats
        const stats = this.fm.getStats('month');
        document.getElementById('total-income').textContent = `₹${stats.income.toFixed(2)}`;
        document.getElementById('total-expenses').textContent = `₹${stats.expenses.toFixed(2)}`;
        document.getElementById('net-balance').textContent = `₹${stats.balance.toFixed(2)}`;
        document.getElementById('goals-progress').textContent = `${stats.avgGoalProgress.toFixed(0)}%`;

        // Update charts
        this.updateCategoryChart('month');
        this.updateTrendChart('6months');

        // Update recent transactions
        this.renderRecentTransactions();

        // Update AI Insight
        const tipBox = document.getElementById('ai-tip-text');
        if (!this.ai.hasApiKey()) {
            tipBox.textContent = 'Connect your Gemini API key in settings to get personalized financial advice.';
            delete tipBox.dataset.loaded;
        } else if (!tipBox.dataset.loaded) {
            tipBox.innerHTML = 'Analyzing finances...';
            this.ai.generateTip().then(tip => {
                tipBox.textContent = tip;
                tipBox.dataset.loaded = 'true';
            }).catch(err => {
                tipBox.textContent = 'Could not generate tip. Check your API key. ' + err.message;
                console.error(err);
            });
        }
    }

    renderRecentTransactions() {
        const container = document.getElementById('recent-transactions');
        const transactions = this.fm.getTransactions({}).slice(0, 5);

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>No transactions yet</p>
                    <button class="btn-secondary" onclick="document.getElementById('add-transaction-btn').click()">Add Your First Transaction</button>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(t => this.createTransactionHTML(t)).join('');

        // Add delete listeners
        container.querySelectorAll('.transaction-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this transaction?')) {
                    this.fm.deleteTransaction(id);
                    this.render();
                }
            });
        });
    }

    renderTransactions() {
        const container = document.getElementById('all-transactions');
        const filters = {
            type: document.getElementById('filter-type').value,
            category: document.getElementById('filter-category').value,
            period: document.getElementById('filter-period').value
        };

        const transactions = this.fm.getTransactions(filters);

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>No transactions found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(t => this.createTransactionHTML(t)).join('');

        // Add delete listeners
        container.querySelectorAll('.transaction-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this transaction?')) {
                    this.fm.deleteTransaction(id);
                    this.render();
                }
            });
        });
    }

    createTransactionHTML(transaction) {
        const icon = transaction.type === 'income'
            ? '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'
            : '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>';

        const date = new Date(transaction.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <div class="transaction-item">
                <div class="transaction-icon ${transaction.type}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        ${icon}
                    </svg>
                </div>
                <div class="transaction-details">
                    <div class="transaction-category">${transaction.category}</div>
                    <div class="transaction-description">${transaction.description}</div>
                </div>
                <div class="transaction-meta">
                    <div class="transaction-amount ${transaction.type}">
                        ${transaction.type === 'income' ? '+' : '-'}₹${parseFloat(transaction.amount).toFixed(2)}
                    </div>
                    <div class="transaction-date">${date}</div>
                </div>
                <button class="transaction-delete" data-id="${transaction.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `;
    }

    renderBudgets() {
        const container = document.getElementById('budgets-container');

        if (this.fm.budgets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <p>No budgets created yet</p>
                    <button class="btn-secondary" onclick="document.getElementById('add-budget-btn').click()">Create Your First Budget</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.fm.budgets.map(budget => {
            const spent = this.fm.getBudgetSpending(budget.category);
            const percentage = (spent / parseFloat(budget.amount)) * 100;
            const remaining = parseFloat(budget.amount) - spent;

            let status = 'on-track';
            let statusText = 'On Track';
            let progressClass = '';

            if (percentage >= 100) {
                status = 'over-budget';
                statusText = 'Over Budget';
                progressClass = 'danger';
            } else if (percentage >= 80) {
                status = 'warning';
                statusText = 'Warning';
                progressClass = 'warning';
            }

            return `
                <div class="budget-card">
                    <div class="budget-header">
                        <div class="budget-info">
                            <h4>${budget.category}</h4>
                            <div class="budget-amount">₹${parseFloat(budget.amount).toFixed(2)} / month</div>
                        </div>
                        <button class="budget-delete" data-id="${budget.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                    <div class="budget-progress">
                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                        <div class="progress-text">
                            <span class="progress-percentage">${percentage.toFixed(1)}%</span>
                            <span class="progress-spent">₹${spent.toFixed(2)} spent</span>
                        </div>
                    </div>
                    <div class="budget-status ${status}">${statusText}</div>
                </div>
            `;
        }).join('');

        // Add delete listeners
        container.querySelectorAll('.budget-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this budget?')) {
                    this.fm.deleteBudget(id);
                    this.render();
                }
            });
        });
    }

    renderGoals() {
        const container = document.getElementById('goals-container');

        if (this.fm.goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <p>No savings goals yet</p>
                    <button class="btn-secondary" onclick="document.getElementById('add-goal-btn').click()">Set Your First Goal</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.fm.goals.map(goal => {
            const current = parseFloat(goal.current);
            const target = parseFloat(goal.target);
            const percentage = (current / target) * 100;
            const remaining = target - current;

            let deadlineText = '';
            if (goal.deadline) {
                const deadline = new Date(goal.deadline);
                deadlineText = `Target: ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            }

            return `
                <div class="goal-card">
                    <div class="goal-header">
                        <div class="goal-info">
                            <h4>${goal.name}</h4>
                            <div class="goal-target">Target: ₹${target.toFixed(2)}</div>
                        </div>
                        <div class="goal-actions">
                            <button class="goal-action-btn edit" data-id="${goal.id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="goal-action-btn delete" data-id="${goal.id}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                        <div class="progress-text">
                            <span class="progress-percentage">${percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                    <div class="goal-amounts">
                        <div class="goal-current">Saved: <span>₹${current.toFixed(2)}</span></div>
                        <div class="goal-remaining">Remaining: ₹${remaining.toFixed(2)}</div>
                    </div>
                    ${deadlineText ? `<div class="goal-deadline">${deadlineText}</div>` : ''}
                    <button class="goal-add-btn" data-id="${goal.id}">+ Add Money</button>
                </div>
            `;
        }).join('');

        // Add event listeners
        container.querySelectorAll('.goal-delete, .goal-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this goal?')) {
                    this.fm.deleteGoal(id);
                    this.render();
                }
            });
        });

        container.querySelectorAll('.goal-action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const goal = this.fm.goals.find(g => g.id === id);
                if (goal) {
                    document.getElementById('goal-name').value = goal.name;
                    document.getElementById('goal-target').value = goal.target;
                    document.getElementById('goal-current').value = goal.current;
                    document.getElementById('goal-deadline').value = goal.deadline || '';
                    document.getElementById('goal-modal-title').textContent = 'Edit Savings Goal';
                    document.getElementById('goal-form').dataset.mode = 'edit';
                    document.getElementById('goal-form').dataset.goalId = id;
                    this.openModal('goal-modal');
                }
            });
        });

        container.querySelectorAll('.goal-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                document.getElementById('add-money-goal-id').value = id;
                document.getElementById('add-money-amount').value = '';
                this.openModal('add-money-modal');
            });
        });
    }

    updateCategoryChart(period) {
        const categoryData = this.fm.getCategoryData(period);
        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        this.charts.category.data.labels = labels;
        this.charts.category.data.datasets[0].data = data;
        this.charts.category.update();
    }

    updateTrendChart(period) {
        const months = period === '6months' ? 6 : period === 'year' ? 12 : 12;
        const trendData = this.fm.getTrendData(months);

        this.charts.trend.data.labels = trendData.map(d => d.month);
        this.charts.trend.data.datasets[0].data = trendData.map(d => d.income);
        this.charts.trend.data.datasets[1].data = trendData.map(d => d.expenses);
        this.charts.trend.update();
    }
}

// ===== Initialize Application =====
let app;

// Load marked.js for Markdown parsing
const markedScript = document.createElement('script');
markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
document.head.appendChild(markedScript);

// Load Chart.js from CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
script.onload = () => {
    const financeManager = new FinanceManager();
    const aiManager = new AIManager(financeManager);
    app = new UIManager(financeManager, aiManager);
};
document.head.appendChild(script);
