const express = require('express');
const cors = require('cors');
const wppconnect = require('@wppconnect-team/wppconnect');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 21465;

// Estado da sessão
let client = null;
let qrCodeData = null;
let sessionStatus = 'disconnected'; // disconnected | connecting | connected

/**
 * Inicializa a sessão WPPConnect
 */
async function startSession() {
    sessionStatus = 'connecting';
    try {
        client = await wppconnect.create({
            session: 'jackeline-session',
            catchQR: (base64Qr, asciiQR) => {
                qrCodeData = base64Qr;
                console.log('QR Code gerado. Acesse GET /qrcode para visualizar.');
            },
            statusFind: (statusSession, session) => {
                console.log('Status da sessão:', statusSession);
                if (statusSession === 'isLogged' || statusSession === 'inChat') {
                    sessionStatus = 'connected';
                    qrCodeData = null;
                } else if (statusSession === 'notLogged') {
                    sessionStatus = 'disconnected';
                }
            },
            headless: true,
            useChrome: false,
            puppeteerOptions: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
            folderNameToken: 'tokens',
        });

        sessionStatus = 'connected';
        qrCodeData = null;
        console.log('Sessão WhatsApp conectada com sucesso!');

        // Listener para mensagens recebidas (preparado para uso futuro)
        client.onMessage((message) => {
            console.log('Mensagem recebida de', message.from, ':', message.body);
        });

    } catch (error) {
        console.error('Erro ao iniciar sessão:', error.message);
        sessionStatus = 'disconnected';
    }
}

// ========================
// ENDPOINTS
// ========================

/**
 * GET /status-session
 * Retorna o status atual da sessão do WhatsApp
 */
app.get('/status-session', (req, res) => {
    res.json({
        status: sessionStatus,
        connected: sessionStatus === 'connected',
    });
});

/**
 * GET /qrcode
 * Retorna o QR Code para autenticação da sessão
 */
app.get('/qrcode', (req, res) => {
    if (sessionStatus === 'connected') {
        return res.json({ status: 'connected', message: 'Sessão já está conectada.' });
    }
    if (!qrCodeData) {
        return res.json({ status: 'waiting', message: 'QR Code ainda não foi gerado. Aguarde...' });
    }
    res.json({
        status: 'qrcode',
        qrcode: qrCodeData,
    });
});

/**
 * GET /qrcode/image
 * Retorna o QR Code como imagem para visualização direta no navegador
 */
app.get('/qrcode/image', (req, res) => {
    if (!qrCodeData) {
        return res.status(404).send('QR Code não disponível');
    }
    const base64Data = qrCodeData.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    res.set('Content-Type', 'image/png');
    res.send(imgBuffer);
});

/**
 * POST /send-text
 * Envia uma mensagem de texto via WhatsApp
 * Body: { "phone": "5511999999999", "message": "Mensagem de teste" }
 */
app.post('/send-text', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({
            success: false,
            error: 'Os campos "phone" e "message" são obrigatórios.',
        });
    }

    if (sessionStatus !== 'connected' || !client) {
        return res.status(503).json({
            success: false,
            error: 'Sessão do WhatsApp não está conectada.',
        });
    }

    try {
        // Remove qualquer sufixo existente e usa apenas os dígitos
        const cleanPhone = phone.replace(/@.*$/, '').replace(/\D/g, '');

        // Verifica se o número está registrado no WhatsApp
        const numberStatus = await client.checkNumberStatus(`${cleanPhone}@c.us`);
        if (!numberStatus || !numberStatus.numberExists) {
            return res.status(400).json({
                success: false,
                error: 'Número não encontrado no WhatsApp. Verifique se o número está correto e inclui o DDI (ex: 5511999999999).',
            });
        }

        // Usa o ID retornado pelo próprio WhatsApp para evitar erro de LID
        const whatsappId = numberStatus.id?._serialized || `${cleanPhone}@c.us`;

        const result = await client.sendText(whatsappId, message);
        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso.',
            details: {
                to: whatsappId,
                messageId: result.id,
            },
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error.message);
        res.status(500).json({
            success: false,
            error: 'Falha ao enviar mensagem.',
            details: error.message,
        });
    }
});

// ========================
// INICIALIZAÇÃO
// ========================

app.listen(PORT, () => {
    console.log(`WhatsApp Gateway rodando na porta ${PORT}`);
    console.log(`Status: http://localhost:${PORT}/status-session`);
    console.log(`QR Code: http://localhost:${PORT}/qrcode`);
    startSession();
});
