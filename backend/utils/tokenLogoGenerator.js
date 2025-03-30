const fs = require('fs');
const path = require('path');

/**
 * Creates a simple HTML/CSS-based logo for a token and saves it as an HTML file
 * @param {string} tokenSymbol - The token symbol (e.g., "KASPY")
 * @returns {Promise<string>} The path to the generated logo file
 */
async function generateTokenLogo(tokenSymbol) {
  try {
    // Create the public directory if it doesn't exist
    const publicDir = path.join(__dirname, '../../frontend/public/tokens');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Generate a color based on the token symbol
    const color = getColorFromSymbol(tokenSymbol);
    
    // Create an HTML file with inline CSS for the logo
    const logoHtml = `
      <div style="width: 64px; height: 64px; border-radius: 50%; background-color: ${color}; display: flex; justify-content: center; align-items: center; font-family: Arial, sans-serif; font-weight: bold; color: white; font-size: 24px;">
        ${tokenSymbol.charAt(0).toUpperCase()}
      </div>
    `;
    
    // Create the file path
    const filePath = path.join(publicDir, `${tokenSymbol.toLowerCase()}.html`);
    const relativePath = `/public/tokens/${tokenSymbol.toLowerCase()}.html`;
    
    // Write the HTML to file
    fs.writeFileSync(filePath, logoHtml);
    
    console.log(`Generated HTML logo for ${tokenSymbol} at ${filePath}`);
    return relativePath;
  } catch (error) {
    console.error(`Error generating logo for ${tokenSymbol}:`, error);
    return null;
  }
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
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
}

module.exports = { generateTokenLogo };
