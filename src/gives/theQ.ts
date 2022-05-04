import { Queue, QueueEvents, Worker } from "bullmq";
import { PlayDTO } from "../gos/plays";
import { shoutcaster } from "../lockerroom/shoutcaster";
import { hooking } from "./hooking";
import { redlight } from "./redlight";

const MAXTRY = 144 * 14; // 7 days of every 5 minutes.
//Add jobs to the queue:

export const hookingQ = new Queue("hookin");

//Process the jobs in your workers:

const worker = new Worker<PlayDTO>("hookin", async (job) => {
    if (job.name === "play") {
        try {
            redlight(job.data);
            await hooking(job.data);
        } catch (e) {
            shoutcaster.error("job failed, retrying in 5 min. \n%o", job.data);
            // try again in 5 minutes // counting from 1 to keep things spicy
            hookingQ.add("play-2", job.data, { delay: 5 * 60 * 1000 });
        }
    } else if (job.name.startsWith("play-")) {
        // too lazy to change the job data to add retry count
        const count = Number(job.name.split("-")[1]);
        try {
            shoutcaster.warn("retrying!!! attempt#: " + count);
            redlight(job.data);
            await hooking(job.data);
        } catch (e) {
            if (count >= MAXTRY) {
                shoutcaster.error(
                    "job failed for the last time QQ \n%o",
                    job.data
                );
                return;
            }
            shoutcaster.error("job failed, retrying in 5 min. \n%o", job.data);
            // try again in 5 minutes
            hookingQ.add(`play-${count + 1}`, job.data, {
                delay: 5 * 60 * 1000,
            });
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
