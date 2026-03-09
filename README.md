# WhatsApp Gateway - WPPConnect

Serviço Node.js responsável pela conexão com o WhatsApp Web via WPPConnect.

## Instalação

```bash
cd whatsapp-gateway
npm install
```

## Execução

```bash
npm start
```

O serviço iniciará na porta **21465** e gerará um QR Code para autenticação.

## Endpoints

| Método | Endpoint          | Descrição                          |
|--------|-------------------|------------------------------------|
| GET    | /status-session   | Status da sessão do WhatsApp       |
| GET    | /qrcode           | QR Code em JSON (base64)           |
| GET    | /qrcode/image     | QR Code como imagem PNG            |
| POST   | /send-text        | Enviar mensagem de texto           |

### POST /send-text

```json
{
  "phone": "5511999999999",
  "message": "Mensagem de teste"
}
```

## Sessões

As sessões são persistidas na pasta `tokens/` para evitar login frequente.
