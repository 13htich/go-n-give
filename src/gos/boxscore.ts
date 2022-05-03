import https from "https";
import { askBettman } from "../lockerroom/askBettman";

import { gameplan } from "../lockerroom/gameplan";
import { shoutcaster } from "../lockerroom/shoutcaster";
import { Game } from "./games";

interface PlayerJSON {
    person: {
        id: number;
    };
    stats: {
        skaterStats?: {
            timeOnIce: string;
            assists: number;
            goals: number;
            hits: number;
            blocked: number;
            shortHandedGoals: number;
            shortHandedAssists: number;
        };
        goalieStats?: {
            timeOnIce: string;
            assists: number;
            goals: number;
            decision?: "W" | "L";
            saves: number;
        };
    };
}

interface TeamJSON {
    team: {
        id: number;
    };
    teamStats: {
        teamSkaterStats: { goals: number };
    };
    players: {
        // id prefixed with 'ID'
        [idString: string]: PlayerJSON;
    };
}

interface BoxScoreJSON {
    teams: {
        home: TeamJSON;
        away: TeamJSON;
    };
}

// X = game in play
type GoalieOutcome = "W" | undefined;

interface PlayerStats {
    touchedIce: boolean;
    goals: number;
    assists: number;
    outcome?: GoalieOutcome;
    shutout?: true;
    saves?: number;
    tb1?: number;
    tb2?: number;
    tb3?: number;
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
const hasTouchedIce = (timeOnIce: string) => {
    // wrap in try/catch incase timeOnIce is messsed up (should be 0:00 but who knows)
    try {
        const [minutes, seconds] = timeOnIce.split(":").map(Number);
        if (minutes === 0 && seconds === 0) return false;

        return true;
    } catch {
        return false;
    }
};

const validate = (json: any): json is BoxScoreJSON => {
    //todo
    return true;
};

const transform = (json: BoxScoreJSON, game: Game): BoxScore => {
    const boys2Men = (
        homeOrAway: "home" | "away"
    ): Record<string, PlayerStats> => {
        const otherTeam = homeOrAway === "home" ? "away" : "home";
        return Object.values(json.teams[homeOrAway].players).reduce(
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
                    const shutout =
                        goalieStats.decision === "W" &&
                        json.teams[otherTeam].teamStats.teamSkaterStats
                            .goals === 0
                            ? true
                            : undefined;
                    const outcome: GoalieOutcome =
                        goalieStats.decision === "W" ? "W" : undefined;
                    theBoys[playa.person.id] = {
                        touchedIce: hasTouchedIce(goalieStats.timeOnIce),
                        goals: goalieStats.goals,
                        assists: goalieStats.assists,
                        outcome,
                        shutout,
                        saves: goalieStats.saves,
                    };
                }
                if (skaterStats) {
                    theBoys[playa.person.id] = {
                        touchedIce: hasTouchedIce(skaterStats.timeOnIce),
                        goals: skaterStats.goals,
                        assists: skaterStats.assists,
                        tb1: skaterStats.hits,
                        tb2: skaterStats.blocked,
                        tb3:
                            skaterStats.shortHandedGoals +
                            skaterStats.shortHandedAssists,
                    };
                }
                return theBoys;
            },
            {}
        );
    };
    const homeBoys = boys2Men("home");

    const awayBoys = boys2Men("away");

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
