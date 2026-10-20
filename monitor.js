const CITY_ID = "68";
const EVENT_ID = "31537";

const TARGET_THEATER_ID = "25";
const TARGET_THEATER_KEY = "uci-new-york-city-center";

const DATES = ["2026-12-18", "2026-12-19"];

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
};

async function sendTelegramAlert(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("⚠️ Credenciais do Telegram não encontradas. Mensagem no console:");
        console.log(message);
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
            }),
        });

        if (res.ok) {
            console.log("✅ Alerta enviado para o Telegram com sucesso!");
        } else {
            console.error("❌ Falha no envio do Telegram. Status:", res.status);
        }
    } catch (err) {
        console.error("❌ Erro ao chamar API do Telegram:", err.message);
    }
}

async function checkDate(date) {
    const url = `https://api-content.ingresso.com/v0/sessions/city/${CITY_ID}/event/${EVENT_ID}/partnership/home/groupBy/sessionType?date=${date}`;

    try {
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) return false;

        const data = await response.json();
        if (!data || data.length === 0) return false;

        for (const group of data) {
            if (!group.theaters) continue;

            for (const theater of group.theaters) {
                const isTargetTheater =
                    String(theater.id) === TARGET_THEATER_ID ||
                    theater.urlKey === TARGET_THEATER_KEY;

                if (isTargetTheater) {
                    const rooms = theater.rooms || [];
                    if (rooms.length > 0) {
                        return {
                            available: true,
                            date,
                            theaterName: theater.name,
                            roomsCount: rooms.length,
                        };
                    }
                }
            }
        }
        return false;
    } catch (error) {
        console.error(`[${date}] Erro na requisição:`, error.message);
        return false;
    }
}

async function run() {
    console.log(`[${new Date().toLocaleString("pt-BR")}] Checando ingressos...`);

    for (const date of DATES) {
        const result = await checkDate(date);
        if (result && result.available) {
            const msg = `🚨 INGRESSOS LIBERADOS!\n\nFilme ID: ${EVENT_ID}\nCinema: ${result.theaterName}\nData: ${result.date}\nSessões disponíveis: ${result.roomsCount}`;
            await sendTelegramAlert(msg);
        } else {
            console.log(`[${date}] Ingressos ainda não disponíveis no UCI New York City Center.`);
        }
    }
}

run();