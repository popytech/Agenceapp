const { app, BrowserWindow, shell, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Charge le .env.local embarqué dans les ressources (mode packagé)
function loadEnvFile() {
  const envPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', '.env.local')
    : path.join(__dirname, '..', '.env.local');

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile();

const PORT = 3000;
let mainWindow = null;
let nextProcess = null;

// Vérifie si le serveur Next.js est prêt
function waitForServer(url, retries = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 308) {
          resolve();
        } else {
          retry(remaining);
        }
      }).on('error', () => retry(remaining));
    };

    const retry = (remaining) => {
      if (remaining <= 0) {
        reject(new Error('Le serveur Next.js n\'a pas démarré.'));
        return;
      }
      setTimeout(() => check(remaining - 1), delay);
    };

    check(retries);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ERP Popytech',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#0f172a',
  });

  // Ouvrir les liens externes dans le navigateur système
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    // En production (packagé), utiliser next start
    // En dev, utiliser next dev
    const isPackaged = app.isPackaged;
    const appPath = isPackaged
      ? path.join(process.resourcesPath, 'app')
      : path.join(__dirname, '..');

    const npmCmd = process.platform === 'win32' ? 'node.exe' : 'node';
    const nextBin = path.join(appPath, 'node_modules', '.bin', 'next');

    const env = {
      ...process.env,
      NODE_ENV: isPackaged ? 'production' : 'development',
      PORT: String(PORT),
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    };

    const cmd = isPackaged ? nextBin : nextBin;
    const args = isPackaged ? ['start', '--port', String(PORT)] : ['dev', '--port', String(PORT)];

    nextProcess = spawn(cmd, args, {
      cwd: appPath,
      env,
      shell: true,
    });

    nextProcess.stdout.on('data', (data) => {
      console.log(`[Next.js] ${data}`);
    });

    nextProcess.stderr.on('data', (data) => {
      console.error(`[Next.js ERR] ${data}`);
    });

    nextProcess.on('error', (err) => {
      console.error('Erreur démarrage Next.js:', err);
      reject(err);
    });

    resolve();
  });
}

app.whenReady().then(async () => {
  // Affiche une fenêtre de chargement immédiatement
  mainWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: false },
    icon: path.join(__dirname, 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  mainWindow.show();

  try {
    await startNextServer();
    await waitForServer(`http://localhost:${PORT}`, 60, 1000);

    // Ferme la fenêtre de chargement et ouvre la vraie fenêtre
    mainWindow.close();
    createWindow();
  } catch (err) {
    dialog.showErrorBox('Erreur de démarrage', `Impossible de démarrer l'ERP.\n\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
