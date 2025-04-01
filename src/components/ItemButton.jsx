import React from "react";

function ItemButton({ onPress }) {
  return (
    <div
      onTouchEnd={onPress}
      style={{
        position: "fixed",
        bottom: "35px",
        right: "20px",
        width: "75px",
        height: "75px",
        borderRadius: "50%",
        backgroundColor: "rgba(128, 128, 128, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <span
        style={{
          color: "white",
          fontSize: "24px",
          fontWeight: "bold",
        }}
      >
        A
      </span>
    </div>
  );
}

export default ItemButton;
