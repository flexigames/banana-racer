const mapText = `
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x__________________________________________________________x
x_______________________xxxxxxxxxxxxx______________________x
x___________________________________x______________________x
x__________________>>______________________________________x
x__________________>>______________________________________x
x__________________________________________________________x
x__________________________________________________________x
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

type Block = {
  position: {
    x: number;
    y: number;
    z: number;
  };
  size: {
    x: number;
    y: number;
    z: number;
  };
};

type MapSize = {
  width: number;
  height: number;
};

type MapData = {
  blocks: Block[];
  mapSize: MapSize;
};

export function loadMap(): MapData {
  try {
    const mapRows = mapText.trim().split("\n");

    const blocks: Block[] = [];
    const mapSize: MapSize = {
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
        if (mapCell === "x" && !visited.has(`${rowIndex},${columnIndex}`)) {
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
        }
      });
    });

    return { blocks, mapSize };
  } catch (error) {
    console.error("Error loading map:", error);
    return { blocks: [], mapSize: { width: 0, height: 0 } };
  }
}

const { blocks, mapSize } = loadMap();

export { blocks, mapSize };
