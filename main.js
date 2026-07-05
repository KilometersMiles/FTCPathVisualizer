const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { execFile } = require('child_process');
const path = require('path');
const Store = require('electron-store').default;

const store = new Store();

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'build', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'build', 'index.html'));
  } else {
    win.loadURL('http://localhost:3000');
  }
}

ipcMain.handle('run-optimizer', async (event, payload) => {
  return new Promise((resolve, reject) => {
    const { waypoints = [], obstacles = [], attributes = [], boundary = {} } = payload || {};

    let pythonProcess;

    if (app.isPackaged) {
      const exePath = path.join(process.resourcesPath, 'backend', 'optim', 'optim.exe');
      pythonProcess = execFile(exePath);
    } else {
      pythonProcess = spawn('python', ['python/optim.py']);
    }

    pythonProcess.stdin.write(JSON.stringify({ waypoints, obstacles, attributes, boundary }));
    pythonProcess.stdin.end();

    let result = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Python Stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(result));
        } catch (e) {
          reject(`Failed to parse Python output: ${result}`);
        }
      } else {
        reject(`Python exited with code ${code}. Error: ${errorOutput}`);
      }
    });
    pythonProcess.stderr.on('data', (data) => {
      console.error(`PYTHON ERROR: ${data.toString()}`);
    });
  });
});

ipcMain.on('store-set', (event, { key, value }) => {
  store.set(key, value);
});

ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

app.whenReady().then(() => {
  createWindow()
})


