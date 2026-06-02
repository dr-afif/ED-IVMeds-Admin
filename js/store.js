/**
 * Application State Management
 */

class Store {
    constructor() {
        this.medications = [];
        this.currentMedication = null;
        this.validationResults = new Map(); // id -> array of issues
        
        this.sessionState = {
            activeView: 'dashboard',
            selectedMedication: null,
            searchText: '',
            editorState: {
                expandedSections: [],
                selectedPrepTab: 0,
                scrollPosition: 0
            }
        };

        // Load from localStorage if available (prevent accidental reload loss)
        this.loadDraft();
        this.loadSessionState();
    }

    setMedications(data) {
        if (!Array.isArray(data)) {
            console.error("Invalid data format for medications.");
            return;
        }
        this.medications = data;
        this.saveDraft();
        this.triggerEvent('medicationsUpdated', this.medications);
    }

    addMedication(med) {
        this.medications.push(med);
        this.saveDraft();
        this.triggerEvent('medicationsUpdated', this.medications);
    }

    updateMedication(id, updatedMed) {
        const idx = this.medications.findIndex(m => m.id === id);
        if (idx !== -1) {
            // Keep the original id if updatedMed doesn't have one
            this.medications[idx] = { ...updatedMed, id: updatedMed.id || id };
            this.saveDraft();
            this.triggerEvent('medicationsUpdated', this.medications);
            
            // Re-validate all on update
            if (window.validator) {
                window.validator.validateAll(this.medications);
            }
        }
    }
    
    deleteMedication(id) {
        this.medications = this.medications.filter(m => m.id !== id);
        this.validationResults.delete(id);
        this.saveDraft();
        this.triggerEvent('medicationsUpdated', this.medications);
    }

    getMedication(id) {
        return this.medications.find(m => m.id === id);
    }

    setCurrentMedication(id) {
        this.currentMedication = this.getMedication(id) || null;
        if (!this.currentMedication) {
            id = null;
        }
        this.updateSessionState({ selectedMedication: id });
        this.triggerEvent('currentMedicationChanged', this.currentMedication);
    }
    
    createNewMedication() {
        const emptyMed = {
            id: 'new-medication-' + Date.now(),
            name: '',
            aliases: [],
            searchTerms: [],
            category: '',
            indications: [],
            formulaType: 'weight_based',
            weightBased: true,
            doseUnit: 'mcg/kg/min',
            doseMin: null,
            doseMax: null,
            doseStep: null,
            dosePoints: null,
            allowCustomConcentration: false,
            safety: {
                highAlert: false,
                requiresPump: true,
                requiresCVL: false,
                peripheralCompatible: true,
                requiresCardiacMonitoring: true
            },
            preparations: [],
            administrationGuidance: '',
            importantCautions: [],
            references: [],
            lastReviewed: new Date().toISOString().split('T')[0]
        };
        this.addMedication(emptyMed);
        this.setCurrentMedication(emptyMed.id);
        return emptyMed;
    }

    setValidationResults(id, issues) {
        this.validationResults.set(id, issues);
        this.triggerEvent('validationUpdated', { id, issues });
    }

    getAllValidationResults() {
        return this.validationResults;
    }

    // Simple Event System
    triggerEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    // Draft persistence
    saveDraft() {
        try {
            localStorage.setItem('ed-iv-meds-draft', JSON.stringify(this.medications));
        } catch(e) {
            console.warn("Could not save to localStorage", e);
        }
    }

    loadDraft() {
        try {
            const draft = localStorage.getItem('ed-iv-meds-draft');
            if (draft) {
                this.medications = JSON.parse(draft);
            }
        } catch(e) {
            console.warn("Could not load from localStorage", e);
        }
    }

    // Session persistence
    saveSessionState() {
        try {
            localStorage.setItem('ed_iv_meds_admin_workspace_state_v1', JSON.stringify(this.sessionState));
        } catch(e) {
            console.warn("Could not save session state", e);
        }
    }

    loadSessionState() {
        try {
            const state = localStorage.getItem('ed_iv_meds_admin_workspace_state_v1');
            if (state) {
                const parsed = JSON.parse(state);
                this.sessionState = { ...this.sessionState, ...parsed };
                // Ensure editorState exists if it was missing in old data
                if (!this.sessionState.editorState) {
                    this.sessionState.editorState = { expandedSections: [], selectedPrepTab: 0, scrollPosition: 0 };
                }
            }
        } catch(e) {
            console.warn("Could not load session state", e);
        }
    }

    updateSessionState(updates) {
        this.sessionState = { ...this.sessionState, ...updates };
        this.saveSessionState();
    }
}

// Global store instance
window.store = new Store();
