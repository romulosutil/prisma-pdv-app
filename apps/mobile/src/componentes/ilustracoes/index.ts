import type { ComponentType } from 'react';
import type { ConteudoIlustraProps } from './comum';
import { ConteudoBusca } from './busca';
import { ConteudoCesta } from './cesta';
import { ConteudoCheck } from './check';
import { ConteudoGrafico } from './grafico';
import { ConteudoLanterna } from './lanterna';
import { ConteudoLoja } from './loja';
import { ConteudoMoedas } from './moedas';
import { ConteudoOffline } from './offline';
import { ConteudoPausa } from './pausa';
import { ConteudoPix } from './pix';
import { ConteudoProduto } from './produto';
import { ConteudoRecibo } from './recibo';
import { ConteudoScanner } from './scanner';
import { ConteudoTap } from './tap';

/** Mapa kind -> conteúdo SVG. Contrato fixo: 14 kinds. */
export const ILUSTRACOES = {
  scanner: ConteudoScanner,
  cesta: ConteudoCesta,
  moedas: ConteudoMoedas,
  tap: ConteudoTap,
  pix: ConteudoPix,
  produto: ConteudoProduto,
  check: ConteudoCheck,
  offline: ConteudoOffline,
  recibo: ConteudoRecibo,
  lanterna: ConteudoLanterna,
  loja: ConteudoLoja,
  pausa: ConteudoPausa,
  busca: ConteudoBusca,
  grafico: ConteudoGrafico,
} satisfies Record<string, ComponentType<ConteudoIlustraProps>>;
