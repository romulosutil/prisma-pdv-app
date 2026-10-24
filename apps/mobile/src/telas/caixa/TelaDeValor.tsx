import type { Centavos } from '@pdv/shared';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { EntradaDeValor } from '@/componentes/EntradaDeValor';

export interface TelaDeValorProps {
  titulo: string;
  onVoltar: () => void;
  descricao?: string;
  rotuloCampo: string;
  valorCentavos: Centavos;
  onChange: (valorCentavos: Centavos) => void;
  erro?: string | null;
  /** Conteúdo entre a descrição e o campo de valor (ex.: esperado na gaveta). */
  antes?: ReactNode;
  /** Conteúdo depois do teclado (ex.: campo de motivo, resultado da contagem). */
  depois?: ReactNode;
  acao: { rotulo: string; onPress: () => void; desabilitado?: boolean; carregando?: boolean };
}

/** Tela de uma tarefa de caixa com um valor digitado no teclado numérico (abrir, fechar, sangria, suprimento). */
export function TelaDeValor({ titulo, onVoltar, descricao, rotuloCampo, valorCentavos, onChange, erro, antes, depois, acao }: TelaDeValorProps) {
  return (
    <TelaBase
      rolavel
      bordas={['top']}
      style={estilos.tela}
      rodape={<Botao rotulo={acao.rotulo} onPress={acao.onPress} desabilitado={acao.desabilitado} carregando={acao.carregando} />}
    >
      <CabecalhoTela titulo={titulo} onVoltar={onVoltar} rotuloVoltar="Voltar para o caixa" />
      {descricao ? (
        <Texto estilo="corpo" cor={cores.ink2}>
          {descricao}
        </Texto>
      ) : null}
      {antes}
      <EntradaDeValor rotulo={rotuloCampo} valorCentavos={valorCentavos} onChange={onChange} erro={erro} />
      {depois}
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 16, paddingTop: 16, paddingBottom: 24 },
});
