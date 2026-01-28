/**
 * Type declaration for bcryptjs
 * This is a backend-only package, but authService.browser.ts imports it
 * for legacy browser-based auth (not used in production with backend API)
 */
declare module 'bcryptjs' {
  export function hash(data: string, saltRounds: number): Promise<string>;
  export function compare(data: string, hash: string): Promise<boolean>;
  
  interface BcryptJS {
    hash(data: string, saltRounds: number): Promise<string>;
    compare(data: string, hash: string): Promise<boolean>;
  }
  
  const bcrypt: BcryptJS;
  export default bcrypt;
}
