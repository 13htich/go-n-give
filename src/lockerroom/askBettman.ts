import https from "https";
import { shoutcaster } from "./shoutcaster";

export const askBettman = async (url: URL) => {
    return await new Promise((resolve, reject) => {
        const req = https.get(url, (res: any) => {
            let body = "";

            res.on("data", (chunk: string) => (body += chunk));

            res.on("end", () => {
                resolve(JSON.parse(body));
            });
        });
        req.on("error", reject);
    }).catch((e) => shoutcaster.error("Uh oh.. : %s", e.message));
};
