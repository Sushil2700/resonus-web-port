import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
export function useDesktop() { const {width} = useWindowDimensions(); return Platform.OS === 'web' && width >= 1000; }
export function DesktopChrome() { return null; }
