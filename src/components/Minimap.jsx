import React from "react";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { bridges, blocks, ramps } from "../lib/map";

const Minimap = () => {
  const { players, playerId, bananas, fakeCubes, greenShells, itemBoxes } =
    useMultiplayer();

  const mapWidth = 120;
  const mapHeight = 120;
  const playerDotSize = 8;

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        width: mapWidth,
        height: mapHeight,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        border: "2px solid white",
        overflow: "hidden",
      }}
    >
      {bridges &&
        bridges.map((bridge, index) => (
          <div
            key={`bridge-${index}`}
            style={{
              position: "absolute",
              left: `${
                bridge.position[0] * 2 +
                mapWidth / 2 -
                (bridge.scale[0] * 2) / 2
              }px`,
              top: `${
                bridge.position[2] * 2 +
                mapHeight / 2 -
                (bridge.scale[2] * 2) / 2
              }px`,
              width: `${bridge.scale[0] * 2}px`,
              height: `${bridge.scale[2] * 2}px`,
              backgroundColor: "grey",
              transform: `rotate(${bridge.rotation || 0}rad)`,
              transformOrigin: "center",
              opacity: 0.5,
            }}
          />
        ))}

      {ramps &&
        ramps.map((ramp, index) => (
          <div
            key={`ramp-${index}`}
            style={{
              position: "absolute",
              left: `${
                ramp.position[0] * 2 + mapWidth / 2 - (ramp.scale[0] * 2) / 2
              }px`,
              top: `${
                ramp.position[2] * 2 + mapHeight / 2 - (ramp.scale[2] * 2) / 2
              }px`,
              width: `${ramp.scale[0] * 2}px`,
              height: `${ramp.scale[2] * 2}px`,
              backgroundColor: "darkgrey",
              transformOrigin: "center",
              opacity: 0.5,
            }}
          />
        ))}

      {/* Render blocks */}
      {blocks &&
        blocks.map((block, index) => (
          <div
            key={`block-${index}`}
            style={{
              position: "absolute",
              left: `${
                block.position.x * 2 + mapWidth / 2 - (block.size.x * 2) / 2
              }px`,
              top: `${
                block.position.z * 2 + mapHeight / 2 - (block.size.z * 2) / 2
              }px`,
              width: `${block.size.x * 2}px`,
              height: `${block.size.z * 2}px`,
              backgroundColor: block.color || "blue",
              transform: `rotate(${block.rotation || 0}rad)`,
              transformOrigin: "center",
              opacity: 0.5,
            }}
          />
        ))}

      {Object.values(players).map((player) => {
        if (player.lives <= 0) return null;

        const isCurrentPlayer = player.id === playerId;
        const dotColor = `hsl(${player.color.h * 360}, ${
          player.color.s * 100
        }%, ${player.color.l * 100}%)`;

        return (
          <div
            key={player.id}
            style={{
              position: "absolute",
              left: `${
                player.position.x * 2 + mapWidth / 2 - playerDotSize / 2
              }px`,
              top: `${
                player.position.z * 2 + mapHeight / 2 - playerDotSize / 2
              }px`,
              width: playerDotSize,
              height: playerDotSize,
              backgroundColor: dotColor,
              border: isCurrentPlayer ? "2px solid white" : "none",
              transform: `rotate(-${player.rotation * (180 / Math.PI)}deg)`,
              transformOrigin: "center",
              zIndex: 10,
            }}
          />
        );
      })}
    </div>
  );
};

export default Minimap;
