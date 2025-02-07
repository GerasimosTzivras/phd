/**
 * Recursively assign a unique ID to every element (if not already assigned)
 * and initialize its score in the global scores object.
 */
function initializeDomIds(element) {
  if (!element.dataset.domId) {
    element.dataset.domId = nextDomId++;
    scores[element.dataset.domId] = { heat: 0, click: 0 };
  }
  Array.from(element.children).forEach((child) => {
    initializeDomIds(child);
  });
}
/***** PART 2: HEATMAP FUNCTIONALITY *****/
// Heatmap Settings & Data Structures
let gridSize = 10; // Grid resolution (in pixels per cell)
let kernelRadius = 2; // Kernel radius (in grid cells) for adding heat
let maxIntensity = 10; // Maximum intensity used for color mapping (for current page)

const canvas = document.getElementById("heatmapCanvas");
const ctx = canvas.getContext("2d");
let heatmapData = []; // 2D array: heatmapData[row][col]
let gridCols, gridRows;
let updateTimeout = null; // For throttling localStorage updates

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

function saveHeatmapData() {
  const storedKey = "heatmapData_" + location.pathname;
  localStorage.setItem(storedKey, JSON.stringify(heatmapData));
}

function addHeat(x, y) {
  const gx = x / gridSize;
  const gy = y / gridSize;
  const minCol = Math.max(0, Math.floor(gx - kernelRadius));
  const maxCol = Math.min(gridCols - 1, Math.floor(gx + kernelRadius));
  const minRow = Math.max(0, Math.floor(gy - kernelRadius));
  const maxRow = Math.min(gridRows - 1, Math.floor(gy + kernelRadius));

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const cellCenterX = col + 0.5;
      const cellCenterY = row + 0.5;
      const dx = cellCenterX - gx;
      const dy = cellCenterY - gy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= kernelRadius) {
        const contribution = (kernelRadius - dist + 1) / (kernelRadius + 1);
        heatmapData[row][col] += contribution;
      }
    }
  }

  if (!updateTimeout) {
    updateTimeout = setTimeout(() => {
      saveHeatmapData();
      updateTimeout = null;
    }, 500);
  }
}

document.addEventListener("mousemove", (event) => {
  addHeat(event.pageX, event.pageY);
});
window.addEventListener("beforeunload", saveHeatmapData);

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

function drawHeatmap() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    let aggregatedData = [];
    for (let r = 0; r < finalRows; r++) {
      aggregatedData[r] = new Array(finalCols).fill(0);
    }
    storedHeatmaps.forEach((heatData) => {
      for (let r = 0; r < heatData.length; r++) {
        for (let c = 0; c < heatData[r].length; c++) {
          aggregatedData[r][c] += heatData[r][c];
        }
      }
    });
    let aggregatedMax = 0;
    for (let r = 0; r < finalRows; r++) {
      for (let c = 0; c < finalCols; c++) {
        if (aggregatedData[r][c] > aggregatedMax) {
          aggregatedMax = aggregatedData[r][c];
        }
      }
    }
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
    const combinedCanvas = document.createElement("canvas");
    combinedCanvas.width = finalCols * gridSize;
    combinedCanvas.height = finalRows * gridSize;
    const combinedCtx = combinedCanvas.getContext("2d");
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
    let link = document.createElement("a");
    link.download = "combined-aggregated-heatmap.png";
    link.href = combinedCanvas.toDataURL("image/png");
    link.click();
  });

document
  .getElementById("toggle-heatmap")
  .addEventListener("change", function (e) {
    canvas.style.display = e.target.checked ? "block" : "none";
  });

document.getElementById("clear-heatmap").addEventListener("click", function () {
  for (let r = 0; r < gridRows; r++) {
    heatmapData[r].fill(0);
  }
  saveHeatmapData();
});

document
  .getElementById("maxIntensitySlider")
  .addEventListener("input", function (e) {
    maxIntensity = Number(e.target.value);
    document.getElementById("maxIntensityValue").textContent = maxIntensity;
  });

document
  .getElementById("kernelRadiusSlider")
  .addEventListener("input", function (e) {
    kernelRadius = Number(e.target.value);
    document.getElementById("kernelRadiusValue").textContent = kernelRadius;
  });

document
  .getElementById("gridSizeSlider")
  .addEventListener("input", function (e) {
    gridSize = Number(e.target.value);
    document.getElementById("gridSizeValue").textContent = gridSize;
    initHeatmap();
    saveHeatmapData();
  });

document
  .getElementById("simulateHighHeat")
  .addEventListener("click", function () {
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        heatmapData[r][c] = maxIntensity * 2;
      }
    }
    saveHeatmapData();
  });

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

/***** PART 3: DOM TREE & SCORE TRACKING *****/

// Global counter for assigning unique IDs to elements.
let nextDomId = 1;
// Global mapping from unique DOM id to the corresponding tree node element.
const treeMapping = {};
// Global scores object: key is domId and value is an object { heat: number, click: number }.
const scores = {};

// Function to create the DOM tree (recursively) with dimensions, position, and score placeholders.
function drawDomTree(element, parent) {
  const node = document.createElement("div");
  node.className = "tree-node";

  // Assign a unique ID if not already assigned.
  if (!element.dataset.domId) {
    element.dataset.domId = nextDomId++;
  }
  const domId = element.dataset.domId;

  // Initialize scores if not already present.
  if (!scores[domId]) {
    scores[domId] = { heat: 0, click: 0 };
  }

  // Store the tree node reference.
  treeMapping[domId] = node;

  const rect = element.getBoundingClientRect();
  const dimensions = `Width: ${rect.width.toFixed(
    2
  )}px, Height: ${rect.height.toFixed(2)}px`;
  const position = `Top: ${rect.top.toFixed(2)}px, Left: ${rect.left.toFixed(
    2
  )}px`;

  node.innerHTML = `
    <strong>${element.tagName} (ID: ${domId})</strong>
    <div class="tree-node-info">${dimensions}</div>
    <div class="tree-node-info">${position}</div>
    <div class="tree-node-info" data-score-heat="${domId}">Heat Score: 0</div>
    <div class="tree-node-info" data-score-click="${domId}">Click Score: 0</div>
  `;

  if (parent) {
    parent.appendChild(node);
  }

  Array.from(element.children).forEach((child) => {
    drawDomTree(child, node);
  });

  return node;
}

// Function to generate a text version (for download, if desired).
function saveTreeAsText(node, depth = 0) {
  let treeText = `${"  ".repeat(depth)}<${node.tagName.toLowerCase()}>\n`;
  Array.from(node.children).forEach((child) => {
    treeText += saveTreeAsText(child, depth + 1);
  });
  return treeText;
}

// Update the displayed scores in the DOM tree.
function updateTreeScores() {
  for (const id in scores) {
    const heatElem = document.querySelector(`[data-score-heat="${id}"]`);
    if (heatElem) {
      heatElem.textContent = `Heat Score: ${scores[id].heat}`;
    }
    const clickElem = document.querySelector(`[data-score-click="${id}"]`);
    if (clickElem) {
      clickElem.textContent = `Click Score: ${scores[id].click}`;
    }
  }
  requestAnimationFrame(updateTreeScores);
}
updateTreeScores();

// For each mousemove, update the heat score for every element in the event’s composed path.
document.addEventListener("mousemove", (event) => {
  // For each mousemove event, update the heat score for every element in the composed path.
  const path = event.composedPath();
  for (const el of path) {
    if (el.dataset && el.dataset.domId) {
      const id = el.dataset.domId;
      if (scores[id]) {
        scores[id].heat += 1;
      } else {
        scores[id] = { heat: 1, click: 0 };
      }
    }
  }
});

// For each click, update the click score of the clicked element.
document.addEventListener("click", (event) => {
  const target = event.target;
  if (target.dataset && target.dataset.domId) {
    const id = target.dataset.domId;
    if (scores[id]) {
      scores[id].click += 1;
    } else {
      scores[id] = { heat: 0, click: 1 };
    }
  }
});

/***** PART 4: VIEW TREE ONLY BUTTON & SNAPSHOT GENERATION *****/
// On index.html (i.e. when NOT on domtree.html), attach the event to the "View DOM Tree Only" button.
if (!window.location.pathname.endsWith("domtree.html")) {
  document.addEventListener("DOMContentLoaded", () => {
    // Ensure every element in the live DOM has a unique ID.
    initializeDomIds(document.body);

    const viewTreeBtn = document.getElementById("view-tree-only-btn");
    if (viewTreeBtn) {
      viewTreeBtn.addEventListener("click", () => {
        // Create a temporary container (not added to the document)
        const tempContainer = document.createElement("div");
        // Generate the DOM tree snapshot into tempContainer.
        drawDomTree(document.body, tempContainer);
        // Update score display elements in tempContainer with the current global scores.
        const heatNodes = tempContainer.querySelectorAll("[data-score-heat]");
        heatNodes.forEach((node) => {
          const id = node.getAttribute("data-score-heat");
          if (scores[id]) {
            node.textContent = `Heat Score: ${scores[id].heat}`;
          }
        });
        const clickNodes = tempContainer.querySelectorAll("[data-score-click]");
        clickNodes.forEach((node) => {
          const id = node.getAttribute("data-score-click");
          if (scores[id]) {
            node.textContent = `Click Score: ${scores[id].click}`;
          }
        });
        // Save the snapshot as JSON (only the HTML is needed, since scores are merged).
        const treeSnapshot = { html: tempContainer.innerHTML };
        localStorage.setItem("selectedDomTree", JSON.stringify(treeSnapshot));
        // Redirect to domtree.html.
        window.location.href = "domtree.html";
      });
    }
  });
} else {
  // On domtree.html, retrieve and display the stored snapshot.
  document.addEventListener("DOMContentLoaded", () => {
    const treeContainer = document.getElementById("tree-container");
    const storedData = localStorage.getItem("selectedDomTree");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        treeContainer.innerHTML = parsedData.html;
      } catch (e) {
        treeContainer.textContent = "Error reading DOM tree data.";
        console.error(e);
      }
    } else {
      treeContainer.textContent = "No DOM tree data available.";
    }
  });
}
