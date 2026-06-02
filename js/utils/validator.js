/**
 * Validation Engine
 */

class Validator {
    constructor(store) {
        this.store = store;
        
        // Listen to updates and validate
        document.addEventListener('medicationsUpdated', (e) => {
            this.validateAll(e.detail);
        });
    }

    validateAll(medications) {
        let totalWarnings = 0;
        let totalErrors = 0;
        let totalPreps = 0;
        let missingRefs = 0;
        let missingCautions = 0;

        medications.forEach(med => {
            const issues = this.validateMedication(med);
            this.store.setValidationResults(med.id, issues);
            
            if (med.preparations) totalPreps += med.preparations.length;
            
            issues.forEach(issue => {
                if (issue.type === 'error') totalErrors++;
                if (issue.type === 'warning') {
                    totalWarnings++;
                    if (issue.message.toLowerCase().includes('reference')) missingRefs++;
                    if (issue.message.toLowerCase().includes('caution')) missingCautions++;
                }
            });
        });

        // Update UI counters
        const badge = document.getElementById('nav-validation-badge');
        if (badge) {
            const total = totalWarnings + totalErrors;
            badge.textContent = total;
            badge.style.display = total > 0 ? 'inline-block' : 'none';
            
            badge.className = 'badge';
            if (totalErrors > 0) badge.classList.add('error');
            else if (totalWarnings > 0) badge.classList.add('warning');
        }

        const setStat = (id, val, addClass) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = val;
                if (addClass && el.parentElement.parentElement.querySelector('.stat-icon')) {
                    el.parentElement.parentElement.querySelector('.stat-icon').className = `stat-icon ${addClass}`;
                }
            }
        };

        setStat('stat-warnings', totalWarnings, totalWarnings > 0 ? 'warning' : 'success');
        setStat('stat-errors', totalErrors, totalErrors > 0 ? 'error' : 'success');
        setStat('stat-total-preps', totalPreps);
        setStat('stat-missing-refs', missingRefs, missingRefs > 0 ? 'warning' : 'success');
        setStat('stat-missing-cautions', missingCautions, missingCautions > 0 ? 'warning' : 'success');

        
        // Render dashboard if active
        this.renderValidationDashboard();
    }

    validateMedication(med) {
        const issues = [];

        // --- SECTION 1: Basic Information ---
        if (!med.id || med.id.trim() === '') {
            issues.push({ type: 'error', message: 'Missing Drug ID', section: 'basic' });
        }
        if (!med.name || med.name.trim() === '') {
            issues.push({ type: 'error', message: 'Missing Drug Name', section: 'basic' });
        }
        if (!med.category || med.category.trim() === '') {
            issues.push({ type: 'error', message: 'Missing Category', section: 'basic' });
        }
        if (!med.searchTerms || med.searchTerms.length === 0) {
            issues.push({ type: 'warning', message: 'No search terms configured', section: 'basic' });
        }
        if (!med.indications || med.indications.length === 0) {
            issues.push({ type: 'error', message: 'Missing Indications', section: 'basic' });
        }

        // --- SECTION 3: Dose Configuration ---
        if (!med.formulaType) {
            issues.push({ type: 'error', message: 'Missing Formula Type', section: 'dose' });
        }
        
        if (!med.doseUnit || med.doseUnit.trim() === '') {
            issues.push({ type: 'error', message: 'Missing Dose Unit', section: 'dose' });
        }
        
        if (med.formulaType === 'weight_based' || med.formulaType === 'fixed_dose') {
            const hasRange = med.doseMin !== null && med.doseMax !== null && med.doseStep !== null;
            const hasPoints = med.dosePoints && med.dosePoints.length > 0;
            
            if (!hasRange && !hasPoints) {
                issues.push({ type: 'error', message: 'Dose configuration incomplete. Provide range or dose points.', section: 'dose' });
            }
            if (hasRange && med.doseMin > med.doseMax) {
                issues.push({ type: 'error', message: 'Dose Min must be less than or equal to Dose Max', section: 'dose' });
            }
        }

        // --- SECTION 4: Preparations ---
        if (!med.preparations || med.preparations.length === 0) {
            issues.push({ type: 'error', message: 'At least one preparation is required', section: 'preparations' });
        } else {
            let defaultCount = 0;
            med.preparations.forEach((prep, idx) => {
                if (prep.isDefault) defaultCount++;
                
                if (!prep.label) issues.push({ type: 'error', message: `Preparation ${idx+1} missing Label`, section: 'preparations' });
                if (prep.finalVolumeMl === undefined || prep.finalVolumeMl === null) issues.push({ type: 'error', message: `Preparation ${prep.label || idx+1} missing Final Volume`, section: 'preparations' });
                if (prep.concentration === undefined || prep.concentration === null) issues.push({ type: 'error', message: `Preparation ${prep.label || idx+1} missing Concentration`, section: 'preparations' });
                const validUnits = ['mcg/ml', 'mg/ml', 'g/ml', 'IU/ml'];
                if (!validUnits.includes(prep.concentrationUnit)) issues.push({ type: 'error', message: `Preparation ${prep.label || idx+1} concentration unit must be one of: ${validUnits.join(', ')}`, section: 'preparations' });
                if (!prep.diluent) issues.push({ type: 'error', message: `Preparation ${prep.label || idx+1} missing Diluent`, section: 'preparations' });
                if (!prep.ampouleStrength) issues.push({ type: 'error', message: `Preparation ${prep.label || idx+1} missing Ampoule Strength`, section: 'preparations' });
                if (prep.ampouleCount === undefined || prep.ampouleCount === null) issues.push({ type: 'error', message: `Preparation ${prep.label || idx+1} missing Ampoule Count`, section: 'preparations' });
            });
            
            if (defaultCount !== 1) {
                issues.push({ type: 'error', message: `Exactly one default preparation is required. Found ${defaultCount}.`, section: 'preparations' });
            }
        }

        // --- SECTION 5 & 6: Administration & References ---
        if (!med.administrationGuidance) {
            issues.push({ type: 'warning', message: 'Missing Administration Guidance', section: 'admin' });
        }
        if (!med.importantCautions || med.importantCautions.length === 0) {
            issues.push({ type: 'warning', message: 'No important cautions provided', section: 'admin' });
        }
        if (!med.references || med.references.length === 0) {
            issues.push({ type: 'warning', message: 'No references provided', section: 'refs' });
        }

        return issues;
    }

    renderValidationDashboard() {
        const container = document.getElementById('validation-results-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const allIssues = this.store.getAllValidationResults();
        let hasAnyIssues = false;

        allIssues.forEach((issues, medId) => {
            if (issues.length === 0) return;
            hasAnyIssues = true;
            
            const med = this.store.getMedication(medId);
            const medName = med ? med.name : 'Unknown Medication';

            const card = document.createElement('div');
            card.className = 'preparation-card'; // Reuse style
            
            card.innerHTML = `
                <div class="preparation-card-header">
                    <h4>${medName}</h4>
                    <button class="btn btn-sm btn-outline" onclick="app.navigate('medications'); store.setCurrentMedication('${medId}')">Edit</button>
                </div>
                <ul class="validation-list">
                    ${issues.map(iss => `
                        <li class="validation-item ${iss.type}" data-type="${iss.type}">
                            <i data-lucide="${iss.type === 'error' ? 'x-circle' : 'alert-triangle'}"></i>
                            <div>
                                <strong>${iss.type.toUpperCase()}:</strong> ${iss.message}
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `;
            container.appendChild(card);
        });

        if (!hasAnyIssues) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i data-lucide="check-circle" style="width: 48px; height: 48px; color: var(--status-success); margin-bottom: 1rem;"></i>
                    <p>All medications are perfectly valid!</p>
                </div>
            `;
        }
        
        if (window.lucide) window.lucide.createIcons();
    }
}

window.validator = new Validator(window.store);
