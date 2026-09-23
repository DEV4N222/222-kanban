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
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: 3,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#BE2448",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          222
        </div>
      </div>
    ),
    { ...size }
  );
}
