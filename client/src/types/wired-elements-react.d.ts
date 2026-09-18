import type React from 'react';

declare module 'wired-elements-react' {
  interface CommonWiredProps {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    id?: string;
    key?: React.Key;
  }

  export const WiredButton: React.FC<CommonWiredProps & {
    elevation?: number;
    disabled?: boolean;
    onClick?: (e?: any) => void;
  }>;

  export const WiredCard: React.FC<CommonWiredProps & {
    elevation?: number;
    fill?: string;
  }>;

  export const WiredInput: React.FC<CommonWiredProps & {
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    type?: string;
    onChange?: (e: any) => void;
    onInput?: (e: any) => void;
    onKeyDown?: (e: any) => void;
  }>;

  export const WiredTextarea: React.FC<CommonWiredProps & {
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    rows?: number;
    maxrows?: number;
    onChange?: (e: any) => void;
    onInput?: (e: any) => void;
  }>;

  export const WiredCombo: React.FC<CommonWiredProps & {
    selected?: string;
    disabled?: boolean;
    onselected?: (e: any) => void;
  }>;

  export const WiredItem: React.FC<CommonWiredProps & {
    value?: string;
    text?: string;
  }>;

  export const WiredRadio: React.FC<CommonWiredProps & {
    checked?: boolean;
    disabled?: boolean;
    name?: string;
    text?: string;
    onChange?: (e: any) => void;
    onClick?: (e: any) => void;
  }>;

  export const WiredRadioGroup: React.FC<CommonWiredProps & {
    selected?: string;
    disabled?: boolean;
    onselected?: (e: any) => void;
  }>;

  export const WiredDialog: React.FC<CommonWiredProps & {
    open?: boolean;
    elevation?: number;
  }>;

  export const WiredDivider: React.FC<CommonWiredProps & {
    elevation?: number;
  }>;
}
