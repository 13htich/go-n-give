import { v4 } from "uuid";
import { BoxScore } from "./boxscore";

export interface PlayDTO {
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

// todo: refactor
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
            const d = (assists / Math.abs(assists)) as 1 | -1;
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
            const d = (assists / Math.abs(assists)) as 1 | -1;
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
