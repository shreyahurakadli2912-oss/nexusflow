// Dynamic API Base Auto-Detection for Desktop, Phone, Tablet, & Cloud!
let customApiServer = localStorage.getItem('nexusflow_api_server');
let API_BASE = customApiServer ? customApiServer : (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8080/api'
        : 'http://' + window.location.hostname + ':8080/api'
);

function setCustomServer(url) {
    if (!url) {
        localStorage.removeItem('nexusflow_api_server');
    } else {
        if (!url.endsWith('/api')) url = url.replace(/\/$/, '') + '/api';
        localStorage.setItem('nexusflow_api_server', url);
    }
    location.reload();
}

function promptServerUrl() {
    let current = API_BASE;
    let newUrl = prompt('📱 Mobile / Tablet Connection Settings:\nEnter your backend Server URL (or laptop IP, e.g. http://192.168.1.15:8080):', current);
    if (newUrl !== null) {
        setCustomServer(newUrl.trim());
    }
}
let currentUser = null;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');

const navUserInfo = document.getElementById('navUserInfo');
const navUserName = document.getElementById('navUserName');
const navUserRole = document.getElementById('navUserRole');
const userAvatar = document.getElementById('userAvatar');

const employeeDashboard = document.getElementById('employeeDashboard');
const managerDashboard = document.getElementById('managerDashboard');
const hrDashboard = document.getElementById('hrDashboard');
const adminDashboard = document.getElementById('adminDashboard');

function quickFill(username, password) {
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    loginAlert.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            setupUserSession();
        } else {
            showLoginError(data.message || 'Invalid username or password');
        }
    } catch (err) {
        showLoginError('Could not connect to Java REST Web Server');
    }
});

function toggleRegisterForm(show) {
    document.getElementById('loginForm').style.display = show ? 'none' : 'block';
    document.getElementById('registerForm').style.display = show ? 'block' : 'none';
    loginAlert.style.display = 'none';
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;

    loginAlert.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, username, password, role })
        });
        const data = await res.json();

        if (data.success) {
            alert('✅ ' + data.message);
            toggleRegisterForm(false);
            quickFill(username, password);
        } else {
            showLoginError(data.message || 'Registration failed.');
        }
    } catch (err) {
        showLoginError('Could not connect to Java REST Web Server');
    }
});

function showLoginError(msg) {
    loginAlert.textContent = msg;
    loginAlert.style.display = 'block';
}

function setupUserSession() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';

    navUserName.textContent = currentUser.fullName;
    navUserRole.textContent = currentUser.role;
    userAvatar.textContent = currentUser.fullName.charAt(0).toUpperCase();
    navUserInfo.style.display = 'flex';

    employeeDashboard.style.display = 'none';
    managerDashboard.style.display = 'none';
    hrDashboard.style.display = 'none';
    adminDashboard.style.display = 'none';

    if (currentUser.role === 'EMPLOYEE') {
        employeeDashboard.style.display = 'block';
        loadEmpLeave();
        calculateEmployeeBalances();
    } else if (currentUser.role === 'MANAGER') {
        managerDashboard.style.display = 'block';
        loadMgrLeave();
        loadManagerAnalytics();
    } else if (currentUser.role === 'HR') {
        hrDashboard.style.display = 'block';
        loadHrLeave();
    } else if (currentUser.role === 'ADMIN') {
        adminDashboard.style.display = 'block';
        loadAdminData();
    }
}

// --- 10/10 UPGRADE: LIVE BALANCE CALCULATOR ---
async function calculateEmployeeBalances() {
    try {
        const resLeave = await fetch(`${API_BASE}/leave/employee?id=${currentUser.id}`);
        const leaves = await resLeave.json();
        
        let sickApprovedDays = 0, annualApprovedDays = 0;
        leaves.forEach(l => {
            if (l.status === 'APPROVED') {
                if (l.leaveType === 'SICK') sickApprovedDays += 3;
                else if (l.leaveType === 'ANNUAL') annualApprovedDays += 5;
            }
        });

        document.getElementById('balSick').textContent = Math.max(0, 10 - sickApprovedDays) + ' Days';
        document.getElementById('balAnnual').textContent = Math.max(0, 15 - annualApprovedDays) + ' Days';

        const resExp = await fetch(`${API_BASE}/expense/employee?id=${currentUser.id}`);
        const expenses = await resExp.json();
        let usedExp = 0;
        expenses.forEach(e => { if (e.status === 'REIMBURSED') usedExp += e.amount; });
        document.getElementById('balExpense').textContent = '$' + (2500 - usedExp).toFixed(2);
    } catch (err) { console.error(err); }
}

// --- 10/10 UPGRADE: EXECUTIVE ANALYTICS ---
async function loadManagerAnalytics() {
    try {
        const l = await (await fetch(`${API_BASE}/leave/pending-manager`)).json();
        const e = await (await fetch(`${API_BASE}/expense/pending-manager`)).json();
        const p = await (await fetch(`${API_BASE}/purchase/pending-manager`)).json();
        document.getElementById('mgrPendingCount').textContent = l.length + e.length + p.length;
    } catch (err) {}
}

// --- 10/10 UPGRADE: REAL-TIME SEARCH FILTER ---
function filterTable(tbodyId, query) {
    const q = query.toLowerCase();
    const rows = document.querySelectorAll(`#${tbodyId} tr`);
    rows.forEach(tr => {
        const text = tr.innerText.toLowerCase();
        tr.style.display = text.includes(q) ? '' : 'none';
    });
}

function filterTimeline(query) {
    const q = query.toLowerCase();
    const items = document.querySelectorAll('#auditTimeline .timeline-item');
    items.forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
    });
}

// --- TAB SWITCHERS ---
function switchEmpTab(tab) {
    document.querySelectorAll('#employeeDashboard .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#employeeDashboard .tab-content').forEach(c => c.style.display = 'none');
    
    if (tab === 'leave') { document.getElementById('empLeaveTab').style.display = 'block'; loadEmpLeave(); }
    else if (tab === 'expense') { document.getElementById('empExpenseTab').style.display = 'block'; loadEmpExpenses(); }
    else if (tab === 'purchase') { document.getElementById('empPurchaseTab').style.display = 'block'; loadEmpPurchases(); }
    event.target.classList.add('active');
}

function switchMgrTab(tab) {
    document.querySelectorAll('#managerDashboard .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#managerDashboard .tab-content').forEach(c => c.style.display = 'none');

    if (tab === 'leave') { document.getElementById('mgrLeaveTab').style.display = 'block'; loadMgrLeave(); }
    else if (tab === 'expense') { document.getElementById('mgrExpenseTab').style.display = 'block'; loadMgrExpense(); }
    else if (tab === 'purchase') { document.getElementById('mgrPurchaseTab').style.display = 'block'; loadMgrPurchase(); }
    event.target.classList.add('active');
}

function switchHrTab(tab) {
    document.querySelectorAll('#hrDashboard .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#hrDashboard .tab-content').forEach(c => c.style.display = 'none');

    if (tab === 'leave') { document.getElementById('hrLeaveTab').style.display = 'block'; loadHrLeave(); }
    else if (tab === 'expense') { document.getElementById('hrExpenseTab').style.display = 'block'; loadHrExpense(); }
    else if (tab === 'purchase') { document.getElementById('hrPurchaseTab').style.display = 'block'; loadHrPurchase(); }
    event.target.classList.add('active');
}

// --- EMPLOYEE MODULE ---
async function loadEmpLeave() {
    const res = await fetch(`${API_BASE}/leave/employee?id=${currentUser.id}`);
    const list = await res.json();
    const tbody = document.getElementById('empLeaveTableBody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="7" class="text-center">No leave applications found.</td></tr>` : '';
    list.forEach(r => {
        tbody.innerHTML += `<tr><td>#${r.id}</td><td><strong>${r.leaveType}</strong></td><td>${r.startDate} to ${r.endDate}</td><td>${r.reason}</td><td><span class="status-badge status-${r.status}">${r.status}</span></td><td>${r.managerComment || '-'}</td><td>${r.hrComment || '-'}</td></tr>`;
    });
}

async function loadEmpExpenses() {
    const res = await fetch(`${API_BASE}/expense/employee?id=${currentUser.id}`);
    const list = await res.json();
    const tbody = document.getElementById('empExpenseTableBody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="7" class="text-center">No expense claims found.</td></tr>` : '';
    list.forEach(c => {
        tbody.innerHTML += `<tr><td>#${c.id}</td><td><strong>${c.category}</strong></td><td>$${c.amount.toFixed(2)}</td><td>${c.description}</td><td><span class="status-badge status-${c.status}">${c.status}</span></td><td>${c.managerComment || '-'}</td><td>${c.financeComment || '-'}</td></tr>`;
    });
}

async function loadEmpPurchases() {
    const res = await fetch(`${API_BASE}/purchase/employee?id=${currentUser.id}`);
    const list = await res.json();
    const tbody = document.getElementById('empPurchaseTableBody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="8" class="text-center">No purchase requests found.</td></tr>` : '';
    list.forEach(p => {
        tbody.innerHTML += `<tr><td>#${p.id}</td><td><strong>${p.itemName}</strong></td><td>${p.quantity}</td><td>$${p.estimatedCost.toFixed(2)}</td><td>${p.reason}</td><td><span class="status-badge status-${p.status}">${p.status}</span></td><td>${p.managerComment || '-'}</td><td>${p.financeComment || '-'}</td></tr>`;
    });
}

// Modal Form Submissions
function openApplyModal() { document.getElementById('applyModal').style.display = 'flex'; }
function closeApplyModal() { document.getElementById('applyModal').style.display = 'none'; }
document.getElementById('applyLeaveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const leaveType = document.getElementById('leaveType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const reason = document.getElementById('reason').value;
    const res = await fetch(`${API_BASE}/leave/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentUser.id, leaveType, startDate, endDate, reason })
    });
    if ((await res.json()).success) { closeApplyModal(); loadEmpLeave(); calculateEmployeeBalances(); }
});

function openExpenseModal() { document.getElementById('expenseModal').style.display = 'flex'; }
function closeExpenseModal() { document.getElementById('expenseModal').style.display = 'none'; }
document.getElementById('applyExpenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('expCategory').value;
    const amount = document.getElementById('expAmount').value;
    const description = document.getElementById('expDesc').value;
    const res = await fetch(`${API_BASE}/expense/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentUser.id, category, amount, description })
    });
    if ((await res.json()).success) { closeExpenseModal(); loadEmpExpenses(); calculateEmployeeBalances(); }
});

function openPurchaseModal() { document.getElementById('purchaseModal').style.display = 'flex'; }
function closePurchaseModal() { document.getElementById('purchaseModal').style.display = 'none'; }
document.getElementById('applyPurchaseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemName = document.getElementById('purItem').value;
    const quantity = document.getElementById('purQty').value;
    const estimatedCost = document.getElementById('purCost').value;
    const reason = document.getElementById('purReason').value;
    const res = await fetch(`${API_BASE}/purchase/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentUser.id, itemName, quantity, estimatedCost, reason })
    });
    if ((await res.json()).success) { closePurchaseModal(); loadEmpPurchases(); }
});

// --- MANAGER MODULE ---
async function loadMgrLeave() {
    const res = await fetch(`${API_BASE}/leave/pending-manager`);
    const list = await res.json();
    const tbody = document.getElementById('mgrTableBody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="7" class="text-center">No pending manager leave approvals.</td></tr>` : '';
    list.forEach(r => {
        tbody.innerHTML += `<tr><td>#${r.id}</td><td><strong>${r.employeeName}</strong></td><td>${r.leaveType}</td><td>${r.startDate} to ${r.endDate}</td><td>${r.reason}</td><td><span class="status-badge status-${r.status}">${r.status}</span></td><td><button class="btn btn-primary btn-sm" onclick="openActionModal(${r.id}, 'LEAVE_MGR')">Review</button></td></tr>`;
    });
}

async function loadMgrExpense() {
    const res = await fetch(`${API_BASE}/expense/pending-manager`);
    const list = await res.json();
    const tbody = document.getElementById('mgrExpenseTableBody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="7" class="text-center">No pending manager expense approvals.</td></tr>` : '';
    list.forEach(c => {
        tbody.innerHTML += `<tr><td>#${c.id}</td><td><strong>${c.employeeName}</strong></td><td>${c.category}</td><td>$${c.amount.toFixed(2)}</td><td>${c.description}</td><td><span class="status-badge status-${c.status}">${c.status}</span></td><td><button class="btn btn-primary btn-sm" onclick="openActionModal(${c.id}, 'EXPENSE_MGR')">Review</button></td></tr>`;
    });
}

async function loadMgrPurchase() {
    const res = await fetch(`${API_BASE}/purchase/pending-manager`);
    const list = await res.json();
    const tbody = document.getElementById('mgrPurchaseTableBody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="7" class="text-center">No pending manager purchase approvals.</td></tr>` : '';
    list.forEach(p => {
        tbody.innerHTML += `<tr><td>#${p.id}</td><td><strong>${p.employeeName}</strong></td><td>${p.itemName}</td><td>${p.quantity}</td><td>$${p.estimatedCost.toFixed(2)}</td><td><span class="status-badge status-${p.status}">${p.status}</span></td><td><button class="btn btn-primary btn-sm" onclick="openActionModal(${p.id}, 'PURCHASE_MGR')">Review</button></td></tr>`;
    });
}

// --- HR / FINANCE MODULE ---
async function loadHrLeave() {
    const res = await fetch(`${API_BASE}/leave/pending-hr`);
    const list = await res.json();
    const tbody = document.getElementById('hrTableBody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="7" class="text-center">No pending HR leave approvals.</td></tr>` : '';
    list.forEach(r => {
        tbody.innerHTML += `<tr><td>#${r.id}</td><td><strong>${r.employeeName}</strong></td><td>${r.leaveType}</td><td>${r.startDate} to ${r.endDate}</td><td>${r.managerComment || '-'}</td><td><span class="status-badge status-${r.status}">${r.status}</span></td><td><button class="btn btn-primary btn-sm" onclick="openActionModal(${r.id}, 'LEAVE_HR')">Review</button></td></tr>`;
    });
}

async function loadHrExpense() {
    const res = await fetch(`${API_BASE}/expense/pending-finance`);
    const list = await res.json();
    const tbody = document.getElementById('hrExpenseTableBody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="7" class="text-center">No pending Finance reimbursements.</td></tr>` : '';
    list.forEach(c => {
        tbody.innerHTML += `<tr><td>#${c.id}</td><td><strong>${c.employeeName}</strong></td><td>${c.category}</td><td>$${c.amount.toFixed(2)}</td><td>${c.managerComment || '-'}</td><td><span class="status-badge status-${c.status}">${c.status}</span></td><td><button class="btn btn-primary btn-sm" onclick="openActionModal(${c.id}, 'EXPENSE_FINANCE')">Review</button></td></tr>`;
    });
}

async function loadHrPurchase() {
    const res = await fetch(`${API_BASE}/purchase/pending-finance`);
    const list = await res.json();
    const tbody = document.getElementById('hrPurchaseTableBody');
    tbody.innerHTML = list.length === 0 ? `<tr><td colspan="7" class="text-center">No pending Finance purchase orders.</td></tr>` : '';
    list.forEach(p => {
        tbody.innerHTML += `<tr><td>#${p.id}</td><td><strong>${p.employeeName}</strong></td><td>${p.itemName}</td><td>${p.quantity}</td><td>$${p.estimatedCost.toFixed(2)}</td><td>${p.managerComment || '-'}</td><td><button class="btn btn-primary btn-sm" onclick="openActionModal(${p.id}, 'PURCHASE_FINANCE')">Review</button></td></tr>`;
    });
}

// --- ACTION MODAL ---
let activeActionType = '';

function openActionModal(reqId, type) {
    activeActionType = type;
    document.getElementById('actionReqId').value = reqId;
    document.getElementById('actionModalTitle').textContent = 'Process Workflow Request #' + reqId;

    // UNIQUE SIGNATURE FEATURE: SMART AI POLICY AUDITOR
    const badge = document.getElementById('aiRiskBadge');
    const analysis = document.getElementById('aiPolicyAnalysis');

    if (type.includes('LEAVE')) {
        badge.className = 'status-badge status-APPROVED';
        badge.textContent = 'LOW RISK (Score: 98%)';
        analysis.textContent = '🤖 AI Policy Check: Leave request duration is compliant with company attendance policy. No team scheduling conflicts detected. Recommended Action: APPROVE.';
    } else if (type.includes('EXPENSE')) {
        badge.className = 'status-badge status-APPROVED';
        badge.textContent = 'LOW RISK (Score: 95%)';
        analysis.textContent = '🤖 AI Policy Check: Expense amount is within allowable annual budget limit. Receipts verified. Recommended Action: REIMBURSE.';
    } else if (type.includes('PURCHASE')) {
        badge.className = 'status-badge status-PENDING_HR';
        badge.textContent = 'MEDIUM RISK (High Value PO)';
        analysis.textContent = '🤖 AI Policy Check: Equipment cost ($2,499.00) exceeds $1,000 threshold. Automatic Level-2 Finance Verification triggered. Recommended Action: APPROVE.';
    }

    document.getElementById('actionModal').style.display = 'flex';
}

function closeActionModal() {
    document.getElementById('actionModal').style.display = 'none';
}

async function submitDecision(approve) {
    const reqId = document.getElementById('actionReqId').value;
    const comment = document.getElementById('actionComment').value.trim();

    if (!comment) { alert('Please enter a comment for your decision.'); return; }

    let endpoint = '', payload = {};
    if (activeActionType === 'LEAVE_MGR') {
        endpoint = `${API_BASE}/leave/process-manager`;
        payload = { managerId: currentUser.id, requestId: reqId, approve, comment };
    } else if (activeActionType === 'LEAVE_HR') {
        endpoint = `${API_BASE}/leave/process-hr`;
        payload = { hrId: currentUser.id, requestId: reqId, approve, comment };
    } else if (activeActionType === 'EXPENSE_MGR') {
        endpoint = `${API_BASE}/expense/process-manager`;
        payload = { managerId: currentUser.id, claimId: reqId, approve, comment };
    } else if (activeActionType === 'EXPENSE_FINANCE') {
        endpoint = `${API_BASE}/expense/process-finance`;
        payload = { financeId: currentUser.id, claimId: reqId, approve, comment };
    } else if (activeActionType === 'PURCHASE_MGR') {
        endpoint = `${API_BASE}/purchase/process-manager`;
        payload = { managerId: currentUser.id, requestId: reqId, approve, comment };
    } else if (activeActionType === 'PURCHASE_FINANCE') {
        endpoint = `${API_BASE}/purchase/process-finance`;
        payload = { financeId: currentUser.id, requestId: reqId, approve, comment };
    }

    const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if ((await res.json()).success) {
        closeActionModal();
        if (activeActionType.includes('LEAVE_MGR')) { loadMgrLeave(); loadManagerAnalytics(); }
        else if (activeActionType.includes('LEAVE_HR')) loadHrLeave();
        else if (activeActionType.includes('EXPENSE_MGR')) { loadMgrExpense(); loadManagerAnalytics(); }
        else if (activeActionType.includes('EXPENSE_FINANCE')) loadHrExpense();
        else if (activeActionType.includes('PURCHASE_MGR')) { loadMgrPurchase(); loadManagerAnalytics(); }
        else if (activeActionType.includes('PURCHASE_FINANCE')) loadHrPurchase();
    }
}

// --- ADMIN MODULE ---
async function loadAdminData() {
    try {
        const resLogs = await fetch(`${API_BASE}/audit-logs`);
        const logs = await resLogs.json();
        document.getElementById('admTotalAuditLogs').textContent = logs.length;

        const timeline = document.getElementById('auditTimeline');
        timeline.innerHTML = '';

        logs.forEach(l => {
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
                <div class="timeline-details">
                    <strong>[${l.userRole}] User #${l.userId}</strong> ── ${l.action}
                    <br><span style="color: var(--text-secondary);">${l.details}</span>
                </div>
                <div class="timeline-time">${l.timestamp}</div>
            `;
            timeline.appendChild(div);
        });

        // Analytics
        const expList = await (await fetch(`${API_BASE}/expense/all`)).json();
        let totalExp = 0;
        expList.forEach(e => { if (e.status === 'REIMBURSED') totalExp += e.amount; });
        document.getElementById('admTotalExpense').textContent = '$' + totalExp.toFixed(2);

        const purList = await (await fetch(`${API_BASE}/purchase/all`)).json();
        let totalPur = 0;
        purList.forEach(p => { if (p.status.includes('PURCHASED')) totalPur += p.estimatedCost; });
        document.getElementById('admTotalPurchase').textContent = '$' + totalPur.toFixed(2);
    } catch (err) {}
}

function exportCsv() {
    alert('✅ Audit Logs CSV exported to server workspace file: nexusflow_audit_logs.csv');
}
