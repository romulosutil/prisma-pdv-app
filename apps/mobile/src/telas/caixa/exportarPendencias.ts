import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function exportarPendencias(conteudo: string): Promise<void> {
  const nome = 'pdv-pendencias-para-revisao.json';
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json;charset=utf-8' }));
    const ancora = document.createElement('a');
    ancora.href = url;
    ancora.download = nome;
    document.body.appendChild(ancora);
    ancora.click();
    ancora.remove();
    URL.revokeObjectURL(url);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartilhamento indisponível.');
  const arquivo = new File(Paths.cache, nome);
  arquivo.create({ overwrite: true });
  arquivo.write(conteudo);
  await Sharing.shareAsync(arquivo.uri, { mimeType: 'application/json', dialogTitle: 'Exportar pendências para revisão', UTI: 'public.json' });
}
