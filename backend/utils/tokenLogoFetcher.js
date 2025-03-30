const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

/**
 * Fetches token logo from kas.fyi and saves it locally
 * @param {string} tokenSymbol - The token symbol/ticker (e.g., "KASPY")
 * @returns {Promise<string>} The local path or URL to the logo
 */
async function fetchTokenLogo(tokenSymbol) {
  try {
    // Set up directories
    const logoDir = path.join(__dirname, '../../frontend/public/tokens');
    if (!fs.existsSync(logoDir)) {
      fs.mkdirSync(logoDir, { recursive: true });
    }

    const localPath = path.join(logoDir, `${tokenSymbol.toLowerCase()}.png`);
    const relativePath = `/public/tokens/${tokenSymbol.toLowerCase()}.png`;
    
    // Try to fetch using tokenkaspa.com API
    try {
      console.log(`Trying to fetch logo for ${tokenSymbol} from tokenkaspa.com`);
      const logoUrl = `https://tokenkaspa.com/tokens/${tokenSymbol.toLowerCase()}.png`;
      const response = await axios.get(logoUrl, { 
        responseType: 'arraybuffer',
        validateStatus: status => status === 200 // Only accept 200 responses
      });
      
      // Save the image
      fs.writeFileSync(localPath, Buffer.from(response.data));
      console.log(`Successfully saved logo for ${tokenSymbol}`);
      return relativePath;
    } catch (error) {
      console.log(`Failed to fetch from tokenkaspa.com: ${error.message}`);
      // Continue to next approach
    }
    
    // Try to fetch from Kaspa explorer
    try {
      console.log(`Trying to fetch logo for ${tokenSymbol} from explorer.kaspa.org`);
      const logoUrl = `https://explorer.kaspa.org/token/icon/${tokenSymbol.toLowerCase()}`;
      const response = await axios.get(logoUrl, { 
        responseType: 'arraybuffer',
        validateStatus: status => status === 200 // Only accept 200 responses
      });
      
      // Save the image
      fs.writeFileSync(localPath, Buffer.from(response.data));
      console.log(`Successfully saved logo for ${tokenSymbol}`);
      return relativePath;
    } catch (error) {
      console.log(`Failed to fetch from explorer.kaspa.org: ${error.message}`);
      // Continue to generate fallback
    }
    
    // Generate a fallback image if all fetches fail
    console.log(`Generating fallback logo for ${tokenSymbol}`);
    generateFallbackLogo(tokenSymbol, localPath);
    return relativePath;
  } catch (error) {
    console.error(`Error in token logo fetching for ${tokenSymbol}:`, error);
    return null;
  }
}

/**
 * Generates a simple colored circle with the token's first letter
 * @param {string} symbol - Token symbol
 * @param {string} outputPath - Path to save the generated image
 */
function generateFallbackLogo(symbol, outputPath) {
  // Create a 200x200 canvas
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  
  // Generate a color based on the symbol (simple hash function)
  const color = getColorFromSymbol(symbol);
  
  // Draw a filled circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(100, 100, 90, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw the first letter of the symbol
  const letter = symbol.charAt(0).toUpperCase();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 120px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 100, 100);
  
  // Save the image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

/**
 * Generate a color based on a string
 * @param {string} str - Input string
 * @returns {string} - Hex color code
 */
function getColorFromSymbol(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate vibrant colors by setting high saturation and limiting to the hue
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 80%, 50%)`;
}

module.exports = { fetchTokenLogo };
