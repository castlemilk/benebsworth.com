import React from 'react';
import { Diagram } from '@/components/diagram/diagram';
import pllData from '@/content/blog/pll-from-first-principles/pll-feedback.json';

export function PllDiagram() {
    return <Diagram data={pllData} />;
}
