import fs from "fs";
import path from "path";
import { BoxScore } from "../gos/boxscore";
import { shoutcaster } from "./shoutcaster";

const STORAGE_BASE_PATH = path.normalize(__dirname + "/../../storage/");

const getFileName = (gameId: number) => `game-${gameId}.json`;

export function readGameScore(gameId: number): Promise<BoxScore | null> {
    return new Promise((res) => {
        try {
            fs.readFile(
                path.join(STORAGE_BASE_PATH, getFileName(gameId)),
                (err, data) => {
                    try {
                        if (err) {
                            if (err.code !== "ENOENT")
                                shoutcaster.error(
                                    "Failed to READ [%s] error: [%s]",
                                    gameId,
                                    err.message
                                );
                            return res(null);
                        }
                        res(JSON.parse(data.toString()));
                    } catch (e: any) {
                        shoutcaster.error(
                            "Failed to READ [%s] error: [%s]",
                            gameId,
                            e.message
                        );
                        res(null);
                    }
                }
            );
        } catch (e: any) {
            shoutcaster.error(
                "Failed to READ [%s] error: [%s]",
                gameId,
                e.message
            );
            res(null);
        }
    });
}

export function writeGameScore(gameScore: BoxScore): Promise<boolean> {
    return new Promise((res) => {
        try {
            fs.writeFile(
                path.join(STORAGE_BASE_PATH, getFileName(gameScore.id)),
                Buffer.from(JSON.stringify(gameScore)),
                (err) => {
                    if (err) {
                        shoutcaster.error(
                            "Failed to WRTIE [%s] error: [%s]",
                            gameScore.id,
                            err.message
                        );
                        return res(false);
                    }
                    res(true);
                }
            );
        } catch (e: any) {
            shoutcaster.error(
                "Failed to WRTIE [%s] error: [%s]",
                gameScore.id,
                e.message
            );
            res(false);
        }
    });
}
