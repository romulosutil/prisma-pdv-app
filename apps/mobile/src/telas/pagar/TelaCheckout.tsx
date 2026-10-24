import { formatarBRL, multiplicarPreco } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone } from '@/componentes/Icone';
import { Segmentado } from '@/componentes/Segmentado';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { rotuloDaQuantidade, useCarrinho } from '@/dados/carrinho';
import type { ProvedorPagamento } from '@/dados/tipos';
import { cores, raio, textoBotao } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { CabecalhoPagamento } from './CabecalhoPagamento';
import { FolhaUpgrade } from './FolhaUpgrade';
import { useMeiosDisponiveis } from './meiosDisponiveis';
import { NOME_TAP } from './rotulos';
import { TileMeio } from './TileMeio';
import { useCobranca } from './useCobranca';

export function TelaCheckout() {
  const router = useRouter();
  const carrinho = useCarrinho();
  const { finalizar, ocupado } = useCobranca();
  const { integracao, conectados, comProvedor, padrao } = useMeiosDisponiveis();

  const [itensAbertos, setItensAbertos] = useState(false);
  const [upgradeAberto, setUpgradeAberto] = useState(false);
  const [escolhaPix, setEscolhaPix] = useState<ProvedorPagamento | null>(null);
  const [escolhaTap, setEscolhaTap] = useState<ProvedorPagamento | null>(null);

  const provedorPix = conectados.find((p) => p.id === escolhaPix) ?? padrao;
  const provedorTap = conectados.find((p) => p.id === escolhaTap) ?? padrao;
  const opcoes = conectados.map((p) => ({ valor: p.id, rotulo: p.nome }));

  const parcial = carrinho.pagoCentavos > 0;
  const quitado = carrinho.restanteCentavos === 0;
  const textoItens = carrinho.quantidade === 1 ? '1 item' : `${carrinho.quantidade} itens`;

  return (
    <TelaBase rolavel>
      <CabecalhoPagamento titulo="Cobrar" rotuloVoltar="Voltar para a venda" onVoltar={parcial ? false : undefined} />

      <View style={estilos.resumo}>
        <Texto estilo="legenda" cor={cores.ink3}>
          {parcial ? 'Falta cobrar' : 'Total da venda'}
        </Texto>
        <Dinheiro centavos={carrinho.restanteCentavos} estilo="display" />
        {parcial ? (
          <Texto estilo="corpoMedio" cor={cores.ink2} numerico accessibilityLabel={`Já recebido ${falarDinheiro(carrinho.pagoCentavos)} de ${falarDinheiro(carrinho.totalCentavos)}`}>
            {`Já recebido ${formatarBRL(carrinho.pagoCentavos)} de ${formatarBRL(carrinho.totalCentavos)}`}
          </Texto>
        ) : null}
        <ListaDeItens
          aberta={itensAbertos}
          rotulo={`${textoItens} · ${itensAbertos ? 'ocultar itens' : 'ver itens'}`}
          onAlternar={() => setItensAbertos((aberta) => !aberta)}
        />
      </View>

      {quitado ? (
        <View style={estilos.meios}>
          <Banner tipo="info" texto="O valor da venda já foi recebido. Falta só registrar a venda." />
          <Botao rotulo="Concluir venda" carregando={ocupado} onPress={() => void finalizar()} />
        </View>
      ) : (
        <View style={estilos.meios}>
          <Texto estilo="tituloL" accessibilityRole="header">
            Como o cliente vai pagar?
          </Texto>

          <TileMeio
            titulo="Pix"
            legenda={comProvedor ? 'QR Code na tela, confirma sozinho' : 'QR da sua chave Pix, você confirma'}
            icone={comProvedor ? undefined : 'pix'}
            monograma={comProvedor ? provedorPix?.monograma : undefined}
            fundo={comProvedor ? provedorPix?.fundo : undefined}
            cor={comProvedor ? provedorPix?.cor : undefined}
            onPress={() => router.push({ pathname: '/pagar/pix', params: comProvedor && provedorPix ? { provedor: provedorPix.id } : {} })}
            abaixo={
              comProvedor && opcoes.length > 1 ? (
                <Segmentado rotuloGrupo="Provedor do Pix" opcoes={opcoes} valor={provedorPix?.id ?? opcoes[0]!.valor} onChange={setEscolhaPix} />
              ) : null
            }
          />

          {comProvedor && provedorTap ? (
            <TileMeio
              titulo="Cartão por aproximação"
              legenda={`No próprio celular · ${NOME_TAP[provedorTap.id]}`}
              monograma={provedorTap.monograma}
              fundo={provedorTap.fundo}
              cor={provedorTap.cor}
              onPress={() => router.push({ pathname: '/pagar/tap', params: { provedor: provedorTap.id } })}
              abaixo={
                opcoes.length > 1 ? (
                  <Segmentado
                    rotuloGrupo="App de aproximação"
                    opcoes={conectados.map((p) => ({ valor: p.id, rotulo: NOME_TAP[p.id] }))}
                    valor={provedorTap.id}
                    onChange={setEscolhaTap}
                  />
                ) : null
              }
            />
          ) : integracao ? (
            <TileMeio
              titulo="Cartão por aproximação"
              legenda="Conecte InfinitePay ou Mercado Pago"
              icone="cartao"
              etiqueta={{ texto: 'Conectar' }}
              situacao="Nenhum provedor conectado"
              onPress={() => router.push('/ajustes')}
            />
          ) : (
            <TileMeio
              titulo="Cartão por aproximação"
              legenda="Disponível no plano Negócio"
              icone="cartao"
              etiqueta={{ texto: 'Negócio', icone: 'cadeado' }}
              situacao="Bloqueado no seu plano. Toque para ver os planos"
              onPress={() => setUpgradeAberto(true)}
            />
          )}

          <TileMeio
            titulo="Cartão"
            legenda="Registre o crédito ou débito da sua maquininha"
            icone="cartao"
            onPress={() => router.push('/pagar/cartao')}
          />
          <TileMeio titulo="Dinheiro" legenda="Calcula o troco" icone="dinheiro" onPress={() => router.push('/pagar/dinheiro')} />
          {carrinho.restanteCentavos > 1 ? (
            <TileMeio titulo="Dividir pagamento" legenda="Ex.: parte em dinheiro, resto no Pix" icone="dividir" onPress={() => router.push('/pagar/dividir')} />
          ) : null}
        </View>
      )}

      <FolhaUpgrade visivel={upgradeAberto} onFechar={() => setUpgradeAberto(false)} />
    </TelaBase>
  );
}

function ListaDeItens({ aberta, rotulo, onAlternar }: { aberta: boolean; rotulo: string; onAlternar: () => void }) {
  const { itens } = useCarrinho();
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        accessibilityState={{ expanded: aberta }}
        onPress={onAlternar}
        onFocus={aoFocar}
        onBlur={aoDesfocar}
        style={[estilos.alternar, anel]}
      >
        <Texto cor={cores.anil} style={textoBotao.M}>
          {rotulo}
        </Texto>
        <Icone nome={aberta ? 'chevronCima' : 'chevronBaixo'} tamanho={20} cor={cores.anil} />
      </Pressable>
      {aberta ? (
        <View style={estilos.itens}>
          {itens.map((item, i) => (
            <View
              key={item.chave}
              accessible
              accessibilityLabel={`${item.descricao}, ${rotuloDaQuantidade(item)}, ${falarDinheiro(multiplicarPreco(item.precoUnitarioCentavos, item.quantidadeMilesimos))}`}
              style={[estilos.item, i < itens.length - 1 && estilos.divisor]}
            >
              <Texto estilo="corpo" numerico style={estilos.nomeItem}>
                {`${rotuloDaQuantidade(item)} ${item.descricao}`}
              </Texto>
              <Dinheiro centavos={multiplicarPreco(item.precoUnitarioCentavos, item.quantidadeMilesimos)} estilo="corpoMedio" accessible={false} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  resumo: { gap: 4, paddingTop: 8, paddingBottom: 20 },
  alternar: { alignSelf: 'flex-start', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: -12, paddingHorizontal: 12, borderRadius: 999 },
  itens: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: raio.md, backgroundColor: cores.surface },
  item: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  divisor: { borderBottomWidth: 1, borderBottomColor: cores.line },
  nomeItem: { flex: 1 },
  meios: { gap: 12, paddingBottom: 8 },
});
