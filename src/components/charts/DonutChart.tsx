import { Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

export type DonutSegment = { label: string; value: number; color: string };

type Props = {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
};

export default function DonutChart({ data, size = 120, strokeWidth = 16 }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let cumulative = 0;

  return (
    <View className="flex-row items-center">
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          {total === 0 ? (
            <Circle cx={cx} cy={cy} r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="none" />
          ) : (
            data
              .filter((d) => d.value > 0)
              .map((d, i) => {
                const segmentLength = (d.value / total) * circumference;
                const dashArray = `${segmentLength} ${circumference - segmentLength}`;
                const dashOffset = -cumulative;
                cumulative += segmentLength;
                return (
                  <Circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke={d.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    fill="none"
                    strokeLinecap="butt"
                  />
                );
              })
          )}
        </G>
      </Svg>

      <View className="ml-4 flex-1">
        {data.map((d) => (
          <View key={d.label} className="flex-row items-center mb-2">
            <View
              style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }}
              className="mr-2"
            />
            <Text className="text-text text-xs flex-1">{d.label}</Text>
            <Text className="text-text font-bold text-xs">{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
