import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Confirmacao } from '@/componentes/Confirmacao';
import { Secao } from '@/componentes/Secao';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { cores } from '@/tema';
import { compartilharDiagnostico } from './acoes';
import { limpar, registrar } from './registro';
import { useCopiarDiagnostico, useQuantidadeDeEventos } from './useDiagnostico';

/** Seção de Ajustes da versão de testes: copiar, compartilhar e limpar o diagnóstico. Só é montada com `FERRAMENTAS_TESTE`. */
export function SecaoDiagnostico() {
  const toast = useToast();
  const quantidade = useQuantidadeDeEventos();
  const copiar = useCopiarDiagnostico();
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);

  const compartilhar = async () => {
    setCompartilhando(true);
    try {
      const resultado = await compartilharDiagnostico();
      if (resultado === 'indisponivel') toast.mostrar('Compartilhar arquivos não está disponível neste aparelho.', { tipo: 'erro' });
      else if (resultado === 'baixado') toast.mostrar('Arquivo de diagnóstico baixado.', { tipo: 'sucesso' });
    } catch (erro) {
      registrar('erro', 'falha ao compartilhar o diagnóstico', erro);
      toast.mostrar('Não foi possível gerar o arquivo de diagnóstico.', { tipo: 'erro' });
    } finally {
      setCompartilhando(false);
    }
  };

  const confirmarLimpeza = async () => {
    await limpar();
    setConfirmandoLimpeza(false);
    toast.mostrar('Diagnóstico limpo.', { tipo: 'sucesso' });
  };

  return (
    <Secao titulo="Diagnóstico (versão de testes)">
      <Texto estilo="legenda" cor={cores.ink3} accessibilityLiveRegion="polite">
        {`${quantidade} ${quantidade === 1 ? 'evento registrado' : 'eventos registrados'}. Não inclui número de cartão, códigos de login nem nomes de clientes.`}
      </Texto>
      <View style={estilos.botoes}>
        <Botao
          rotulo="Copiar diagnóstico"
          tamanho="M"
          larguraTotal
          accessibilityHint="Copia o registro de eventos em JSON para colar na conversa com o desenvolvedor"
          onPress={() => void copiar()}
        />
        <Botao
          rotulo="Compartilhar arquivo"
          variante="terciario"
          tamanho="M"
          larguraTotal
          carregando={compartilhando}
          accessibilityHint="Gera um arquivo JSON do diagnóstico e abre o compartilhamento"
          onPress={() => void compartilhar()}
        />
        <Botao
          rotulo="Limpar diagnóstico"
          variante="perigo"
          tamanho="M"
          larguraTotal
          desabilitado={quantidade === 0}
          accessibilityHint="Apaga os eventos registrados neste aparelho"
          onPress={() => setConfirmandoLimpeza(true)}
        />
      </View>
      <Confirmacao
        visivel={confirmandoLimpeza}
        onFechar={() => setConfirmandoLimpeza(false)}
        titulo="Limpar diagnóstico?"
        texto="Os eventos registrados neste aparelho serão apagados. Faça isso antes de repetir um teste, para o diagnóstico mostrar só o que aconteceu nele."
        rotuloConfirmar="Limpar"
        perigo
        onConfirmar={() => void confirmarLimpeza()}
      />
    </Secao>
  );
}

const estilos = StyleSheet.create({
  botoes: { gap: 8, marginTop: 4 },
});
