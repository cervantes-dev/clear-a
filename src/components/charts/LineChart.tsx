import { useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

export type ChartPoint = { label: string; value: number };

type Props = {
  data: ChartPoint[];
  height?: number;
  color?: string;
};

export default function LineChart({ data, height = 140, color = "#800020" }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const max = Math.max(...data.map((d) => d.value), 1);
  const paddingTop = 16;
  const paddingBottom = 24;
  const chartHeight = height - paddingTop - paddingBottom;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: paddingTop + chartHeight - (d.value / max) * chartHeight,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${
          paddingTop + chartHeight
        } Z`
      : "";

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Line
            x1={0}
            y1={paddingTop + chartHeight}
            x2={width}
            y2={paddingTop + chartHeight}
            stroke="#E5E7EB"
            strokeWidth={1}
          />
          {areaPath ? <Path d={areaPath} fill={color} fillOpacity={0.08} /> : null}
          {linePath ? <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" /> : null}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} />
          ))}
        </Svg>
      )}
      <View className="flex-row justify-between px-1 mt-1">
        {data.map((d, i) => (
          <Text key={i} className="text-text opacity-40 text-[10px]">
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}