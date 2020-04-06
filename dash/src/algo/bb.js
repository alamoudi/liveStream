import { AbrAlgorithm } from '../algo/interface';
import { BufferLevelGetter } from '../algo/getters';

import { Decision, Value } from '../common/data';
import { logging } from '../common/logger';


const logger = logging('BB');
const SECOND = 1000;


const reservoir = 5 * SECOND;
const cushion = 10 * SECOND;


export class BB extends AbrAlgorithm {
    constructor(video) {
        super();

        this.bitrateArray = video.bitrateArray;
        this.n = this.bitrateArray.length;
        this.bufferLevel = new BufferLevelGetter();
    }
   
    getDecision(metrics, index, timestamp) {
        this.bufferLevel.update(metrics);
        let bufferLevel = this.bufferLevel.value;

        let bitrate = 0;
        let quality = 0;
        if (bufferLevel <= reservoir) {
            bitrate = this.bitrateArray[0];
        } else if (bufferLevel >= reservoir + cushion) {
            bitrate = this.bitrateArray[this.n - 1];
        } else {
            bitrate = this.bitrateArray[0] + 
               (this.bitrateArray[this.n - 1] - this.bitrateArray[0]) * 
               (bufferLevel - reservoir) / cushion;
        }

        for (let i = this.n - 1; i >= 0; i--) {
            quality = i;
            if (bitrate >= this.bitrateArray[i]) {
                break;
            }
        }

        logger.log(`bitrate ${bitrate}`, `quality ${quality}`, `buffer level ${bufferLevel}`); 
        return new Decision(
            index,
            quality,
            timestamp,
        );
    }
}
