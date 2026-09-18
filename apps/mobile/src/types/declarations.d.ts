declare module 'lucide-react-native' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';

  export interface IconProps extends SvgProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }

  export type Icon = React.FC<IconProps>;

  export const ArrowDownLeft: Icon;
  export const ArrowUpRight: Icon;
  export const AlertCircle: Icon;
  export const AlertTriangle: Icon;
  export const Bell: Icon;
  export const CheckCircle: Icon;
  export const CheckCircle2: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const Clock: Icon;
  export const Copy: Icon;
  export const FileText: Icon;
  export const Filter: Icon;
  export const Flame: Icon;
  export const Hash: Icon;
  export const Key: Icon;
  export const LogOut: Icon;
  export const Shield: Icon;
  export const ShieldCheck: Icon;
  export const Swords: Icon;
  export const Trophy: Icon;
  export const User: Icon;
  export const Users: Icon;
  export const Wallet: Icon;
  export const X: Icon;
  export const Zap: Icon;

  const icons: Record<string, Icon>;
  export default icons;
}
