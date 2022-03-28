import { PlayDTO } from "../gos/plays";
import { shoutcaster } from "../lockerroom/shoutcaster";
import * as zmq from "zeromq";
import { redlight } from "./redlight";

const THE_AM_THE_FM_THE_PM_TOO = "tcp://127.0.0.1:3000";

// publish to 0mq
let sock: zmq.Socket;
export const broadcast = async (play: PlayDTO): Promise<void> => {
    if (!sock) {
        sock = zmq.socket("push");
        sock.bindSync(THE_AM_THE_FM_THE_PM_TOO);
        shoutcaster.info(THE_AM_THE_FM_THE_PM_TOO + " THE Q is now live!");
    }
    sock.send(JSON.stringify(play));
};

let listener: zmq.Socket;
const listenIn = () => {
    //review plays from zeroMq
    if (!listener) {
        listener = zmq.socket("pull");
        listener.connect(THE_AM_THE_FM_THE_PM_TOO);
        listener.on("message", (msg: string) => redlight(JSON.parse(msg)));
        shoutcaster.info(
            "YOU ARE NOW LISTENING TO " + THE_AM_THE_FM_THE_PM_TOO + " THE Q~!"
        );
    }
};

if (process.env.NODE_ENV === "demo") {
    listenIn();
}
