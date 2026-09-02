import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface Props {
  height?: number;
  children?: React.ReactNode;
}

export default function WaveHeader({
  height = 190,
  children,
}: Props) {
  return (
    <View style={{ height }}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 190"
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
            V130
            C340 170 280 175 220 145
            C150 110 80 115 0 145
            Z
          "
        />

        {/* Main */}
        <Path
          fill="#800020"
          d="
            M0 0
            H400
            V115
            C340 155 280 160 220 130
            C150 95 80 100 0 130
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