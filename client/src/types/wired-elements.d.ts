import type React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wired-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        elevation?: number;
        disabled?: boolean;
      };
      'wired-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        elevation?: number;
        fill?: string;
      };
      'wired-input': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        placeholder?: string;
        value?: string;
        disabled?: boolean;
        type?: string;
      };
      'wired-textarea': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        placeholder?: string;
        value?: string;
        disabled?: boolean;
        rows?: number;
        maxrows?: number;
      };
      'wired-combo': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        selected?: string;
        disabled?: boolean;
      };
      'wired-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        value?: string;
        text?: string;
      };
      'wired-divider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        elevation?: number;
      };
      'wired-dialog': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        open?: boolean;
        elevation?: number;
      };
    }
  }
}

export {};
