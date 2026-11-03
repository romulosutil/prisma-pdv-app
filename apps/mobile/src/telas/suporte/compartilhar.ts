import { criarExportacaoTemporaria } from '@/util/exportacoes';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function compartilharJson(nome: string, conteudo: string, titulo = 'Exportar dados pessoais e comerciais'): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento indisponível.');
  const arquivo = criarExportacaoTemporaria(nome, conteudo);
  await Sharing.shareAsync(arquivo.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: titulo });
}
