const CITY_ID = "2";
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
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
        });

        if (!res.ok) {
            console.error("❌ Erro ao enviar mensagem no Telegram. Status:", res.status);
        }
    } catch (err) {
        console.error("❌ Erro na API do Telegram:", err.message);
    }
}

async function checkDate(date) {
    const url = `https://api-content.ingresso.com/v0/sessions/city/${CITY_ID}/event/${EVENT_ID}/partnership/home/groupBy/sessionType?date=${date}`;

    try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) {
            console.log(`[${date}] HTTP Error: ${res.status}`);
            return { available: false };
        }

        const data = await res.json();
        const theaters = data[0]?.theaters || [];

        const targetTheater = theaters.find(
            (t) => String(t.id) === String(TARGET_THEATER_ID) || t.urlKey === TARGET_THEATER_KEY
        );

        if (!targetTheater) {
            console.log(`[${date}] Cinema ID ${TARGET_THEATER_ID} ainda não abriu sessões.`);
            return { available: false };
        }

        const sessions = targetTheater.sessionTypes.flatMap((st) => st.sessions);

        if (sessions.length > 0) {
            console.log(`[${date}] 🎉 INGRESSOS DISPONÍVEIS! Encontradas ${sessions.length} sessões.`);
            return {
                available: true,
                date,
                sessionsCount: sessions.length,
                theaterName: targetTheater.name,
            };
        } else {
            return { available: false };
        }
    } catch (err) {
        return { available: false };
    }
}

async function run() {
    console.log(`[${new Date().toLocaleString("pt-BR")}] Checando ingressos...`);

    const availableDates = [];

    for (const date of DATES) {
        const result = await checkDate(date);
        if (result && result.available) {
            availableDates.push(result);
        }
    }

    if (availableDates.length > 0) {
        const details = availableDates
            .map((item) => `- Data: ${item.date} (${item.sessionsCount} sessões encontradas)`)
            .join("\n");

        const msg = `INGRESSOS LIBERADOS AMOR!\n\nCinema: ${availableDates[0].theaterName}\n${details}`;
        await sendTelegramAlert(msg);
    } else {
        await sendTelegramAlert("Ainda sem ingresso </3");
    }
}

run();