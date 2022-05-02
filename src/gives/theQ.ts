import { Queue, QueueEvents, Worker } from "bullmq";
import { PlayDTO } from "../gos/plays";
import { shoutcaster } from "../lockerroom/shoutcaster";
import { hooking } from "./hooking";
import { redlight } from "./redlight";
//Add jobs to the queue:

export const hookingQ = new Queue("hookin");

//Process the jobs in your workers:

const worker = new Worker<PlayDTO>("hookin", async (job) => {
    if (job.name === "play") {
        try {
            redlight(job.data);
            await hooking(job.data);
        } catch (e) {
            shoutcaster.error(
                "job failed, retrying in 5 min. \n",
                JSON.stringify
            );
            // try again in 5 minutes
            hookingQ.add("play", job.data, { delay: 5 * 60 * 1000 });
        }
    }
});

//Listen to jobs for completion:

const queueEvents = new QueueEvents("hookin");

queueEvents.on("completed", () => {
    shoutcaster.info("~hooked~");
});

queueEvents.on("failed", (something) => {
    shoutcaster.error("queue error:\n", JSON.stringify(something));
});
