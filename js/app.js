/**
 * Main Application Logic & Routing
 */

class App {
    constructor() {
        this.currentView = null; // Will be set in init()
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
                window.store.updateSessionState({ searchText: term });
                const rows = document.querySelectorAll('#meds-table tbody tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
            // Restore search text
            if (window.store.sessionState.searchText) {
                searchInput.value = window.store.sessionState.searchText;
            }
        }

        // Initial render
        this.updateDashboardStats();
        
        // Ensure validation runs on load
        if (window.validator) {
            window.validator.validateAll(window.store.medications);
        }

        // Restore active view instead of 'dashboard'
        const initialView = window.store.sessionState.activeView || 'dashboard';
        this.navigate(initialView);
        
        // Try to restore selected med if we have one
        if (window.store.sessionState.selectedMedication) {
            const medId = window.store.sessionState.selectedMedication;
            if (window.store.getMedication(medId)) {
                this.editMedication(medId);
            } else {
                window.store.setCurrentMedication(null);
                this.renderMedicationsList();
            }
        } else {
            this.renderMedicationsList();
        }

        // Apply initial search filter if any
        if (searchInput && searchInput.value) {
            searchInput.dispatchEvent(new Event('input'));
        }
    }

    navigate(view) {
        if (this.currentView === view) return;

        // Hide old view
        if (this.currentView) {
            const oldViewEl = document.getElementById(`view-${this.currentView}`);
            if (oldViewEl) oldViewEl.style.display = 'none';
        }
        
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
            'workspace': 'Database Workspace',
            'validation': 'System Validation',
            'settings': 'Settings'
        };
        document.getElementById('header-title').textContent = titles[view] || 'App';
        
        // Extra logic based on view
        if (view === 'workspace') {
            this.renderMedicationsList();
            if (window.store.medications.length > 0 && !window.store.currentMedication && !window.store.sessionState.selectedMedication) {
                // Auto select first med if none selected and none in session
                this.editMedication(window.store.medications[0].id);
            }
        }

        this.currentView = view;
        window.store.updateSessionState({ activeView: view });
    }

    updateDashboardStats() {
        const totalEl = document.getElementById('stat-total-meds');
        if (totalEl) totalEl.textContent = window.store.medications.length;
    }

    renderMedicationsList() {
        const tbody = document.querySelector('#meds-list-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (window.store.medications.length === 0) {
            tbody.innerHTML = `<tr><td style="text-align:center; padding: 2rem; color:var(--text-muted);">No medications found.</td></tr>`;
            return;
        }

        const currentId = window.store.currentMedication ? window.store.currentMedication.id : null;

        window.store.medications.forEach(med => {
            const tr = document.createElement('tr');
            if (med.id === currentId) tr.classList.add('selected');
            
            // Check issues
            const issues = window.store.validationResults.get(med.id) || [];
            const hasError = issues.some(i => i.type === 'error');
            const hasWarning = issues.some(i => i.type === 'warning');
            
            let icon = '<i data-lucide="check-circle" style="color:var(--status-success); width:16px; height:16px;"></i>';
            if (hasError) icon = '<i data-lucide="x-circle" style="color:var(--status-error); width:16px; height:16px;"></i>';
            else if (hasWarning) icon = '<i data-lucide="alert-triangle" style="color:var(--status-warning); width:16px; height:16px;"></i>';

            tr.innerHTML = `
                <td style="display:flex; justify-content:space-between; align-items:center;" onclick="app.editMedication('${med.id}')">
                    <div>
                        <div class="med-name">${med.name || 'Unnamed'}</div>
                        <div class="med-aliases" style="font-size:0.75rem;">${med.category || '-'}</div>
                    </div>
                    <div>${icon}</div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        if (window.lucide) window.lucide.createIcons();
    }

    editMedication(id) {
        window.store.setCurrentMedication(id);
        
        // Re-render list to highlight active item
        this.renderMedicationsList();
        
        // Ensure workspace view is active
        if (this.currentView !== 'workspace') {
            this.navigate('workspace');
        }
    }

    createNewMedication() {
        const med = window.store.createNewMedication();
        this.navigate('workspace');
        // List automatically re-renders via event listener, but we might need to manually call edit
        this.editMedication(med.id);
    }

    deleteMedication(id) {
        if (confirm('Are you sure you want to delete this medication?')) {
            window.store.deleteMedication(id);
            if (window.store.currentMedication && window.store.currentMedication.id === id) {
                window.store.setCurrentMedication(null);
            }
        }
    }
}

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
