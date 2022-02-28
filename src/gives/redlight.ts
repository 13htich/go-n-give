import { PlayDTO } from "../gos/plays";
import { shoutcaster } from "../lockerroom/shoutcaster";

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
            const verb = positive ? "ASSISTED" : "ASSIST REVERTED";
            shoutcaster.info("%o: [%o]", verb, play.p);
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
