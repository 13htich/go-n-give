import https from "https";
import { askBettman } from "../lockerroom/askBettman";

import { gameplan } from "../lockerroom/gameplan";
import { shoutcaster } from "../lockerroom/shoutcaster";
import { Game } from "./games";

interface BoxScoreJSON {
    teams: {
        home: {
            team: {
                id: number;
            };
            teamStats: {
                teamSkaterStats: { goals: number };
            };
            players: {
                // id prefixed with 'ID'
                [idString: string]: {
                    person: {
                        id: number;
                    };
                    stats: {
                        skaterStats?: {
                            assists: number;
                            goals: number;
                        };
                        goalieStats?: {
                            assists: number;
                            goals: number;
                            decision?: "W" | "L";
                        };
                    };
                };
            };
        };
        away: {
            team: {
                id: number;
            };
            teamStats: {
                teamSkaterStats: { goals: number };
            };
            players: {
                // id prefixed with 'ID'
                [idString: string]: {
                    person: {
                        id: number;
                    };
                    stats: {
                        skaterStats?: {
                            assists: number;
                            goals: number;
                        };
                        goalieStats?: {
                            assists: number;
                            goals: number;
                            decision?: "W" | "L";
                        };
                    };
                };
            };
        };
    };
}

// X = game in play
type GoalieOutcome = "W" | "SO" | undefined;

interface PlayerStats {
    goals: number;
    assists: number;
    outcome?: GoalieOutcome;
}

export interface BoxScore {
    id: number;
    ts: string;
    home: {
        id: number;
        score: number;
        players: {
            [id: number]: PlayerStats;
        };
    };
    away: {
        id: number;
        score: number;
        players: {
            [id: number]: PlayerStats;
        };
    };
}

const validate = (json: any): json is BoxScoreJSON => {
    //todo
    return true;
};

const transform = (json: BoxScoreJSON, game: Game): BoxScore => {
    const homeBoys = Object.values(json.teams.home.players).reduce(
        (
            theBoys: {
                [id: number]: PlayerStats;
            },
            playa
        ) => {
            // only one of these will be defined, sometimes niether.
            const skaterStats = playa.stats.skaterStats;
            const goalieStats = playa.stats.goalieStats;
            if (!skaterStats && !goalieStats) {
                // must be the coaches son, just ignore these players....
                return theBoys;
            }
            if (goalieStats) {
                const outcome: GoalieOutcome =
                    goalieStats.decision === "W" &&
                    json.teams.away.teamStats.teamSkaterStats.goals === 0
                        ? "SO"
                        : goalieStats.decision === "W"
                        ? "W"
                        : undefined;
                theBoys[playa.person.id] = {
                    goals: goalieStats.goals,
                    assists: goalieStats.assists,
                    outcome,
                };
            }
            if (skaterStats) {
                theBoys[playa.person.id] = {
                    goals: skaterStats.goals,
                    assists: skaterStats.assists,
                };
            }
            return theBoys;
        },
        {}
    );

    const awayBoys = Object.values(json.teams.away.players).reduce(
        (
            theBoys: {
                [id: number]: PlayerStats;
            },
            playa
        ) => {
            // only one of these will be defined, sometimes niether.
            const skaterStats = playa.stats.skaterStats;
            const goalieStats = playa.stats.goalieStats;
            if (!skaterStats && !goalieStats) {
                // must be the coaches son, just ignore these players....
                return theBoys;
            }
            if (goalieStats) {
                const outcome: GoalieOutcome =
                    goalieStats.decision === "W" &&
                    json.teams.home.teamStats.teamSkaterStats.goals === 0
                        ? "SO"
                        : goalieStats.decision === "W"
                        ? "W"
                        : undefined;
                theBoys[playa.person.id] = {
                    goals: goalieStats.goals,
                    assists: goalieStats.assists,
                    outcome,
                };
            }
            if (skaterStats) {
                theBoys[playa.person.id] = {
                    goals: skaterStats.goals,
                    assists: skaterStats.assists,
                };
            }
            return theBoys;
        },
        {}
    );
    return {
        id: game.id,
        ts: game.ts,
        home: {
            id: json.teams.home.team.id,
            score: json.teams.home.teamStats.teamSkaterStats.goals,
            players: homeBoys,
        },
        away: {
            id: json.teams.away.team.id,
            score: json.teams.away.teamStats.teamSkaterStats.goals,
            players: awayBoys,
        },
    };
};

// https://statsapi.web.nhl.com/api/v1/game/2021020482/boxscore
export const loadScore = async (game: Game): Promise<BoxScore> => {
    const url = new URL(
        `/api/v1/game/${game.id}/boxscore`,
        "https://statsapi.web.nhl.com"
    );
    const boxScoreJson = await askBettman(url);

    if (validate(boxScoreJson)) return transform(boxScoreJson, game);
    else {
        shoutcaster.error(
            "let me put my glasses on, that doesn't look quite right:\n%O",
            boxScoreJson
        );
        throw new Error("Invalid Boxscore");
    }
};
