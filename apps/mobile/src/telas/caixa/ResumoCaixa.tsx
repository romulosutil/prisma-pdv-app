import { PLANOS, planoMinimoPara, type MovimentoCaixa } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone } from '@/componentes/Icone';
import { LinhaLista } from '@/componentes/LinhaLista';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useCaixa, useConta, useLicenca, useResumoDoDia } from '@/dados/hooks';
import { cores, raio } from '@/tema';
import { FolhaDePlano } from '@/componentes/FolhaDePlano';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { formatarHora } from '@/util/tempo';
import { CabecalhoCaixa } from './CabecalhoCaixa';
import { IconeCaixa } from './icones';
import { compararGaveta, textoDaGaveta } from './logica';
import { LinhaValor } from './LinhaValor';

type TipoMovimento = MovimentoCaixa['tipo'];

const ROTULO_MOVIMENTO: Record<TipoMovimento, string> = { sangria: 'Sangria', suprimento: 'Suprimento' };

export function ResumoCaixa() {
  const router = useRouter();
  const { perfil, primeiroNome } = useConta();
  const { caixa, historico } = useCaixa();
  const resumo = useResumoDoDia();
  const { podeUsar } = useLicenca();
  const [avisoPlano, setAvisoPlano] = useState(false);

  const movimentosLiberados = podeUsar('sangria_suprimento');
  const planoMovimentos = PLANOS[planoMinimoPara('sangria_suprimento')].nome;
  const movimentos = caixa?.movimentos ?? [];
  const ultimoFechamento = historico
    .flatMap((c) => (c.fechamento ? [c.fechamento] : []))
    .sort((a, b) => b.em.localeCompare(a.em))[0];

  const meios = [
    { nome: 'Dinheiro', icone: 'dinheiro', valor: resumo.porMeio.dinheiro },
    { nome: 'Pix', icone: 'pix', valor: resumo.porMeio.pix },
    { nome: 'Cartão', icone: 'cartao', valor: resumo.porMeio.cartao },
  ] as const;

  const esperado = resumo.esperadoNaGavetaCentavos;
  // Parte do esperado que veio de vendas em dinheiro desde a abertura (nem todo o dinheiro do dia, se o caixa abriu depois).
  const dinheiroVendido = esperado === null ? 0 : esperado - resumo.trocoInicialCentavos - resumo.suprimentosCentavos + resumo.sangriasCentavos;

  const abrirMovimento = (tipo: TipoMovimento) => {
    if (movimentosLiberados) router.push({ pathname: '/caixa/movimento', params: { tipo } });
    else setAvisoPlano(true);
  };

  return (
    <TelaBase rolavel bordas={['top']} style={estilos.tela}>
      <CabecalhoCaixa secao="resumo" />

      <View
        accessible
        accessibilityLabel={`Vendido hoje: ${falarDinheiro(resumo.totalCentavos)}, em ${resumo.quantidadeVendas} ${resumo.quantidadeVendas === 1 ? 'venda' : 'vendas'}. ${
          caixa ? `Caixa aberto às ${formatarHora(new Date(caixa.abertura.em))}` : 'Caixa fechado'
        }`}
        style={estilos.totais}
      >
        <Texto estilo="label" cor={cores.ink2}>
          {caixa ? `Aberto às ${formatarHora(new Date(caixa.abertura.em))} por ${primeiroNome} · ${perfil?.aparelhoNome ?? ''}` : 'Caixa fechado'}
        </Texto>
        <Dinheiro centavos={resumo.totalCentavos} estilo="display" accessible={false} />
        <Texto estilo="corpoMedio" cor={cores.ink2}>
          {`${resumo.quantidadeVendas} ${resumo.quantidadeVendas === 1 ? 'venda' : 'vendas'} hoje`}
        </Texto>
      </View>

      <View style={estilos.meios}>
        {meios.map((meio) => (
          <View key={meio.nome} accessible accessibilityLabel={`${meio.nome}: ${falarDinheiro(meio.valor)}`} style={estilos.meio}>
            <View style={estilos.iconeMeio}>
              <Icone nome={meio.icone} tamanho={22} />
            </View>
            <View style={estilos.dadosMeio}>
              <View style={estilos.linhaMeio}>
                <Texto estilo="corpoMedio">{meio.nome}</Texto>
                <Dinheiro centavos={meio.valor} estilo="corpoMedio" accessible={false} />
              </View>
              <View style={estilos.trilho} aria-hidden>
                <View style={[estilos.barra, { width: `${resumo.totalCentavos > 0 ? (meio.valor / resumo.totalCentavos) * 100 : 0}%` }]} />
              </View>
            </View>
          </View>
        ))}
      </View>

      {caixa && esperado !== null ? (
        <>
          <View style={estilos.cartao}>
            <Texto estilo="tituloM" accessibilityRole="header" style={estilos.tituloCartao}>
              Conferir gaveta
            </Texto>
            <LinhaValor rotulo="Troco inicial" centavos={resumo.trocoInicialCentavos} />
            <LinhaValor rotulo="Dinheiro vendido" centavos={dinheiroVendido} divisor />
            {resumo.suprimentosCentavos > 0 ? <LinhaValor rotulo="Suprimentos" sinal="+" centavos={resumo.suprimentosCentavos} divisor /> : null}
            {resumo.sangriasCentavos > 0 ? <LinhaValor rotulo="Sangrias" sinal="−" centavos={resumo.sangriasCentavos} divisor /> : null}
            <LinhaValor rotulo="Esperado na gaveta" centavos={esperado} destaque divisor />
          </View>

          <Botao rotulo="Fechar caixa" icone="fecharCaixa" onPress={() => router.push('/caixa/fechar')} />

          <View style={estilos.movimentos}>
            <View style={estilos.botoesMovimento}>
              {(['sangria', 'suprimento'] as const).map((tipo) => (
                <Botao
                  key={tipo}
                  rotulo={ROTULO_MOVIMENTO[tipo]}
                  icone={movimentosLiberados ? undefined : 'cadeado'}
                  variante="terciario"
                  tamanho="M"
                  larguraTotal
                  style={estilos.botaoMovimento}
                  accessibilityHint={movimentosLiberados ? undefined : `Disponível no plano ${planoMovimentos}`}
                  onPress={() => abrirMovimento(tipo)}
                />
              ))}
            </View>
            {movimentosLiberados ? null : (
              <Texto estilo="legenda" cor={cores.ink3}>
                {`Retirar ou colocar dinheiro na gaveta: disponível no plano ${planoMovimentos}.`}
              </Texto>
            )}
          </View>

          {movimentos.length > 0 ? (
            <View style={estilos.lista}>
              <Texto estilo="tituloM" accessibilityRole="header">
                Movimentos da gaveta
              </Texto>
              {movimentos.map((m, i) => (
                <LinhaLista
                  key={m.id}
                  titulo={ROTULO_MOVIMENTO[m.tipo]}
                  subtitulo={`${formatarHora(new Date(m.criadoEm))}${m.motivo ? ` · ${m.motivo}` : ''}`}
                  rotuloAcessivel={`${ROTULO_MOVIMENTO[m.tipo]} às ${formatarHora(new Date(m.criadoEm))}${m.motivo ? `, ${m.motivo}` : ''}: ${falarDinheiro(m.valorCentavos)}`}
                  miniatura={<IconeCaixa nome={m.tipo} />}
                  divisor={i < movimentos.length - 1}
                  valor={<Dinheiro centavos={m.valorCentavos} estilo="corpoMedio" accessible={false} />}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View style={estilos.fechado} accessibilityRole="summary">
          <Texto estilo="tituloM" accessibilityRole="header">
            Caixa fechado
          </Texto>
          <Texto estilo="corpo" cor={cores.ink2}>
            {ultimoFechamento
              ? `Último fechamento às ${formatarHora(new Date(ultimoFechamento.em))}. ${textoDaGaveta(compararGaveta(ultimoFechamento.esperadoCentavos, ultimoFechamento.contadoCentavos))}.`
              : 'Abra o caixa com o troco inicial para conferir a gaveta no fim do dia.'}
          </Texto>
          <Botao rotulo="Abrir caixa" icone="caixa" onPress={() => router.push('/caixa/abrir')} />
        </View>
      )}

      <FolhaDePlano
        visivel={avisoPlano}
        onFechar={() => setAvisoPlano(false)}
        titulo="Sangria e suprimento"
        texto={`Registre o dinheiro que sai da gaveta (sangria) ou que entra para reforçar o troco (suprimento), e a conferência do fim do dia fica certa. Disponível a partir do plano ${planoMovimentos}.`}
        planoNome={planoMovimentos}
      />
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 20, paddingTop: 24, paddingBottom: 32 },
  totais: { gap: 4, padding: 20, borderRadius: raio.lg, backgroundColor: cores.surface },
  meios: { gap: 12 },
  meio: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconeMeio: { width: 44, height: 44, borderRadius: raio.md, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.surface },
  dadosMeio: { flex: 1, gap: 6 },
  linhaMeio: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  trilho: { height: 8, borderRadius: 999, backgroundColor: cores.surface2, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 999, backgroundColor: cores.ink },
  cartao: { paddingHorizontal: 16, paddingBottom: 4, borderRadius: raio.md, backgroundColor: cores.surface },
  tituloCartao: { paddingTop: 16, paddingBottom: 4 },
  movimentos: { gap: 8 },
  botoesMovimento: { flexDirection: 'row', gap: 8 },
  botaoMovimento: { flex: 1 },
  lista: { gap: 4 },
  fechado: { gap: 12, padding: 20, borderRadius: raio.lg, backgroundColor: cores.surface },
});
