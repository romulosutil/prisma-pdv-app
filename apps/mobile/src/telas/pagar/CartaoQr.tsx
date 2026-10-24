import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';
import { cores, raio } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';

const TAMANHO_QR = 236;

/** QR do Pix num cartão branco (o código precisa de fundo claro para ser lido). */
export function CartaoQr({ codigo, valorCentavos }: { codigo: string; valorCentavos: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`QR Code Pix de ${falarDinheiro(valorCentavos)}`} style={estilos.cartao}>
      <QRCode value={codigo} size={TAMANHO_QR} ecl="M" color={cores.ink} backgroundColor={cores.bg} />
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { alignSelf: 'center', padding: 16, borderRadius: raio.lg, borderWidth: 1, borderColor: cores.line, backgroundColor: cores.bg },
});
