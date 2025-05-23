const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is running...');

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    processImage: async (imageData) => {
      console.log('Preload: processImage called with data length:', imageData?.length || 'unknown');
      
      try {
        
        const result = await ipcRenderer.invoke('process-image', imageData);
        console.log('Preload: Successfully received result from main process');
        return result;
      } catch (error) {
        console.error('Preload: Error calling main process:', error);
        throw error;
      }
    },
    
    isElectron: () => {
      return true;
    },
    
    getPlatform: () => {
      return process.platform;
    }
  });
  
  console.log('Preload script: electronAPI successfully exposed to renderer');
  
} catch (error) {
  console.error('Preload script error:', error);
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script: DOM content loaded');
});