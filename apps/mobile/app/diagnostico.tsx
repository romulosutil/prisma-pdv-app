import { Redirect } from 'expo-router';
const Diagnostico = process.env.EXPO_PUBLIC_AMBIENTE === 'homologacao' ? require('@/telemetria/TelaDiagnostico').default : null;
export default function DiagnosticoPiloto() { return Diagnostico ? <Diagnostico /> : <Redirect href="/" />; }
