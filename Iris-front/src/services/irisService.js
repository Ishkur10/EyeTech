
const processImageWeb = async (imageData) => {
  console.log('irisService: Processing image in Web mode');
  
  try {

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    const endpoint = `${API_BASE_URL}/api/process-base64`;
    
    console.log('irisService: Making HTTP request to:', endpoint);
    
    const requestBody = {
      imageData: imageData
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('irisService: HTTP response status:', response.status);
    
    if (!response.ok) {

      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        console.warn('Could not parse error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('irisService: Successfully received result from web API:', result);
    
    if (!result || typeof result.pupilCenterX === 'undefined') {
      throw new Error('Invalid response format from server');
    }
    
    return result;
    
  } catch (error) {
    console.error("irisService: Error in web mode:", error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Could not connect to the server. Make sure the Java backend is running on http://localhost:8080');
    } else if (error.name === 'SyntaxError') {
      throw new Error('Server returned invalid data. Check the server logs for errors.');
    } else {
      throw error;
    }
  }
};

const processImageElectron = async (imageData) => {
  console.log('irisService: Processing image in Electron mode');
  
  try {
    // Check if the Electron API is available (exposed by our preload script)
    if (window.electronAPI && window.electronAPI.processImage) {
      console.log('irisService: electronAPI is available, calling processImage...');
      
      // Call the processImage function that was exposed by the preload script
      // This will communicate with the main Electron process, which will run the Java application
      const result = await window.electronAPI.processImage(imageData);
      
      console.log('irisService: Successfully received result:', result);
      return result;
      
    } else {
      // This error occurs when the preload script didn't load properly
      // or when the contextBridge API wasn't set up correctly
      const errorMsg = 'Electron API not available. Make sure the preload script loaded correctly.';
      console.error('irisService:', errorMsg);
      console.log('Available window properties:', Object.keys(window));
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error("irisService: Error in Electron mode:", error);
    throw error;
  }
};

// Helper function to detect if we're running in Electron or a regular web browser
const isElectron = () => {
  // Method 1: Check if electronAPI is available (most reliable for our setup)
  if (window.electronAPI) {
    return true;
  }
  
  // Method 2: Check user agent (backup method)
  return navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
};

// Main export: automatically chooses the right processing method based on environment
export const processImage = async (imageData) => {
  console.log('irisService: processImage called, detecting environment...');
  
  const electronMode = isElectron();
  console.log('irisService: Running in Electron mode:', electronMode);
  
  if (electronMode) {
    return processImageElectron(imageData);
  } else {
    return processImageWeb(imageData);
  }
};

// Additional exports for testing and debugging
export const isElectronApp = isElectron;
export const processImageElectronDirect = processImageElectron;
export const processImageWebDirect = processImageWeb;