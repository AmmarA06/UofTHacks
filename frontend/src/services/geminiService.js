import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Converts a File object to a base64 string
 * @param {File} file - The image file to convert
 * @returns {Promise<string>} Base64 encoded string
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      // Extract the base64 string (remove data URL prefix)
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    
    reader.onerror = (error) => reject(error);
    
    reader.readAsDataURL(file);
  });
}

/**
 * Analyzes a floor plan image and identifies shelves and containers
 * @param {File} imageFile - The floor plan image file
 * @returns {Promise<Array>} Array of identified shelves/containers with their properties
 */
export async function analyzeFloorPlan(imageFile) {
  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);
    
    // Get the mime type from the file
    const mimeType = imageFile.type || 'image/jpeg';

    // Prepare the image part for the API
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    // Create the prompt
    const prompt = `Analyze this floor plan image and identify ONLY shelving units and storage racks. Do NOT include doors, walls, windows, or other furniture.

For each shelf/rack found, return a JSON array where each object has:
- id: unique identifier (e.g., A1, A2, B1, B2, etc.)
- label: descriptive name of the shelf (e.g., "Storage Shelf A1", "Rack B2")
- normalizedPos: { x: 0-1, y: 0-1 } (center point of shelf relative to image dimensions, where 0,0 is top-left and 1,1 is bottom-right)
- scale: { w: 0-1, h: 0-1 } (dimensions of shelf relative to image dimensions - keep shelves reasonably sized, typically 0.05-0.15 for width/height)
- metadata: { item: "product name", productType: "cell_phone" or "water_bottle", count: 0 } (use cell_phone or water_bottle for productType, default count to 0)

CRITICAL RULES:
1. ONLY detect shelves, storage racks, and storage units
2. Shelves in the SAME ROW must have EQUAL SPACING between them - if you see 3 shelves in a row, they should be evenly distributed across the width
3. Shelves in the SAME ROW should have very similar Y-coordinates (normalizedPos.y should be nearly identical for shelves in the same horizontal row)
4. Ensure shelves are well-spaced and not overlapping
5. ALWAYS return an EVEN number of shelves (2, 4, 6, 8, etc.) - if you detect an odd number, either add one more or remove one to make it even
6. Double-check your coordinates - no shelf should be an extreme outlier from the others
7. Return ONLY the JSON array with no markdown formatting, no code blocks, no backticks, no explanations
8. Start directly with [ and end with ]`;

    // Generate content with the image and prompt
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean up the response text (remove any markdown code blocks if present)
    let cleanedText = text.trim();
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\s*/g, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');
    cleanedText = cleanedText.trim();

    // Parse the JSON response
    let parsedData = JSON.parse(cleanedText);

    // Validate that it's an array
    if (!Array.isArray(parsedData)) {
      throw new Error('Response is not an array');
    }

    // Validate the structure of each item
    parsedData.forEach((item, index) => {
      if (!item.id || !item.label || !item.normalizedPos || !item.scale || !item.metadata) {
        console.warn(`Item at index ${index} is missing required fields:`, item);
      }
    });

    // Validate and correct outlier positions
    parsedData = validateAndCorrectPositions(parsedData);

    // Ensure even number of shelves - if odd, remove the last one
    if (parsedData.length % 2 !== 0) {
      console.warn(`Odd number of shelves detected (${parsedData.length}). Removing last shelf to make it even.`);
      parsedData.pop();
    }

    return parsedData;

  } catch (error) {
    console.error('Error analyzing floor plan:', error);
    
    // Provide more specific error messages
    if (error.message.includes('API key')) {
      throw new Error('Invalid or missing Gemini API key. Please check your .env file.');
    } else if (error instanceof SyntaxError) {
      throw new Error('Failed to parse response from Gemini. The model did not return valid JSON.');
    } else {
      throw new Error(`Failed to analyze floor plan: ${error.message}`);
    }
  }
}

/**
 * Validates shelf positions and corrects extreme outliers
 * Groups shelves into rows and ensures even spacing
 * @param {Array} shelves - Array of shelf data
 * @returns {Array} Corrected shelf data
 */
function validateAndCorrectPositions(shelves) {
  if (shelves.length < 2) return shelves;

  // Calculate statistics for outlier detection
  const xPositions = shelves.map(s => s.normalizedPos.x);
  const yPositions = shelves.map(s => s.normalizedPos.y);
  
  const avgX = xPositions.reduce((a, b) => a + b, 0) / xPositions.length;
  const avgY = yPositions.reduce((a, b) => a + b, 0) / yPositions.length;
  
  // Calculate standard deviation
  const stdX = Math.sqrt(xPositions.reduce((sq, n) => sq + Math.pow(n - avgX, 2), 0) / xPositions.length);
  const stdY = Math.sqrt(yPositions.reduce((sq, n) => sq + Math.pow(n - avgY, 2), 0) / yPositions.length);
  
  // Threshold: 2.5 standard deviations (outlier detection)
  const outlierThreshold = 2.5;
  
  // Group shelves by rows (similar Y coordinates)
  const rows = [];
  shelves.forEach(shelf => {
    const existingRow = rows.find(row => 
      Math.abs(row[0].normalizedPos.y - shelf.normalizedPos.y) < 0.1 // Within 10% Y difference
    );
    
    if (existingRow) {
      existingRow.push(shelf);
    } else {
      rows.push([shelf]);
    }
  });
  
  // Correct outliers and normalize spacing within rows
  const correctedShelves = [];
  
  rows.forEach(row => {
    // Sort shelves in row by X position
    row.sort((a, b) => a.normalizedPos.x - b.normalizedPos.x);
    
    // Check for outliers in this row
    row.forEach((shelf, idx) => {
      let correctedShelf = { ...shelf };
      
      // Check X outlier
      if (Math.abs(shelf.normalizedPos.x - avgX) > stdX * outlierThreshold) {
        console.warn(`Outlier detected for shelf ${shelf.id} at X=${shelf.normalizedPos.x.toFixed(2)}. Adjusting...`);
        // Interpolate position based on row position
        const targetX = 0.2 + (idx / (row.length - 1 || 1)) * 0.6; // Spread between 0.2 and 0.8
        correctedShelf.normalizedPos.x = targetX;
      }
      
      // Check Y outlier
      if (Math.abs(shelf.normalizedPos.y - avgY) > stdY * outlierThreshold) {
        console.warn(`Outlier detected for shelf ${shelf.id} at Y=${shelf.normalizedPos.y.toFixed(2)}. Adjusting to average.`);
        correctedShelf.normalizedPos.y = avgY;
      }
      
      // Ensure positions are within valid range
      correctedShelf.normalizedPos.x = Math.max(0.1, Math.min(0.9, correctedShelf.normalizedPos.x));
      correctedShelf.normalizedPos.y = Math.max(0.1, Math.min(0.9, correctedShelf.normalizedPos.y));
      
      correctedShelves.push(correctedShelf);
    });
  });
  
  console.log(`Validated ${shelves.length} shelves across ${rows.length} row(s)`);
  
  return correctedShelves;
}

/**
 * Test function to verify API connection
 * @returns {Promise<boolean>} True if API is working
 */
export async function testConnection() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hello');
    const response = await result.response;
    return !!response.text();
  } catch (error) {
    console.error('Gemini API connection test failed:', error);
    return false;
  }
}
