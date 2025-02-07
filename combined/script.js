/***** Heatmap Settings & Data Structures *****/
// These values can be adjusted via controls.
let gridSize = 10; // Grid resolution (in pixels per cell)
let kernelRadius = 2; // Kernel radius (in grid cells) for adding heat
let maxIntensity = 10; // Maximum intensity used for color mapping (for current page)

const canvas = document.getElementById("heatmapCanvas");
const ctx = canvas.getContext("2d");
let heatmapData = []; // 2D array: heatmapData[row][col]
let gridCols, gridRows;
let updateTimeout = null; // For throttling localStorage updates

/**
 * Initialize (or reinitialize) the canvas size and heatmap data.
 * If stored heatmap data exists for this page (keyed by location.pathname),
 * merge it into the new grid.
 */
function initHeatmap() {
  const width = document.documentElement.scrollWidth;
  const height = document.documentElement.scrollHeight;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  gridCols = Math.ceil(width / gridSize);
  gridRows = Math.ceil(height / gridSize);

  // Create a new 2D array with all cells initialized to 0.
  const newHeatmapData = [];
  for (let row = 0; row < gridRows; row++) {
    newHeatmapData[row] = new Array(gridCols).fill(0);
  }

  // Load stored heatmap data (if any) and merge into the new grid.
  const storedKey = "heatmapData_" + location.pathname;
  const storedData = localStorage.getItem(storedKey);
  if (storedData) {
    try {
      const parsedData = JSON.parse(storedData);
      // Copy over overlapping cells.
      for (let row = 0; row < Math.min(parsedData.length, gridRows); row++) {
        for (
          let col = 0;
          col < Math.min(parsedData[row].length, gridCols);
          col++
        ) {
          newHeatmapData[row][col] = parsedData[row][col];
        }
      }
    } catch (e) {
      console.error("Error parsing stored heatmap data:", e);
    }
  }
  heatmapData = newHeatmapData;
}

initHeatmap();
window.addEventListener("resize", initHeatmap);

// Save the current heatmap data to localStorage.
function saveHeatmapData() {
  const storedKey = "heatmapData_" + location.pathname;
  localStorage.setItem(storedKey, JSON.stringify(heatmapData));
}

/***** Adding Heat on Mouse Movement *****/
// Each time the mouse moves, update a “kernel” (neighbors included) using a radial falloff.
function addHeat(x, y) {
  // Convert document coordinates to grid coordinates.
  const gx = x / gridSize;
  const gy = y / gridSize;

  // Determine affected grid indices.
  const minCol = Math.max(0, Math.floor(gx - kernelRadius));
  const maxCol = Math.min(gridCols - 1, Math.floor(gx + kernelRadius));
  const minRow = Math.max(0, Math.floor(gy - kernelRadius));
  const maxRow = Math.min(gridRows - 1, Math.floor(gy + kernelRadius));

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      // Find the center of the grid cell (in grid coordinates).
      const cellCenterX = col + 0.5;
      const cellCenterY = row + 0.5;
      const dx = cellCenterX - gx;
      const dy = cellCenterY - gy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= kernelRadius) {
        // Linear falloff: cells closer receive more heat.
        const contribution = (kernelRadius - dist + 1) / (kernelRadius + 1);
        heatmapData[row][col] += contribution;
      }
    }
  }

  // Throttle localStorage updates to about every 500ms.
  if (!updateTimeout) {
    updateTimeout = setTimeout(() => {
      saveHeatmapData();
      updateTimeout = null;
    }, 500);
  }
}

// Listen for mouse moves. Use event.pageX/Y so coordinates are relative to the document.
document.addEventListener("mousemove", function (event) {
  addHeat(event.pageX, event.pageY);
});

// Save the heatmap when the page is unloaded.
window.addEventListener("beforeunload", saveHeatmapData);

/***** Color Mapping Function for Current Page *****/
// Map the heat intensity to a color gradient: Yellow → Orange → Red.
// When intensity is 0, the cell will simply remain with the default background.
function intensityToColor(intensity) {
  const t = Math.min(intensity / maxIntensity, 1);
  const r = 255,
    b = 0;
  let g;
  if (t <= 0.5) {
    const factor = t / 0.5;
    g = Math.round(255 - (255 - 165) * factor);
  } else {
    const factor = (t - 0.5) / 0.5;
    g = Math.round(165 - 165 * factor);
  }
  return `rgb(${r},${g},${b})`;
}

/***** Drawing the Current Page Heatmap *****/
function drawHeatmap() {
  // Clear the canvas without filling with a blue background.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw heat cells with reduced opacity.
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const intensity = heatmapData[row][col];
      if (intensity > 0) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = intensityToColor(intensity);
        const x = col * gridSize;
        const y = row * gridSize;
        ctx.fillRect(x, y, gridSize, gridSize);
        ctx.globalAlpha = 1.0;
      }
    }
  }
  requestAnimationFrame(drawHeatmap);
}
drawHeatmap();

/***** Screenshot Functionality for Current Page *****/
// When the "Download Screenshot" button is clicked, ensure the heatmap is temporarily visible.
document.getElementById("downloadBtn").addEventListener("click", function () {
  const heatmapCanvas = document.getElementById("heatmapCanvas");
  const originalDisplay = heatmapCanvas.style.display;
  heatmapCanvas.style.display = "block";

  html2canvas(document.querySelector("#container")).then(function (
    capturedCanvas
  ) {
    heatmapCanvas.style.display = originalDisplay;
    const link = document.createElement("a");
    link.download = "dashboard-screenshot.png";
    link.href = capturedCanvas.toDataURL("image/png");
    link.click();
  });
});

/***** Aggregated Combined Heatmap Download Functionality *****/
// When the "Download Combined Heatmap" button is clicked, create an aggregated heatmap
// by summing the stored heatmap data from all pages.
document
  .getElementById("downloadCombinedBtn")
  .addEventListener("click", function () {
    let heatmapKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key.startsWith("heatmapData_")) {
        heatmapKeys.push(key);
      }
    }

    if (heatmapKeys.length === 0) {
      alert("No heatmap data found in localStorage.");
      return;
    }

    // Determine final grid dimensions (max rows and columns among stored heatmaps).
    let finalRows = 0,
      finalCols = 0;
    let storedHeatmaps = [];
    heatmapKeys.forEach((key) => {
      let data = localStorage.getItem(key);
      if (!data) return;
      let heatData;
      try {
        heatData = JSON.parse(data);
      } catch (e) {
        console.error("Error parsing heatmap data for key:", key, e);
        return;
      }
      storedHeatmaps.push(heatData);
      if (heatData.length > finalRows) finalRows = heatData.length;
      if (heatData.length > 0 && heatData[0].length > finalCols)
        finalCols = heatData[0].length;
    });

    // Create an aggregated heatmap array.
    let aggregatedData = [];
    for (let r = 0; r < finalRows; r++) {
      aggregatedData[r] = new Array(finalCols).fill(0);
    }

    // Sum all heatmaps cell by cell.
    storedHeatmaps.forEach((heatData) => {
      for (let r = 0; r < heatData.length; r++) {
        for (let c = 0; c < heatData[r].length; c++) {
          aggregatedData[r][c] += heatData[r][c];
        }
      }
    });

    // Compute the maximum intensity in the aggregated data.
    let aggregatedMax = 0;
    for (let r = 0; r < finalRows; r++) {
      for (let c = 0; c < finalCols; c++) {
        if (aggregatedData[r][c] > aggregatedMax) {
          aggregatedMax = aggregatedData[r][c];
        }
      }
    }

    // Define a mapping function for the aggregated heatmap using aggregatedMax.
    function aggregatedIntensityToColor(intensity, aggregatedMax) {
      let t = Math.min(intensity / aggregatedMax, 1);
      const r = 255,
        b = 0;
      let g;
      if (t <= 0.5) {
        let factor = t / 0.5;
        g = Math.round(255 - (255 - 165) * factor);
      } else {
        let factor = (t - 0.5) / 0.5;
        g = Math.round(165 - 165 * factor);
      }
      return `rgb(${r},${g},${b})`;
    }

    // Create an offscreen canvas for the aggregated heatmap.
    const combinedCanvas = document.createElement("canvas");
    combinedCanvas.width = finalCols * gridSize;
    combinedCanvas.height = finalRows * gridSize;
    const combinedCtx = combinedCanvas.getContext("2d");

    // Render the aggregated heatmap.
    for (let r = 0; r < finalRows; r++) {
      for (let c = 0; c < finalCols; c++) {
        let intensity = aggregatedData[r][c];
        if (intensity > 0) {
          combinedCtx.fillStyle = aggregatedIntensityToColor(
            intensity,
            aggregatedMax
          );
          combinedCtx.fillRect(c * gridSize, r * gridSize, gridSize, gridSize);
        }
      }
    }

    // Trigger download of the aggregated heatmap image.
    let link = document.createElement("a");
    link.download = "combined-aggregated-heatmap.png";
    link.href = combinedCanvas.toDataURL("image/png");
    link.click();
  });

/***** Heatmap Control Panel Functionality *****/
// Toggle heatmap overlay
document
  .getElementById("toggle-heatmap")
  .addEventListener("change", function (e) {
    canvas.style.display = e.target.checked ? "block" : "none";
  });

// Clear heatmap data
document.getElementById("clear-heatmap").addEventListener("click", function () {
  for (let r = 0; r < gridRows; r++) {
    heatmapData[r].fill(0);
  }
  saveHeatmapData();
});

// Adjust maximum intensity via slider
document
  .getElementById("maxIntensitySlider")
  .addEventListener("input", function (e) {
    maxIntensity = Number(e.target.value);
    document.getElementById("maxIntensityValue").textContent = maxIntensity;
  });

// Adjust kernel radius via slider
document
  .getElementById("kernelRadiusSlider")
  .addEventListener("input", function (e) {
    kernelRadius = Number(e.target.value);
    document.getElementById("kernelRadiusValue").textContent = kernelRadius;
  });

// Adjust grid size via slider – reinitialize heatmap (this will clear current data)
document
  .getElementById("gridSizeSlider")
  .addEventListener("input", function (e) {
    gridSize = Number(e.target.value);
    document.getElementById("gridSizeValue").textContent = gridSize;
    initHeatmap();
    saveHeatmapData();
  });

/***** Simulate High Heat Button *****/
// When the "Simulate High Heat" button is clicked, set every cell to a high value (twice maxIntensity),
// so that the entire heatmap shows as very high heat (red).
document
  .getElementById("simulateHighHeat")
  .addEventListener("click", function () {
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        heatmapData[r][c] = maxIntensity * 2; // This ensures intensity/maxIntensity becomes > 1 and is clamped to red.
      }
    }
    saveHeatmapData();
  });

/***** Heatmap Statistics *****/
function updateHeatmapStats() {
  let total = 0;
  let maxRecorded = 0;
  let cellCount = gridRows * gridCols;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const value = heatmapData[r][c];
      total += value;
      if (value > maxRecorded) {
        maxRecorded = value;
      }
    }
  }
  const avg = cellCount > 0 ? total / cellCount : 0;
  document.getElementById("totalHeat").textContent = total.toFixed(2);
  document.getElementById("avgIntensity").textContent = avg.toFixed(2);
  document.getElementById("maxRecorded").textContent = maxRecorded.toFixed(2);
}
setInterval(updateHeatmapStats, 1000);
