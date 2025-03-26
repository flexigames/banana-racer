const mapText = `
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x______________________>>>>________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x___________________________xxxxxxxxx______________________x
x___________________________________x______________________x
x__________________________________________________________x
x______________________v___________________________________x
x______________________v___________________________________x
x______________________^___________________________________x
x__________________________________________________________x
x_______________xxxxxxxxxx____________x____________________x
x_______________xxxxxxxxxx_________________________________x
x_______________xxxxxxxxxx_____________________x___________x
x_______________xxxxxxxxxx_________________________________x
x_______________xxxxxxxxxx_________________________________x
x_______________xxxxxxxxxx_________________x_______________x
x_______________xxxxxxxxxx_________________________________x
x_______________xxxxxxxxxx_________________________________x
x_______________xxxxxxxxxx_________________________________x
x_______________xxxxxxxxxx_________________________________x
x_______________xxxxxxxxxx_________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x______________xxxxxxxxxx__________________________________x
x______________xxxxxxxxxx__________________________________x
x______________xxxxxxxxxx__________________________________x
x______________xxxxxxxxxx__________________________________x
x______________xxxxxxxxxx__________________________________x
x______________xxxxxxxxxx__________________________________x
x______________xxxxxxxxxx__________________________________x
x______________xxxxxxxxxx__________________________________x
x______________xxxxxxxxxx__________________________________x
x______________xxxxxxxxxx__________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`;

export function loadMap() {
  try {
    const mapRows = mapText.trim().split("\n");

    const blocks = [];
    const ramps = [];
    const mapSize = {
      width: mapRows[0]?.length || 0,
      height: mapRows.length || 0,
    };

    // Calculate offsets to center the map
    const halfWidth = mapSize.width / 2;
    const halfHeight = mapSize.height / 2;

    // First pass: Find continuous blocks
    const visited = new Set();

    mapRows.forEach((mapRow, rowIndex) => {
      Array.from(mapRow).forEach((mapCell, columnIndex) => {
        if (!visited.has(`${rowIndex},${columnIndex}`)) {
          if (mapCell === "x") {
            // Find width of continuous block
            let width = 0;
            while (
              columnIndex + width < mapRow.length &&
              mapRow[columnIndex + width] === "x"
            ) {
              width++;
            }

            // Find height of continuous block
            let height = 0;
            while (
              rowIndex + height < mapRows.length &&
              mapRows[rowIndex + height][columnIndex] === "x"
            ) {
              let isFullRow = true;
              for (let w = 0; w < width; w++) {
                if (mapRows[rowIndex + height][columnIndex + w] !== "x") {
                  isFullRow = false;
                  break;
                }
              }
              if (!isFullRow) break;
              height++;
            }

            // Mark all cells in this block as visited
            for (let h = 0; h < height; h++) {
              for (let w = 0; w < width; w++) {
                visited.add(`${rowIndex + h},${columnIndex + w}`);
              }
            }

            // Add block if it's larger than 1x1
            if (width > 0 && height > 0) {
              blocks.push({
                position: {
                  x: columnIndex - halfWidth + width / 2 - 0.5,
                  y: 0,
                  z: rowIndex - halfHeight + height / 2 - 0.5,
                },
                size: {
                  x: width,
                  y: 2,
                  z: height,
                },
              });
            }
          } else if (mapCell === ">" || mapCell === "<" || mapCell === "v" || mapCell === "^") {
            // Check for consecutive ramp symbols
            let width = 1;
            let length = 1;
            
            // Check horizontal consecutive symbols
            while (
              columnIndex + width < mapRow.length &&
              mapRow[columnIndex + width] === mapCell
            ) {
              visited.add(`${rowIndex},${columnIndex + width}`);
              width++;
            }
            
            // Check vertical consecutive symbols
            while (
              rowIndex + length < mapRows.length &&
              mapRows[rowIndex + length][columnIndex] === mapCell
            ) {
              visited.add(`${rowIndex + length},${columnIndex}`);
              length++;
            }
            
            visited.add(`${rowIndex},${columnIndex}`);
            
            let direction = 0;
            if (mapCell === ">") direction = 0;
            else if (mapCell === "<") direction = Math.PI;
            else if (mapCell === "v") direction = -Math.PI / 2;
            else if (mapCell === "^") direction = Math.PI / 2;

            ramps.push({
              position: [
                columnIndex - halfWidth + (width / 2) - 0.5,
                0,
                rowIndex - halfHeight + (length / 2) - 0.5
              ],
              rotation: direction,
              scale: [width, 0.5, length]
            });
          }
        }
      });
    });

    return { blocks, ramps, mapSize };
  } catch (error) {
    console.error("Error loading map:", error);
    return { blocks: [], ramps: [], mapSize: { width: 0, height: 0 } };
  }
}

const { blocks, ramps, mapSize } = loadMap();

console.log("ramps", ramps);

export { blocks, ramps, mapSize };
