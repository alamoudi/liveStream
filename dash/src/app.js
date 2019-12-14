import { Decision } from './common/data';
import { logging } from './common/logger';
import { SetQualityController } from './component/abr';
import { StatsTracker } from './component/stats'; 
import { BackendShim } from './component/backend';
import { checking } from './component/consistency';
import { DataPiece, Interceptor } from './component/intercept';

import { QualityController } from './controller/quality';
import { StatsController } from './controller/stats';


const logger = logging('App');
const qualityStream = checking('quality');
const metricsStream = checking('metrics');


export class App {
    constructor() {
        this.shim = new BackendShim(); 
        this.interceptor = new Interceptor();
        this.interceptor.start();

        this.qualityController = new QualityController();
        this.statsController = new StatsController();
        
        this.current = 0;
        this.pool = 5;
        this.index = 0;
        SetQualityController(this.qualityController);
    }

    withPlayer(player) {
        this.tracker = new StatsTracker(player);
        return this;
    }

    sendPieceRequest() {
        if (this.current < this.pool) {
            this.current += 1;
            this.index += 1;
        } else {
            return;
        }
        let index = this.index;

        this.shim
            .pieceRequest()
            .addIndex(index)
            .onSuccess((body) => {
                this.sendPieceRequest();
                
                let object = JSON.parse(body);
                let decision = new Decision(
                    object.index,
                    object.quality,
                    object.timestamp
                );
                
                this.qualityController.addPiece(decision);
                qualityStream.push(decision);

                // [TODO] check this is legit
                this.statsController.advance(decision.timestamp);
            }).onFail(() => {
            }).send();
        
        this.shim
            .resourceRequest()
            .addIndex(index)
            .onSend((url, content) => {
                // we intercept future requests to the backend
                this.interceptor.intercept(index);
            })
            .onSuccessResponse((res) => {
                this.interceptor.onIntercept(index, (object) => { 
                    let ctx = object.ctx;
                    let makeWritable = object.makeWritable;
                    let url = object.url;
                   
                    // make writable
                    makeWritable(ctx, 'responseURL', true);
                    makeWritable(ctx, 'response', true); 
                    makeWritable(ctx, 'readyState', true);
                    makeWritable(ctx, 'status', true);
                    makeWritable(ctx, 'statusText', true);
                    
                    const execute = (callback, event) => {
                        try {
                            if (callback) {
                                if (event) {
                                    callback(event);
                                } else {
                                    callback();
                                }
                            }
                        } catch(ex) {
                            logger.log('Exception in', ex, callback);
                        }
                    };

                    // starting
                    ctx.readyState = 3;
                    execute(ctx.onprogress, {
                        'noTrace' : true,
                    });
                    

                    // modify response
                    ctx.responseType = "arraybuffer";
                    ctx.responseURL = url;
                    ctx.response = res.response;
                    ctx.readyState = 4;
                    ctx.status = 200;
                    ctx.statusText = "OK";

                    
                    logger.log('Overrided', ctx.responseURL, ctx);
                    execute(ctx.onprogress, {
                        'lengthComputable' : true,
                        'loaded' : res.response.bytelength,
                        'total' : res.response.bytelength,
                        'noTrace': true,
                    });
                    execute(ctx.onload);
                    execute(ctx.onloadended);
                });
            }).onFail(() => {
            }).send();
       this.sendPieceRequest(); 
    }

    start() {
        this.sendPieceRequest();
        this.interceptor
            .onRequest((index) => {
                // only when a request is sent, this means that the next 
                // decision of the abr component will ask for the next 
                // index 
                this.qualityController.advance(index + 1);

                // send metrics to tracker 
                this.tracker.getMetrics(); 
            });
        
        this.tracker.registerCallback((metrics) => {
            // Log metrics
            this.statsController.addMetrics(metrics);
            logger.log("metrics", this.statsController.metrics);

            // Request a new peice from the backend
            let allMetrics = this.statsController.metrics;
            for (let segment of metrics.segments) {
                metricsStream.push(segment);
            }

            this.shim
                .metricsRequest()
                .addStats(allMetrics.serialize())
                .onSuccess((body) => {
                    // [TODO] advance timestamp
                }).onFail(() => {
                }).send();
        });
        this.tracker.start();
    }
}
