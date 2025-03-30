const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetches token logo from kas.fyi website
 * @param {string} tokenSymbol - The token symbol/ticker (e.g., "HORSE")
 * @returns {Promise<string|null>} The logo URL if found, or null
 */
async function fetchTokenLogo(tokenSymbol) {
  try {
    console.log(`Fetching logo for token: ${tokenSymbol}`);
    
    // First, try direct URL to the logo based on common patterns
    const directUrl = `https://krc20-assets.kas.fyi/icons/${tokenSymbol.toUpperCase()}.jpg`;
    console.log(`Trying direct URL: ${directUrl}`);
    
    try {
      const directResponse = await axios.head(directUrl);
      if (directResponse.status === 200) {
        console.log(`Logo found directly at: ${directUrl}`);
        return directUrl;
      }
    } catch (error) {
      console.log(`Direct URL not available: ${error.message}`);
    }
    
    // Next, try PNG format
    const pngUrl = `https://krc20-assets.kas.fyi/icons/${tokenSymbol.toUpperCase()}.png`;
    console.log(`Trying PNG URL: ${pngUrl}`);
    
    try {
      const pngResponse = await axios.head(pngUrl);
      if (pngResponse.status === 200) {
        console.log(`Logo found at PNG URL: ${pngUrl}`);
        return pngUrl;
      }
    } catch (error) {
      console.log(`PNG URL not available: ${error.message}`);
    }
    
    // If direct URLs don't work, try to access the token page on kas.fyi
    const tokenUrl = `https://kas.fyi/token/krc20/${tokenSymbol.toUpperCase()}`;
    console.log(`Fetching token page: ${tokenUrl}`);
    
    const response = await axios.get(tokenUrl);
    
    if (response.status === 200) {
      // Parse the HTML
      const $ = cheerio.load(response.data);
      
      // Look for the symbol-label element with background-image style
      const symbolLabel = $('.symbol-label');
      
      if (symbolLabel.length > 0) {
        // Extract the background-image URL from the style attribute
        const style = symbolLabel.attr('style');
        
        if (style && style.includes('background-image')) {
          // Parse the URL from the style
          const urlMatch = style.match(/url\(['"]?(.*?)['"]?\)/);
          
          if (urlMatch && urlMatch[1]) {
            const logoUrl = urlMatch[1];
            console.log(`Found logo URL in style: ${logoUrl}`);
            return logoUrl;
          }
        }
      }
      
      // Look for direct img tag with src inside symbol-label
      const imgTag = $('.symbol-label img');
      
      if (imgTag.length > 0) {
        const logoUrl = imgTag.attr('src');
        if (logoUrl) {
          console.log(`Found logo in img tag: ${logoUrl}`);
          return logoUrl;
        }
      }
    }
    
    console.log(`No logo found for token ${tokenSymbol}`);
    return null;
  } catch (error) {
    console.error(`Error fetching logo for ${tokenSymbol}:`, error.message);
    return null;
  }
}

module.exports = { fetchTokenLogo };
