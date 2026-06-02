/**
 * Bedside App Live Preview Component
 */

class Preview {
    constructor(store) {
        this.store = store;
        this.container = document.getElementById('preview-screen-content');
        
        document.addEventListener('currentMedicationChanged', (e) => {
            if (e.detail) this.render(e.detail);
            else this.clear();
        });
        
        // Listen to updates from editor live editing
        document.addEventListener('medicationsUpdated', () => {
            if (this.store.currentMedication) {
                this.render(this.store.currentMedication);
            }
        });
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '<p class="placeholder-text">Select a medication to preview</p>';
        }
    }

    calculateRate(drug, preparation, weight, dose) {
        if (!drug || !preparation || dose === undefined || dose === null || !preparation.concentration) return 0;
        
        let rate = 0;
        if (drug.formulaType === 'weight_based') {
            if (!weight) return 0;
            // rate_ml_hr = (dose × weight × 60) ÷ concentration
            rate = (dose * weight * 60) / preparation.concentration;
        } else if (drug.formulaType === 'fixed_dose') {
            // rate_ml_hr = (dose × 60) ÷ concentration
            rate = (dose * 60) / preparation.concentration;
        }

        return Number(rate.toFixed(1));
    }

    generateDoseTable(drug, preparation, weight) {
        if (!drug || !preparation) return [];
        if (drug.formulaType === 'weight_based' && !weight) return [];

        const table = [];
        
        if (drug.dosePoints && Array.isArray(drug.dosePoints) && drug.dosePoints.length > 0) {
            drug.dosePoints.forEach(point => {
                const rate = this.calculateRate(drug, preparation, weight, point);
                table.push({
                    dose: Number(point.toFixed(2)),
                    rate: rate
                });
            });
        } else if (drug.doseMin != null && drug.doseMax != null && drug.doseStep != null) {
            let currentDose = drug.doseMin;
            let iterations = 0;
            while (currentDose <= drug.doseMax && iterations < 100) {
                const rate = this.calculateRate(drug, preparation, weight, currentDose);
                table.push({
                    dose: Number(currentDose.toFixed(2)),
                    rate: rate
                });
                currentDose += drug.doseStep;
                iterations++;
            }
        }
        
        return table;
    }

    render(med) {
        if (!this.container) return;
        
        const safe = med.safety || {};
        const prep = med.preparations && med.preparations.find(p => p.isDefault) || (med.preparations && med.preparations[0]) || {};

        const highAlert = safe.highAlert ?? med.highAlert;
        const requiresPump = safe.requiresPump ?? med.requiresPump;
        const requiresCVL = safe.requiresCVL ?? med.requiresCVL;
        const peripheralCompatible = safe.peripheralCompatible ?? med.peripheralCompatible;
        const requiresCardiacMonitoring = safe.requiresCardiacMonitoring ?? med.requiresCardiacMonitoring;

        let badgesHtml = '';
        if (highAlert) badgesHtml += '<div class="safety-badge high-alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>High Alert</div>';
        if (requiresPump) badgesHtml += '<div class="safety-badge pump-required"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>Pump</div>';
        if (requiresCVL) badgesHtml += '<div class="safety-badge cvl-required"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>CVL</div>';
        else if (peripheralCompatible) badgesHtml += '<div class="safety-badge peripheral-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>Peripheral OK</div>';
        if (requiresCardiacMonitoring) badgesHtml += '<div class="safety-badge cardiac-monitoring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>ECG</div>';

        const cautions = Array.isArray(med.importantCautions) ? med.importantCautions : (med.importantCautions ? [med.importantCautions] : []);
        const cautionsHtml = cautions.length > 0 ? cautions.map(c => `<li>${c}</li>`).join('') : '<li class="info-block-value">No specific cautions.</li>';
        
        const indications = med.indications || [];
        const indicationsHtml = indications.length > 0 ? indications.map(ind => `<li>${ind}</li>`).join('') : '<div class="info-block-value">Not specified in current data.</div>';
        
        const references = med.references || [];
        const referencesHtml = references.length > 0 ? references.map(r => `<li>${r}</li>`).join('') : '<div class="info-block-value">Not specified in current data.</div>';

        // Real Dose Table using 70kg
        const previewWeight = 70;
        const doseTableData = this.generateDoseTable(med, prep, previewWeight);
        
        let doseHtml = '';
        if (doseTableData.length > 0) {
            doseTableData.forEach((row, idx) => {
                const highlightClass = (idx % 2 === 1) ? 'class="highlight-row"' : '';
                doseHtml += `<tr><td ${highlightClass}>${row.dose}</td><td ${highlightClass}>${row.rate}</td></tr>`;
            });
        } else {
            doseHtml = '<tr><td colspan="2" style="text-align:center; color: var(--text-muted); padding: 32px 0;">No calculation data available.</td></tr>';
        }

        let doseRange = '--';
        if (med.dosePoints && med.dosePoints.length > 0) {
            doseRange = `${med.dosePoints[0]} – ${med.dosePoints[med.dosePoints.length-1]} ${med.doseUnit}`;
        } else if (med.doseMin != null && med.doseMax != null) {
            doseRange = `${med.doseMin} – ${med.doseMax} ${med.doseUnit}`;
        }
        
        let prepStepsHtml = '';
        if (prep.preparationSteps && prep.preparationSteps.length > 0) {
            let listHtml = prep.preparationSteps.map(step => `<li>${step}</li>`).join('');
            prepStepsHtml = `
                <details class="prep-steps-drawer" id="prep-steps-drawer">
                    <summary class="prep-steps-toggle">
                        Preparation Steps
                        <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;margin-left:auto;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </summary>
                    <ol class="prep-steps-list" id="prep-steps-list">
                        ${listHtml}
                    </ol>
                </details>
            `;
        }

        this.container.innerHTML = `
            <div class="app-container">
                <div id="drug-detail-view" class="view" style="display: flex;">
                    <div class="sticky-top-container">
                    <header class="detail-header">
                        <button class="icon-btn" aria-label="Back">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </button>
                        <div class="header-title">${med.name || 'Unnamed Medication'}</div>
                        <button class="icon-btn" aria-label="Toggle Favorite">
                            <svg class="star-icon active" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </button>
                    </header>
                    <div class="detail-weight-bar">
                        <div class="detail-weight-info">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;flex-shrink:0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span>Patient Weight</span>
                            <strong class="patient-weight-display detail-weight-value">${previewWeight} kg</strong>
                        </div>
                        <button class="edit-weight-btn-simple">Edit</button>
                    </div>
                    <div class="drug-identity-bar">
                        <span class="drug-category-label">${med.category || 'Category'}</span>
                        <div class="safety-badges-inline">${badgesHtml}</div>
                        <span class="detail-disclaimer-badge">⚠ Verify</span>
                    </div>
                </div>

                <div class="scroll-content detail-scroll">
                    <!-- PREPARATION CARD -->
                    <div class="prep-detail-card">
                        <div class="prep-card-top-row">
                            <div class="prep-card-name-group">
                                <span class="prep-card-name">${prep.label || 'Select Preparation'}</span>
                                ${prep.isDefault ? '<span class="prep-default-badge">✓ Recommended</span>' : '<span class="prep-nondefault-badge">⚠ Non-standard</span>'}
                            </div>
                            <div class="prep-card-change">Change <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
                        </div>

                        <div class="prep-card-desc">${prep.description || prep.notes || ''}</div>
                        ${prep.isHighConcentration ? '<div class="high-conc-warning">⚠ High concentration — use only when clinically appropriate</div>' : ''}

                        <div class="prep-data-grid">
                            <div class="prep-data-item">
                                <div class="prep-data-label">Ampoules</div>
                                <div class="prep-data-value">${prep.ampouleCount != null ? prep.ampouleCount + ' × ampoule(s)' : '--'}</div>
                                <div class="prep-data-sub">${prep.ampouleStrength || '--'}</div>
                            </div>
                            <div class="prep-data-item">
                                <div class="prep-data-label">Drug Volume</div>
                                <div class="prep-data-value">${prep.medicationVolumeMl != null ? prep.medicationVolumeMl + ' ml' : '--'}</div>
                            </div>
                            <div class="prep-data-item">
                                <div class="prep-data-label">Diluent</div>
                                <div class="prep-data-value">${prep.diluent || '--'}</div>
                            </div>
                            <div class="prep-data-item">
                                <div class="prep-data-label">Diluent Volume</div>
                                <div class="prep-data-value">${prep.diluentVolumeMl != null ? prep.diluentVolumeMl + ' ml' : '--'}</div>
                            </div>
                            <div class="prep-data-item">
                                <div class="prep-data-label">Final Volume</div>
                                <div class="prep-data-value">${prep.finalVolumeMl != null ? prep.finalVolumeMl + ' ml' : '--'}</div>
                            </div>
                            <div class="prep-data-item">
                                <div class="prep-data-label">Concentration</div>
                                <div class="prep-data-value conc-highlight">${prep.concentration || '--'} ${prep.concentrationUnit || 'mcg/ml'}</div>
                            </div>
                        </div>
                        
                        ${prepStepsHtml}
                    </div>

                    <!-- DOSE TABLE (Real) -->
                    <div class="calculator-section">
                        <div class="table-header-row">
                            <div class="table-col-label"><span>${med.doseUnit || 'mcg/kg/min'}</span></div>
                            <div class="table-col-label right">mL/hr</div>
                        </div>
                        <div class="clinical-table-wrapper">
                            <table class="clinical-table">
                                <tbody>${doseHtml}</tbody>
                            </table>
                        </div>
                        <div class="table-footer-formula">Formula: ${med.formulaType === 'weight_based' ? '(Dose × Weight × 60) / Concentration' : '(Dose × 60) / Concentration'}</div>
                    </div>

                    <!-- ADMINISTRATION NOTES -->
                    <details class="more-info-drawer" open>
                        <summary class="more-info-toggle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            Administration Notes
                            <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-left:auto;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </summary>
                        <div class="more-info-content">
                            <div class="info-block">
                                <div class="info-block-label">DOSE RANGE</div>
                                <div class="info-block-value">${doseRange}</div>
                            </div>
                            <div class="info-block">
                                <div class="info-block-label">ADMINISTRATION</div>
                                <div class="info-block-value">${med.administrationGuidance || '--'}</div>
                            </div>
                            <div class="info-block">
                                <div class="info-block-label">IMPORTANT CAUTIONS</div>
                                <ul class="info-list caution-text">${cautionsHtml}</ul>
                            </div>
                        </div>
                    </details>

                    <!-- INDICATIONS -->
                    <details class="more-info-drawer">
                        <summary class="more-info-toggle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>
                            Indications
                            <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-left:auto;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </summary>
                        <div class="more-info-content">
                            <ul class="bullet-list info-list">${indicationsHtml}</ul>
                        </div>
                    </details>

                    <!-- REFERENCES -->
                    <details class="more-info-drawer">
                        <summary class="more-info-toggle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                            References
                            <svg class="drawer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;margin-left:auto;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </summary>
                        <div class="more-info-content">
                            <ul class="info-list">${referencesHtml}</ul>
                        </div>
                    </details>
                </div>
                </div>
            </div>
        `;
    }
}

window.preview = new Preview(window.store);
