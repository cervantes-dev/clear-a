import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface Props {
  height?: number;
  children?: React.ReactNode;
}

export default function CurvedHeader({
  height = 220,
  children,
}: Props) {
  return (
    <View style={{ height }}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 220"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {/* Shadow */}
        <Path
          fill="#5C001A"
          d="
            M0 0
            H400
            V220
            Q200 120 0 220
            Z
          "
        />

        {/* Main */}
        <Path
          fill="#800020"
          d="
            M0 0
            H400
            V205
            Q200 105 0 205
            Z
          "
        />
      </Svg>

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}