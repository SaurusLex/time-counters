// google-auth.js
// Google Authentication logic (GIS + gapi)

const CLIENT_ID = '998524962437-50rfr94nvutvqi6nk5v8b99ah2di0mtg.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
let tokenClient = null;
let gapiInited = false;
let gisInited = false;
let silentSignInAttempted = false;

// Centraliza la actualización de UI y backup info tras login/logout
function updateAuthUI(isSignedIn) {
    updateSigninStatus(isSignedIn);
    if (typeof window.renderDriveBackupInfo === 'function') {
        window.renderDriveBackupInfo();
    }
}

function trySilentSignInIfReady() {
    if (gapiInited && gisInited && tokenClient && !silentSignInAttempted) {
        silentSignInAttempted = true;
        // Si ya hay token, solo actualiza la UI, no pidas token ni muestres modal
        if (gapi.client.getToken()) {
            updateAuthUI(true);
            return;
        }
        tokenClient.callback = (resp) => {
            updateAuthUI(resp && !resp.error);
        };
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

export function gapiLoaded() {
  gapi.load('client', async () => {
    await gapi.client.init({
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
    });
    gapiInited = true;
    maybeEnableDriveButtons();
    trySilentSignInIfReady();
  });
}
window.gapiLoaded = gapiLoaded;

export function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: /* handleTokenResponse */() => {}, // Se asigna dinámicamente
    });
    gisInited = true;
}
window.gisLoaded = gisLoaded;

export function isSignedIn() {
    return !!(window.gapi && gapi.client && typeof gapi.client.getToken === 'function' && gapi.client.getToken());
}

export function handleAuthClick() {
    if (!tokenClient) return;
    tokenClient.callback = (resp) => {
        if (resp.error !== undefined) {
            window.showToast && window.showToast('Error autenticando con Google');
            updateAuthUI(false);
            return;
        }
        updateAuthUI(true);
    };
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

export function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        updateAuthUI(false);
    }
}

export function updateSigninStatus(isSignedIn) {
    document.getElementById('google-login-btn').style.display = isSignedIn ? 'none' : '';
    document.getElementById('drive-backup-btn').style.display = isSignedIn ? '' : 'none';
    document.getElementById('drive-restore-btn').style.display = isSignedIn ? '' : 'none';
    document.getElementById('google-signout-btn').style.display = isSignedIn ? '' : 'none';
    if (!isSignedIn) {
        document.getElementById('google-login-btn').textContent = 'Continuar con Google';
    }
}

export function trySilentSignIn() {
    if (!tokenClient) return;
    tokenClient.callback = (resp) => {
        updateAuthUI(resp && !resp.error);
    };
    //tokenClient.requestAccessToken({ prompt: '' });
}

export function initGoogleAuth() {
    window.gapiLoaded = gapiLoaded;
    window.gisLoaded = gisLoaded;
    // No se intenta login silencioso aquí, solo cuando ambos estén listos
    // Los scripts de Google en index.html llamarán a estas funciones
}

export function maybeEnableDriveButtons() {
    if (gapiInited && gisInited) {
        updateAuthUI(isSignedIn());
    }
}
