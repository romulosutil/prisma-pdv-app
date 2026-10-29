# Certificado público de teste

cert.pem e key.pem formam uma identidade autoassinada exclusivamente para os testes SMTP em127.0.0.1. A chave é deliberadamente pública e não autentica nenhum serviço real. Não usar essa identidade em implantação.

O SAN contém somente IP127.0.0.1. Validade:29/10/2026 a26/10/2036. Substituir o par antes do vencimento e repetir os testes positivos e negativos de TLS. O certificado foi gerado localmente com OpenSSL, sem alterar o armazenamento de certificados do Windows.

Somente os subprocessos dos testes positivos recebem NODE_EXTRA_CA_CERTS com cert.pem. O processo pai e o sistema não ganham essa confiança; os testes negativos continuam verificando rejeição. Nenhum teste desliga a verificação de certificados.
