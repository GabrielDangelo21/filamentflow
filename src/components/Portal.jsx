import { createPortal } from 'react-dom';

// Renderiza direto no <body>. Pop-ups e avisos (position: fixed) precisam disso para cobrir a tela
// inteira: dentro da área de conteúdo eles ficariam presos a ela, porque ela é a referência das
// container queries (container-type), e isso também vale para elementos com position: fixed.
export default function Portal({ children }) {
  return createPortal(children, document.body);
}
