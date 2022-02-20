import fs from "fs";
import path from "path";
import { BoxScore } from "../gos/boxscore";
import { shoutcaster } from "./shoutcaster";

const STORAGE_BASE_PATH = path.normalize(__dirname + "/../../storage/");

const getFileName = (gameId: number) => `game-${gameId}.json`;

export async function readGameScore(gameId: number): Promise<BoxScore | null> {
    return await new Promise((res, rej) => {
        fs.readFile(
            path.join(STORAGE_BASE_PATH, getFileName(gameId)),
            (err, data) => {
                if (err) {
                    if (err.code !== "ENOENT") shoutcaster.error(err.message);
                    return res(null);
                }
                res(JSON.parse(data.toString()));
            }
        );
    });
}

export async function writeGameScore(gameScore: BoxScore): Promise<boolean> {
    return await new Promise((res) => {
        fs.writeFile(
            path.join(STORAGE_BASE_PATH, getFileName(gameScore.id)),
            Buffer.from(JSON.stringify(gameScore)),
            (err) => {
                if (err) {
                    shoutcaster.error(err.message);
                    return res(false);
                }
                res(true);
            }
        );
    });
}
