import { v4 } from "uuid";
import { BoxScore } from "./boxscore";

type POINT_TYPE = "G" | "A" | "W" | "SO" | "S40";
export interface PlayDTO {
    // event id - for idempotency
    uuid: string;
    // playerId
    player_id: number;
    // point type
    point_type: POINT_TYPE;
    // delta
    delta: -1 | 1;
    // game start timestamp - iso8601
    game_start: string;
}

export const getPlays = (bs: BoxScore, oldbs: BoxScore | null): PlayDTO[] => {
    const plays: PlayDTO[] = [];
    const pushPlays = (homeOrAway: "home" | "away") => {
        for (const [playerId, playerStats] of Object.entries(
            bs[homeOrAway].players
        )) {
            const pushPlay = (t: POINT_TYPE, d: 1 | -1) => {
                const uuid = v4();
                const player_id = Number(playerId);
                const point_type = t;
                const delta = d;
                const game_start = bs.ts;
                plays.push({
                    uuid,
                    player_id,
                    point_type,
                    delta,
                    game_start,
                });
            };

            const compare =
                oldbs && oldbs[homeOrAway].players[Number(playerId)];

            // shoutcaster.error("GOALS: %O, ASSISTS: %O", goals, assists);
            if (
                compare &&
                compare.outcome &&
                compare.outcome !== playerStats.outcome
            ) {
                // if the previous recorded outcome exists (W or SO) but the new outcome is different, revert previous outcome
                const t = compare.outcome;
                const d = -1; // revert
                pushPlay(t, d);
            }
            const compareOutcome = compare && compare.outcome;
            if (playerStats.outcome && compareOutcome !== playerStats.outcome) {
                // if the new outcome exists and is not already recorded, send outcome to mo
                const t = playerStats.outcome;
                const d = 1;
                pushPlay(t, d);
            }
            if (playerStats.saves) {
                const prevSave40s = Math.floor((compare?.saves || 0) / 40);
                const newSave40s = Math.floor(playerStats.saves / 39);
                const save40s = newSave40s - prevSave40s;
                // save40s
                for (let i = 0; i < Math.abs(save40s); i++) {
                    const t = "S40";
                    const d = (save40s / Math.abs(save40s)) as 1 | -1;
                    pushPlay(t, d);
                }
            }

            let { goals, assists } = playerStats;
            if (compare) {
                goals = goals - compare.goals;
                assists = assists - compare.assists;
            }
            // goals
            for (let i = 0; i < Math.abs(goals); i++) {
                const t = "G";
                const d = (goals / Math.abs(goals)) as 1 | -1;
                pushPlay(t, d);
            }
            // assists
            for (let i = 0; i < Math.abs(assists); i++) {
                const t = "A";
                const d = (assists / Math.abs(assists)) as 1 | -1;
                pushPlay(t, d);
            }
        }
    };

    pushPlays("home");
    pushPlays("away");

    return plays;
};
