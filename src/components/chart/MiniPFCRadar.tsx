import React from 'react';
import { RadarChart, type RadarDataPoint } from './RadarChart';

interface MiniPFCRadarProps {
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  proteinTarget: number;
  fatTarget: number;
  carbsTarget: number;
  fiberTarget: number;
  isDark: boolean;
  size?: number;
}

function MiniPFCRadarComponent({
  protein,
  fat,
  carbs,
  fiber,
  proteinTarget,
  fatTarget,
  carbsTarget,
  fiberTarget,
  isDark,
  size = 120,
}: MiniPFCRadarProps) {
  const data: RadarDataPoint[] = [
    { label: 'P', value: protein, maxValue: proteinTarget },
    { label: 'F', value: fat, maxValue: fatTarget },
    { label: 'C', value: carbs, maxValue: carbsTarget },
    { label: '繊維', value: fiber, maxValue: fiberTarget },
  ];

  return (
    <RadarChart
      data={data}
      size={size}
      isDark={isDark}
      showLabels={false}
      animated={true}
    />
  );
}

export const MiniPFCRadar = React.memo(MiniPFCRadarComponent);
