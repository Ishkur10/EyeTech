const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const fs = require('fs');


let mainWindow;


function createWindow() {
  console.log('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {

      contextIsolation: true,
      
      nodeIntegration: false,
      
      preload: path.join(__dirname, 'preload.js'),
      
      webSecurity: !isDev
    }
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;

  console.log('Loading URL:', startUrl);
  
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
    console.log('Development mode: DevTools opened');
  }

  mainWindow.on('closed', () => {
    console.log('Main window closed');
    mainWindow = null;
  });

  console.log('Main window created successfully');

}


ipcMain.handle('process-image', async (event, imageData) => {
  console.log('=== Image Processing Request Started ===');
  console.log('Received image processing request in main process');
  console.log('Image data type:', typeof imageData);
  console.log('Image data length:', imageData ? imageData.length : 'undefined');
  
  return new Promise((resolve, reject) => {

    const jarPath = isDev
      ? path.join(__dirname, '../../java-backend/netBeans/target/prueba_electron-1.0.0-cli.jar')
      : path.join(process.resourcesPath, 'app/java-backend/prueba_electron-1.0.0-cli.jar');

    console.log('Looking for JAR file at:', jarPath);

    if (!fs.existsSync(jarPath)) {
      const errorMsg = `JAR file not found at: ${jarPath}`;
      console.error('❌ ERROR:', errorMsg);
      
      const alternativePaths = [
        path.join(__dirname, '../../java-backend/netBeans/target/prueba_electron-1.0.0.jar'),
        path.join(__dirname, '../../java-backend/target/prueba_electron-1.0.0-cli.jar'),
        path.join(__dirname, '../backend/target/prueba_electron-1.0.0-cli.jar')
      ];
      
      console.log('Checked alternative paths:');
      alternativePaths.forEach(altPath => {
        const exists = fs.existsSync(altPath);
        console.log(`  ${exists ? '✅' : '❌'} ${altPath}`);
      });
      
      reject(new Error(errorMsg));
      return;
    }

    console.log('✅ JAR file found, spawning Java process...');

   const javaArgs = [
      '-jar', 
      jarPath
    ];
    
    console.log('Java command:', 'java', javaArgs.join(' '));

    const javaProcess = spawn('java', javaArgs, {
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });

    javaProcess.stdin.write(imageData);
    javaProcess.stdin.end();
    
    let stdout = ''; 
    let stderr = '';  
    

    javaProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Java stdout chunk:', output.substring(0, 200) + (output.length > 200 ? '...' : ''));
      stdout += output;
    });
    

    javaProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error('Java stderr:', errorOutput);
      stderr += errorOutput;
    });
    

    javaProcess.on('close', (exitCode) => {
      console.log(`Java process completed with exit code: ${exitCode}`);
      console.log('Total stdout length:', stdout.length);
      
      if (exitCode === 0) {

        try {
          const trimmedOutput = stdout.trim();
          console.log('Parsing Java output:', trimmedOutput.substring(0, 200) + (trimmedOutput.length > 200 ? '...' : ''));
          
          const result = JSON.parse(trimmedOutput);
          
          console.log('✅ Successfully parsed Java result:');
          console.log('  Pupil: center(' + result.pupilCenterX + ',' + result.pupilCenterY + ') radius=' + result.pupilRadius);
          console.log('  Iris: center(' + result.irisCenterX + ',' + result.irisCenterY + ') radius=' + result.irisRadius);
          console.log('=== Image Processing Request Completed Successfully ===');
          
          resolve(result);
          
        } catch (parseError) {
          const errorMsg = `Failed to parse Java output as JSON: ${parseError.message}`;
          console.error('❌ Parse Error:', errorMsg);
          console.error('Raw Java output:', stdout);
          console.log('=== Image Processing Request Failed (Parse Error) ===');
          reject(new Error(errorMsg));
        }
      } else {

        const errorMsg = `Java process failed with exit code ${exitCode}`;
        console.error('❌ Java Process Error:', errorMsg);
        if (stderr) console.error('Java stderr:', stderr);
        if (stdout) console.error('Java stdout:', stdout);
        console.log('=== Image Processing Request Failed (Java Error) ===');
        reject(new Error(`${errorMsg}. Error output: ${stderr}. Standard output: ${stdout}`));
      }
    });
    

    javaProcess.on('error', (spawnError) => {
      const errorMsg = `Failed to start Java process: ${spawnError.message}`;
      console.error('❌ Spawn Error:', errorMsg);
      console.error('This usually means Java is not installed or not in the system PATH');
      console.log('=== Image Processing Request Failed (Spawn Error) ===');
      reject(new Error(errorMsg));
    });


    setTimeout(() => {
      if (!javaProcess.killed) {
        console.log('⚠️ Java process timeout, killing process...');
        javaProcess.kill();
        reject(new Error('Java process timed out after 30 seconds'));
      }
    }, 30000);
  });
});


app.on('ready', () => {
  console.log('Electron app is ready, creating main window...');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    console.log('Quitting application');
    app.quit();
  }
});


app.on('activate', () => {
  console.log('App activated');
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('Application is about to quit');
});