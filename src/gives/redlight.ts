import { v4 } from "uuid";
import { BoxScore } from "../gos/boxscore";
import { shoutcaster } from "../lockerroom/shoutcaster";

interface PlayDTO {
    // event id - for idempotency
    id: string;
    // playerId
    p: number;
    // point type
    t: "G" | "A" | "W" | "SO";
    // delta
    d: -1 | 1;
    // game start timestamp - iso8601
    ts: string;
}

export const getPlays = (bs: BoxScore, oldbs: BoxScore | null): PlayDTO[] => {
    // todo: this function can definitely be cleaned up.
    const plays: PlayDTO[] = [];
    // home
    for (const [playerId, playerStats] of Object.entries(bs.home.players)) {
        const compare = oldbs && oldbs.home.players[Number(playerId)];
        let { goals, assists } = playerStats;
        if (compare) {
            goals = goals - compare.goals;
            assists = assists - compare.assists;
        }

        // shoutcaster.error("GOALS: %O, ASSISTS: %O", goals, assists);
        if (
            compare &&
            compare.outcome &&
            compare.outcome !== playerStats.outcome
        ) {
            // if the previous recorded outcome exists (W or SO) but the new outcome is different, revert previous outcome
            const id = v4();
            const p = Number(playerId);
            const t = compare.outcome;
            const d = -1; // revert
            const ts = bs.ts;
            plays.push({
                id,
                p,
                t,
                d,
                ts,
            });
        }
        const compareOutcome = compare && compare.outcome;
        if (playerStats.outcome && compareOutcome !== playerStats.outcome) {
            // if the new outcome exists and is not already recorded, send outcome to mo
            const id = v4();
            const p = Number(playerId);
            const t = playerStats.outcome;
            const d = 1;
            const ts = bs.ts;
            plays.push({
                id,
                p,
                t,
                d,
                ts,
            });
        }

        // goals
        for (let i = 0; i < Math.abs(goals); i++) {
            const id = v4();
            const p = Number(playerId);
            const t = "G";
            const d = (goals / Math.abs(goals)) as 1 | -1;
            const ts = bs.ts;
            plays.push({
                id,
                p,
                t,
                d,
                ts,
            });
        }
        // assists
        for (let i = 0; i < Math.abs(assists); i++) {
            const id = v4();
            const p = Number(playerId);
            const t = "A";
            const d = (goals / Math.abs(assists)) as 1 | -1;
            const ts = bs.ts;
            plays.push({
                id,
                p,
                t,
                d,
                ts,
            });
        }
    }
    // away
    for (const [playerId, playerStats] of Object.entries(bs.away.players)) {
        const compare = oldbs && oldbs.away.players[Number(playerId)];
        let { goals, assists } = playerStats;
        if (compare) {
            goals = goals - compare.goals;
            assists = assists - compare.assists;
        }

        // shoutcaster.error("GOALS: %O, ASSISTS: %O", goals, assists);
        if (
            compare &&
            compare.outcome &&
            compare.outcome !== playerStats.outcome
        ) {
            // if the previous recorded outcome exists (W or SO) but the new outcome is different, revert previous outcome
            const id = v4();
            const p = Number(playerId);
            const t = compare.outcome;
            const d = -1; // revert
            const ts = bs.ts;
            plays.push({
                id,
                p,
                t,
                d,
                ts,
            });
        }
        const compareOutcome = compare && compare.outcome;
        if (playerStats.outcome && compareOutcome !== playerStats.outcome) {
            // if the new outcome exists and is not already recorded, send outcome to mo
            const id = v4();
            const p = Number(playerId);
            const t = playerStats.outcome;
            const d = 1;
            const ts = bs.ts;
            plays.push({
                id,
                p,
                t,
                d,
                ts,
            });
        }

        // goals
        for (let i = 0; i < Math.abs(goals); i++) {
            const id = v4();
            const p = Number(playerId);
            const t = "G";
            const d = (goals / Math.abs(goals)) as 1 | -1;
            const ts = bs.ts;
            plays.push({
                id,
                p,
                t,
                d,
                ts,
            });
        }
        // assists
        for (let i = 0; i < Math.abs(assists); i++) {
            const id = v4();
            const p = Number(playerId);
            const t = "A";
            const d = (goals / Math.abs(assists)) as 1 | -1;
            const ts = bs.ts;
            plays.push({
                id,
                p,
                t,
                d,
                ts,
            });
        }
    }

    return plays;
};

export const redlight = (play: PlayDTO) => {
    // shoutcaster.info("HEY MO UPDATE THE SPREADSHEET: \n%O", play);
    const positive = Math.abs(play.d) === play.d;
    switch (play.t) {
        case "G": {
            const verb = positive ? "SCORED" : "REVERTED";
            shoutcaster.info("GOAL %o: [%o]", verb, play.p);
            break;
        }
        case "A": {
            const verb = positive ? "ASSISTED" : "REVERTED";
            shoutcaster.info("GOAL %o: [%o]", verb, play.p);
            break;
        }
        case "W": {
            const verb = positive ? "WON" : "WIN REVERTED";
            shoutcaster.info("GAME %o: [%o]", verb, play.p);
            break;
        }
        case "SO": {
            const verb = positive ? "SHUTOUT" : "SHUTOUT REVERTED";
            shoutcaster.info("GAME %o: [%o]", verb, play.p);
            break;
        }
    }
};
