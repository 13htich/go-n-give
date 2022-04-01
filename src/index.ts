// import { hitTheShowers } from "./gos/player";
// import { loadRostersAndGames } from "./gos/roster";
import { loadScore } from "./gos/boxscore";
import { Game, loadGames } from "./gos/games";
import { readGameScore, writeGameScore } from "./lockerroom/lockers";
import { redlight } from "./gives/redlight";
import { shoutcaster } from "./lockerroom/shoutcaster";
import { getPlays } from "./gos/plays";
import { broadcast } from "./gives/theQ";
import { hooking } from "./gives/hooking";

// util
const goToSleep = (ms: number) => {
    shoutcaster.info("Wake me up, when %oms ends...", ms);
    return new Promise((res) => setTimeout(res, ms));
};
const gameStartedBefore = (game: Game, ts: number) =>
    new Date(game.ts).getTime() <= ts;
const gameHasFinished = (game: Game) => game.state === "7";
//
const processGames = async (games: Game[]): Promise<void> => {
    for (const game of games) {
        // load score
        const boxscore = await loadScore(game);
        const previousBoxscore = await readGameScore(game.id);
        // create playDTOs
        const plays = getPlays(boxscore, previousBoxscore);

        // const hookingCalls: Promise<string>[] = [];
        for (const play of plays) {
            redlight(play);
            // hookingCalls.push(hooking(play));
            try {
                await hooking(play);
            } catch (e) {
                shoutcaster.error("failed to hook on this play: %o", play);
            }
        }
        // const report = await Promise.allSettled(hookingCalls);
        // report.forEach((result) => {
        //     if (result.status === "rejected") {
        //         shoutcaster.error(
        //             "failed to hook on this play: %s",
        //             result.reason
        //         );
        //     }
        // });
        if (!(await writeGameScore(boxscore)))
            shoutcaster.error(`FAILED TO WRITE BOXSCORE ${boxscore.id}`);
    }
};

const main = async () => {
    // begs for recursion, but my will is strong
    let checkForCorrections = true;
    // really begging for it.
    let previousLiveGameIds: number[] = [];
    // ive always wanted to put one of these into production
    while (1337) {
        const start = Date.now();
        // setup
        shoutcaster.info("LOADING GAMES");
        const games = await loadGames();
        shoutcaster.info("GAMES LOADED");

        const [historicGames, liveGames, nextGameTS] = games.reduce<
            [Game[], Game[], number]
        >(
            ([historicGames, liveGames, nextGameTS], game) => {
                if (gameStartedBefore(game, start) && gameHasFinished(game)) {
                    // handle games as they end
                    if (previousLiveGameIds.includes(game.id)) {
                        previousLiveGameIds = previousLiveGameIds.filter(
                            (gId) => game.id !== gId
                        );
                        return [
                            historicGames,
                            liveGames.concat(game),
                            nextGameTS,
                        ];
                    }
                    return [historicGames.concat(game), liveGames, nextGameTS];
                } else if (gameStartedBefore(game, start)) {
                    // track live games so that they get updated one more time after finishing.
                    if (!previousLiveGameIds.includes(game.id)) {
                        previousLiveGameIds.push(game.id);
                    }
                    return [historicGames, liveGames.concat(game), nextGameTS];
                } else if (new Date(game.ts).getTime() < nextGameTS) {
                    return [
                        historicGames,
                        liveGames,
                        new Date(game.ts).getTime(),
                    ];
                }
                return [historicGames, liveGames, nextGameTS];
            },
            [[], [], Infinity]
        );

        // processing
        if (liveGames.length) {
            shoutcaster.info("PROCESSING %o LIVE GAMES", liveGames.length);
            await processGames(liveGames);
            shoutcaster.info("PROCESSED %o LIVE GAMES", liveGames.length);
        }
        if (historicGames.length && checkForCorrections) {
            shoutcaster.info("CHECKING %o OLD GAMES", historicGames.length);
            await processGames(historicGames);
            shoutcaster.info("CHECKED %o OLD GAMES", historicGames.length);
        }

        // schedule next run
        const nappyTime = 5000;
        // still wont be exact, but at least no more network calls
        const processingTime = Date.now() - start;
        const msUntilTopOfTheHour = Math.max(
            3600000 - (start % 3600000) - processingTime,
            0
        );
        const msUntilNextGame = Math.max(
            nextGameTS - start - processingTime,
            0
        );
        if (liveGames.length && msUntilTopOfTheHour <= nappyTime) {
            // live games, but time for a full check
            await goToSleep(msUntilTopOfTheHour);
            checkForCorrections = true;
        } else if (liveGames.length) {
            // live games, wait 5 seconds to give bettman a break
            await goToSleep(nappyTime);
            checkForCorrections = false;
        } else {
            // no live games
            await goToSleep(Math.min(msUntilTopOfTheHour, msUntilNextGame));
            checkForCorrections = true;
        }
    }
};

if (process.env.NODE_ENV !== "test") {
    main();
}
