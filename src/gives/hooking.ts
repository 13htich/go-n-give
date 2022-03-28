import { PlayDTO } from "../gos/plays";
import https from "https";
import { shoutcaster } from "../lockerroom/shoutcaster";

const NOAHS_ENDPOINT = "https://mhh-api.herokuapp.com/dump_n_chase";

export const hooking = (play: PlayDTO): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        try {
            const postData = JSON.stringify(play);
            const req = https.request(
                NOAHS_ENDPOINT,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(postData),
                    },
                },
                (res: any) => {
                    let body = "";

                    res.on("data", (chunk: string) => (body += chunk));

                    res.on("end", () => {
                        if (res.statusCode === 200) {
                            resolve(play.uuid);
                        }
                        reject(play.uuid);
                    });
                }
            );
            req.on("error", (e) => {
                shoutcaster.error("Uh oh.. : %s", e);
                reject(play.uuid);
            });
            req.write(postData);
            req.end();
        } catch (e) {
            shoutcaster.error("Uh oh.. : %s", e);
            reject(play.uuid);
        }
    });
};
