import { criarExportacaoTemporaria } from '@/util/exportacoes';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type ResultadoCompartilhamento = 'compartilhado' | 'baixado' | 'indisponivel';

/** Entrega o CSV: na web baixa o arquivo; no aparelho grava no cache e abre a folha de compartilhamento. */
export async function compartilharCsv(nomeDoArquivo: string, conteudo: string): Promise<ResultadoCompartilhamento> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
    const ancora = document.createElement('a');
    ancora.href = url;
    ancora.download = nomeDoArquivo;
    document.body.appendChild(ancora);
    ancora.click();
    ancora.remove();
    URL.revokeObjectURL(url);
    return 'baixado';
  }

  if (!(await Sharing.isAvailableAsync())) return 'indisponivel';
  const arquivo = criarExportacaoTemporaria(nomeDoArquivo, conteudo);
  await Sharing.shareAsync(arquivo.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Exportar vendas',
    UTI: 'public.comma-separated-values-text',
  });
  return 'compartilhado';
}
