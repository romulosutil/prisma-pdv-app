import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Scanner } from '@/componentes/Scanner';
import { TelaBase } from '@/componentes/TelaBase';
import { useToast } from '@/componentes/Toast';
import { useProdutos } from '@/dados/hooks';
import { somenteDigitos } from './logica';
import { useVoltar } from '@/util/useVoltar';

/** "Cadastrar bipando": código novo vai para a busca no catálogo; código já cadastrado abre a edição. */
export function CadastroPorCamera() {
  const router = useRouter();
  const toast = useToast();
  const voltar = useVoltar('/produtos');
  const focada = useIsFocused();
  const { buscarPorEan } = useProdutos();
  // A navegação demora um instante; sem a trava, uma segunda leitura abriria duas telas.
  const navegando = useRef(false);

  useFocusEffect(
    useCallback(() => {
      navegando.current = false;
    }, []),
  );

  const ler = useCallback(
    (codigo: string) => {
      const ean = somenteDigitos(codigo);
      if (navegando.current) return;
      if (!/^\d{8,14}$/.test(ean)) {
        toast.mostrar('Esse não parece um código de barras de produto.', { tipo: 'erro' });
        return;
      }
      navegando.current = true;
      const existente = buscarPorEan(ean);
      if (existente) {
        toast.mostrar(`${existente.nome} já está cadastrado. Abrindo para editar.`);
        router.push({ pathname: '/produtos/[id]', params: { id: existente.id } });
      } else {
        router.push({ pathname: '/produtos/buscando', params: { ean } });
      }
    },
    [buscarPorEan, router, toast],
  );

  return (
    <TelaBase bordas={['top']} semMargem>
      <Scanner onLer={ler} pausado={!focada} onFechar={voltar} titulo="Cadastro" />
    </TelaBase>
  );
}
