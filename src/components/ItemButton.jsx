import React from "react";

function ItemButton({ onPress }) {
  return (
    <button
      onClick={onPress}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        backgroundColor: "rgba(128, 128, 128, 0.5)",
        border: "none",
        color: "white",
        fontSize: "24px",
        fontWeight: "bold",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      A
    </button>
  );
}

export default ItemButton;
