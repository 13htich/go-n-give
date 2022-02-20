// import { hitTheShowers } from "./gos/player";
// import { loadRostersAndGames } from "./gos/roster";
import { loadScore } from "./gos/boxscore";
import { loadGames } from "./gos/games";
import { readGameScore, writeGameScore } from "./lockerroom/lockers";
import { getPlays, redlight } from "./gives/redlight";
import { shoutcaster } from "./lockerroom/shoutcaster";

const goToSleep = (ms: number) => {
    return new Promise((res) => setTimeout(res, ms));
};

const main = async () => {
    // ive always wanted to put one of these into production...
    while (1337) {
        shoutcaster.info("LOADING GAMES...");
        const now = Date.now();
        const games = await loadGames();
        for (const game of games) {
            // load score
            const boxscore = await loadScore(game);
            const previousBoxscore = await readGameScore(game.id);

            const plays = getPlays(boxscore, previousBoxscore);

            for (const play of plays) {
                redlight(play);
                // await goToSleep(1337);
            }
            if (!(await writeGameScore(boxscore)))
                shoutcaster.error(`FAILED TO WRITE BOXSCORE ${boxscore.id}`);
        }
        shoutcaster.info(
            "FINISHED PROCESSING %o GAMES in %o seconds",
            games.length,
            Math.ceil((Date.now() - now) / 1000)
        );
    }
};

if (process.env.NODE_ENV !== "test") {
    main();
}
