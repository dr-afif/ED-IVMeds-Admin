/**
 * GitHub Sync Utility
 * Handles publishing data updates via GitHub Pull Requests
 */

class GitHubSync {
    constructor() {
        this.repo = 'dr-afif/ED-IVMeds-Admin';
        this.baseBranch = 'main';
        this.apiUrl = `https://api.github.com/repos/${this.repo}`;
        
        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('btn-github-sync');
            if (btn) {
                btn.addEventListener('click', () => this.handleSync());
            }
        });
    }

    async handleSync() {
        const tokenInput = document.getElementById('github-token');
        const statusEl = document.getElementById('github-sync-status');
        
        if (!tokenInput || !tokenInput.value.trim()) {
            alert('Please provide a GitHub Personal Access Token.');
            return;
        }

        const token = tokenInput.value.trim();
        
        try {
            // 1. Validate Medications
            statusEl.textContent = 'Validating medications...';
            const meds = window.store.medications;
            
            if (!meds || meds.length === 0) {
                throw new Error('No medications found to sync.');
            }
            
            if (window.validator) {
                window.validator.validateAll(meds);
            }
            
            let hasErrors = false;
            let errorCount = 0;
            window.store.validationResults.forEach(issues => {
                const errors = issues.filter(i => i.type === 'error');
                if (errors.length > 0) {
                    hasErrors = true;
                    errorCount += errors.length;
                }
            });

            if (hasErrors) {
                if (window.app) window.app.navigate('validation');
                throw new Error(`Validation failed with ${errorCount} errors. Please fix them before syncing.`);
            }

            // 2. Build Payloads
            statusEl.textContent = 'Building payloads...';
            const filesToCommit = [];
            
            // a) Individual medication files
            meds.forEach(med => {
                const id = med.id || 'unknown';
                filesToCommit.push({
                    path: `data/drugs/${id}.json`,
                    mode: '100644',
                    type: 'blob',
                    content: JSON.stringify(med, null, 2)
                });
            });

            // b) Combined drugs.json
            filesToCommit.push({
                path: 'data/drugs.json',
                mode: '100644',
                type: 'blob',
                content: JSON.stringify(meds, null, 2)
            });

            // c) Database metadata
            const meta = {
                lastUpdated: new Date().toISOString(),
                medicationCount: meds.length,
                version: '1.0'
            };
            filesToCommit.push({
                path: 'data/database-meta.json',
                mode: '100644',
                type: 'blob',
                content: JSON.stringify(meta, null, 2)
            });

            // Set up common headers for GitHub API
            const headers = {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json'
            };

            // 3. GitHub Flow
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            const branchName = `data-update/${timestamp}`;

            // Step 3a: Get latest commit SHA of base branch
            statusEl.textContent = 'Fetching base branch...';
            const refRes = await fetch(`${this.apiUrl}/git/refs/heads/${this.baseBranch}`, { headers });
            if (!refRes.ok) throw new Error(`Failed to fetch base branch: ${refRes.statusText}`);
            const refData = await refRes.json();
            const latestCommitSha = refData.object.sha;

            // Step 3b: Get the tree SHA of that commit
            const commitRes = await fetch(`${this.apiUrl}/git/commits/${latestCommitSha}`, { headers });
            if (!commitRes.ok) throw new Error(`Failed to fetch commit: ${commitRes.statusText}`);
            const commitData = await commitRes.json();
            const baseTreeSha = commitData.tree.sha;

            // Step 3c: Create a new tree
            statusEl.textContent = 'Creating Git tree...';
            const treeRes = await fetch(`${this.apiUrl}/git/trees`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    base_tree: baseTreeSha,
                    tree: filesToCommit
                })
            });
            if (!treeRes.ok) throw new Error(`Failed to create tree: ${treeRes.statusText}`);
            const treeData = await treeRes.json();
            const newTreeSha = treeData.sha;

            // Step 3d: Create a commit
            statusEl.textContent = 'Creating commit...';
            const newCommitRes = await fetch(`${this.apiUrl}/git/commits`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message: `Data update: ${timestamp}`,
                    tree: newTreeSha,
                    parents: [latestCommitSha]
                })
            });
            if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${newCommitRes.statusText}`);
            const newCommitData = await newCommitRes.json();
            const newCommitSha = newCommitData.sha;

            // Step 3e: Create new branch reference
            statusEl.textContent = 'Creating new branch...';
            const newRefRes = await fetch(`${this.apiUrl}/git/refs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    ref: `refs/heads/${branchName}`,
                    sha: newCommitSha
                })
            });
            if (!newRefRes.ok) throw new Error(`Failed to create branch: ${newRefRes.statusText}`);

            // Step 3f: Create Pull Request
            statusEl.textContent = 'Opening Pull Request...';
            const prRes = await fetch(`${this.apiUrl}/pulls`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: `Data Update ${timestamp}`,
                    head: branchName,
                    base: this.baseBranch,
                    body: `Automated data update from ED-IVMeds-Admin app.\n\nChanges included:\n- ${filesToCommit.length} files updated.\n- Medications validated successfully.`
                })
            });
            if (!prRes.ok) throw new Error(`Failed to create Pull Request: ${prRes.statusText}`);
            const prData = await prRes.json();

            // Success
            statusEl.innerHTML = `<span style="color: var(--status-success);"><i data-lucide="check-circle" style="width: 14px; height: 14px; vertical-align: middle;"></i> PR Created: <a href="${prData.html_url}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">View Pull Request</a></span>`;
            
            if (window.lucide) window.lucide.createIcons();

        } catch (error) {
            console.error('GitHub Sync Error:', error); // Token is not in the error object natively, safe to log error message.
            statusEl.innerHTML = `<span style="color: var(--status-error);"><i data-lucide="x-circle" style="width: 14px; height: 14px; vertical-align: middle;"></i> Error: ${error.message}</span>`;
            if (window.lucide) window.lucide.createIcons();
            alert(`Sync Failed: ${error.message}`);
        }
    }
}

// Initialize and attach to window
window.githubSync = new GitHubSync();
