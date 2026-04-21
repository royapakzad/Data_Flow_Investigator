declare module "react-simple-maps" {
  import type { CSSProperties, ReactNode, SVGProps, MouseEvent } from "react";

  interface Geography {
    rsmKey: string;
    id: string | number;
    properties: Record<string, unknown>;
    [key: string]: unknown;
  }

  interface GeographiesChildrenProps {
    geographies: Geography[];
    outline: unknown;
    borders: unknown;
  }

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
  }

  interface GeographiesProps {
    geography: string | object;
    children: (props: GeographiesChildrenProps) => ReactNode;
    [key: string]: unknown;
  }

  interface GeoStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    outline?: string;
    cursor?: string;
    transition?: string;
    pointerEvents?: string;
  }

  interface GeographyProps extends Omit<SVGProps<SVGPathElement>, "style"> {
    geography: Geography;
    style?: {
      default?: GeoStyle;
      hover?: GeoStyle;
      pressed?: GeoStyle;
    };
    onClick?: (event: MouseEvent<SVGPathElement>) => void;
    onMouseEnter?: (event: MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: MouseEvent<SVGPathElement>) => void;
  }

  export function ComposableMap(props: ComposableMapProps): JSX.Element;
  export function Geographies(props: GeographiesProps): JSX.Element;
  export function Geography(props: GeographyProps): JSX.Element;
  export function ZoomableGroup(props: { children?: ReactNode; [key: string]: unknown }): JSX.Element;
  export function Marker(props: { coordinates: [number, number]; children?: ReactNode; [key: string]: unknown }): JSX.Element;
  export function Graticule(props: Record<string, unknown>): JSX.Element;
}
