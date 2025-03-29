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
  color: string;
};

type Ramp = {
  position: [number, number, number];
  rotation: number;
  scale: [number, number, number];
};

type Bridge = {
  position: [number, number, number];
  rotation: number;
  scale: [number, number, number];
};

type ItemBox = {
  position: [number, number, number];
};

type MapSize = {
  width: number;
  height: number;
};

type MapData = {
  blocks: Block[];
  ramps: Ramp[];
  bridges: Bridge[];
  itemBoxes: ItemBox[];
  mapSize: MapSize;
};

const mapText = `
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
x__________________________________________________________x
x___?________________________________________________?_____x
x_____?________________________________________________?___x
x__?_______________________________________________? ______x
x__________________________________________________________x
x_______>>>>>>>>>>>>>>>yyy________bbb<<<<<<<<<<<<<<<_______x
x_______>>>>>>>>>>>>>>>yyy________bbb<<<<<<<<<<<<<<<_______x
x_____vvyyyyyyyyyyyyyyyyyy________bbbbbbbbbbbbbbbbbbvv_____x
x_____vvyyyyyyyyyyyyyyyyyy________bbbbbbbbbbbbbbbbbbvv_____x
x_____vvyyyyyyyyyyyyyyyyyy________bbbbbbbbbbbbbbbbbbvv_____x
x_____vvyyyYYYYYYYYYYYyyyy________bbbbBBBBBBBBBBBbbbvv_____x
x_____vvyyyYYYYYYYYYYYyyyy________bbbbBBBBBBBBBBBbbbvv_____x
x_____vvyyyYYYYYYYYYYYyyyy________bbbbBBBBBBBBBBBbbbvv_____x
x_____vvyyyYYYYYYYYYYYyyyy________bbbb↑↑BBBBBBBBBbbbvv_____x
x_____vvyyyYYYYYYYYYYYyyyy________bbbb↑↑BBBBBBBBBbbbvv_____x
x_____vvyyyYYYYYYYYYYYyyyy________bbbb↑↑BBBBBBBBBbbbvv_____x
x_____vvyyyYYYYYYYYYYYyyyy________bbbb↑↑BBBBBBBBBbbbvv_____x
x_____vvyyyYYYYYYYYYYYyyyy________bbbb↑↑BBBBBBBBBbbbvv_____x
x_____vvyyyYYY←←←←←←←←yyyy________bbbb↑↑BBBBBBBBBbbbvv_____x
x_____vvyyyYYY←←←←←←←←yyyy________bbbb↑↑BBBBBBBBBbbbvv_____x
x_____vvyyyyyyyyyyyyyyyyyy________bbbb↑↑BBBBBBBBBbbbvv_____x
x_____vvyyyyyyyyyyyyyyyyyy========bbbb↑↑BBBBBBBBBbbbvv_____x
x_____yyyyyyyyyyyyyyyyyyyy========bbbbbbbbbbbbbbbbbbbb_____x
x_____yyyyyyyyyyyyyyyyyyyy________bbbbbbbbbbbbbbbbbbbb_____x
x_____yyyyyyyyyyyyyyyyyyyy________bbbbbbbbbbbbbbbbbbbb_____x
x_____________________==____________==_____________________x
x_____________________==____________==_____________________x
x_____________________==___?__?_____==_____________________x
x_____________________==____________==_____________________x
x_____________________==____________==_____________________x
x_____________________==___?__?_____==_____________________x
x_____________________==____________==_____________________x
x_____________________==____________==_____________________x
x_____gggggggggggggggggggg________rrrrrrrrrrrrrrrrrrr______x
x_____gggggggggggggggggggg________rrrrrrrrrrrrrrrrrrr______x
x_____gggggggggggggggggggg========rrrrrrrrrrrrrrrrrrr______x
x_____^^gggGGGGGGGGG↓↓gggg========rrrrrrrrrrrrrrrrr^^______x
x_____^^gggGGGGGGGGG↓↓gggg________rrr→→→→→→→→RRRrrr^^______x
x_____^^gggGGGGGGGGG↓↓gggg________rrr→→→→→→→→RRRrrr^^______x
x_____^^gggGGGGGGGGG↓↓gggg________rrrRRRRRRRRRRRrrr^^______x
x_____^^gggGGGGGGGGG↓↓gggg________rrrRRRRRRRRRRRrrr^^______x
x_____^^gggGGGGGGGGG↓↓gggg________rrrRRRRRRRRRRRrrr^^______x
x_____^^gggGGGGGGGGG↓↓gggg________rrrRRRRRRRRRRRrrr^^______x
x_____^^gggGGGGGGGGG↓↓gggg________rrrRRRRRRRRRRRrrr^^______x
x_____^^gggGGGGGGGGG↓↓gggg________rrrRRRRRRRRRRRrrr^^______x
x_____^^gggGGGGGGGGGGGgggg________rrrRRRRRRRRRRRrrr^^______x
x_____^^gggGGGGGGGGGGGgggg________rrrRRRRRRRRRRRrrr^^______x
x_____^^gggGGGGGGGGGGGgggg________rrrRRRRRRRRRRRrrr^^______x
x_____^^gggggggggggggggggg________rrrrrrrrrrrrrrrrr^^______x
x_____^^gggggggggggggggggg________rrrrrrrrrrrrrrrrr^^______x
x_____^^gggggggggggggggggg________rrrrrrrrrrrrrrrrr^^______x
x_______>>>>>>>>>>>>>>>ggg________rrr<<<<<<<<<<<<<<________x
x_______>>>>>>>>>>>>>>>ggg________rrr<<<<<<<<<<<<<<________x
x__________________________________________________________x
x_?________________________________________________?_______x
x___?___________________________________________________?__x
x______?____________________________________________?______x
x__________________________________________________________x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`;

export function loadMap(): MapData {
  try {
    const mapRows = mapText.trim().split("\n");

    const blocks: Block[] = [];
    const ramps: Ramp[] = [];
    const bridges: Bridge[] = [];
    const itemBoxes: ItemBox[] = [];
    const mapSize: MapSize = {
      width: mapRows[0]?.length || 0,
      height: mapRows.length || 0,
    };

    // Calculate offsets to center the map
    const halfWidth = mapSize.width / 2;
    const halfHeight = mapSize.height / 2;

    // First pass: Find continuous blocks
    const visited = new Set<string>();

    mapRows.forEach((mapRow, rowIndex) => {
      Array.from(mapRow).forEach((mapCell, columnIndex) => {
        if (!visited.has(`${rowIndex},${columnIndex}`)) {
          if (mapCell === "?") {
            itemBoxes.push({
              position: [
                columnIndex - halfWidth + 0.5,
                0,
                rowIndex - halfHeight + 0.5,
              ],
            });
            visited.add(`${rowIndex},${columnIndex}`);
            return;
          }

          if (
            mapCell === "x" ||
            mapCell === "r" ||
            mapCell === "g" ||
            mapCell === "b" ||
            mapCell === "y" ||
            mapCell === "R" ||
            mapCell === "G" ||
            mapCell === "B" ||
            mapCell === "Y"
          ) {
            let width = 0;
            while (
              columnIndex + width < mapRow.length &&
              mapRow[columnIndex + width] === mapCell &&
              !visited.has(`${rowIndex},${columnIndex + width}`)
            ) {
              width++;
            }

            let height = 0;
            while (
              rowIndex + height < mapRows.length &&
              rowIndex + height < mapRows.length &&
              mapRows[rowIndex + height][columnIndex] === mapCell &&
              !visited.has(`${rowIndex + height},${columnIndex}`)
            ) {
              let isFullRow = true;
              for (let w = 0; w < width; w++) {
                if (
                  mapRows[rowIndex + height][columnIndex + w] !== mapCell ||
                  visited.has(`${rowIndex + height},${columnIndex + w}`)
                ) {
                  isFullRow = false;
                  break;
                }
              }
              if (!isFullRow) break;
              height++;
            }

            for (let h = 0; h < height; h++) {
              for (let w = 0; w < width; w++) {
                visited.add(`${rowIndex + h},${columnIndex + w}`);
              }
            }

            if (width > 0 && height > 0) {
              blocks.push({
                position: {
                  x: columnIndex - halfWidth + width / 2 - 0.5,
                  y:
                    mapCell === "R" ||
                    mapCell === "G" ||
                    mapCell === "B" ||
                    mapCell === "Y"
                      ? 2
                      : 0,
                  z: rowIndex - halfHeight + height / 2 - 0.5,
                },
                size: {
                  x: width,
                  y: 2,
                  z: height,
                },
                color:
                  mapCell === "x"
                    ? "gray"
                    : mapCell === "r"
                    ? "red"
                    : mapCell === "g"
                    ? "green"
                    : mapCell === "b"
                    ? "blue"
                    : mapCell === "y"
                    ? "yellow"
                    : mapCell === "R"
                    ? "red"
                    : mapCell === "G"
                    ? "green"
                    : mapCell === "B"
                    ? "blue"
                    : "yellow",
              });
            }
          } else if (
            mapCell === ">" ||
            mapCell === "<" ||
            mapCell === "v" ||
            mapCell === "^" ||
            mapCell === "↑" ||
            mapCell === "←" ||
            mapCell === "→" ||
            mapCell === "↓"
          ) {
            // Check for consecutive ramp symbols
            let width = 0;
            let height = 0;

            // Check horizontal consecutive symbols
            while (
              columnIndex + width < mapRow.length &&
              mapRow[columnIndex + width] === mapCell &&
              !visited.has(`${rowIndex},${columnIndex + width}`)
            ) {
              width++;
            }

            // Check vertical consecutive symbols
            while (
              rowIndex + height < mapRows.length &&
              rowIndex + height < mapRows.length &&
              mapRows[rowIndex + height][columnIndex] === mapCell &&
              !visited.has(`${rowIndex + height},${columnIndex}`)
            ) {
              height++;
            }

            // Mark all cells in the ramp as visited
            for (let h = 0; h < height; h++) {
              for (let w = 0; w < width; w++) {
                visited.add(`${rowIndex + h},${columnIndex + w}`);
              }
            }

            // Only create a ramp if we have valid dimensions
            if (width > 0 && height > 0) {
              let direction = 0;
              if (mapCell === ">" || mapCell === "→") direction = 0;
              else if (mapCell === "<" || mapCell === "←") direction = Math.PI;
              else if (mapCell === "v" || mapCell === "↓")
                direction = -Math.PI / 2;
              else if (mapCell === "^" || mapCell === "↑")
                direction = Math.PI / 2;

              const isLevelTwoRamp =
                mapCell === "↑" ||
                mapCell === "←" ||
                mapCell === "→" ||
                mapCell === "↓";

              ramps.push({
                position: [
                  columnIndex - halfWidth + width / 2 - 0.5,
                  isLevelTwoRamp ? 2 : 0,
                  rowIndex - halfHeight + height / 2 - 0.5,
                ],
                rotation: direction,
                scale: [width, 2, height],
              });
            }
          } else if (mapCell === "=") {
            // Handle bridge symbols (both horizontal and vertical)
            // Check for rectangular bridges
            let width = 1;
            let height = 1;
            
            // First check horizontal extent
            while (
              columnIndex + width < mapRow.length &&
              mapRow[columnIndex + width] === mapCell &&
              !visited.has(`${rowIndex},${columnIndex + width}`)
            ) {
              width++;
            }
            
            // Then check vertical extent
            while (
              rowIndex + height < mapRows.length &&
              mapRows[rowIndex + height][columnIndex] === mapCell &&
              !visited.has(`${rowIndex + height},${columnIndex}`)
            ) {
              // Check if the entire row has bridge symbols
              let isFullRow = true;
              for (let w = 0; w < width; w++) {
                if (
                  columnIndex + w >= mapRow.length ||
                  mapRows[rowIndex + height][columnIndex + w] !== mapCell ||
                  visited.has(`${rowIndex + height},${columnIndex + w}`)
                ) {
                  isFullRow = false;
                  break;
                }
              }
              if (!isFullRow) break;
              height++;
            }
            
            // Mark all cells in the bridge as visited
            for (let h = 0; h < height; h++) {
              for (let w = 0; w < width; w++) {
                visited.add(`${rowIndex + h},${columnIndex + w}`);
              }
            }
            
            // Create a bridge with the correct dimensions
            bridges.push({
              position: [
                columnIndex - halfWidth + width / 2 - 0.5,
                1,
                rowIndex - halfHeight + height / 2 - 0.5,
              ],
              rotation: 0,
              scale: [width, 1, height],
            });
          }
        }
      });
    });

    return { blocks, ramps, bridges, itemBoxes, mapSize };
  } catch (error) {
    console.error("Error loading map:", error);
    return {
      blocks: [],
      ramps: [],
      bridges: [],
      itemBoxes: [],
      mapSize: { width: 0, height: 0 },
    };
  }
}

const { blocks, ramps, bridges, itemBoxes, mapSize } = loadMap();

console.log("ramps", ramps);
console.log("bridges", bridges);
console.log("itemBoxes", itemBoxes);

export { blocks, ramps, bridges, itemBoxes, mapSize };
