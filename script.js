// Function to create the DOM tree structure with dimensions and position
function drawDomTree(element, parent) {
  const node = document.createElement("div");
  node.className = "tree-node";

  // Get element's dimensions and position
  const rect = element.getBoundingClientRect();
  const dimensions = `Width: ${rect.width.toFixed(
    2
  )}px, Height: ${rect.height.toFixed(2)}px`;
  const position = `Top: ${rect.top.toFixed(2)}px, Left: ${rect.left.toFixed(
    2
  )}px`;

  // Display element's tag name and its info
  node.innerHTML = `
        <strong>${element.tagName}</strong>
        <div class="tree-node-info">${dimensions}</div>
        <div class="tree-node-info">${position}</div>
    `;

  // Append this node to its parent
  if (parent) {
    parent.appendChild(node);
  }

  // Recursively draw child elements
  Array.from(element.children).forEach((child) => {
    drawDomTree(child, node);
  });

  return node;
}

// Render the tree in the container
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("tree-container");
  const rootTree = drawDomTree(document.body, null);

  // Style the root element
  rootTree.className += " tree-node-root";

  container.appendChild(rootTree);
});

function saveTreeAsText(node, depth = 0) {
  let treeText = `${"  ".repeat(depth)}<${node.tagName.toLowerCase()}>\n`;
  Array.from(node.children).forEach((child) => {
    treeText += saveTreeAsText(child, depth + 1);
  });
  return treeText;
}

document.addEventListener("DOMContentLoaded", () => {
  const treeText = saveTreeAsText(document.body);
  const blob = new Blob([treeText], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dom_tree.txt";
  a.textContent = "Download DOM Tree as Text";
  a.style.display = "block";
  a.style.margin = "20px auto";
  a.style.textAlign = "center";
  document.body.appendChild(a);
});
