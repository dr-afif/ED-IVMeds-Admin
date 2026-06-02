/**
 * Medication Editor Component
 */

class Editor {
    constructor(store) {
        this.store = store;
        this.container = document.getElementById('form-sections-container');
        this.validationList = document.getElementById('live-validation-list');
        
        this.formWrapper = document.getElementById('med-form');
        if (this.formWrapper) {
            // Debounce scroll event slightly to prevent excessive localStorage writes
            let scrollTimeout;
            this.formWrapper.addEventListener('scroll', () => {
                if (this.med) {
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => {
                        this.updateEditorState({ scrollPosition: this.formWrapper.scrollTop });
                    }, 100);
                }
            });
        }
        
        document.addEventListener('currentMedicationChanged', (e) => {
            if (e.detail) {
                this.med = JSON.parse(JSON.stringify(e.detail)); // working copy
                
                // Restore state
                const sessionState = this.store.sessionState.editorState || {};
                this.activePrepEditIndex = sessionState.selectedPrepTab !== undefined ? sessionState.selectedPrepTab : null;
                
                this.render();
                this.updateLiveValidation();

                // Restore scroll position
                if (this.formWrapper && sessionState.scrollPosition) {
                    setTimeout(() => {
                        this.formWrapper.scrollTop = sessionState.scrollPosition;
                    }, 0);
                }
            } else {
                this.med = null;
                this.render();
            }
        });
    }

    updateEditorState(updates) {
        if (!this.store.sessionState.editorState) {
            this.store.sessionState.editorState = {};
        }
        this.store.updateSessionState({
            editorState: {
                ...this.store.sessionState.editorState,
                ...updates
            }
        });
    }

    render() {
        if (!this.container) return;
        if (!this.med) {
            this.container.innerHTML = '<div style="padding: 3rem; text-align: center; color: var(--text-muted);">Select a medication from the list to begin editing.</div>';
            if (this.validationList) this.validationList.innerHTML = '';
            return;
        }
        
        this.container.innerHTML = `
            ${this.renderSection1()}
            ${this.renderSection2()}
            ${this.renderSection3()}
            ${this.renderSection4()}
            ${this.renderSection5()}
            ${this.renderSection6()}
            ${this.renderSection7()}
        `;
        
        this.attachListeners();
        if (window.lucide) window.lucide.createIcons();
    }

    // --- Sections Rendering ---
    
    renderSection1() {
        return `
        <div class="form-section">
            <h3 class="form-section-title">1. Basic Information</h3>
            <div class="form-grid">
                <div class="form-group full-width">
                    <label class="form-label">Drug ID (Unique identifier)</label>
                    <input type="text" class="form-control" name="id" value="${this.med.id || ''}" placeholder="e.g. noradrenaline">
                </div>
                <div class="form-group">
                    <label class="form-label">Drug Name</label>
                    <input type="text" class="form-control" name="name" value="${this.med.name || ''}" placeholder="e.g. Noradrenaline">
                </div>
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <input type="text" class="form-control" name="category" value="${this.med.category || ''}" placeholder="e.g. Vasopressor">
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Aliases</label>
                    ${this.renderTagsInput('aliases', this.med.aliases || [])}
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Search Terms</label>
                    ${this.renderTagsInput('searchTerms', this.med.searchTerms || [])}
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Indications</label>
                    ${this.renderTagsInput('indications', this.med.indications || [])}
                </div>
            </div>
        </div>
        `;
    }

    renderSection2() {
        const s = this.med.safety || {};
        return `
        <div class="form-section">
            <h3 class="form-section-title">2. Safety Metadata</h3>
            <div class="form-grid">
                ${this.renderToggle('safety.highAlert', 'High Alert Medication', s.highAlert)}
                ${this.renderToggle('safety.requiresPump', 'Requires Infusion Pump', s.requiresPump)}
                ${this.renderToggle('safety.requiresCVL', 'Requires Central Line (CVL)', s.requiresCVL)}
                ${this.renderToggle('safety.peripheralCompatible', 'Peripheral Compatible', s.peripheralCompatible)}
                ${this.renderToggle('safety.requiresCardiacMonitoring', 'Requires Cardiac Monitoring', s.requiresCardiacMonitoring)}
            </div>
        </div>
        `;
    }

    renderSection3() {
        const isWeight = this.med.formulaType === 'weight_based';
        const hasRange = this.med.doseMin !== null;
        
        return `
        <div class="form-section">
            <h3 class="form-section-title">3. Dose Configuration</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Formula Type</label>
                    <select class="form-control" name="formulaType">
                        <option value="weight_based" ${isWeight ? 'selected' : ''}>Weight Based</option>
                        <option value="fixed_dose" ${!isWeight ? 'selected' : ''}>Fixed Dose</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Dose Unit</label>
                    <input type="text" class="form-control" name="doseUnit" value="${this.med.doseUnit || ''}" placeholder="e.g. mcg/kg/min">
                </div>
                
                <div class="form-group full-width" style="margin-top: 1rem;">
                    <label class="form-label" style="display:flex; justify-content:space-between;">
                        <span>Dose Range (Min/Max/Step)</span>
                        <span style="color:var(--text-muted);font-size:0.8rem;">OR</span>
                        <span>Dose Points</span>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Min Dose</label>
                    <input type="number" step="any" class="form-control" name="doseMin" value="${this.med.doseMin !== null ? this.med.doseMin : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Max Dose</label>
                    <input type="number" step="any" class="form-control" name="doseMax" value="${this.med.doseMax !== null ? this.med.doseMax : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Step</label>
                    <input type="number" step="any" class="form-control" name="doseStep" value="${this.med.doseStep !== null ? this.med.doseStep : ''}">
                </div>
                
                <div class="form-group full-width">
                    <label class="form-label">Specific Dose Points (Comma separated)</label>
                    <input type="text" class="form-control" name="dosePoints" value="${(this.med.dosePoints || []).join(', ')}" placeholder="e.g. 5, 10, 20, 40">
                    <p class="help-text">Leave blank to use Dose Range instead.</p>
                </div>
            </div>
        </div>
        `;
    }

    renderSection4() {
        const preps = this.med.preparations || [];
        
        return `
        <div class="form-section">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
                <h3 class="form-section-title" style="border:none; margin:0; padding:0;">4. Preparation Variants</h3>
                <button class="btn btn-sm btn-outline" id="btn-add-prep"><i data-lucide="plus"></i> Add Preparation</button>
            </div>
            
            <div id="preparations-list">
                ${preps.map((prep, index) => this.renderPreparationCard(prep, index)).join('')}
            </div>
        </div>
        `;
    }
    
    renderPreparationCard(prep, index) {
        const isEditing = this.activePrepEditIndex === index;
        
        if (!isEditing) {
            return `
            <div class="preparation-card summary-card" data-index="${index}" style="display:flex; justify-content:space-between; align-items:center; padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <div style="font-weight: 600; font-size: 1.1rem; color: var(--text-primary);">
                        ${prep.label || 'Unnamed Preparation'}
                        ${prep.isDefault ? '<span class="badge success" style="font-size:0.7rem; margin-left: 8px;">Default</span>' : ''}
                    </div>
                    <div style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">
                        ${prep.ampouleStrength ? prep.ampouleStrength + ' in ' : ''}
                        ${prep.finalVolumeMl ? prep.finalVolumeMl + 'ml ' : ''}
                        ${prep.diluent || ''}
                        ${prep.concentration ? '— ' + prep.concentration + ' ' + (prep.concentrationUnit || 'mcg/ml') : ''}
                    </div>
                </div>
                <div style="display:flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-outline btn-edit-prep" data-index="${index}"><i data-lucide="edit-2"></i> Edit</button>
                    <button class="btn btn-sm btn-ghost btn-dup-prep" data-index="${index}" title="Duplicate"><i data-lucide="copy"></i></button>
                    <button class="btn btn-sm btn-ghost btn-del-prep" data-index="${index}" style="color:var(--status-error);" title="Delete"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
            `;
        }
        
        return `
        <div class="preparation-card" data-index="${index}" style="border: 2px solid var(--accent-primary); padding: 1.5rem; background: var(--bg-surface); border-radius: 8px; margin-bottom: 1rem;">
            <div class="preparation-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <h4 style="margin:0; color: var(--accent-primary);">Editing Preparation ${index + 1}</h4>
                <button class="btn btn-sm btn-primary btn-close-prep-edit"><i data-lucide="check"></i> Done</button>
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Label</label>
                    <input type="text" class="form-control prep-field" data-field="label" data-index="${index}" value="${prep.label || ''}" placeholder="e.g. Single Strength">
                </div>
                <div class="form-group" style="display:flex; align-items:flex-end; gap: 1rem;">
                    ${this.renderToggle(`preparations.${index}.isDefault`, 'Default', prep.isDefault, 'prep-toggle')}
                    ${this.renderToggle(`preparations.${index}.isHighConcentration`, 'High Conc.', prep.isHighConcentration, 'prep-toggle')}
                </div>
                
                <div class="form-group full-width">
                    <label class="form-label">Description / Notes</label>
                    <input type="text" class="form-control prep-field" data-field="description" data-index="${index}" value="${prep.description || ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Ampoule Strength</label>
                    <input type="text" class="form-control prep-field" data-field="ampouleStrength" data-index="${index}" value="${prep.ampouleStrength || ''}" placeholder="e.g. 4mg/4ml">
                </div>
                <div class="form-group">
                    <label class="form-label">Ampoule Count</label>
                    <input type="number" class="form-control prep-field" data-field="ampouleCount" data-index="${index}" value="${prep.ampouleCount !== undefined ? prep.ampouleCount : ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Medication Volume (ml)</label>
                    <input type="number" step="any" class="form-control prep-field" data-field="medicationVolumeMl" data-index="${index}" value="${prep.medicationVolumeMl !== undefined ? prep.medicationVolumeMl : ''}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Diluent Volume (ml)</label>
                    <input type="number" step="any" class="form-control prep-field" data-field="diluentVolumeMl" data-index="${index}" value="${prep.diluentVolumeMl !== undefined ? prep.diluentVolumeMl : ''}">
                </div>

                <div class="form-group">
                    <label class="form-label">Final Volume (ml)</label>
                    <input type="number" step="any" class="form-control prep-field" data-field="finalVolumeMl" data-index="${index}" value="${prep.finalVolumeMl !== undefined ? prep.finalVolumeMl : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Diluent Name</label>
                    <input type="text" class="form-control prep-field" data-field="diluent" data-index="${index}" value="${prep.diluent || ''}" placeholder="e.g. D5W">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Concentration</label>
                    <input type="number" step="any" class="form-control prep-field" data-field="concentration" data-index="${index}" value="${prep.concentration !== undefined ? prep.concentration : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Concentration Unit</label>
                    <input type="text" class="form-control prep-field" data-field="concentrationUnit" data-index="${index}" value="${prep.concentrationUnit || 'mcg/ml'}">
                </div>
            </div>
        </div>
        `;
    }

    renderSection5() {
        return `
        <div class="form-section">
            <h3 class="form-section-title">5. Administration</h3>
            <div class="form-grid">
                <div class="form-group full-width">
                    <label class="form-label">Administration Guidance</label>
                    <textarea class="form-control" name="administrationGuidance">${this.med.administrationGuidance || ''}</textarea>
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Important Cautions</label>
                    ${this.renderTagsInput('importantCautions', this.med.importantCautions || [])}
                </div>
            </div>
        </div>
        `;
    }

    renderSection6() {
        return `
        <div class="form-section">
            <h3 class="form-section-title">6. References</h3>
            <div class="form-grid">
                <div class="form-group full-width">
                    <label class="form-label">References</label>
                    ${this.renderTagsInput('references', this.med.references || [])}
                </div>
            </div>
        </div>
        `;
    }

    renderSection7() {
        return `
        <div class="form-section">
            <h3 class="form-section-title">7. Advanced Configurations</h3>
            <div class="form-grid">
                <div class="form-group full-width">
                    <label class="form-label">Dose Phases (JSON Array)</label>
                    <textarea class="form-control" name="dosePhases" rows="3" placeholder='e.g. [{"phase": "Loading", "dose": 40, "doseUnit": "mg/kg"}]'>${this.med.dosePhases ? JSON.stringify(this.med.dosePhases) : ''}</textarea>
                    <p class="help-text">Use valid JSON to override calculator logic with phased dosing.</p>
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Indication Overrides (JSON Object)</label>
                    <textarea class="form-control" name="indicationOverrides" rows="3" placeholder='e.g. {"Asthma": {"formulaType": "fixed_dose"}}'>${this.med.indicationOverrides ? JSON.stringify(this.med.indicationOverrides) : ''}</textarea>
                    <p class="help-text">Use valid JSON to override medication properties based on active indication.</p>
                </div>
            </div>
        </div>
        `;
    }

    // --- Components ---
    
    renderToggle(name, label, checked, extraClass = '') {
        const id = `toggle-${name.replace(/\./g, '-')}`;
        return `
        <div class="form-group ${extraClass}">
            <label class="toggle-wrapper">
                <input type="checkbox" name="${name}" id="${id}" ${checked ? 'checked' : ''}>
                <div class="toggle"></div>
                <span class="toggle-label">${label}</span>
            </label>
        </div>
        `;
    }

    renderTagsInput(name, items) {
        return `
        <div class="tags-input-container" data-name="${name}">
            ${items.map((item, i) => `
                <div class="tag">
                    ${item}
                    <i data-lucide="x" class="tag-remove" data-index="${i}" data-name="${name}"></i>
                </div>
            `).join('')}
            <input type="text" class="tags-input" placeholder="Type and press Enter...">
        </div>
        `;
    }

    // --- Interaction & Binding ---
    
    attachListeners() {
        if (!this.container) return;

        // Basic inputs
        this.container.querySelectorAll('input:not(.tags-input):not(.prep-field):not([type="checkbox"]), textarea, select').forEach(el => {
            el.addEventListener('input', (e) => {
                let val = e.target.value;
                if (e.target.name === 'dosePhases' || e.target.name === 'indicationOverrides') {
                    try {
                        val = val.trim() ? JSON.parse(val) : null;
                        e.target.style.borderColor = '';
                    } catch (err) {
                        e.target.style.borderColor = 'red';
                        return; // don't sync invalid JSON
                    }
                }
                this.updateField(e.target.name, val, e.target.type);
            });
        });

        // Checkboxes / Toggles
        this.container.querySelectorAll('input[type="checkbox"]').forEach(el => {
            el.addEventListener('change', (e) => {
                this.updateField(e.target.name, e.target.checked, 'checkbox');
            });
        });

        // Tags Inputs
        this.container.querySelectorAll('.tags-input').forEach(el => {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (el.value.trim()) {
                        const name = el.parentElement.dataset.name;
                        const arr = this.getNested(this.med, name) || [];
                        arr.push(el.value.trim());
                        this.setNested(this.med, name, arr);
                        this.reRenderAndSync();
                    }
                }
            });
        });

        this.container.querySelectorAll('.tag-remove').forEach(el => {
            el.addEventListener('click', (e) => {
                const name = el.dataset.name;
                const index = parseInt(el.dataset.index);
                const arr = this.getNested(this.med, name) || [];
                arr.splice(index, 1);
                this.setNested(this.med, name, arr);
                this.reRenderAndSync();
            });
        });
        
        // Dose Points special handling
        const dosePointsInput = this.container.querySelector('input[name="dosePoints"]');
        if (dosePointsInput) {
            dosePointsInput.addEventListener('change', (e) => {
                const val = e.target.value;
                if (!val.trim()) {
                    this.med.dosePoints = null;
                } else {
                    this.med.dosePoints = val.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                }
                this.syncToStore();
            });
        }

        // Preparations Fields
        this.container.querySelectorAll('.prep-field').forEach(el => {
            el.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                let val = e.target.value;
                if (e.target.type === 'number') val = val === '' ? undefined : parseFloat(val);
                
                this.med.preparations[index][field] = val;
                this.syncToStore();
            });
        });

        // Preparations Add/Del/Dup
        const btnAdd = document.getElementById('btn-add-prep');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                if (!this.med.preparations) this.med.preparations = [];
                this.med.preparations.push({
                    label: '',
                    isDefault: this.med.preparations.length === 0,
                    isHighConcentration: false
                });
                this.activePrepEditIndex = this.med.preparations.length - 1;
                this.updateEditorState({ selectedPrepTab: this.activePrepEditIndex });
                this.reRenderAndSync();
            });
        }

        this.container.querySelectorAll('.btn-edit-prep').forEach(el => {
            el.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.activePrepEditIndex = index;
                this.updateEditorState({ selectedPrepTab: index });
                this.reRenderAndSync();
            });
        });

        this.container.querySelectorAll('.btn-close-prep-edit').forEach(el => {
            el.addEventListener('click', () => {
                this.activePrepEditIndex = null;
                this.updateEditorState({ selectedPrepTab: null });
                this.reRenderAndSync();
            });
        });

        this.container.querySelectorAll('.btn-del-prep').forEach(el => {
            el.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                if (confirm('Delete this preparation?')) {
                    this.med.preparations.splice(index, 1);
                    if (this.activePrepEditIndex === index) this.activePrepEditIndex = null;
                    else if (this.activePrepEditIndex > index) this.activePrepEditIndex--;
                    this.reRenderAndSync();
                }
            });
        });

        this.container.querySelectorAll('.btn-dup-prep').forEach(el => {
            el.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                const copy = JSON.parse(JSON.stringify(this.med.preparations[index]));
                copy.label += ' (Copy)';
                copy.isDefault = false; // don't duplicate default flag
                this.med.preparations.push(copy);
                this.reRenderAndSync();
            });
        });
    }

    updateField(name, value, type) {
        if (type === 'number') {
            value = value === '' ? null : parseFloat(value);
        }
        
        if (name === 'formulaType') {
            this.med.weightBased = (value === 'weight_based');
        }

        this.setNested(this.med, name, value);
        this.syncToStore();
    }
    
    getNested(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    setNested(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    reRenderAndSync() {
        this.syncToStore();
        this.render();
    }

    syncToStore() {
        // Send updates back to the main store so they persist and update other views
        this.store.updateMedication(this.med.id, this.med);
        this.updateLiveValidation();
    }
    
    save() {
        // Since we live-sync, this is more of a visual confirmation
        this.store.saveDraft();
        alert('Medication changes saved locally.');
    }

    updateLiveValidation() {
        if (!this.validationList || !window.validator) return;
        
        const issues = window.validator.validateMedication(this.med);
        
        if (issues.length === 0) {
            this.validationList.innerHTML = '<li class="validation-item" style="color:var(--status-success);"><i data-lucide="check-circle"></i> No issues found!</li>';
        } else {
            this.validationList.innerHTML = issues.map(iss => `
                <li class="validation-item ${iss.type}">
                    <i data-lucide="${iss.type === 'error' ? 'x-circle' : 'alert-triangle'}"></i>
                    <div>${iss.message}</div>
                </li>
            `).join('');
        }
        if (window.lucide) window.lucide.createIcons();
    }
}

window.editor = new Editor(window.store);
