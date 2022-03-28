import https from "https";
import { askBettman } from "../lockerroom/askBettman";

import { gameplan } from "../lockerroom/gameplan";
import { shoutcaster } from "../lockerroom/shoutcaster";

interface GamesJSON {
    totalGames: number;
    dates: Array<{
        games: Array<{
            gamePk: number;
            gameDate: string;
            status: {
                statusCode: string;
            };
            teams: {
                home: {
                    team: {
                        id: number;
                    };
                };
                away: {
                    team: {
                        id: number;
                    };
                };
            };
        }>;
    }>;
}

export interface Game {
    id: number;
    ts: string;
    home: number; // teamId
    away: number; // teamId
    state: string; // "1" === scheduled, "7" === final
}

const validate = (json: any): json is GamesJSON => {
    return (
        json.dates &&
        Array.isArray(json.dates) &&
        json.dates.every((date: any) => {
            return (
                date.games &&
                Array.isArray(date.games) &&
                date.games.every((game: any) => {
                    // should be fine with < 100 games
                    return (
                        typeof game.gamePk === "number" &&
                        typeof game.gameDate === "string" &&
                        game.teams &&
                        game.teams.home &&
                        game.teams.home.team &&
                        typeof game.teams.home.team.id === "number" &&
                        game.teams.away &&
                        game.teams.away.team &&
                        typeof game.teams.away.team.id === "number"
                    );
                })
            );
        })
    );
};

const transform = (json: GamesJSON): Game[] => {
    return json.dates.reduce((games: Game[], date) => {
        for (const game of date.games) {
            games.push({
                id: game.gamePk,
                ts: game.gameDate,
                home: game.teams.home.team.id,
                away: game.teams.home.team.id,
                state: game.status.statusCode,
            });
        }
        return games;
    }, []);
};

export const loadGames = async (): Promise<Game[]> => {
    const params = new URLSearchParams({
        season: gameplan.year,
        gameType: gameplan.gameType,
    });
    const url = new URL(
        `/api/v1/schedule?${params.toString()}`,
        "https://statsapi.web.nhl.com"
    );
    const gamesJson = await askBettman(url);

    if (validate(gamesJson)) return transform(gamesJson);
    else {
        shoutcaster.error(
            "let me put my glasses on, that doesn't look quite right:\n%O",
            gamesJson
        );
        throw new Error("Invalid Games");
    }
};
