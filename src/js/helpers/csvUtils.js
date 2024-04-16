var d3 = {
	...require("d3-fetch/dist/d3-fetch.min"),
  ...require("d3-dsv/dist/d3-dsv.min"),
};

// Function to fetch the CSV using D3.js
async function fetchCSV(csvPath) {
  try {
    const data = await d3.csv(csvPath);
    return data;
  } catch (error) {
    console.error('Error loading CSV file:', error);
    throw error; // Rethrow the error to handle it in the caller
  }
}

module.exports = {
fetchCSV
}; // Export the fetchCSV function