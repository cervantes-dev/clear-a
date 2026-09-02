import { useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { ChartPoint } from "./LineChart";

type Props = {
  data: ChartPoint[];
  height?: number;
  color?: string;
};

export default function BarChart({ data, height = 140, color = "#800020" }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const max = Math.max(...data.map((d) => d.value), 1);
  const paddingBottom = 24;
  const chartHeight = height - paddingBottom;
  const gap = 8;
  const barWidth = data.length > 0 ? (width - gap * (data.length - 1)) / data.length : 0;

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const barHeight = (d.value / max) * chartHeight;
            const x = i * (barWidth + gap);
            const y = chartHeight - barHeight;
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx={4}
                fill={color}
                fillOpacity={d.value === 0 ? 0.15 : 0.85}
              />
            );
          })}
        </Svg>
      )}
      <View className="flex-row justify-between mt-1">
        {data.map((d, i) => (
          <Text key={i} className="text-text opacity-40 text-[10px]" style={{ width: barWidth }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}