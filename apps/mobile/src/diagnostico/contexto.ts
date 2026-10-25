import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Dados } from '@/dados/dados';
import type { ContextoDiagnostico } from './registro';

interface ConstantesAndroid {
  Brand?: string;
  Manufacturer?: string;
  Model?: string;
  Release?: string;
  Version?: number;
}

/** Marca, modelo e sistema vêm do próprio React Native (`Platform.constants`), sem módulo nativo extra. */
function descreverAparelho(): ContextoDiagnostico['aparelho'] {
  const constantes = (Platform.constants ?? {}) as ConstantesAndroid;
  if (Platform.OS === 'android') {
    return {
      marca: constantes.Brand ?? constantes.Manufacturer ?? null,
      modelo: constantes.Model ?? null,
      so: 'android',
      versaoSo: constantes.Release ? `${constantes.Release}${constantes.Version ? ` (API ${constantes.Version})` : ''}` : null,
    };
  }
  return { marca: null, modelo: null, so: Platform.OS, versaoSo: String(Platform.Version ?? '') || null };
}

/** Contexto da exportação: versão do app, aparelho e contagens do estado atual (sem dados de clientes). */
export function criarFonteDeContexto(dados: Dados): () => ContextoDiagnostico {
  return () => {
    const { assinatura, licenca } = dados.assinatura.obter();
    return {
      app: {
        versao: Constants.expoConfig?.version ?? 'desconhecida',
        versionCode: Constants.expoConfig?.android?.versionCode ?? null,
        ferramentasTeste: true,
        modo: dados.backend.modo === 'demo' ? 'demo' : 'api',
      },
      aparelho: descreverAparelho(),
      estado: {
        rotaAtual: null,
        plano: licenca?.planoId ?? assinatura?.planoId ?? null,
        statusAssinatura: assinatura?.status ?? null,
        produtos: dados.produtos.listar().length,
        vendasHoje: dados.vendas.listarPorDia(dados.relogio.agora()).length,
      },
    };
  };
}
