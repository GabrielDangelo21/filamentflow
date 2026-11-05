import { getColorFromName } from '../utils/colorUtils';

// Bolinha com a cor do filamento (deduzida do nome da cor)
const ColorDot = ({ cor, size = 10 }) => (
  <span style={{
    display: 'inline-block',
    width: size,
    height: size,
    borderRadius: '50%',
    background: getColorFromName(cor),
    border: '1px solid rgba(255,255,255,0.25)',
    flexShrink: 0,
  }} />
);

export default ColorDot;
