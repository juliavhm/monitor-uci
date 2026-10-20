const CITY_ID = "68";
const EVENT_ID = "31537";

const TARGET_THEATER_ID = "25";
const TARGET_THEATER_KEY = "uci-new-york-city-center";

const DATES = ["2026-12-18", "2026-12-19"];

const PHONE_NUMBER = process.env.WPP_PHONE;
const API_KEY = process.env.WPP_API_KEY;

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
};

async function sendWhatsAppAlert(message) {
    if (!PHONE_NUMBER || !API_KEY) {
        console.log("⚠️ Credenciais do WhatsApp não encontradas. Print da mensagem:");
        console.log(message);
        return;
    }

    const encodedText = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodedText}&apikey=${API_KEY}`;

    try {
        const res = await fetch(url);
        if (res.ok) {
            console.log("✅ Alerta enviado para o WhatsApp com sucesso!");
        } else {
            console.error("❌ Falha no envio do WhatsApp. Status:", res.status);
        }
    } catch (err) {
        console.error("❌ Erro ao chamar API do WhatsApp:", err.message);
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
            await sendWhatsAppAlert(msg);
        } else {
            console.log(`[${date}] Ingressos ainda não disponíveis no UCI New York City Center.`);
        }
    }
}

run();