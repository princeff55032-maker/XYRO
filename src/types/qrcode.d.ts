declare module "qrcode" {
  export interface QRCodeToDataURLOptions {
    type?: string;
    rendererOpts?: Record<string, unknown>;
    margin?: number;
    scale?: number;
    width?: number;
    errorCorrectionLevel?: "low" | "medium" | "quartile" | "high" | "L" | "M" | "Q" | "H";
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toDataURL(
    text: string | Buffer | Array<unknown>,
    options?: QRCodeToDataURLOptions
  ): Promise<string>;

  export function toDataURL(
    text: string | Buffer | Array<unknown>,
    options: QRCodeToDataURLOptions,
    callback: (error: Error | null, url: string) => void
  ): void;

  export function toString(
    text: string | Buffer | Array<unknown>,
    options?: Record<string, unknown>
  ): Promise<string>;
}
