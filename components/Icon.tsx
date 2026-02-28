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
  | 'trash'
  | 'sparkles'
  | 'photo'
  | 'chart-bar'
  | 'seedling'
  | 'pencil'
  | 'logout'
  | 'chevron-right'
  | 'info'
  | 'sun'
  | 'moon'
  | 'building'
  | 'star'
  | 'star-filled'
  | 'bookmark'
  | 'bookmark-filled'
  | 'camera'
  | 'share'
  | 'navigation'
  | 'tag'
  | 'flame'
  | 'target'
  | 'circle-check'
  | 'trophy';

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

  if (name === 'star-filled') {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z"
          fill={color}
          stroke="none"
        />
      </Svg>
    );
  }

  if (name === 'bookmark-filled') {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M14 2a5 5 0 0 1 5 5v14a1 1 0 0 1 -1.555 .832l-5.445 -3.63l-5.444 3.63a1 1 0 0 1 -1.556 -.831v-14a5 5 0 0 1 5 -5h4z"
          fill={color}
          stroke="none"
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
  sparkles: (
    <>
      <Path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2z" />
      <Path d="M3 12a6 6 0 0 1 6 6a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6z" />
      <Path d="M17 4a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2z" />
    </>
  ),
  photo: (
    <>
      <Path d="M15 8h.01" />
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Path d="M4 15l4 -4a3 5 0 0 1 3 0l5 5" />
      <Path d="M14 14l1 -1a3 5 0 0 1 3 0l2 2" />
    </>
  ),
  'chart-bar': (
    <>
      <Rect x={3} y={12} width={4} height={8} rx={1} />
      <Rect x={9} y={8} width={4} height={12} rx={1} />
      <Rect x={15} y={4} width={4} height={16} rx={1} />
    </>
  ),
  seedling: (
    <>
      <Path d="M12 10a6 6 0 0 0 -6 -6h-3v2a6 6 0 0 0 6 6h3" />
      <Path d="M12 14a6 6 0 0 1 6 -6h3v1a6 6 0 0 1 -6 6h-3" />
      <Path d="M12 20v-10" />
    </>
  ),
  pencil: (
    <Path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
  ),
  logout: (
    <>
      <Path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
      <Path d="M9 12h12l-3 -3" />
      <Path d="M18 15l3 -3" />
    </>
  ),
  'chevron-right': (
    <Path d="M9 6l6 6l-6 6" />
  ),
  info: (
    <>
      <Path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <Path d="M12 8l.01 0" />
      <Path d="M11 12h1v4h1" />
    </>
  ),
  sun: (
    <>
      <Path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
      <Path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />
    </>
  ),
  moon: (
    <>
      <Path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
    </>
  ),
  building: (
    <>
      <Path d="M3 21l18 0" />
      <Path d="M9 8l1 0" />
      <Path d="M9 12l1 0" />
      <Path d="M9 16l1 0" />
      <Path d="M14 8l1 0" />
      <Path d="M14 12l1 0" />
      <Path d="M14 16l1 0" />
      <Path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" />
    </>
  ),
  star: (
    <Path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />
  ),
  // star-filled + bookmark-filled have special handling above
  'star-filled': null,
  bookmark: (
    <Path d="M9 4h6a2 2 0 0 1 2 2v14l-5 -3l-5 3v-14a2 2 0 0 1 2 -2" />
  ),
  'bookmark-filled': null,
  camera: (
    <>
      <Path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" />
      <Path d="M12 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    </>
  ),
  share: (
    <>
      <Path d="M6 15m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <Path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <Path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <Path d="M8.7 13.7l6.6 2.6" />
      <Path d="M15.3 7.3l-6.6 2.6" />
    </>
  ),
  navigation: (
    <>
      <Path d="M12 18.5l-3 -1.5l-6 3v-13l6 -3l6 3l6 -3v7.5" />
      <Path d="M9 4v13" />
      <Path d="M15 7v5.5" />
      <Path d="M21.121 20.121a3 3 0 1 0 -4.242 0c.418 .419 1.125 1.045 2.121 1.879c1.051 -.89 1.759 -1.516 2.121 -1.879z" />
      <Path d="M19 18v.01" />
    </>
  ),
  tag: (
    <>
      <Path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <Path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3z" />
    </>
  ),
  flame: (
    <Path d="M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z" />
  ),
  target: (
    <>
      <Path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <Path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" />
      <Path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    </>
  ),
  'circle-check': (
    <>
      <Path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <Path d="M9 12l2 2l4 -4" />
    </>
  ),
  trophy: (
    <>
      <Path d="M8 21l8 0" />
      <Path d="M12 17l0 4" />
      <Path d="M7 4l10 0" />
      <Path d="M17 4v8a5 5 0 0 1 -10 0v-8" />
      <Path d="M5 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M19 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    </>
  ),
};
