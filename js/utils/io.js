/**
 * Input / Output Operations
 */

class IOHandler {
    constructor(store) {
        this.store = store;
        
        // Setup Import Listener
        const fileImport = document.getElementById('file-import');
        if (fileImport) {
            fileImport.addEventListener('change', (e) => this.importDatabase(e));
        }

        // Setup Export All Listener
        const btnExportAll = document.getElementById('btn-export-all');
        if (btnExportAll) {
            btnExportAll.addEventListener('click', () => this.exportDatabase());
        }

        // Setup Folder Import (Build Database)
        const folderImport = document.getElementById('folder-import');
        if (folderImport) {
            folderImport.addEventListener('change', (e) => this.buildCombinedDatabase(e));
        }
        const btnBuildDb = document.getElementById('btn-build-db');
        if (btnBuildDb) {
            btnBuildDb.addEventListener('click', () => {
                if (folderImport) folderImport.click();
            });
        }
    }

    importDatabase(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    this.store.setMedications(data);
                    
                    const elLastImport = document.getElementById('stat-last-import');
                    if (elLastImport) elLastImport.textContent = new Date().toLocaleTimeString();
                    
                    alert(`Successfully imported ${data.length} medications.`);
                } else if (data && typeof data === 'object' && data.id) {
                    // Handle single medication
                    const existingIdx = this.store.medications.findIndex(m => m.id === data.id);
                    if (existingIdx !== -1) {
                        this.store.updateMedication(data.id, data);
                        alert(`Successfully updated medication: ${data.name || data.id}`);
                    } else {
                        this.store.addMedication(data);
                        alert(`Successfully added new medication: ${data.name || data.id}`);
                    }
                    // Auto-select the imported medication if we're in workspace view
                    if (window.app && window.app.currentView === 'workspace') {
                        window.app.editMedication(data.id);
                    }
                } else {
                    alert('Invalid file format. Expected an array of medications or a single medication object with an id.');
                }
            } catch (err) {
                console.error("Error parsing JSON:", err);
                alert('Error parsing JSON file.');
            }
            // Reset input
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    exportDatabase() {
        const data = this.store.medications;
        if (data.length === 0) {
            alert("No medications to export.");
            return;
        }

        // Ensure clean export without extra internal fields if necessary
        const jsonString = JSON.stringify(data, null, 2);
        this.downloadFile('drugs.json', jsonString);
    }

    exportCurrentMedication() {
        const med = this.store.currentMedication;
        if (!med) {
            alert("No medication selected to export.");
            return;
        }

        const fileName = `${med.id || 'unknown'}.json`;
        const jsonString = JSON.stringify(med, null, 2);
        this.downloadFile(fileName, jsonString);
    }

    exportIndividualFiles() {
        const data = this.store.medications;
        if (data.length === 0) {
            alert("No medications to export.");
            return;
        }

        // Just doing a simple approach for MVP: triggering multiple downloads.
        // Modern browsers may ask for permission.
        data.forEach(med => {
            const fileName = `${med.id || 'unknown'}.json`;
            const jsonString = JSON.stringify(med, null, 2);
            this.downloadFile(fileName, jsonString);
        });
    }

    buildCombinedDatabase(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const medications = [];
        let filesProcessed = 0;
        let expectedFiles = 0;

        // Count JSON files
        for (let i = 0; i < files.length; i++) {
            if (files[i].name.endsWith('.json')) expectedFiles++;
        }

        if (expectedFiles === 0) {
            alert("No JSON files found in the selected folder.");
            return;
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.name.endsWith('.json')) continue;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    // It could be a single med object or array. Assume one-medication-per-file architecture.
                    if (!Array.isArray(data)) {
                        medications.push(data);
                    }
                } catch (err) {
                    console.error(`Error parsing ${file.name}:`, err);
                }

                filesProcessed++;
                if (filesProcessed === expectedFiles) {
                    this.store.setMedications(medications);
                    alert(`Built database from ${medications.length} files.`);
                    this.exportDatabase(); // Automatically trigger export of combined
                }
            };
            reader.readAsText(file);
        }
        event.target.value = ''; // Reset
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

window.io = new IOHandler(window.store);
