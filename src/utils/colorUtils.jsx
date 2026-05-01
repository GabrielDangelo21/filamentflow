import React from 'react';

export const getColorFromName = (corName) => {
  if (!corName) return '#00F0FF';
  const n = corName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('preto') || n.includes('negro') || n.includes('black')) return '#6B7280';
  if (n.includes('branco') || n.includes('white') || n.includes('ivory') || n.includes('marfim')) return '#E2E8F0';
  if (n.includes('cinza escuro')) return '#64748B';
  if (n.includes('cinza') || n.includes('prata') || n.includes('prateado') || n.includes('silver')) return '#94A3B8';
  if (n.includes('escarlate') || n.includes('carmim') || n.includes('bordeux') || n.includes('bordo') || n.includes('vinho') || n.includes('sangue')) return '#B91C1C';
  if (n.includes('vermelho') || n.includes('red')) return '#EF4444';
  if (n.includes('laranja') || n.includes('orange')) return '#F97316';
  if (n.includes('amarelo') || n.includes('yellow') || n.includes('limao') || n.includes('lima')) return '#EAB308';
  if (n.includes('dourado') || n.includes('ouro') || n.includes('gold')) return '#D97706';
  if (n.includes('bege') || n.includes('creme') || n.includes('areia') || n.includes('caramelo')) return '#D4A96A';
  if (n.includes('marrom') || n.includes('cafe') || n.includes('brown') || n.includes('bronze') || n.includes('chocolate')) return '#92400E';
  if (n.includes('indigo') || n.includes('anil')) return '#4F46E5';
  if (n.includes('roxo') || n.includes('violeta') || n.includes('lilas') || n.includes('purple') || n.includes('amethyst') || n.includes('ametista')) return '#8B5CF6';
  if (n.includes('magenta') || n.includes('fucsia') || n.includes('rosa choque')) return '#D946EF';
  if (n.includes('rosa') || n.includes('pink')) return '#EC4899';
  if (n.includes('coral') || n.includes('salmon') || n.includes('salmo')) return '#F87171';
  if (n.includes('azul marinho') || n.includes('navy')) return '#1E40AF';
  if (n.includes('azul') || n.includes('blue') || n.includes('reflexo') || n.includes('celeste') || n.includes('safira')) return '#3B82F6';
  if (n.includes('ciano') || n.includes('turquesa') || n.includes('aqua') || n.includes('teal')) return '#06B6D4';
  if (n.includes('jade') || n.includes('muerdago') || n.includes('oliva') || n.includes('floresta') || n.includes('musgo') || n.includes('esmeralda')) return '#059669';
  if (n.includes('verde') || n.includes('green')) return '#10B981';
  if (n.includes('transparente') || n.includes('natural') || n.includes('cristal')) return '#CBD5E1';
  return '#00F0FF';
};

export const ColorDot = ({ cor, size = 10 }) => (
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
