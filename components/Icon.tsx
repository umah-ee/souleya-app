/**
 * Tabler Icons – React Native SVG Komponente
 * Quelle: https://tabler.io/icons (MIT-Lizenz)
 * Regeln: stroke-width="1.5", stroke-linecap="round", stroke-linejoin="round", fill="none"
 * Farbe: ueber color-Prop (Standard: currentColor/inherit)
 */

import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'compass'
  | 'users'
  | 'user'
  | 'heart'
  | 'heart-filled'
  | 'message-circle'
  | 'x'
  | 'map-pin'
  | 'current-location'
  | 'plus'
  | 'check'
  | 'edit'
  | 'map'
  | 'search'
  | 'arrow-left'
  | 'send'
  | 'corner-up-left'
  | 'face-smile'
  | 'trash';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 16, color = '#C8A96E' }: IconProps) {
  if (name === 'heart-filled') {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"
          fill={color}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      {paths[name]}
    </Svg>
  );
}

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <Path d="M5 12l-2 0l9 -9l9 9l-2 0" />
      <Path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
      <Path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
    </>
  ),
  compass: (
    <>
      <Path d="M8 16l2 -6l6 -2l-2 6l-6 2" />
      <Path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    </>
  ),
  users: (
    <>
      <Path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
      <Path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <Path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
    </>
  ),
  user: (
    <>
      <Path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
      <Path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
    </>
  ),
  heart: (
    <Path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
  ),
  // fill + stroke werden ueber die HeartFilled-Sonderbehandlung in der Komponente gesetzt
  'heart-filled': null,
  'message-circle': (
    <Path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1" />
  ),
  x: (
    <>
      <Path d="M18 6l-12 12" />
      <Path d="M6 6l12 12" />
    </>
  ),
  'map-pin': (
    <>
      <Path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
      <Path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
    </>
  ),
  'current-location': (
    <>
      <Path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <Path d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0" />
      <Path d="M12 2v2" />
      <Path d="M12 20v2" />
      <Path d="M20 12h2" />
      <Path d="M2 12h2" />
    </>
  ),
  plus: (
    <>
      <Path d="M12 5l0 14" />
      <Path d="M5 12l14 0" />
    </>
  ),
  check: (
    <Path d="M5 12l5 5l10 -10" />
  ),
  edit: (
    <>
      <Path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
      <Path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" />
      <Path d="M16 5l3 3" />
    </>
  ),
  map: (
    <>
      <Path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13" />
      <Path d="M9 4v13" />
      <Path d="M15 7v13" />
    </>
  ),
  search: (
    <>
      <Path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
      <Path d="M21 21l-6 -6" />
    </>
  ),
  'arrow-left': (
    <>
      <Path d="M5 12l14 0" />
      <Path d="M5 12l6 6" />
      <Path d="M5 12l6 -6" />
    </>
  ),
  send: (
    <>
      <Path d="M10 14l11 -11" />
      <Path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
    </>
  ),
  'corner-up-left': (
    <>
      <Path d="M14 9l-4 -4l4 -4" />
      <Path d="M10 5h5a6 6 0 0 1 6 6v2" />
    </>
  ),
  'face-smile': (
    <>
      <Path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <Path d="M9 10l.01 0" />
      <Path d="M15 10l.01 0" />
      <Path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
    </>
  ),
  trash: (
    <>
      <Path d="M4 7l16 0" />
      <Path d="M10 11l0 6" />
      <Path d="M14 11l0 6" />
      <Path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
      <Path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
    </>
  ),
};
