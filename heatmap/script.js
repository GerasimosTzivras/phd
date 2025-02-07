/***** Heatmap Settings & Data Structures *****/
const canvas = document.getElementById("heatmapCanvas");
const ctx = canvas.getContext("2d");

// Grid settings: divide the document into cells of gridSize x gridSize pixels.
const gridSize = 10; // Adjust for resolution (smaller = finer grid)
let heatmapData = []; // 2D array: heatmapData[row][col]
let gridCols, gridRows;

// Initialize (or reinitialize) the canvas size and heatmap data.
function initHeatmap() {
  const width = document.documentElement.scrollWidth;
  const height = document.documentElement.scrollHeight;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  gridCols = Math.ceil(width / gridSize);
  gridRows = Math.ceil(height / gridSize);

  // Create a 2D array with all cells initialized to 0.
  heatmapData = [];
  for (let row = 0; row < gridRows; row++) {
    heatmapData[row] = new Array(gridCols).fill(0);
  }
}

initHeatmap();
window.addEventListener("resize", initHeatmap);

/***** Adding Heat on Mouse Movement *****/
// Each time the mouse moves, update a “kernel” (neighbors included) using a radial falloff.
const kernelRadius = 2; // in grid cells
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
}

// Listen for mouse moves. Use event.pageX/Y so coordinates are relative to the document.
document.addEventListener("mousemove", function (event) {
  addHeat(event.pageX, event.pageY);
});

/***** Color Mapping Function *****/
// Map the heat intensity to a color gradient: Yellow → Orange → Red.
// Yellow: rgb(255, 255, 0); Orange: rgb(255, 165, 0); Red: rgb(255, 0, 0)
const maxIntensity = 10; // Maximum intensity value at which the cell is fully red

function intensityToColor(intensity) {
  // Normalize intensity between 0 and 1.
  const t = Math.min(intensity / maxIntensity, 1);
  const r = 255,
    b = 0;
  let g;

  if (t <= 0.5) {
    // Interpolate from yellow (g=255) to orange (g=165).
    const factor = t / 0.5; // factor: 0 → 1
    g = Math.round(255 - (255 - 165) * factor);
  } else {
    // Interpolate from orange (g=165) to red (g=0).
    const factor = (t - 0.5) / 0.5; // factor: 0 → 1
    g = Math.round(165 - 165 * factor);
  }
  return `rgb(${r},${g},${b})`;
}

/***** Drawing the Heatmap *****/
function drawHeatmap() {
  // Clear the canvas.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw each grid cell (if it has any recorded heat).
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const intensity = heatmapData[row][col];
      if (intensity > 0) {
        ctx.fillStyle = intensityToColor(intensity);
        const x = col * gridSize;
        const y = row * gridSize;
        ctx.fillRect(x, y, gridSize, gridSize);
      }
    }
  }
  // Continue the drawing loop.
  requestAnimationFrame(drawHeatmap);
}
// Start the animation loop.
drawHeatmap();

/***** Screenshot Functionality *****/
// When the download button is clicked, use html2canvas to capture the entire container.
document.getElementById("downloadBtn").addEventListener("click", function () {
  // Capture the element with id="container"
  html2canvas(document.querySelector("#container")).then(function (
    capturedCanvas
  ) {
    // Create a temporary link to trigger the download.
    const link = document.createElement("a");
    link.download = "dashboard-screenshot.png";
    link.href = capturedCanvas.toDataURL("image/png");
    // Automatically click the link to trigger the download.
    link.click();
  });
});
