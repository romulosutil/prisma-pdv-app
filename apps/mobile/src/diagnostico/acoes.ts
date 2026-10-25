import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { exportar, nomeDoArquivo, registrar } from './registro';

export type ResultadoCompartilhamento = 'compartilhado' | 'baixado' | 'indisponivel';

/** Copia o JSON compacto para a área de transferência; devolve quantos eventos foram. */
export async function copiarDiagnostico(): Promise<number> {
  const diagnostico = await exportar();
  await Clipboard.setStringAsync(JSON.stringify(diagnostico));
  registrar('app', 'diagnóstico copiado', { eventos: diagnostico.eventos.length });
  return diagnostico.eventos.length;
}

/** Grava `diagnostico-AAAAMMDD-HHMM.json` e abre o compartilhamento (na web, baixa o arquivo). */
export async function compartilharDiagnostico(): Promise<ResultadoCompartilhamento> {
  const diagnostico = await exportar();
  const conteudo = JSON.stringify(diagnostico, null, 2);
  const arquivoNome = nomeDoArquivo();

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json;charset=utf-8' }));
    const ancora = document.createElement('a');
    ancora.href = url;
    ancora.download = arquivoNome;
    document.body.appendChild(ancora);
    ancora.click();
    ancora.remove();
    URL.revokeObjectURL(url);
    return 'baixado';
  }

  if (!(await Sharing.isAvailableAsync())) return 'indisponivel';
  const arquivo = new File(Paths.cache, arquivoNome);
  arquivo.create({ overwrite: true });
  arquivo.write(conteudo);
  await Sharing.shareAsync(arquivo.uri, { mimeType: 'application/json', dialogTitle: 'Compartilhar diagnóstico', UTI: 'public.json' });
  registrar('app', 'diagnóstico compartilhado', { eventos: diagnostico.eventos.length });
  return 'compartilhado';
}
