import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#26262C",
          border: "2px solid #F47725",
          borderRadius: "8px",
          color: "#F47725",
          display: "flex",
          fontSize: "13px",
          fontWeight: 800,
          height: "32px",
          justifyContent: "center",
          letterSpacing: "0",
          width: "32px",
        }}
      >
        TA
      </div>
    ),
    {
      ...size,
    }
  );
}
