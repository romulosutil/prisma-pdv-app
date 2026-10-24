import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icone } from '@/componentes/Icone';
import { cores, raio, texto } from '@/tema';
import { useFoco } from '@/tema/useFoco';

export interface CampoBuscaProps {
  valor: string;
  onChange: (valor: string) => void;
  rotulo: string;
  placeholder: string;
}

/** Busca em linha única, com botão para limpar (alvo de 48). */
export function CampoBusca({ valor, onChange, rotulo, placeholder }: CampoBuscaProps) {
  const [focado, setFocado] = useState(false);
  const limpar = useFoco();
  return (
    <View style={[estilos.caixa, { borderColor: focado ? cores.anil : 'transparent' }]}>
      <Icone nome="lupa" tamanho={20} cor={cores.ink3} />
      <TextInput
        value={valor}
        onChangeText={onChange}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        accessibilityLabel={rotulo}
        role="searchbox"
        placeholder={placeholder}
        placeholderTextColor={cores.ink3}
        selectionColor={cores.anil}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={[texto.corpoMedio, estilos.entrada]}
      />
      {valor ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpar busca"
          onPress={() => onChange('')}
          onFocus={limpar.aoFocar}
          onBlur={limpar.aoDesfocar}
          hitSlop={4}
          style={[estilos.limpar, limpar.anel]}
        >
          <Icone nome="fechar" tamanho={18} cor={cores.ink2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: raio.md,
    borderWidth: 2,
    backgroundColor: cores.surface,
  },
  entrada: { flex: 1, minHeight: 48, color: cores.ink, outlineWidth: 0 },
  limpar: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
