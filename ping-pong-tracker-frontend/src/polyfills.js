// src/polyfills.js

// Polyfill TextEncoder and TextDecoder for Jest's JSDOM environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;