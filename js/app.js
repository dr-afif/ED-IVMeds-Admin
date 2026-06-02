/**
 * Main Application Logic & Routing
 */

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.init();
    }

    init() {
        // Setup Navigation Listeners
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.dataset.view;
                this.navigate(view);
            });
        });

        // Listen for medication updates to refresh views
        document.addEventListener('medicationsUpdated', () => {
            this.updateDashboardStats();
            this.renderMedicationsList();
        });

        // Search logic
        const searchInput = document.getElementById('med-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#meds-table tbody tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
        }

        // Initial render
        this.updateDashboardStats();
        this.renderMedicationsList();
        
        // Ensure validation runs on load
        if (window.validator) {
            window.validator.validateAll(window.store.medications);
        }
    }

    navigate(view) {
        if (this.currentView === view) return;

        // Hide old view
        document.getElementById(`view-${this.currentView}`).style.display = 'none';
        
        // Show new view
        document.getElementById(`view-${view}`).style.display = 'block';
        
        // Update nav active state
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.view === view) el.classList.add('active');
        });

        // Update header title
        const titles = {
            'dashboard': 'Dashboard',
            'medications': 'Medication Database',
            'validation': 'System Validation',
            'preview': 'Bedside Preview',
            'settings': 'Settings'
        };
        document.getElementById('header-title').textContent = titles[view] || 'App';
        
        // Extra logic based on view
        if (view === 'medications') {
            this.renderMedicationsList();
        }

        this.currentView = view;
    }

    updateDashboardStats() {
        const totalEl = document.getElementById('stat-total-meds');
        if (totalEl) totalEl.textContent = window.store.medications.length;
    }

    renderMedicationsList() {
        const tbody = document.querySelector('#meds-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (window.store.medications.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color:var(--text-muted);">No medications found. Import database or add new.</td></tr>`;
            return;
        }

        window.store.medications.forEach(med => {
            const tr = document.createElement('tr');
            
            // Check issues
            const issues = window.store.validationResults.get(med.id) || [];
            const hasError = issues.some(i => i.type === 'error');
            const hasWarning = issues.some(i => i.type === 'warning');
            
            let statusBadge = '<span class="badge" style="background:var(--status-success-bg);color:var(--status-success);">Valid</span>';
            if (hasError) statusBadge = '<span class="badge" style="background:var(--status-error-bg);color:var(--status-error);">Error</span>';
            else if (hasWarning) statusBadge = '<span class="badge" style="background:var(--status-warning-bg);color:var(--status-warning);">Warning</span>';

            tr.innerHTML = `
                <td>
                    <div class="med-name">${med.name || 'Unnamed'}</div>
                    <div class="med-aliases">${(med.aliases || []).join(', ')}</div>
                </td>
                <td>${med.category || '-'}</td>
                <td>${(med.preparations || []).length} preps</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="app.editMedication('${med.id}')">Edit</button>
                    <button class="btn btn-sm btn-ghost" onclick="app.previewMedication('${med.id}')"><i data-lucide="monitor-smartphone"></i></button>
                    <button class="btn btn-sm btn-ghost" style="color:var(--status-error);" onclick="app.deleteMedication('${med.id}')"><i data-lucide="trash-2"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        if (window.lucide) window.lucide.createIcons();
    }

    editMedication(id) {
        window.store.setCurrentMedication(id);
        
        // Show editor view, but we keep the main tab as 'medications' logically or switch to editor view
        document.getElementById('view-medications').style.display = 'none';
        document.getElementById('view-editor').style.display = 'block';
        
        document.getElementById('header-title').textContent = 'Medication Editor';
    }

    createNewMedication() {
        const med = window.store.createNewMedication();
        // The store already sets it as current. Switch to editor.
        document.getElementById('view-medications').style.display = 'none';
        document.getElementById('view-editor').style.display = 'block';
        document.getElementById('header-title').textContent = 'New Medication';
    }

    deleteMedication(id) {
        if (confirm('Are you sure you want to delete this medication?')) {
            window.store.deleteMedication(id);
        }
    }

    previewMedication(id) {
        window.store.setCurrentMedication(id);
        this.navigate('preview');
    }
}

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
