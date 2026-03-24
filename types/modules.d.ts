// Typ-Deklarationen fuer native Module die erst im Custom Dev Build verfuegbar sind.
// Diese Deklarationen verhindern TypeScript-Fehler waehrend der Entwicklung mit Expo Go.

declare module 'react-native-onesignal' {
  const OneSignal: {
    initialize(appId: string): void;
    Notifications: {
      requestPermission(fallback: boolean): Promise<boolean>;
      addEventListener(event: string, handler: (e: { notification: { additionalData?: Record<string, unknown> } }) => void): void;
    };
    User: {
      pushSubscription: {
        getIdAsync(): Promise<string | null>;
      };
    };
  };
  export default OneSignal;
}

declare module '@rnmapbox/maps' {
  import type { ComponentType } from 'react';
  import type { ViewStyle } from 'react-native';

  export function setAccessToken(token: string): void;

  export const MapView: ComponentType<{
    style?: ViewStyle;
    styleURL?: string;
    logoEnabled?: boolean;
    attributionEnabled?: boolean;
    compassEnabled?: boolean;
    scaleBarEnabled?: boolean;
    onRegionDidChange?: (feature: { properties: { visibleBounds: number[][] }; geometry: { coordinates: number[] } }) => void;
    children?: React.ReactNode;
  }>;

  export const Camera: ComponentType<{
    defaultSettings?: { centerCoordinate?: number[]; zoomLevel?: number };
  }>;

  export const PointAnnotation: ComponentType<{
    id: string;
    coordinate: number[];
    onSelected?: () => void;
    children?: React.ReactNode;
  }>;

  export const ShapeSource: ComponentType<{
    id: string;
    shape: GeoJSON.FeatureCollection;
    cluster?: boolean;
    clusterRadius?: number;
    children?: React.ReactNode;
  }>;

  export const SymbolLayer: ComponentType<{
    id: string;
    style?: Record<string, unknown>;
    filter?: unknown[];
  }>;

  export const CircleLayer: ComponentType<{
    id: string;
    style?: Record<string, unknown>;
    filter?: unknown[];
  }>;

  const _default: {
    setAccessToken: typeof setAccessToken;
    MapView: typeof MapView;
    Camera: typeof Camera;
    PointAnnotation: typeof PointAnnotation;
    ShapeSource: typeof ShapeSource;
    SymbolLayer: typeof SymbolLayer;
    CircleLayer: typeof CircleLayer;
  };
  export default _default;
}
