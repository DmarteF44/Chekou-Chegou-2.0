import "react-native-url-polyfill/auto";
import { decode, encode } from "base-64";

const globalScope = globalThis as typeof globalThis & {
  atob?: (value: string) => string;
  btoa?: (value: string) => string;
};

if (!globalScope.atob) globalScope.atob = decode;
if (!globalScope.btoa) globalScope.btoa = encode;
