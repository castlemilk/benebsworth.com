/** Curated deterministic strokes. Decorative only; never alter diagram geometry. */
export function AnnotationMark({kind='arrow',className=''}:{kind?:'arrow'|'underline'|'bracket'|'circle';className?:string}) {
 const paths={arrow:'M93 8C58 12 35 28 19 61C16 67 13 74 12 82M10 67L12 83L26 72',underline:'M5 35C29 31 54 38 78 33S131 30 156 34M16 40C54 37 93 41 135 37',bracket:'M31 7C19 9 15 8 12 13L10 78C15 82 22 80 32 82M8 24L7 65',circle:'M143 18C113 4 55 6 24 25C-4 42 8 67 44 76C89 88 145 76 157 52C169 30 141 12 110 10'};
 return <svg className={'annotation-mark '+className} aria-hidden="true" focusable="false" viewBox={kind==='underline'?'0 26 165 20':kind==='arrow'||kind==='bracket'?'0 0 100 90':'0 0 165 90'} preserveAspectRatio={kind==='underline'?'none':'xMidYMid meet'} fill="none"><path d={paths[kind]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg>
}
