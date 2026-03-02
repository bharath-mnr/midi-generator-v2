// //E:\pro\midigenerator_v2\frontend\src\components\shared\Icons.jsx

// Thin SVG icon component
const Icon = ({ d, size = 18, stroke = 'currentColor', fill = 'none', sw = 1.6, style, ...rest }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24"
    fill={fill} stroke={stroke}
    strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round"
    style={style}
    {...rest}
  >
    <path d={d} />
  </svg>
)

export const Waveform   = (p) => <Icon {...p} d="M2 12h4l3-9 4 18 3-9 4 0" />
export const BookOpen   = (p) => <Icon {...p} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
export const Clock      = (p) => <Icon {...p} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
export const Wrench     = (p) => <Icon {...p} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
export const Send       = (p) => <Icon {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
export const Download   = (p) => <Icon {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
export const Upload     = (p) => <Icon {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
export const Trash      = (p) => <Icon {...p} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
export const Music      = (p) => <Icon {...p} d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
export const Copy       = (p) => <Icon {...p} d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4h-2M8 4v4h8M8 4h8" />
export const Check      = (p) => <Icon {...p} d="M20 6L9 17l-5-5" />
export const FileText   = (p) => <Icon {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
export const AlertTri   = (p) => <Icon {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
export const Plus       = (p) => <Icon {...p} d="M12 5v14M5 12h14" />
export const Activity   = (p) => <Icon {...p} d="M22 12h-4l-3 9L9 3l-3 9H2" />

export const Scissors = (p) => <Icon {...p} d="M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 0l10 10M6 9l10-10M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />