// google-drive.js
// Google Drive backup/restore logic (requires authentication from google-auth.js)

export async function backupToDrive() {
    if (!window.gapi || !gapi.client.getToken()) {
        window.showToast && window.showToast('Debes iniciar sesión con Google primero.');
        return;
    }
    setButtonLoading('drive-backup-btn', true, 'Guardando...');
    const data = localStorage.getItem('counters') || '[]';
    const fileContent = new Blob([data], { type: 'application/json' });
    const metadata = {
        name: 'time-counters-backup.json',
        mimeType: 'application/json'
    };
    let filesResponse = await gapi.client.drive.files.list({
        q: "name='time-counters-backup.json' and trashed=false",
        fields: 'files(id,name)'
    });
    const files = filesResponse.result.files;
    let form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', fileContent);
    if (files && files.length > 0) {
        const fileId = files[0].id;
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + gapi.client.getToken().access_token },
            body: form
        });
        setButtonLoading('drive-backup-btn', false);
        setLastDriveBackupTime(new Date());
        renderDriveBackupInfo();
        window.showToast && window.showToast('Backup actualizado en Google Drive');
    } else {
        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + gapi.client.getToken().access_token },
            body: form
        });
        setButtonLoading('drive-backup-btn', false);
        setLastDriveBackupTime(new Date());
        renderDriveBackupInfo();
        window.showToast && window.showToast('Backup guardado en Google Drive');
    }
}

export async function restoreFromDrive() {
    if (!window.gapi || !gapi.client.getToken()) {
        window.showToast && window.showToast('Debes iniciar sesión con Google primero.');
        return;
    }
    setButtonLoading('drive-restore-btn', true, 'Restaurando...');
    let filesResponse = await gapi.client.drive.files.list({
        q: "name='time-counters-backup.json' and trashed=false",
        fields: 'files(id,name)'
    });
    const files = filesResponse.result.files;
    if (files && files.length > 0) {
        const fileId = files[0].id;
        const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }
        });
        const data = await resp.text();
        localStorage.setItem('counters', data);
        window.renderCounters && window.renderCounters();
        setButtonLoading('drive-restore-btn', false);
        window.showToast && window.showToast('Datos restaurados desde Google Drive');
    } else {
        setButtonLoading('drive-restore-btn', false);
        window.showToast && window.showToast('No se encontró backup en Google Drive');
    }
}

export async function deleteDriveBackup() {
    if (!window.gapi || !gapi.client.getToken()) {
        window.showToast && window.showToast('You must sign in with Google first.');
        return;
    }
    setButtonLoading('drive-delete-btn', true, 'Deleting...');
    try {
        let filesResponse = await gapi.client.drive.files.list({
            q: "name='time-counters-backup.json' and trashed=false",
            fields: 'files(id,name)'
        });
        const files = filesResponse.result.files;
        if (files && files.length > 0) {
            const fileId = files[0].id;
            await gapi.client.drive.files.delete({ fileId });
            setButtonLoading('drive-delete-btn', false);
            setLastDriveBackupTime('');
            renderDriveBackupInfo();
            window.showToast && window.showToast('Backup deleted from Google Drive');
        } else {
            setButtonLoading('drive-delete-btn', false);
            window.showToast && window.showToast('No backup found in Google Drive');
        }
    } catch (e) {
        setButtonLoading('drive-delete-btn', false);
        window.showToast && window.showToast('Could not delete backup from Drive.');
    }
}

export function getLastDriveBackupTime() {
    return localStorage.getItem('lastDriveBackupTime');
}
export function setLastDriveBackupTime(date) {
    localStorage.setItem('lastDriveBackupTime', date.toISOString());
}

export async function renderDriveBackupInfo() {
    const infoDiv = document.getElementById('drive-backup-info');
    if (!infoDiv) return;
    if (!(window.gapi && gapi.client && typeof gapi.client.getToken === 'function' && gapi.client.getToken())) {
        infoDiv.textContent = '';
        return;
    }
    // Buscar el archivo en Drive
    try {
        let filesResponse = await gapi.client.drive.files.list({
            q: "name='time-counters-backup.json' and trashed=false",
            fields: 'files(id, name, modifiedTime)'
        });
        const files = filesResponse.result.files;
        if (files && files.length > 0) {
            // Hay backup, mostrar fecha de modificación
            const file = files[0];
            const lastDate = new Date(file.modifiedTime);
            const now = new Date();
            const diffMs = now - lastDate;
            const diffMins = Math.floor(diffMs / 60000);
            let ago = '';
            if (diffMins < 1) ago = 'hace menos de un minuto';
            else if (diffMins < 60) ago = `hace ${diffMins} min`;
            else if (diffMins < 1440) ago = `hace ${Math.floor(diffMins/60)} h`;
            else ago = `hace ${Math.floor(diffMins/1440)} días`;
            infoDiv.textContent = `Última copia en Drive: ${lastDate.toLocaleString()} (${ago})`;
            // Guardar fecha en localStorage para coherencia con backup/restore
            setLastDriveBackupTime(lastDate);
        } else {
            infoDiv.textContent = 'No hay ninguna copia de seguridad en Google Drive.';
            localStorage.removeItem('lastDriveBackupTime');
        }
    } catch (e) {
        infoDiv.textContent = 'No se pudo comprobar el estado de la copia en Drive.';
    }
}

// Utilidades auxiliares (pueden estar en index.js, pero se usan aquí)
function setButtonLoading(btnId, isLoading, loadingText) {
    const btn = document.getElementById(btnId);
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
    } else {
        btn.disabled = false;
        if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
}
