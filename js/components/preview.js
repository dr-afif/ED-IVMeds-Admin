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

    render(med) {
        if (!this.container) return;
        
        const safe = med.safety || {};
        
        // Render exact HTML structure matching bedside app aesthetic
        this.container.innerHTML = `
            <div style="padding: 20px; font-family: -apple-system, sans-serif;">
                <h1 style="font-size: 24px; margin-bottom: 5px; font-weight: bold;">${med.name || 'Unnamed Medication'}</h1>
                <p style="color: #888; font-size: 14px; margin-bottom: 15px;">${med.category || 'No category'}</p>
                
                <!-- Safety Badges -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
                    ${safe.highAlert ? '<span style="background: #ffebe6; color: #de350b; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">High Alert</span>' : ''}
                    ${safe.requiresPump ? '<span style="background: #e6fcff; color: #00b8d9; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">Pump Required</span>' : ''}
                    ${safe.requiresCVL ? '<span style="background: #eae6ff; color: #5243aa; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">CVL Required</span>' : 
                                         '<span style="background: #e3fcef; color: #006644; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">Peripheral OK</span>'}
                </div>

                <!-- Indications -->
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Indications</h3>
                    <ul style="padding-left: 20px; margin: 0; font-size: 14px;">
                        ${(med.indications || []).map(ind => `<li>${ind}</li>`).join('') || '<li>None</li>'}
                    </ul>
                </div>

                <!-- Preparations -->
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Preparations</h3>
                    ${(med.preparations || []).map(prep => `
                        <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <strong style="color: #fff; font-size: 16px;">${prep.label || 'Unnamed Prep'}</strong>
                                ${prep.isDefault ? '<span style="background: #006644; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Default</span>' : ''}
                            </div>
                            <p style="color: #aaa; font-size: 14px; margin-bottom: 15px;">${prep.description || ''}</p>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                                <div>
                                    <div style="color: #666; font-size: 12px;">Diluent</div>
                                    <div style="color: #ddd; font-size: 14px;">${prep.diluentVolumeMl || 0}ml ${prep.diluent || 'Unknown'}</div>
                                </div>
                                <div>
                                    <div style="color: #666; font-size: 12px;">Final Conc.</div>
                                    <div style="color: #00b8d9; font-weight: bold; font-size: 14px;">${prep.concentration || 0} ${prep.concentrationUnit || 'mcg/ml'}</div>
                                </div>
                            </div>
                        </div>
                    `).join('') || '<p style="color: #888; font-size: 14px;">No preparations added.</p>'}
                </div>

                <!-- Administration -->
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Administration</h3>
                    <p style="color: #ccc; font-size: 14px; line-height: 1.5; margin-bottom: 10px;">
                        ${med.administrationGuidance || 'No guidance provided.'}
                    </p>
                    ${med.importantCautions && med.importantCautions.length > 0 ? `
                        <div style="background: #ffebe6; border-left: 4px solid #de350b; padding: 10px; border-radius: 0 4px 4px 0;">
                            <ul style="padding-left: 20px; margin: 0; font-size: 13px; color: #de350b;">
                                ${med.importantCautions.map(c => `<li>${c}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

window.preview = new Preview(window.store);
